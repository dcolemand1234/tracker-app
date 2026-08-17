import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, PanResponder, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { xpForLevel } from './leveling';
import { habitDoneOn, todayDateKey } from './habitUtils';
import { generateTerrainGrid, isWalkable, carveChain, TERRAIN } from './terrainGenerator';
import { minionFightCost, WEAPON_TIERS, ARMOR_TIERS } from './heroUtils';
import { TERRAIN_TEXTURE_RAW } from './terrainTiles';
import { DECO_SPRITE_RAW } from './decorationTiles';
import { base64ToUint8Array } from './base64Decode';

// ============================================================================
// Built on the proven pipeline from ThreeMapPOC.js (confirmed rendering on
// device) - same canvas-shim + WebGLRenderer setup, no expo-three.
//
// Textures now: reuses the same original tile art already generated for
// the 2D map (terrainTiles.js), loaded once via THREE.TextureLoader and
// cached, rather than reloading per rebuild. This was the one thing left
// deliberately untested in the original POC - if loading a texture from
// a base64 data URI behaves unexpectedly in this specific pipeline, each
// terrain type falls back to its solid color individually rather than
// the whole scene breaking.
// ============================================================================

const WORLD_COLS = 60;
const WORLD_ROWS = 60;
const VIEWPORT_COLS = 13;
const VIEWPORT_ROWS = 14;
const WORLD_SEED = 'quest-world-v1';
const AUTO_CLEAR_MS = 6000;

const SPAWN_COL = Math.floor(WORLD_COLS / 2);
const SPAWN_ROW = Math.floor(WORLD_ROWS / 2);
const BOSS_COL = SPAWN_COL + 4;
const BOSS_ROW = SPAWN_ROW - 4;

// Fixed points of interest, each connected to spawn by a carved dirt
// trail (see carvePaths in terrainGenerator.js) - this is what gives the
// map actual structure to explore instead of reading as pure noise. The
// boss is one of these, plus two more so there's a reason to wander in
// more than one direction.
const LANDMARKS = [
  { key: 'boss', col: BOSS_COL, row: BOSS_ROW, color: 0x8a2020, label: 'Boss' },
  { key: 'lookout', col: SPAWN_COL - 6, row: SPAWN_ROW + 5, color: 0x2a6ea8, label: 'Lookout' },
  { key: 'grove', col: SPAWN_COL + 7, row: SPAWN_ROW + 6, color: 0x3c8a3c, label: 'Grove' },
];

const TERRAIN_COLOR_3D = {
  deep_water: 0x14286e,
  water: 0x1e3cb4,
  shore: 0xdccb8a,
  sand: 0xd2c882,
  grass: 0x4a9a4a,
  forest: 0x3c8a3c,
  mountain: 0x646464,
  snow: 0xdcdcdc,
  path: 0xc2a25a,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hashTile(id, openTiles) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const spot = openTiles[h % openTiles.length];
  return { col: spot.col, row: spot.row };
}

// A small low-poly "creature" - an icosahedron body (reads as a gem/imp
// shape, nothing like a plain box or cone) with two eyes so it has a
// face, plus optional spikes for the boss. Used for every quest/boss
// marker instead of a bare primitive.
function makeCreatureMesh(THREE, { color, emissive, radius, spiky }) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 0),
    new THREE.MeshStandardMaterial({ color, emissive: emissive ?? 0x000000, flatShading: true })
  );
  group.add(body);

  const eyeGeo = new THREE.SphereGeometry(radius * 0.14, 6, 6);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilGeo = new THREE.SphereGeometry(radius * 0.07, 6, 6);
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x161616 });
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * radius * 0.32, radius * 0.12, radius * 0.72);
    group.add(eye);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * radius * 0.32, radius * 0.12, radius * 0.72 + radius * 0.1);
    group.add(pupil);
  });

  if (spiky) {
    const spikeMat = new THREE.MeshStandardMaterial({ color, flatShading: true });
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.13, radius * 0.45, 4), spikeMat);
      const angle = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * radius * 0.55, radius * 0.55, Math.sin(angle) * radius * 0.55);
      spike.rotation.x = 0.4;
      spike.rotation.y = -angle;
      group.add(spike);
    }
  }

  return group;
}

// A real drag-based virtual joystick, replacing the button D-pad. Touch
// down anywhere in its base, drag to pick a direction, hold to keep
// moving that way - the nub is clamped to the base's radius so it can't
// be dragged outside, and movement repeats on an interval for as long
// as the drag stays past a small deadzone in a given direction. Built
// on PanResponder (core React Native, no new dependency) rather than a
// gesture library.
const JOYSTICK_RADIUS = 55;
const JOYSTICK_DEADZONE = 12;
const REPEAT_MS = 220;

function Joystick({ onMove }) {
  const nubAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // Invisible until touched: starts fully transparent, fades to a faint
  // outline only while actively being dragged, then fades back out on
  // release - the drag zone itself is always there and always usable,
  // it just doesn't show as a visible on-screen control at rest.
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const activeDirRef = useRef(null); // 'up' | 'down' | 'left' | 'right' | null
  const repeatTimerRef = useRef(null);

  function directionFor(dx, dy) {
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < JOYSTICK_DEADZONE) return null;
    const angle = Math.atan2(dy, dx); // -PI..PI, 0 = right, +down
    const deg = (angle * 180) / Math.PI;
    if (deg >= -45 && deg < 45) return 'right';
    if (deg >= 45 && deg < 135) return 'down';
    if (deg >= -135 && deg < -45) return 'up';
    return 'left';
  }

  function fireForDirection(dir) {
    if (dir === 'up') onMove(0, -1);
    else if (dir === 'down') onMove(0, 1);
    else if (dir === 'left') onMove(-1, 0);
    else if (dir === 'right') onMove(1, 0);
  }

  function startRepeating(dir) {
    if (activeDirRef.current === dir) return; // already repeating this direction
    stopRepeating();
    activeDirRef.current = dir;
    fireForDirection(dir); // immediate first step, not just after the first interval
    repeatTimerRef.current = setInterval(() => fireForDirection(dir), REPEAT_MS);
  }

  function stopRepeating() {
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
    activeDirRef.current = null;
  }

  useEffect(() => stopRepeating, []); // cleanup on unmount

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        nubAnim.setValue({ x: 0, y: 0 });
        Animated.timing(opacityAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
      },
      onPanResponderMove: (evt, gesture) => {
        const rawX = gesture.dx;
        const rawY = gesture.dy;
        const dist = Math.min(JOYSTICK_RADIUS, Math.sqrt(rawX * rawX + rawY * rawY));
        const angle = Math.atan2(rawY, rawX);
        const clampedX = Math.cos(angle) * dist;
        const clampedY = Math.sin(angle) * dist;
        nubAnim.setValue({ x: clampedX, y: clampedY });

        const dir = directionFor(rawX, rawY);
        if (dir) startRepeating(dir);
        else stopRepeating();
      },
      onPanResponderRelease: () => {
        stopRepeating();
        Animated.spring(nubAnim, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 5 }).start();
        Animated.timing(opacityAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        stopRepeating();
        Animated.spring(nubAnim, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 5 }).start();
        Animated.timing(opacityAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <View style={styles.joystickWrap}>
      <Animated.View style={[styles.joystickBase, { opacity: opacityAnim }]} {...panResponder.panHandlers}>
        <Animated.View
          style={[styles.joystickNub, { transform: nubAnim.getTranslateTransform() }]}
        />
      </Animated.View>
      {/* Invisible but still touchable full-size hit zone - panHandlers
          live on the (normally opacity:0) base above, so this just
          gives it a decently sized, always-present touch target without
          requiring the visual ring to be shown. */}
    </View>
  );
}

export default function RoadmapWorld3D({
  level,
  xp,
  hero,
  habits,
  cards,
  onFightMinion,
  onBossDefeated,
  onExit,
}) {
  const insets = useSafeAreaInsets();
  const cost = minionFightCost(hero.weaponTier);
  const needed = xpForLevel(level);

  const terrainGrid = useMemo(() => {
    const base = generateTerrainGrid({ seed: WORLD_SEED, cols: WORLD_COLS, rows: WORLD_ROWS, scale: 10 });
    // ONE continuous trail through spawn -> every landmark in order,
    // rather than separate spokes each starting back at spawn - reads as
    // "follow this one road" instead of "a web of unrelated routes",
    // which is what made the map feel directionless/open-world before.
    return carveChain(base, [
      { col: SPAWN_COL, row: SPAWN_ROW },
      ...LANDMARKS.map((l) => ({ col: l.col, row: l.row })),
    ]);
  }, []);
  const openTiles = useMemo(() => {
    const spots = [];
    terrainGrid.forEach((row, r) => {
      row.forEach((terrain, c) => {
        if (isWalkable(terrain)) spots.push({ row: r, col: c });
      });
    });
    return spots;
  }, [terrainGrid]);

  const [heroTile, setHeroTile] = useState({
    col: Math.floor(WORLD_COLS / 2),
    row: Math.floor(WORLD_ROWS / 2),
  });
  const [facingLeft, setFacingLeft] = useState(false);

  function move(dCol, dRow) {
    if (dCol < 0) setFacingLeft(true);
    if (dCol > 0) setFacingLeft(false);
    setHeroTile((p) => {
      const nextCol = clamp(p.col + dCol, 0, WORLD_COLS - 1);
      const nextRow = clamp(p.row + dRow, 0, WORLD_ROWS - 1);
      const targetTerrain = terrainGrid[nextRow][nextCol];
      if (!isWalkable(targetTerrain)) return p;
      return { col: nextCol, row: nextRow };
    });
  }

  // Camera dead-zone: the viewport only re-centers once the hero gets
  // close to its edge, instead of every single tile step. Before this,
  // buildWorld() (which rebuilds ~180 tile meshes from scratch) ran on
  // literally every move because the viewport recentered on the hero
  // every step - that rebuild churn was the main cause of movement
  // feeling rough/stuttery, more than anything about the joystick itself.
  const CAMERA_MARGIN = 3;
  const [viewportOrigin, setViewportOrigin] = useState(() => ({
    col: clamp(
      Math.floor(WORLD_COLS / 2) - Math.floor(VIEWPORT_COLS / 2),
      0,
      Math.max(0, WORLD_COLS - VIEWPORT_COLS)
    ),
    row: clamp(
      Math.floor(WORLD_ROWS / 2) - Math.floor(VIEWPORT_ROWS / 2),
      0,
      Math.max(0, WORLD_ROWS - VIEWPORT_ROWS)
    ),
  }));

  useEffect(() => {
    setViewportOrigin((prev) => {
      let { col, row } = prev;
      if (heroTile.col - col < CAMERA_MARGIN) col = heroTile.col - CAMERA_MARGIN;
      else if (heroTile.col - col > VIEWPORT_COLS - 1 - CAMERA_MARGIN)
        col = heroTile.col - (VIEWPORT_COLS - 1 - CAMERA_MARGIN);
      if (heroTile.row - row < CAMERA_MARGIN) row = heroTile.row - CAMERA_MARGIN;
      else if (heroTile.row - row > VIEWPORT_ROWS - 1 - CAMERA_MARGIN)
        row = heroTile.row - (VIEWPORT_ROWS - 1 - CAMERA_MARGIN);
      col = clamp(col, 0, Math.max(0, WORLD_COLS - VIEWPORT_COLS));
      row = clamp(row, 0, Math.max(0, WORLD_ROWS - VIEWPORT_ROWS));
      if (col === prev.col && row === prev.row) return prev; // bail out, no re-render/rebuild
      return { col, row };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroTile]);

  const cameraCol = viewportOrigin.col;
  const cameraRow = viewportOrigin.row;

  // --- today's habits -> quests, same logic as the 2D version ---
  const todayKey = todayDateKey();
  const pendingHabits = (habits || []).filter((h) => !habitDoneOn(h, todayKey));
  const prevDoneRef = useRef(new Set());
  const [readyQuests, setReadyQuests] = useState([]);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);

  useEffect(() => {
    const nowDone = new Set((habits || []).filter((h) => habitDoneOn(h, todayKey)).map((h) => h.id));
    const newlyDone = (habits || []).filter((h) => nowDone.has(h.id) && !prevDoneRef.current.has(h.id));
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

  // Boss-defeated trigger, ported over from the older HeroArena/
  // RoadmapWorldMap screens - this 3D view never actually called
  // onBossDefeated anywhere, so leveling up while fighting the boss did
  // nothing here even though the mechanic (level increases -> boss
  // falls) was already fully working in those older screens.
  const prevLevelRef = useRef(level);
  useEffect(() => {
    if (level > prevLevelRef.current) {
      onBossDefeated();
    }
    prevLevelRef.current = level;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const bossReady = pendingHabits.length === 0 && readyQuests.length === 0;

  // Direction indicator target: the boss once ready, otherwise the
  // nearest ready-to-finish quest, otherwise the nearest still-pending
  // one - always pointing at whatever's actually next to do, not just a
  // fixed landmark.
  const compassTarget = useMemo(() => {
    function nearest(tiles) {
      let best = null;
      let bestDist = Infinity;
      tiles.forEach((t) => {
        const d = Math.abs(t.col - heroTile.col) + Math.abs(t.row - heroTile.row);
        if (d < bestDist) {
          bestDist = d;
          best = t;
        }
      });
      return best;
    }
    if (bossReady) return { col: BOSS_COL, row: BOSS_ROW, label: 'Boss' };
    if (readyQuests.length) return { ...nearest(readyQuests.map((q) => q.tile)), label: 'Quest ready' };
    if (pendingHabits.length) {
      const tile = nearest(pendingHabits.map((h) => hashTile(h.id, openTiles)));
      return { ...tile, label: 'Quest' };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossReady, readyQuests, pendingHabits, heroTile, openTiles]);

  const compassInfo = useMemo(() => {
    if (!compassTarget) return null;
    const dx = compassTarget.col - heroTile.col;
    const dz = compassTarget.row - heroTile.row;
    const dist = Math.round(Math.sqrt(dx * dx + dz * dz));
    if (dist === 0) return null; // standing right on it, nothing to point at
    // 0deg = up/north (row decreasing), clockwise from there.
    const angleDeg = (Math.atan2(dx, -dz) * 180) / Math.PI;
    return { angleDeg, dist, label: compassTarget.label };
  }, [compassTarget, heroTile]);

  // What walking up to something actually DOES: before this, every
  // marker in the 3D world was pure decoration - tapping/approaching a
  // quest or the boss did nothing, the only working interaction lived in
  // the Quests panel. This surfaces a real action button once the hero
  // is within 1 tile of a ready quest or the boss, wired to the exact
  // same handlers the panel uses.
  const nearbyAction = useMemo(() => {
    const within1 = (t) => t && Math.abs(t.col - heroTile.col) <= 1 && Math.abs(t.row - heroTile.row) <= 1;
    const readyHere = readyQuests.find((q) => within1(q.tile));
    if (readyHere) return { type: 'quest', quest: readyHere, label: `✨ Finish "${readyHere.text}"` };
    if (bossReady && within1({ col: BOSS_COL, row: BOSS_ROW })) {
      return { type: 'boss', label: '⚔️ Attack the boss' };
    }
    return null;
  }, [readyQuests, bossReady, heroTile]);

  function finishQuest(quest) {
    if (hero.energy < cost) return;
    setReadyQuests((prev) => prev.filter((q) => q.id !== quest.id));
    onFightMinion();
  }

  function handleNearbyAction() {
    if (!nearbyAction) return;
    if (nearbyAction.type === 'quest') {
      finishQuest(nearbyAction.quest);
    } else if (nearbyAction.type === 'boss') {
      if (hero.energy < cost) return;
      onFightMinion();
    }
  }

  // --- Three.js scene, built once, updated imperatively on movement ---
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const glRef = useRef(null);
  const heroMeshRef = useRef(null);
  const worldGroupRef = useRef(null);
  const rafRef = useRef(null);
  // Animation state, all refs (not React state) since these get mutated
  // every single frame inside the persistent render() loop closure -
  // using state here would mean 60 re-renders/sec. heroTargetRef is
  // where the hero SHOULD be (grid-snapped, set whenever heroTile
  // changes); heroRenderPosRef is where it's actually drawn, eased
  // toward the target a little each frame - that's what turns the old
  // instant tile-to-tile teleport into a smooth glide.
  const heroTargetRef = useRef({ x: 0, z: 0 });
  const heroRenderPosRef = useRef({ x: 0, z: 0 });
  const facingLeftRef = useRef(false);
  const heroLimbsRef = useRef({ leftLeg: null, rightLeg: null, leftArm: null, rightArm: null });
  const startTimeRef = useRef(Date.now());
  // Tree/bush/mountain-peak sprites (for a gentle idle sway) and
  // water/deep_water tile materials (for a scrolling-current effect),
  // collected fresh each buildWorld() call so the render loop always
  // animates whatever's currently in the scene, not stale disposed
  // objects from a previous rebuild.
  const swaySpritesRef = useRef([]);
  // Loaded once, keyed by terrain type (8 total) - reused across every
  // tile instance and every rebuild rather than reloading per tile.
  const textureCacheRef = useRef({});
  // Same idea as textureCacheRef but for the tree/bush/boulder/mountain
  // billboard sprites (decorationTiles.js) - loaded once, reused every
  // rebuild, keyed by DECO_SPRITE name rather than terrain type.
  const decoTextureCacheRef = useRef({});
  const [texturesLoaded, setTexturesLoaded] = useState(false);

  function loadTerrainTextures() {
    // Builds each texture directly from raw RGBA pixel bytes via
    // THREE.DataTexture instead of THREE.TextureLoader. TextureLoader
    // internally needs a browser Image element (`document`), which this
    // bare expo-gl/Hermes environment doesn't have (confirmed via an
    // on-screen debug banner during development, since removed - this
    // was the fix for that). DataTexture takes a raw byte buffer
    // directly, so there's no image decoding step and nothing
    // environment-dependent to fail. Synchronous, no loading state needed.
    const errors = [];

    const buildTexture = (raw) => {
      const bytes = base64ToUint8Array(raw.base64);
      const texture = new THREE.DataTexture(bytes, raw.width, raw.height, THREE.RGBAFormat);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      // Raw pixel rows here are top-row-first (how PIL/most image libs
      // export them), but THREE's UV convention expects bottom-row-first
      // unless flipY is set - without this every tile would render
      // upside down.
      texture.flipY = true;
      texture.needsUpdate = true;
      return texture;
    };

    Object.keys(TERRAIN_TEXTURE_RAW).forEach((type) => {
      try {
        const texture = buildTexture(TERRAIN_TEXTURE_RAW[type]);
        if (type === 'water' || type === 'deep_water') {
          // Repeat wrapping so scrolling the UV offset each frame (in the
          // render loop) reveals a continuously flowing pattern instead
          // of just stretching/clamping the edge pixels.
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
        }
        textureCacheRef.current[type] = texture;
      } catch (e) {
        errors.push(`${type}: ${e && e.message ? e.message : String(e)}`);
      }
    });
    // 'path' (the carved dirt trail terrain) has no dedicated crop in the
    // tileset - it reuses the same 'shore' texture, which was already
    // unused elsewhere in the 3D view (shore-blending only ran for the 2D
    // map), so this doesn't cost an extra texture upload.
    if (textureCacheRef.current.shore) {
      textureCacheRef.current.path = textureCacheRef.current.shore;
    }

    Object.keys(DECO_SPRITE_RAW).forEach((type) => {
      try {
        decoTextureCacheRef.current[type] = buildTexture(DECO_SPRITE_RAW[type]);
      } catch (e) {
        errors.push(`deco:${type}: ${e && e.message ? e.message : String(e)}`);
      }
    });

    setTexturesLoaded(true);
    if (errors.length > 0) {
      // Kept as a console warning (visible via a connected Metro/debugger)
      // rather than an on-screen banner now that texture loading is
      // confirmed working - a silent fallback to solid colors is fine
      // for anything that still somehow fails.
      console.warn('[RoadmapWorld3D] texture load errors:', errors);
    }
  }

  function disposeGroup(scene, group) {
    if (!group) return;
    scene.remove(group);
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }

  function buildWorld() {
    const scene = sceneRef.current;
    if (!scene) return;
    disposeGroup(scene, worldGroupRef.current);
    swaySpritesRef.current = [];

    const group = new THREE.Group();
    const planeGeo = new THREE.PlaneGeometry(1, 1);

    for (let r = cameraRow; r < cameraRow + VIEWPORT_ROWS; r++) {
      for (let c = cameraCol; c < cameraCol + VIEWPORT_COLS; c++) {
        if (r < 0 || r >= WORLD_ROWS || c < 0 || c >= WORLD_COLS) continue;
        const terrain = terrainGrid[r][c];
        const x = c - cameraCol;
        const z = r - cameraRow;

        const cachedTexture = textureCacheRef.current[terrain];
        const tileMat = cachedTexture
          ? new THREE.MeshStandardMaterial({ map: cachedTexture })
          : new THREE.MeshStandardMaterial({ color: TERRAIN_COLOR_3D[terrain] ?? 0x4a9a4a });
        const tile = new THREE.Mesh(planeGeo, tileMat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x, 0, z);
        group.add(tile);

        if (terrain === TERRAIN.FOREST) {
          const treeTexture = decoTextureCacheRef.current.tree;
          if (treeTexture) {
            // Camera-facing billboard using the actual tileset tree art,
            // instead of a trunk cylinder + cone standing in for one.
            const sprite = new THREE.Sprite(
              new THREE.SpriteMaterial({ map: treeTexture, transparent: true })
            );
            sprite.scale.set(0.9, 0.9, 1);
            sprite.position.set(x, 0.45, z);
            group.add(sprite);
            // Random phase so trees don't all sway in lockstep.
            swaySpritesRef.current.push({ sprite, phase: Math.random() * Math.PI * 2 });
          } else {
            const trunk = new THREE.Mesh(
              new THREE.CylinderGeometry(0.06, 0.08, 0.25, 6),
              new THREE.MeshStandardMaterial({ color: 0x5a3c20 })
            );
            trunk.position.set(x, 0.12, z);
            group.add(trunk);
            const top = new THREE.Mesh(
              new THREE.ConeGeometry(0.28, 0.5, 7),
              new THREE.MeshStandardMaterial({ color: 0x2c6e2c })
            );
            top.position.set(x, 0.5, z);
            group.add(top);
          }
        } else if (terrain === TERRAIN.MOUNTAIN) {
          const peakTexture = decoTextureCacheRef.current.mountainPeak;
          if (peakTexture) {
            const sprite = new THREE.Sprite(
              new THREE.SpriteMaterial({ map: peakTexture, transparent: true })
            );
            sprite.scale.set(1.15, 1.15, 1);
            sprite.position.set(x, 0.5, z);
            group.add(sprite);
          } else {
            const peak = new THREE.Mesh(
              new THREE.ConeGeometry(0.42, 0.7, 4),
              new THREE.MeshStandardMaterial({ color: 0x808080 })
            );
            peak.position.set(x, 0.35, z);
            peak.rotation.y = Math.PI / 4;
            group.add(peak);
          }
        }
      }
    }

    // Quest markers - small purple creatures, one per pending habit
    pendingHabits.forEach((h, i) => {
      const tile = hashTile(h.id, openTiles);
      if (
        tile.col < cameraCol ||
        tile.col >= cameraCol + VIEWPORT_COLS ||
        tile.row < cameraRow ||
        tile.row >= cameraRow + VIEWPORT_ROWS
      )
        return;
      const marker = makeCreatureMesh(THREE, { color: 0x6a4a9a, radius: 0.24 });
      marker.position.set(tile.col - cameraCol, 0.26, tile.row - cameraRow);
      group.add(marker);
    });

    // Ready-to-finish quests - glowing gold creatures
    readyQuests.forEach((q) => {
      if (
        q.tile.col < cameraCol ||
        q.tile.col >= cameraCol + VIEWPORT_COLS ||
        q.tile.row < cameraRow ||
        q.tile.row >= cameraRow + VIEWPORT_ROWS
      )
        return;
      const marker = makeCreatureMesh(THREE, { color: 0xd9a441, emissive: 0x553300, radius: 0.27 });
      marker.position.set(q.tile.col - cameraCol, 0.28, q.tile.row - cameraRow);
      group.add(marker);
    });

    // Boss - larger spiky red creature, fixed world spot near the hero's starting area
    if (bossReady) {
      if (
        BOSS_COL >= cameraCol &&
        BOSS_COL < cameraCol + VIEWPORT_COLS &&
        BOSS_ROW >= cameraRow &&
        BOSS_ROW < cameraRow + VIEWPORT_ROWS
      ) {
        const boss = makeCreatureMesh(THREE, { color: 0x8a2020, emissive: 0x2a0a0a, radius: 0.42, spiky: true });
        boss.position.set(BOSS_COL - cameraCol, 0.46, BOSS_ROW - cameraRow);
        group.add(boss);
      }
    }

    // The other landmarks (lookout/grove) - simple colored beacons so
    // there's something visible worth walking the trail toward, besides
    // the boss. Skipped once bossReady is true and the boss box above is
    // already occupying that spot.
    LANDMARKS.forEach((l) => {
      if (l.key === 'boss') return;
      if (
        l.col < cameraCol ||
        l.col >= cameraCol + VIEWPORT_COLS ||
        l.row < cameraRow ||
        l.row >= cameraRow + VIEWPORT_ROWS
      )
        return;
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.09, 0.55, 6),
        new THREE.MeshStandardMaterial({ color: l.color })
      );
      beacon.position.set(l.col - cameraCol, 0.28, l.row - cameraRow);
      group.add(beacon);
      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.22, 4),
        new THREE.MeshStandardMaterial({ color: l.color })
      );
      flag.position.set(l.col - cameraCol, 0.65, l.row - cameraRow);
      group.add(flag);
    });

    scene.add(group);
    worldGroupRef.current = group;
  }

  function updateHeroAndCamera() {
    // Only updates the LOGICAL target - actual mesh/camera positions are
    // eased toward this every frame inside the render() loop below, which
    // is what makes movement glide between tiles instead of teleporting.
    const hx = heroTile.col - cameraCol;
    const hz = heroTile.row - cameraRow;
    heroTargetRef.current = { x: hx, z: hz };
    facingLeftRef.current = facingLeft;
  }

  async function onContextCreate(gl) {
    glRef.current = gl;
    const canvasShim = {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      clientHeight: gl.drawingBufferHeight,
    };
    const renderer = new THREE.WebGLRenderer({ canvas: canvasShim, context: gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
    renderer.setPixelRatio(1);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#87ceeb');
    sceneRef.current = scene;

    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const viewSize = 7;
    const camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      100
    );
    cameraRef.current = camera;

    // Flat lighting, no shadows - ambient + one directional light purely
    // for a bit of shading definition on the pixel-art faces, with no
    // shadow map/shadow camera setup at all.
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    const viewportCenterX = VIEWPORT_COLS / 2;
    const viewportCenterZ = VIEWPORT_ROWS / 2;
    sun.position.set(viewportCenterX + 3, 6, viewportCenterZ + 2);
    scene.add(sun);

    // Hero - a small articulated voxel-person (torso, head, two arms, two
    // legs) instead of a single box+sphere blob, so it actually reads as
    // a character. Legs/arms are kept in a ref so the render loop below
    // can swing them while walking instead of leaving them static.
    const heroGroup = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b088 });
    const outfit = new THREE.MeshStandardMaterial({ color: 0x3355aa });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.14), outfit);
    torso.position.y = 0.32;
    heroGroup.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), skin);
    head.position.y = 0.53;
    heroGroup.add(head);

    const legGeo = new THREE.BoxGeometry(0.07, 0.2, 0.08);
    legGeo.translate(0, -0.1, 0); // pivot at the hip (top), not box center, so rotation swings it naturally
    const leftLeg = new THREE.Mesh(legGeo.clone(), outfit);
    leftLeg.position.set(-0.06, 0.2, 0);
    heroGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo.clone(), outfit);
    rightLeg.position.set(0.06, 0.2, 0);
    heroGroup.add(rightLeg);

    const armGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06);
    armGeo.translate(0, -0.1, 0); // pivot at the shoulder
    const leftArm = new THREE.Mesh(armGeo.clone(), skin);
    leftArm.position.set(-0.15, 0.42, 0);
    heroGroup.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo.clone(), skin);
    rightArm.position.set(0.15, 0.42, 0);
    heroGroup.add(rightArm);

    heroLimbsRef.current = { leftLeg, rightLeg, leftArm, rightArm };
    scene.add(heroGroup);
    heroMeshRef.current = heroGroup;

    // Seed the render position at the real spawn spot, not (0,0) - without
    // this the hero would visibly glide in from the world origin on the
    // very first frame instead of just appearing where it should.
    const initialX = heroTile.col - cameraCol;
    const initialZ = heroTile.row - cameraRow;
    heroTargetRef.current = { x: initialX, z: initialZ };
    heroRenderPosRef.current = { x: initialX, z: initialZ };
    facingLeftRef.current = facingLeft;

    loadTerrainTextures();
    buildWorld();
    updateHeroAndCamera();

    function render() {
      rafRef.current = requestAnimationFrame(render);

      // Ease the hero's rendered position toward its logical tile target
      // a little each frame - this is the actual movement-feel fix, the
      // rest (dead-zone camera, fewer rebuilds) just removes the stutter
      // that was fighting against it.
      const target = heroTargetRef.current;
      const pos = heroRenderPosRef.current;
      const LERP = 0.28;
      pos.x += (target.x - pos.x) * LERP;
      pos.z += (target.z - pos.z) * LERP;
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      if (Math.abs(dx) < 0.002) pos.x = target.x;
      if (Math.abs(dz) < 0.002) pos.z = target.z;
      const moving = Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const bobY = moving ? Math.sin(elapsed * 10) * 0.035 : Math.sin(elapsed * 2) * 0.012;

      const heroMesh = heroMeshRef.current;
      if (heroMesh) {
        heroMesh.position.set(pos.x, 0.35 + bobY, pos.z);
        heroMesh.rotation.y = facingLeftRef.current ? Math.PI : 0;
      }
      // Simple opposite-phase leg/arm swing while walking, still while
      // idle - the missing piece that made the character read as a
      // static block even after it got arms/legs instead of just a box.
      const limbs = heroLimbsRef.current;
      if (limbs.leftLeg && limbs.rightLeg) {
        const swing = moving ? Math.sin(elapsed * 10) * 0.5 : 0;
        limbs.leftLeg.rotation.x = swing;
        limbs.rightLeg.rotation.x = -swing;
        if (limbs.leftArm && limbs.rightArm) {
          limbs.leftArm.rotation.x = -swing * 0.7;
          limbs.rightArm.rotation.x = swing * 0.7;
        }
      }
      if (camera) {
        camera.position.set(pos.x + 4, 5, pos.z + 4);
        camera.lookAt(pos.x, 0, pos.z);
      }

      // Gentle idle sway on tree/mountain billboards - cheap (just a
      // per-sprite material.rotation, no geometry changes) but it's what
      // keeps the world from reading as a frozen still image.
      swaySpritesRef.current.forEach(({ sprite, phase }) => {
        sprite.material.rotation = Math.sin(elapsed * 1.6 + phase) * 0.06;
      });

      // Scrolling water - both water textures are shared across every
      // tile of that type, so animating the one cached texture's offset
      // animates every water tile on screen at once.
      const waterTex = textureCacheRef.current.water;
      if (waterTex) {
        waterTex.offset.x = (elapsed * 0.04) % 1;
        waterTex.needsUpdate = true;
      }
      const deepTex = textureCacheRef.current.deep_water;
      if (deepTex) {
        deepTex.offset.x = (elapsed * 0.03) % 1;
        deepTex.offset.y = (elapsed * 0.015) % 1;
        deepTex.needsUpdate = true;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    }
    render();
  }

  // buildWorld() rebuilds ~180 tile meshes + decorations - only worth
  // doing when the visible viewport actually changed (camera dead-zone
  // shift) or the quest/texture state changed, NOT on every single hero
  // step. Movement itself is handled by updateHeroAndCamera below, which
  // just updates a target ref the render loop eases toward every frame.
  useEffect(() => {
    buildWorld();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraCol, cameraRow, readyQuests, pendingHabits.length, texturesLoaded]);

  useEffect(() => {
    updateHeroAndCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroTile, facingLeft, cameraCol, cameraRow]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <View style={styles.wrap}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />

      <View style={[styles.topOverlay, { paddingTop: insets.top }]} pointerEvents="box-none">
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
      </View>

      {compassInfo ? (
        <View style={styles.compassWrap} pointerEvents="none">
          <View style={styles.compassRing}>
            <View
              style={[
                styles.compassNeedle,
                { transform: [{ rotate: `${compassInfo.angleDeg}deg` }] },
              ]}
            >
              <View style={styles.compassNeedleHead} />
              <View style={styles.compassNeedleTail} />
            </View>
          </View>
          <Text style={styles.compassLabel}>
            {compassInfo.label} · {compassInfo.dist}
          </Text>
        </View>
      ) : null}

      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
        {nearbyAction ? (
          <TouchableOpacity style={styles.nearbyActionBtn} onPress={handleNearbyAction}>
            <Text style={styles.nearbyActionText}>{nearbyAction.label}</Text>
          </TouchableOpacity>
        ) : null}

        {bossReady ? (
          <View style={styles.fightBtn}>
            <Text style={styles.fightBtnText}>
              ⚔️ Boss nearby — {Math.max(0, Math.round(needed - xp))} XP from real tasks until it falls.
            </Text>
          </View>
        ) : (
          <Text style={styles.hint}>
            {pendingHabits.length + readyQuests.length} quest
            {pendingHabits.length + readyQuests.length === 1 ? '' : 's'} left today - complete a habit to
            weaken it.
          </Text>
        )}

        <Joystick onMove={move} />
      </View>

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
                    <TouchableOpacity key={q.id} style={styles.panelRow} onPress={() => finishQuest(q)}>
                      <Text style={styles.panelRowIcon}>✨</Text>
                      <Text style={[styles.panelRowText, styles.panelRowDone]}>
                        {q.text} — tap to finish ({cost}⚡)
                      </Text>
                    </TouchableOpacity>
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
                [...pendingHabits.map((h) => h.text), ...readyQuests.map((q) => q.text)].map((t, i) => (
                  <View key={i} style={styles.panelRow}>
                    <Text style={styles.panelRowIcon}>⚔️</Text>
                    <Text style={styles.panelRowText}>{t}</Text>
                  </View>
                ))
              )}
              <Text style={[styles.panelSection, { marginTop: 16 }]}>SIDE QUESTS (your roadmap goals)</Text>
              {(cards || []).length === 0 ? (
                <Text style={styles.panelEmpty}>No goal cards yet.</Text>
              ) : (
                (cards || []).map((c) => {
                  const goals = c.goals || [];
                  const done = goals.filter(
                    (g) => (g.tasks || []).length > 0 && (g.tasks || []).every((t) => t.done)
                  ).length;
                  return (
                    <View key={c.id} style={styles.panelRow}>
                      <Text style={styles.panelRowIcon}>🛡️</Text>
                      <Text style={styles.panelRowText}>
                        {c.title} — {done}/{goals.length} goals
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  glView: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  headerRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  headerBtn: { backgroundColor: 'rgba(20,24,32,0.55)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  headerBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  energyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  energyLabel: { color: '#f0f2f5', fontSize: 11, fontWeight: '700', marginRight: 8 },
  energyTrack: {
    flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(20,20,30,0.6)',
    overflow: 'hidden', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  energyFill: { height: 10, borderRadius: 5, backgroundColor: '#5cc9e8' },
  energyNum: { color: '#f0f2f5', fontSize: 10, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 },
  // Invisible controller: no background/border on the wrap itself, the
  // base circle's own opacity is animated (starts at 0, fades in only
  // while actively touched) in the Joystick component above - this wrap
  // just positions the touch zone, it draws nothing on its own.
  joystickWrap: {
    alignItems: 'center', paddingBottom: 22,
  },
  joystickBase: {
    width: JOYSTICK_RADIUS * 2, height: JOYSTICK_RADIUS * 2, borderRadius: JOYSTICK_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  joystickNub: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  hint: {
    color: '#e4e8ee', fontSize: 11, textAlign: 'center', paddingVertical: 10, paddingHorizontal: 14,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3,
  },
  compassWrap: {
    position: 'absolute',
    top: 100,
    right: 12,
    alignItems: 'center',
  },
  compassRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(20,24,32,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Needle instead of a plain symmetric triangle - a bare equilateral
  // triangle is technically directional but reads ambiguously at a
  // glance; a bright pointed head + a dim tail behind the pivot is how
  // real compass needles solve this, and it's unambiguous even at a
  // quick glance.
  compassNeedle: {
    width: 24,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassNeedleHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 17,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffd54a',
  },
  compassNeedleTail: {
    width: 4,
    height: 13,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
  },
  compassLabel: {
    marginTop: 4,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 3,
  },
  fightBtn: {
    backgroundColor: 'rgba(138,32,32,0.92)', borderRadius: 12, paddingVertical: 12, marginHorizontal: 14,
    marginBottom: 10, alignItems: 'center',
  },
  fightBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  nearbyActionBtn: {
    backgroundColor: '#d9a441', borderRadius: 14, paddingVertical: 14, marginHorizontal: 14,
    marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  nearbyActionText: { color: '#241a06', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  panel: {
    width: '100%', maxWidth: 400, backgroundColor: '#161d26', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 16,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  panelTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  panelClose: { color: '#e4e8ee', fontSize: 18 },
  panelSection: { color: '#d9a441', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  panelEmpty: { color: '#8a95a3', fontSize: 12, paddingVertical: 8 },
  panelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  panelRowIcon: { fontSize: 14, marginRight: 8 },
  panelRowText: { color: '#e4e8ee', fontSize: 13, flex: 1 },
  panelRowDone: { color: '#4fb894' },
});
