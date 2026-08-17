import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, Image, Animated, Easing, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { xpForLevel } from './leveling';
import { habitDoneOn, todayDateKey } from './habitUtils';
import {
  WEAPON_TIERS,
  ARMOR_TIERS,
  minionFightCost,
  HERO_FRAMES,
  minionFramesFor,
  BOSS_FRAMES,
} from './heroUtils';
import { generateTerrainGrid, isWalkable } from './terrainGenerator';
import ColorTerrainMap from './ColorTerrainMap';
import { GROUND_SHADOW } from './decor';

const FRAME_INTERVAL = 380;
const TILE_SIZE = 24;
// A genuinely large world instead of a small fully-visible grid — this
// is what makes it feel explorable rather than a static backdrop. Only
// a VIEWPORT-sized window of it renders at once (see the camera logic
// below), so performance doesn't depend on the world's actual size.
const WORLD_COLS = 60;
const WORLD_ROWS = 60;
const VIEWPORT_COLS = 13;
const VIEWPORT_ROWS = 14;
// Same seed every time so the world looks the same across app opens
// instead of reshuffling on every reload — change this string any time
// you want a genuinely different-looking map.
const WORLD_SEED = 'quest-world-v1';
const AUTO_CLEAR_MS = 6000; // a defeated-but-not-yet-attacked quest fades on its own

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// A cheap deterministic hash so each habit always lands on the same
// walkable tile instead of jumping around every re-render. Takes the
// list of open (walkable) tiles as a parameter since that now depends
// on the generated terrain, not a fixed layout. Positions are in WORLD
// tile coordinates — converting to on-screen position happens later,
// relative to wherever the camera currently is.
function hashTile(id, openTiles) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const spot = openTiles[h % openTiles.length];
  return { col: spot.col, row: spot.row };
}

// Small, slow wander so enemies don't just stand there - each marker
// gets its own independent loop of gentle random drifts around its home
// spot, not a shared animation, so they don't all move in lockstep.
function useWander(seed) {
  const anim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  useEffect(() => {
    let cancelled = false;
    let s = seed;
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    function step() {
      if (cancelled) return;
      const dx = (rand() - 0.5) * (TILE_SIZE * 0.5);
      const dy = (rand() - 0.5) * (TILE_SIZE * 0.5);
      Animated.timing(anim, {
        toValue: { x: dx, y: dy },
        duration: 1800 + rand() * 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => step());
    }
    step();
    return () => {
      cancelled = true;
    };
  }, []);
  return anim;
}

function WanderingMinion({ pos, seed, frames, frame, onPress, selected, calloutText }) {
  const wander = useWander(seed);
  return (
    <Animated.View
      style={[
        styles.marker,
        { left: pos.x, top: pos.y, transform: wander.getTranslateTransform() },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Image source={{ uri: GROUND_SHADOW }} style={styles.markerShadow} />
        <Image source={{ uri: frames[frame] }} style={styles.markerImg} resizeMode="contain" />
        {selected ? (
          <View style={styles.callout}>
            <Text style={styles.calloutText}>{calloutText}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RoadmapWorldMap({ level, xp, hero, habits, cards, onFightMinion, onBossDefeated, onExit }) {
  const insets = useSafeAreaInsets();
  const weapon = WEAPON_TIERS[hero.weaponTier] || WEAPON_TIERS[0];
  const armor = ARMOR_TIERS[hero.armorTier] || ARMOR_TIERS[0];
  const cost = minionFightCost(hero.weaponTier);
  const needed = xpForLevel(level);
  const healthPct = Math.max(0, Math.min(100, 100 - (xp / needed) * 100));

  // Generated once at full world size (same seed every time = same
  // world every app open), not regenerated on every render.
  const terrainGrid = useMemo(
    () => generateTerrainGrid({ seed: WORLD_SEED, cols: WORLD_COLS, rows: WORLD_ROWS, scale: 10 }),
    []
  );
  const openTiles = useMemo(() => {
    const spots = [];
    terrainGrid.forEach((row, r) => {
      row.forEach((terrain, c) => {
        if (isWalkable(terrain)) spots.push({ row: r, col: c });
      });
    });
    return spots;
  }, [terrainGrid]);

  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => 1 - f), FRAME_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // --- hero position in WORLD tile coordinates, moved by the D-pad ---
  const [heroTile, setHeroTile] = useState({
    col: Math.floor(WORLD_COLS / 2),
    row: Math.floor(WORLD_ROWS / 2),
  });
  const [facingLeft, setFacingLeft] = useState(false);
  // Real collision checking — this was the actual bug behind "walking
  // through trees": move() only ever clamped to the world's outer edge,
  // it never checked whether the tile you were stepping onto was solid.
  // Forest, mountain, and both water types now actually block movement.
  function move(dCol, dRow) {
    if (dCol < 0) setFacingLeft(true);
    if (dCol > 0) setFacingLeft(false);
    setHeroTile((p) => {
      const nextCol = clamp(p.col + dCol, 0, WORLD_COLS - 1);
      const nextRow = clamp(p.row + dRow, 0, WORLD_ROWS - 1);
      const targetTerrain = terrainGrid[nextRow][nextCol];
      if (!isWalkable(targetTerrain)) return p; // blocked - stay put
      return { col: nextCol, row: nextRow };
    });
  }

  // --- camera: the top-left WORLD tile of the visible window, kept
  // centered on the hero and clamped so it never scrolls past the
  // world's edge. Everything drawn on screen is positioned relative to
  // this, not to absolute world coordinates. ---
  const cameraCol = clamp(
    heroTile.col - Math.floor(VIEWPORT_COLS / 2),
    0,
    Math.max(0, WORLD_COLS - VIEWPORT_COLS)
  );
  const cameraRow = clamp(
    heroTile.row - Math.floor(VIEWPORT_ROWS / 2),
    0,
    Math.max(0, WORLD_ROWS - VIEWPORT_ROWS)
  );
  function worldToScreen(col, row) {
    return { x: (col - cameraCol) * TILE_SIZE, y: (row - cameraRow) * TILE_SIZE };
  }
  function inViewport(col, row) {
    return col >= cameraCol && col < cameraCol + VIEWPORT_COLS && row >= cameraRow && row < cameraRow + VIEWPORT_ROWS;
  }
  const visibleGrid = useMemo(() => {
    const rows = [];
    for (let r = cameraRow; r < cameraRow + VIEWPORT_ROWS; r++) {
      rows.push(terrainGrid[r].slice(cameraCol, cameraCol + VIEWPORT_COLS));
    }
    return rows;
  }, [terrainGrid, cameraCol, cameraRow]);
  const heroPos = worldToScreen(heroTile.col, heroTile.row);

  // --- today's habits, each one a quest marker ---
  const todayKey = todayDateKey();
  const pendingHabits = (habits || []).filter((h) => !habitDoneOn(h, todayKey));

  // A habit that just flipped from not-done to done becomes a "ready to
  // finish" quest marker for a few seconds - a satisfying tap-to-attack
  // moment, not required, since it also auto-clears on its own.
  const prevDoneRef = useRef(new Set());
  const [readyQuests, setReadyQuests] = useState([]); // [{ id, text, pos, timer }]

  useEffect(() => {
    const nowDone = new Set(
      (habits || []).filter((h) => habitDoneOn(h, todayKey)).map((h) => h.id)
    );
    const newlyDone = (habits || []).filter(
      (h) => nowDone.has(h.id) && !prevDoneRef.current.has(h.id)
    );
    if (newlyDone.length) {
      setReadyQuests((prev) => [
        ...prev,
        ...newlyDone.map((h) => ({ id: h.id, text: h.text, tile: hashTile(h.id, openTiles) })),
      ]);
      newlyDone.forEach((h) => {
        setTimeout(() => {
          setReadyQuests((prev) => prev.filter((q) => q.id !== h.id));
        }, AUTO_CLEAR_MS);
      });
    }
    prevDoneRef.current = nowDone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits]);

  const bossReady = pendingHabits.length === 0 && readyQuests.length === 0;

  // Missions panel state - "Quests" are today's habits (already tracked
  // above), "Side Quests" are the longer-running goal cards from the
  // Roadmaps list, since those are naturally the non-daily objectives.
  const [questsOpen, setQuestsOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const sideQuests = (cards || []).map((c) => {
    const goals = c.goals || [];
    const done = goals.filter((g) => {
      const tasks = g.tasks || [];
      return tasks.length > 0 && tasks.every((t) => t.done);
    }).length;
    return { id: c.id, title: c.title, done, total: goals.length };
  });

  // --- attack animation, reused for quest kills and the boss ---
  const lungeAnim = useRef(new Animated.Value(0)).current;
  const [poofId, setPoofId] = useState(null);
  const [selectedQuestId, setSelectedQuestId] = useState(null);

  function playAttack(onDone) {
    Animated.sequence([
      Animated.timing(lungeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(lungeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onDone);
  }

  function finishQuest(quest) {
    if (hero.energy < cost) return;
    playAttack(() => {
      setPoofId(quest.id);
      setTimeout(() => setPoofId(null), 400);
      setReadyQuests((prev) => prev.filter((q) => q.id !== quest.id));
      onFightMinion();
    });
  }

  // --- boss (unchanged mechanic from before, just relocated onto the map) ---
  const healthAnim = useRef(new Animated.Value(healthPct)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const bossScaleAnim = useRef(new Animated.Value(1)).current;
  const prevRef = useRef({ level, xp });
  const [defeated, setDefeated] = useState(false);
  const [displayLevel, setDisplayLevel] = useState(level);

  useEffect(() => {
    const prev = prevRef.current;
    const leveledUp = level > prev.level;
    if (leveledUp) {
      setDefeated(true);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 120, useNativeDriver: false }),
        Animated.timing(bossScaleAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.timing(bossScaleAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setDisplayLevel(level);
        setDefeated(false);
        healthAnim.setValue(100);
        bossScaleAnim.setValue(1);
        flashAnim.setValue(0);
        Animated.spring(bossScaleAnim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
        onBossDefeated();
      });
    } else if (xp !== prev.xp) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      Animated.timing(healthAnim, { toValue: healthPct, duration: 500, useNativeDriver: false }).start();
      setDisplayLevel(level);
    } else {
      healthAnim.setValue(healthPct);
      setDisplayLevel(level);
    }
    prevRef.current = { level, xp };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, xp]);

  const lungeX = lungeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  const shakeInterp = shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });
  const widthInterp = healthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const healthColor = healthAnim.interpolate({
    inputRange: [0, 30, 60, 100],
    outputRange: ['#c94f4f', '#d98a3f', '#d9b23f', '#4f9e5c'],
  });
  const flashInterp = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] });

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBtn} onPress={onExit}>
          <Text style={styles.headerBtnText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setQuestsOpen(true)}>
          <Text style={styles.headerBtnText}>📜 Quests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setMissionsOpen(true)}>
          <Text style={styles.headerBtnText}>🗺️ Missions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.energyRow}>
        <Text style={styles.energyLabel}>⚡ Energy</Text>
        <View style={styles.energyTrack}>
          <View style={[styles.energyFill, { width: `${hero.energy}%` }]} />
        </View>
        <Text style={styles.energyNum}>{hero.energy}/100</Text>
      </View>

      <View style={[styles.map, { width: VIEWPORT_COLS * TILE_SIZE, height: VIEWPORT_ROWS * TILE_SIZE }]}>
        <ColorTerrainMap grid={visibleGrid} tileSize={TILE_SIZE} />

        {/* Quest markers - one per habit still due today, wandering slowly.
            World position is fixed (from hashTile); only actually rendered
            when the camera's current view includes that tile. */}
        {pendingHabits.map((h, i) => {
          const tile = hashTile(h.id, openTiles);
          if (!inViewport(tile.col, tile.row)) return null;
          const pos = worldToScreen(tile.col, tile.row);
          const frames = minionFramesFor(i);
          return (
            <WanderingMinion
              key={h.id}
              pos={pos}
              seed={i + 1}
              frames={frames}
              frame={frame}
              onPress={() => setSelectedQuestId(selectedQuestId === h.id ? null : h.id)}
              selected={selectedQuestId === h.id}
              calloutText={`Complete "${h.text}" to weaken this quest`}
            />
          );
        })}

        {/* Ready-to-finish quests - just completed, glowing, tap to attack */}
        {readyQuests.map((q) => {
          if (poofId === q.id) return null;
          if (!inViewport(q.tile.col, q.tile.row)) return null;
          const pos = worldToScreen(q.tile.col, q.tile.row);
          return (
            <TouchableOpacity
              key={q.id}
              style={[styles.marker, styles.markerReady, { left: pos.x, top: pos.y }]}
              onPress={() => finishQuest(q)}
              activeOpacity={0.8}
            >
              <View style={styles.readyGlow} />
              <Image source={{ uri: minionFramesFor(0)[frame] }} style={styles.markerImg} resizeMode="contain" />
              <Text style={styles.readyLabel}>{hero.energy >= cost ? `Tap to finish (${cost}⚡)` : 'Fading...'}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Boss - appears once every quest today is cleared, at a fixed
            spot in the world (near the hero's starting area); only drawn
            when the camera has scrolled to include it. */}
        {bossReady && inViewport(Math.floor(WORLD_COLS / 2) + 4, Math.floor(WORLD_ROWS / 2) - 4) ? (
          <Animated.View
            style={[
              styles.marker,
              {
                ...worldToScreen(Math.floor(WORLD_COLS / 2) + 4, Math.floor(WORLD_ROWS / 2) - 4),
                transform: [{ scale: bossScaleAnim }, { translateX: shakeInterp }],
              },
            ]}
          >
            <Image source={{ uri: BOSS_FRAMES[frame] }} style={styles.bossImg} resizeMode="contain" />
          </Animated.View>
        ) : null}

        {/* Hero, moved by the D-pad */}
        <Animated.View
          style={[
            styles.heroWrap,
            { left: heroPos.x, top: heroPos.y },
            armor.glowColor !== 'transparent' && { shadowColor: armor.glowColor },
            { transform: [{ translateX: lungeX }, { scaleX: facingLeft ? -1 : 1 }] },
          ]}
        >
          {armor.glowColor !== 'transparent' ? (
            <View style={[styles.armorGlow, { backgroundColor: armor.glowColor }]} />
          ) : null}
          <Image source={{ uri: GROUND_SHADOW }} style={styles.heroShadow} />
          <Image source={{ uri: HERO_FRAMES[frame] }} style={styles.heroImage} resizeMode="contain" />
          {weapon.image ? (
            <Image source={{ uri: weapon.image }} style={styles.weaponImage} resizeMode="contain" />
          ) : null}
        </Animated.View>
      </View>

      {/* D-pad */}
      <View style={styles.dpad}>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity style={styles.dpadBtn} onPress={() => move(0, -1)}>
            <Text style={styles.dpadText}>▲</Text>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <TouchableOpacity style={styles.dpadBtn} onPress={() => move(-1, 0)}>
            <Text style={styles.dpadText}>◀</Text>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity style={styles.dpadBtn} onPress={() => move(1, 0)}>
            <Text style={styles.dpadText}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity style={styles.dpadBtn} onPress={() => move(0, 1)}>
            <Text style={styles.dpadText}>▼</Text>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
      </View>

      {bossReady ? (
        <>
          <Text style={styles.phaseLabel}>LEVEL {displayLevel} BOSS</Text>
          <View style={styles.healthTrack}>
            <Animated.View style={[styles.healthFill, { width: widthInterp, backgroundColor: healthColor }]} />
            <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashInterp }]} />
          </View>
          {defeated ? <Text style={styles.defeatedText}>DEFEATED!</Text> : null}
          <TouchableOpacity style={styles.fightBtn} onPress={() => playAttack()}>
            <Text style={styles.fightBtnText}>⚔️ Attack Boss</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            {Math.round(xpForLevel(level) - xp)} XP from real tasks until it falls.
          </Text>
        </>
      ) : (
        <Text style={styles.hint}>
          {pendingHabits.length + readyQuests.length} quest
          {pendingHabits.length + readyQuests.length === 1 ? '' : 's'} left today - complete a habit to
          weaken it.
        </Text>
      )}

      {questsOpen ? (
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>📜 Today's Quests</Text>
              <TouchableOpacity onPress={() => setQuestsOpen(false)}>
                <Text style={styles.panelClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {pendingHabits.length === 0 && readyQuests.length === 0 ? (
                <Text style={styles.panelEmpty}>All quests cleared for today.</Text>
              ) : (
                <>
                  {pendingHabits.map((h) => (
                    <View key={h.id} style={styles.panelRow}>
                      <Text style={styles.panelRowIcon}>⚔️</Text>
                      <Text style={styles.panelRowText}>{h.text}</Text>
                    </View>
                  ))}
                  {readyQuests.map((q) => (
                    <View key={q.id} style={styles.panelRow}>
                      <Text style={styles.panelRowIcon}>✨</Text>
                      <Text style={[styles.panelRowText, styles.panelRowDone]}>
                        {q.text} — ready to finish
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {missionsOpen ? (
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>🗺️ Missions</Text>
              <TouchableOpacity onPress={() => setMissionsOpen(false)}>
                <Text style={styles.panelClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={styles.panelSection}>QUESTS (today's habits)</Text>
              {pendingHabits.length + readyQuests.length === 0 ? (
                <Text style={styles.panelEmpty}>None left today.</Text>
              ) : (
                [...pendingHabits.map((h) => h.text), ...readyQuests.map((q) => q.text)].map(
                  (t, i) => (
                    <View key={i} style={styles.panelRow}>
                      <Text style={styles.panelRowIcon}>⚔️</Text>
                      <Text style={styles.panelRowText}>{t}</Text>
                    </View>
                  )
                )
              )}
              <Text style={[styles.panelSection, { marginTop: 16 }]}>
                SIDE QUESTS (your roadmap goals)
              </Text>
              {sideQuests.length === 0 ? (
                <Text style={styles.panelEmpty}>No goal cards yet.</Text>
              ) : (
                sideQuests.map((s) => (
                  <View key={s.id} style={styles.panelRow}>
                    <Text style={styles.panelRowIcon}>🛡️</Text>
                    <Text style={styles.panelRowText}>
                      {s.title} — {s.done}/{s.total} goals
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden' },
  energyRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 8 },
  energyLabel: { color: '#f0f2f5', fontSize: 11, fontWeight: '700', marginRight: 8 },
  energyTrack: {
    flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(20,20,30,0.6)',
    overflow: 'hidden', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  energyFill: { height: 10, borderRadius: 5, backgroundColor: '#5cc9e8' },
  energyNum: { color: '#f0f2f5', fontSize: 10, fontWeight: '600' },
  map: { position: 'relative', overflow: 'hidden' },
  marker: { position: 'absolute', width: 56, alignItems: 'center', marginLeft: -28 },
  markerImg: { width: 44, height: 40 },
  markerShadow: { position: 'absolute', bottom: -6, width: 40, height: 16, left: 2 },
  markerReady: {},
  readyGlow: {
    position: 'absolute', top: -6, width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(217,164,65,0.35)',
  },
  readyLabel: {
    color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center', marginTop: 2,
    textShadowColor: '#000', textShadowRadius: 3,
  },
  callout: {
    position: 'absolute', top: 44, backgroundColor: 'rgba(10,14,20,0.95)', borderRadius: 8,
    padding: 8, width: 140,
  },
  calloutText: { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  bossImg: { width: 72, height: 78 },
  heroWrap: { position: 'absolute', width: 48, marginLeft: -24, alignItems: 'center' },
  armorGlow: {
    position: 'absolute', width: 56, height: 56, borderRadius: 28, opacity: 0.35, bottom: 0,
  },
  heroImage: { width: 40, height: 54 },
  heroShadow: { position: 'absolute', bottom: -6, width: 36, height: 14, left: 6 },
  weaponImage: { position: 'absolute', right: -6, bottom: 6, width: 18, height: 18 },
  dpad: { alignItems: 'center', paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
  dpadRow: { flexDirection: 'row' },
  dpadBtn: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', margin: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  dpadSpacer: { width: 44, height: 44, margin: 2 },
  dpadText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  phaseLabel: {
    color: '#f0f2f5', fontSize: 11, fontWeight: '700', textAlign: 'center',
    marginTop: 10, marginBottom: 8, letterSpacing: 0.5,
  },
  defeatedText: {
    color: '#ff5a5a', fontSize: 18, fontWeight: '800', textAlign: 'center',
    marginBottom: 4, letterSpacing: 1,
  },
  healthTrack: {
    marginHorizontal: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(20,20,30,0.6)',
    overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  healthFill: { height: 14, borderRadius: 7 },
  flashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' },
  fightBtn: {
    backgroundColor: '#d9a441', borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    marginHorizontal: 14,
  },
  fightBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { color: '#e4e8ee', fontSize: 11, textAlign: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  headerRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  headerBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
  },
  headerBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  panel: {
    width: '100%', maxWidth: 400, backgroundColor: '#161d26', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 16,
  },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  panelTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  panelClose: { color: '#e4e8ee', fontSize: 18 },
  panelSection: { color: '#d9a441', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  panelEmpty: { color: '#8a95a3', fontSize: 12, paddingVertical: 8 },
  panelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  panelRowIcon: { fontSize: 14, marginRight: 8 },
  panelRowText: { color: '#e4e8ee', fontSize: 13, flex: 1 },
  panelRowDone: { color: '#4fb894' },
});
