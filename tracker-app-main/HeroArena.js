import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Image, ImageBackground, Animated, Easing, TouchableOpacity, StyleSheet } from 'react-native';
import { xpForLevel } from './leveling';
import {
  WEAPON_TIERS,
  ARMOR_TIERS,
  MINIONS_PER_LEVEL_QUOTA,
  minionFightCost,
  HERO_FRAMES,
  minionFramesFor,
  BOSS_FRAMES,
  ARENA_BACKGROUND,
} from './heroUtils';

const FRAME_INTERVAL = 380; // ms between walk/animation frame swaps

export default function HeroArena({ level, xp, hero, onFightMinion, onBossDefeated }) {
  const weapon = WEAPON_TIERS[hero.weaponTier] || WEAPON_TIERS[0];
  const armor = ARMOR_TIERS[hero.armorTier] || ARMOR_TIERS[0];
  const bossUnlocked = hero.minionsDefeated >= MINIONS_PER_LEVEL_QUOTA;
  const cost = minionFightCost(hero.weaponTier);

  const needed = xpForLevel(level);
  const healthPct = Math.max(0, Math.min(100, 100 - (xp / needed) * 100));

  // --- frame-swap animation (real walk-cycle / wing-flap / breathing,
  // not just a single static image being transformed) ---
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => 1 - f), FRAME_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const minionFrames = minionFramesFor(hero.minionsDefeated);

  // --- hero patrol: actually walks back and forth, not just bobbing ---
  const patrolAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(patrolAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(patrolAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [patrolAnim]);

  // --- attack lunge + enemy reaction ---
  const lungeAnim = useRef(new Animated.Value(0)).current;
  const enemyHitAnim = useRef(new Animated.Value(0)).current;
  const [poof, setPoof] = useState(false);

  function playAttack(onDone) {
    Animated.sequence([
      Animated.timing(lungeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(enemyHitAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(lungeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      enemyHitAnim.setValue(0);
      if (onDone) onDone();
    });
  }

  function handleFightMinion() {
    if (hero.energy < cost) return;
    playAttack(() => {
      setPoof(true);
      setTimeout(() => setPoof(false), 400);
      onFightMinion();
    });
  }

  // --- boss health bar + level-up defeat ---
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

  const patrolX = patrolAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 16] });
  const lungeX = lungeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const enemyHitX = enemyHitAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const enemyHitOpacity = enemyHitAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  const shakeInterp = shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });
  const widthInterp = healthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const healthColor = healthAnim.interpolate({
    inputRange: [0, 30, 60, 100],
    outputRange: ['#c94f4f', '#d98a3f', '#d9b23f', '#4f9e5c'],
  });
  const flashInterp = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] });

  return (
    <ImageBackground
      source={{ uri: ARENA_BACKGROUND }}
      style={styles.arena}
      imageStyle={styles.arenaImage}
    >
      <View style={styles.energyRow}>
        <Text style={styles.energyLabel}>⚡ Energy</Text>
        <View style={styles.energyTrack}>
          <View style={[styles.energyFill, { width: `${hero.energy}%` }]} />
        </View>
        <Text style={styles.energyNum}>{hero.energy}/100</Text>
      </View>

      <View style={styles.battleRow}>
        <Animated.View
          style={[
            styles.heroWrap,
            armor.glowColor !== 'transparent' && { shadowColor: armor.glowColor },
            { transform: [{ translateX: Animated.add(patrolX, lungeX) }] },
          ]}
        >
          {armor.glowColor !== 'transparent' ? (
            <View style={[styles.armorGlow, { backgroundColor: armor.glowColor }]} />
          ) : null}
          <Image source={{ uri: HERO_FRAMES[frame] }} style={styles.heroImage} resizeMode="contain" />
          {weapon.image ? (
            <Image source={{ uri: weapon.image }} style={styles.weaponImage} resizeMode="contain" />
          ) : null}
        </Animated.View>

        {!bossUnlocked ? (
          <Animated.View
            style={{
              opacity: poof ? 0 : enemyHitOpacity,
              transform: [{ translateX: enemyHitX }],
            }}
          >
            <Image source={{ uri: minionFrames[frame] }} style={styles.minionImage} resizeMode="contain" />
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ translateX: enemyHitX }, { scale: bossScaleAnim }] }}>
            <Image source={{ uri: BOSS_FRAMES[frame] }} style={styles.bossImage} resizeMode="contain" />
          </Animated.View>
        )}
      </View>

      {!bossUnlocked ? (
        <>
          <Text style={styles.phaseLabel}>
            Minions cleared: {hero.minionsDefeated}/{MINIONS_PER_LEVEL_QUOTA}
          </Text>
          <TouchableOpacity
            style={[styles.fightBtn, hero.energy < cost && styles.fightBtnDisabled]}
            disabled={hero.energy < cost}
            onPress={handleFightMinion}
          >
            <Text style={styles.fightBtnText}>⚔️ Fight Minion ({cost} energy)</Text>
          </TouchableOpacity>
          {hero.energy < cost ? (
            <Text style={styles.hint}>Complete tasks and habits to earn energy.</Text>
          ) : null}
        </>
      ) : (
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
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  arena: {
    borderRadius: 16,
    padding: 18,
    overflow: 'hidden',
  },
  arenaImage: { borderRadius: 16 },
  energyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  energyLabel: { color: '#f0f2f5', fontSize: 11, fontWeight: '700', marginRight: 8, textShadowColor: '#000', textShadowRadius: 3 },
  energyTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(20,20,30,0.6)',
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  energyFill: { height: 10, borderRadius: 5, backgroundColor: '#5cc9e8' },
  energyNum: { color: '#f0f2f5', fontSize: 10, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 3 },
  battleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginBottom: 12,
    height: 90,
  },
  heroWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  armorGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.35,
    bottom: 0,
  },
  heroImage: { width: 48, height: 64 },
  weaponImage: { position: 'absolute', right: -8, bottom: 8, width: 22, height: 22 },
  minionImage: { width: 56, height: 50 },
  bossImage: { width: 80, height: 88 },
  phaseLabel: {
    color: '#f0f2f5',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  defeatedText: {
    color: '#ff5a5a',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
  healthTrack: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(20,20,30,0.6)',
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  healthFill: { height: 14, borderRadius: 7 },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
  },
  fightBtn: {
    backgroundColor: '#d9a441',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fightBtnDisabled: { backgroundColor: '#4a5568' },
  fightBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { color: '#e4e8ee', fontSize: 11, textAlign: 'center', marginTop: 8, textShadowColor: '#000', textShadowRadius: 3 },
});

