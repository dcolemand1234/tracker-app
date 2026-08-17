import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Image, ImageBackground, Animated, Easing, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { xpForLevel } from './leveling';
import { habitDoneOn, todayDateKey } from './habitUtils';
import { WEAPON_TIERS, ARMOR_TIERS, minionFightCost, MINION_TYPES, MAX_ENERGY, ABILITIES } from './heroUtils';
import { RONIN_IDLE_FRAMES, RONIN_ATTACK_FRAMES } from './roninSprites';
import { ONI_IDLE_FRAMES, ONI_ATTACK_FRAMES } from './oniSprites';
import { PROVINCE_BACKGROUND } from './provinceBackgrounds';
import { DEMON_REALM_BACKGROUND } from './demonRealmBackground';

// ============================================================================
// Emberforge - text/math-only build. Per the plan: nail the actual game
// mechanics (resources, rates, formulas, the real-habit-driven economy)
// before spending any more time on art. No Image, no ImageBackground, no
// LinearGradient, no asset imports - every value on this screen is either
// a real number from props or a real formula computed from it. Visuals
// come later, once the numbers themselves are right.
// ============================================================================

const AUTO_CLEAR_MS = 6000; // how long a "quest ready" entry lingers in the Quests list before quietly dropping off

// Provinces: each is a real multiplier on Koku-per-kill, unlocked by real
// Rank. No art, no background image - just the math.
const REALMS = [
  { id: 'meadow', name: 'Shirakawa Fields', unlockLevel: 1, tier: 1, bgKey: 'shirakawa_fields' },
  { id: 'forest', name: 'Kurogane Forge', unlockLevel: 5, tier: 2, bgKey: 'kurogane_forge' },
  { id: 'cave', name: 'Hollow Moon Shrine', unlockLevel: 10, tier: 3, bgKey: 'hollow_moon_shrine' },
  { id: 'ridge', name: 'The Crimson Rift', unlockLevel: 16, tier: 4, bgKey: 'crimson_rift' },
];

const MENU_ITEMS = [
  { key: 'energy', label: 'Ki', goesTo: 'combat' },
  { key: 'affinity', label: 'Abilities', goesTo: 'affinity' },
  { key: 'forge', label: 'Smithy', goesTo: 'forge' },
  { key: 'relics', label: 'Relics', goesTo: 'storage' },
  { key: 'journal', label: 'Journal', goesTo: 'missions' },
  { key: 'settings', label: 'Settings', goesTo: 'settings' },
];

export default function RoadmapIdleWorld({
  level,
  xp,
  hero,
  setHero,
  habits,
  cards,
  rewardPoints,
  setRewardPoints,
  onFightMinion,
  onBossDefeated,
  onExit,
  guides,
  onOpenGuide,
  onOpenStats,
  onManageCards,
}) {
  const insets = useSafeAreaInsets();
  const weapon = WEAPON_TIERS[hero.weaponTier] || WEAPON_TIERS[0];
  const armor = ARMOR_TIERS[hero.armorTier] || ARMOR_TIERS[0];
  const cost = minionFightCost(hero.weaponTier);
  const needed = xpForLevel(level);

  // Tier 0 (Fists / No Armor) is always owned for free - everything past
  // that is a one-time purchase, tracked here rather than the tier data
  // itself, so re-equipping something already bought is free from then on.
  const ownedWeaponTiers = hero.ownedWeaponTiers || [0];
  const ownedArmorTiers = hero.ownedArmorTiers || [0];

  function buyOrEquipWeapon(tierIndex) {
    const alreadyOwned = ownedWeaponTiers.includes(tierIndex);
    const tierCost = WEAPON_TIERS[tierIndex].cost;
    if (!alreadyOwned && (rewardPoints ?? 0) < tierCost) return;
    if (!alreadyOwned) {
      setRewardPoints((prev) => (prev ?? 0) - tierCost);
    }
    setHero((prev) => ({
      ...prev,
      weaponTier: tierIndex,
      ownedWeaponTiers: alreadyOwned ? ownedWeaponTiers : [...ownedWeaponTiers, tierIndex],
    }));
  }

  function buyOrEquipArmor(tierIndex) {
    const alreadyOwned = ownedArmorTiers.includes(tierIndex);
    const tierCost = ARMOR_TIERS[tierIndex].cost;
    if (!alreadyOwned && (rewardPoints ?? 0) < tierCost) return;
    if (!alreadyOwned) {
      setRewardPoints((prev) => (prev ?? 0) - tierCost);
    }
    setHero((prev) => ({
      ...prev,
      armorTier: tierIndex,
      ownedArmorTiers: alreadyOwned ? ownedArmorTiers : [...ownedArmorTiers, tierIndex],
    }));
  }
  // Boss health is now driven by weapon-scaled "damage dealt," not a
  // direct restatement of xp/needed - the actual boss-defeat event still
  // fires strictly on real level-up (below, unchanged), so this can
  // never desync from that. Calibrated so the base weapon (Fists, atk 2)
  // behaves identically to before (1 XP gained = 1 damage, bar empties
  // right around level-up) - a stronger weapon deals proportionally
  // more damage per real XP gained, so the bar empties faster as a
  // direct, felt reward for upgrading, without changing how fast you
  // actually level up.
  const BASE_ATK = WEAPON_TIERS[0].atk;
  const prevXpForDamageRef = useRef(xp);
  useEffect(() => {
    const gained = xp - prevXpForDamageRef.current;
    if (gained > 0) {
      const damage = gained * (weapon.atk / BASE_ATK);
      setHero((prev) => ({
        ...prev,
        bossDamageDealt: (prev.bossDamageDealt || 0) + damage,
      }));
    }
    prevXpForDamageRef.current = xp;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);
  const bossDamageDealt = hero.bossDamageDealt || 0;
  const healthPct = Math.max(0, Math.min(100, Math.round(100 - (bossDamageDealt / needed) * 100)));
  // True until the real level-up actually fires - lets the bar show
  // empty (a satisfying "defeated" feel) even in the brief window before
  // the real, external level-up event catches up to it.
  const awaitingFinishingBlow = healthPct <= 0 && xp < needed;

  const todayKey = todayDateKey();
  const pendingHabits = (habits || []).filter((h) => !habitDoneOn(h, todayKey));
  const bossReady = pendingHabits.length === 0;

  const [activeTab, setActiveTab] = useState('combat');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedRealmId, setSelectedRealmId] = useState(REALMS[0].id);
  const unlockedRealms = REALMS.filter((r) => level >= r.unlockLevel);
  const realm =
    unlockedRealms.find((r) => r.id === selectedRealmId) || unlockedRealms[unlockedRealms.length - 1] || REALMS[0];

  // --- real habit completion -> auto-fight queue --------------------------
  const prevDoneRef = useRef(new Set());
  const [queue, setQueue] = useState([]);
  const [readyQuests, setReadyQuests] = useState([]);

  useEffect(() => {
    const nowDone = new Set((habits || []).filter((h) => habitDoneOn(h, todayKey)).map((h) => h.id));
    const newlyDone = (habits || []).filter((h) => nowDone.has(h.id) && !prevDoneRef.current.has(h.id));
    if (newlyDone.length) {
      const entries = newlyDone.map((h) => ({ id: h.id, text: h.text }));
      setQueue((q) => [...q, ...entries]);
      setReadyQuests((prev) => [...prev, ...entries]);
      entries.forEach((e) => {
        setTimeout(() => {
          setReadyQuests((prev) => prev.filter((q) => q.id !== e.id));
        }, AUTO_CLEAR_MS);
      });
    }
    prevDoneRef.current = nowDone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits]);

  // --- boss-defeated trigger (real: fires when real level increases) ------
  const prevLevelRef = useRef(level);
  useEffect(() => {
    if (level > prevLevelRef.current) {
      onBossDefeated();
    }
    prevLevelRef.current = level;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // --- idle math: a real per-second production formula --------------------
  // emberRate is the actual idle-game mechanic requested: a number that
  // increases with real Rank and ticks up on its own every second.
  // Deliberately a SEPARATE currency from Koku (rewardPoints) - Koku only
  // ever moves through real habit completions below, so this ticking
  // number can't quietly inflate the real economy.
  const emberRate = Math.round((1 + level * 0.2) * 10) / 10; // Honor/sec
  const [embers, setEmbers] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setEmbers((e) => Math.round((e + emberRate) * 10) / 10), 1000);
    return () => clearInterval(id);
  }, [emberRate]);

  // --- Ronin sprite animation - idle loop always running, switches to a --
  // real attack-frame cycle for the same window the fight actually takes.
  const [idleFrameIdx, setIdleFrameIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdleFrameIdx((i) => (i + 1) % RONIN_IDLE_FRAMES.length), 150);
    return () => clearInterval(id);
  }, []);

  // --- auto-process the real fight queue, gated on real energy ------------
  const processingRef = useRef(false);
  const [activeFight, setActiveFight] = useState(null);
  const [sessionKills, setSessionKills] = useState(0);

  const [attackFrameIdx, setAttackFrameIdx] = useState(0);
  useEffect(() => {
    if (!activeFight) {
      setAttackFrameIdx(0);
      return;
    }
    const id = setInterval(() => setAttackFrameIdx((i) => (i + 1) % RONIN_ATTACK_FRAMES.length), 100);
    return () => clearInterval(id);
  }, [activeFight]);



  // --- Oni sprite - a single static forward-facing frame (an earlier
  // version cycled through several stances, which read as the boss
  // rocking/stepping backward once animated - a still frame reads as
  // "standing its ground" instead), plus a periodic "roar" flash through
  // clean attack frames every few seconds for some life. Not tied to a
  // real event (the boss doesn't have one the way regular fights do -
  // it's cleared by real level-up).
  const [oniAttacking, setOniAttacking] = useState(false);
  const [oniAttackIdx, setOniAttackIdx] = useState(0);
  useEffect(() => {
    const roarId = setInterval(() => setOniAttacking(true), 4000);
    return () => clearInterval(roarId);
  }, []);
  useEffect(() => {
    if (!oniAttacking) return;
    setOniAttackIdx(0);
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      if (count >= ONI_ATTACK_FRAMES.length) {
        setOniAttacking(false);
        clearInterval(id);
        return;
      }
      setOniAttackIdx(count);
    }, 120);
    return () => clearInterval(id);
  }, [oniAttacking]);

  const oniSprite = oniAttacking ? ONI_ATTACK_FRAMES[oniAttackIdx] : ONI_IDLE_FRAMES[0];

  // --- Ronin also gets a periodic attack flash during boss phase - the --
  // real per-habit attack trigger (activeFight) never fires here since
  // the queue is empty by definition once bossReady is true, so without
  // this the Ronin would just stand idle forever during the boss fight
  // with no visible action at all. Offset from the Oni's timer so they
  // don't attack in perfect lockstep.
  const [roninBossAttacking, setRoninBossAttacking] = useState(false);
  const [roninBossAttackIdx, setRoninBossAttackIdx] = useState(0);
  useEffect(() => {
    if (!bossReady) return;
    const id = setInterval(() => setRoninBossAttacking(true), 3200);
    return () => clearInterval(id);
  }, [bossReady]);
  useEffect(() => {
    if (!roninBossAttacking) return;
    setRoninBossAttackIdx(0);
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      if (count >= RONIN_ATTACK_FRAMES.length) {
        setRoninBossAttacking(false);
        clearInterval(id);
        return;
      }
      setRoninBossAttackIdx(count);
    }, 100);
    return () => clearInterval(id);
  }, [roninBossAttacking]);

  const roninSprite = activeFight
    ? RONIN_ATTACK_FRAMES[attackFrameIdx]
    : roninBossAttacking
    ? RONIN_ATTACK_FRAMES[roninBossAttackIdx]
    : RONIN_IDLE_FRAMES[idleFrameIdx];

  // --- lunge movement - both fighters actually step toward each other ---
  // during their attack window instead of attacking in place. Real
  // Animated values (not just frame swaps) so this is genuine motion.
  const roninLungeAnim = useRef(new Animated.Value(0)).current;
  const isRoninAttacking = !!activeFight || roninBossAttacking;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(roninLungeAnim, {
        toValue: isRoninAttacking ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isRoninAttacking, roninLungeAnim]);
  const roninLungeX = roninLungeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 46] });

  const oniLungeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(oniLungeAnim, {
        toValue: oniAttacking ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [oniAttacking, oniLungeAnim]);
  const oniLungeX = oniLungeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });

  useEffect(() => {
    if (processingRef.current) return;
    if (queue.length === 0) return;
    if (hero.energy < cost) return;
    processingRef.current = true;
    const next = queue[0];
    setActiveFight(next);
    setTimeout(() => {
      onFightMinion(realm.tier);
      setSessionKills((k) => k + 1);
      setQueue((q) => q.slice(1));
      setActiveFight(null);
      processingRef.current = false;
    }, 400); // short real delay so rapid multi-completions don't collapse into one tick - matches the 4-frame attack cycle above (4 x 100ms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, hero.energy, realm.tier]);

  const displayTarget = activeFight || pendingHabits[0] || null;

  // Minion enemy shown during regular (non-boss) combat - picked
  // deterministically from the target's own id so the same habit always
  // shows the same creature rather than flickering between types every
  // re-render, but still varies across different habits/kills.
  const [minionIdleIdx, setMinionIdleIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMinionIdleIdx((i) => (i + 1) % 2), 400);
    return () => clearInterval(id);
  }, []);
  function minionTypeIndexFor(target) {
    if (!target || !target.id) return 0;
    let hash = 0;
    for (let i = 0; i < target.id.length; i++) {
      hash = (hash * 31 + target.id.charCodeAt(i)) % MINION_TYPES.length;
    }
    return hash;
  }
  const minionFrames = displayTarget ? MINION_TYPES[minionTypeIndexFor(displayTarget)] : null;
  const minionSprite = minionFrames ? minionFrames[minionIdleIdx] : null;

  // Real HP for minions, scaled to the current Province's tier - tougher
  // provinces have tougher enemies. This is separate from the actual
  // fight resolution: completing the real habit still instantly clears
  // the encounter regardless of remaining HP (that part is unchanged,
  // and stays the true trigger). Manual attacks below chip away at this
  // HP for real, visible feedback and somewhere to spend Honor while
  // you wait, without letting Honor substitute for the real task.
  const minionMaxHP = 20 + realm.tier * 10;
  const [minionHP, setMinionHP] = useState(minionMaxHP);
  const minionTargetIdRef = useRef(null);
  useEffect(() => {
    const targetId = displayTarget ? displayTarget.id : null;
    if (targetId !== minionTargetIdRef.current) {
      minionTargetIdRef.current = targetId;
      setMinionHP(minionMaxHP);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTarget ? displayTarget.id : null, minionMaxHP]);
  const minionHPPct = Math.max(0, Math.min(100, Math.round((minionHP / minionMaxHP) * 100)));

  // Manual attack - usable against whichever enemy is actually in front
  // of you right now, boss or minion. Real habit completion is still
  // what actually resolves a minion fight and what drives the boss's
  // real progress (unchanged above) - this is a supplementary way to
  // spend idle-earned Honor and do something active in the meantime,
  // not a way to skip past real tasks. Same weapon-scaled damage pool
  // either way, so gear matters here too.
  const ATTACK_HONOR_COST = 15;
  const attackDamage = Math.round(weapon.atk * 3);
  const canManualAttack =
    embers >= ATTACK_HONOR_COST && (bossReady ? !awaitingFinishingBlow : !!displayTarget && minionHP > 0);
  function manualAttack() {
    if (!canManualAttack) return;
    setEmbers((e) => Math.round((e - ATTACK_HONOR_COST) * 10) / 10);
    if (bossReady) {
      setHero((prev) => ({ ...prev, bossDamageDealt: (prev.bossDamageDealt || 0) + attackDamage }));
    } else {
      setMinionHP((hp) => Math.max(0, hp - attackDamage));
    }
    setRoninBossAttacking(true);
  }

  // --- Abilities: one-time Koku unlock, then Honor-cost + cooldown use ---
  const unlockedAbilities = hero.unlockedAbilities || [];
  const [abilityCooldowns, setAbilityCooldowns] = useState({});
  // Re-render on a tick while any cooldown is active, so the countdown
  // text and re-enabled button actually update without needing a
  // separate action to trigger a render.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const anyActive = Object.values(abilityCooldowns).some((t) => t > Date.now());
    if (!anyActive) return;
    const id = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [abilityCooldowns]);

  const abilityFlashAnim = useRef(new Animated.Value(0)).current;
  function playAbilityFlash() {
    abilityFlashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(abilityFlashAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(abilityFlashAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }

  function unlockAbility(id) {
    const ability = ABILITIES.find((a) => a.id === id);
    if (!ability || unlockedAbilities.includes(id)) return;
    if ((rewardPoints ?? 0) < ability.unlockCost) return;
    setRewardPoints((prev) => (prev ?? 0) - ability.unlockCost);
    setHero((prev) => ({ ...prev, unlockedAbilities: [...(prev.unlockedAbilities || []), id] }));
  }

  function useAbility(id) {
    const ability = ABILITIES.find((a) => a.id === id);
    if (!ability) return;
    if (!unlockedAbilities.includes(id)) return;
    if (embers < ability.honorCost) return;
    const readyAt = abilityCooldowns[id] || 0;
    if (readyAt > Date.now()) return;

    setEmbers((e) => Math.round((e - ability.honorCost) * 10) / 10);
    setAbilityCooldowns((prev) => ({ ...prev, [id]: Date.now() + ability.cooldownMs }));
    playAbilityFlash();

    if (id === 'focused_strike') {
      const dmg = Math.round(weapon.atk * 8);
      if (bossReady) {
        if (!awaitingFinishingBlow) {
          setHero((prev) => ({ ...prev, bossDamageDealt: (prev.bossDamageDealt || 0) + dmg }));
        }
      } else if (displayTarget) {
        setMinionHP((hp) => Math.max(0, hp - dmg));
      }
      setRoninBossAttacking(true);
    } else if (id === 'second_wind') {
      setHero((prev) => ({ ...prev, energy: Math.min(MAX_ENERGY, (prev.energy || 0) + 30) }));
    }
  }

  // --- boss health, a real percentage from real xp/needed -----------------

  const menuItemFor = (activeTabKey) => MENU_ITEMS.find((m) => m.goesTo === activeTabKey);

  return (
    <View style={styles.wrap}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setDrawerOpen(true)}>
          <Text style={styles.iconBtnText}>MENU</Text>
        </TouchableOpacity>
        <Text style={styles.topBarText}>
          Ki {hero.energy}/100 · RANK {level}
        </Text>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit}>
          <Text style={styles.iconBtnText}>📅</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'combat' ? (
          <ScrollView contentContainerStyle={styles.panel}>
            <Text style={styles.h1}>Combat</Text>

            <ImageBackground
              source={{ uri: bossReady ? DEMON_REALM_BACKGROUND : PROVINCE_BACKGROUND[realm.bgKey] }}
              style={styles.arenaBox}
              imageStyle={styles.arenaBoxImage}
              resizeMode="cover"
            >
              <View pointerEvents="none" style={styles.combatScrim} />
              <Animated.View
                pointerEvents="none"
                style={[styles.abilityFlash, { opacity: abilityFlashAnim }]}
              />
              <View style={styles.arenaRow}>
                <Animated.View style={[styles.spriteWrap, { transform: [{ translateX: roninLungeX }] }]}>
                  <Image source={{ uri: roninSprite }} style={styles.sprite} resizeMode="contain" />
                </Animated.View>
                {bossReady ? (
                  <View style={styles.spriteWrap}>
                    <Animated.View style={{ transform: [{ translateX: oniLungeX }] }}>
                      <Image source={{ uri: oniSprite }} style={styles.oniSprite} resizeMode="contain" />
                    </Animated.View>
                    <View style={styles.oniHealthTrack}>
                      <View style={[styles.oniHealthFill, { width: `${healthPct}%` }]} />
                    </View>
                  </View>
                ) : minionSprite ? (
                  <View style={styles.spriteWrap}>
                    <Image source={{ uri: minionSprite }} style={styles.minionSprite} resizeMode="contain" />
                    <View style={styles.minionHealthTrack}>
                      <View style={[styles.minionHealthFill, { width: `${minionHPPct}%` }]} />
                    </View>
                  </View>
                ) : null}
              </View>
            </ImageBackground>

            <Row icon="🏯" label="Province" value={`${realm.name} (${realm.tier}x Koku/kill)`} />
            <Row icon="⚔️" label="Weapon / Armor" value={`${weapon.name} / ${armor.name}`} />
            <Row icon="✨" label="Honor" value={`${embers} (+${emberRate}/sec)`} valueStyle={styles.valueHonor} />
            <Row icon="💀" label="Foes Slain" value={String(sessionKills)} valueStyle={styles.valueDanger} />

            <View style={styles.divider} />

            {!bossReady ? (
              <>
                <Text style={styles.h2}>
                  {activeFight ? `Clearing: ${activeFight.text}` : displayTarget ? `Next: ${displayTarget.text}` : 'All entropy cleared'}
                </Text>
                <Row icon="📜" label="Quests remaining today" value={String(pendingHabits.length)} />
                {queue.length > 0 && hero.energy < cost ? (
                  <Text style={styles.hint}>Waiting on Ki - complete a task to earn more.</Text>
                ) : (
                  <Text style={styles.hint}>Complete a habit in real life - it auto-resolves here.</Text>
                )}
                {displayTarget ? (
                  <>
                    <TouchableOpacity
                      style={[styles.attackBtn, !canManualAttack && styles.attackBtnDisabled]}
                      disabled={!canManualAttack}
                      onPress={manualAttack}
                    >
                      <Text style={[styles.attackBtnText, !canManualAttack && styles.attackBtnTextDisabled]}>
                        ⚔️ Attack ({ATTACK_HONOR_COST} Honor → {attackDamage} dmg)
                      </Text>
                    </TouchableOpacity>
                    {embers < ATTACK_HONOR_COST ? (
                      <Text style={styles.hint}>Need {ATTACK_HONOR_COST} Honor to attack - keep idling to earn it.</Text>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.h2}>ONI · RANK {level}</Text>
                {awaitingFinishingBlow ? (
                  <>
                    <Row icon="💢" label="Status" value="Staggered!" valueStyle={styles.valueDanger} />
                    <Text style={styles.hint}>
                      The Oni is beaten but still standing - it falls the moment your Rank catches up.
                    </Text>
                  </>
                ) : (
                  <>
                    <Row icon="💢" label="XP to next Rank" value={String(Math.max(0, Math.round(needed - xp)))} valueStyle={styles.valueDanger} />
                    <Text style={styles.hint}>{Math.max(0, Math.round(needed - xp))} XP from real tasks until it falls.</Text>
                    <TouchableOpacity
                      style={[styles.attackBtn, !canManualAttack && styles.attackBtnDisabled]}
                      disabled={!canManualAttack}
                      onPress={manualAttack}
                    >
                      <Text style={[styles.attackBtnText, !canManualAttack && styles.attackBtnTextDisabled]}>
                        ⚔️ Attack ({ATTACK_HONOR_COST} Honor → {attackDamage} dmg)
                      </Text>
                    </TouchableOpacity>
                    {embers < ATTACK_HONOR_COST ? (
                      <Text style={styles.hint}>Need {ATTACK_HONOR_COST} Honor to attack - keep idling to earn it.</Text>
                    ) : null}
                  </>
                )}
              </>
            )}
          </ScrollView>
        ) : null}

        {activeTab === 'quests' ? (
          <ScrollView contentContainerStyle={styles.panel}>
            <Text style={styles.h1}>Today's Quests</Text>
            {pendingHabits.length === 0 && readyQuests.length === 0 ? (
              <Text style={styles.hint}>All quests cleared for today.</Text>
            ) : (
              <>
                {pendingHabits.map((h) => (
                  <Row key={h.id} label={h.text} value="pending" />
                ))}
                {readyQuests.map((q) => (
                  <Row key={q.id} label={q.text} value="cleared" valueStyle={styles.valueGood} />
                ))}
              </>
            )}
          </ScrollView>
        ) : null}

        {activeTab === 'missions' ? (
          <ScrollView contentContainerStyle={styles.panel}>
            <Text style={styles.h1}>Missions</Text>
            <Text style={styles.h2}>Quests (today's habits)</Text>
            {pendingHabits.length + readyQuests.length === 0 ? (
              <Text style={styles.hint}>None left today.</Text>
            ) : (
              [...pendingHabits.map((h) => h.text), ...readyQuests.map((q) => q.text)].map((t, i) => (
                <Row key={i} label={t} value="" />
              ))
            )}
            <View style={styles.divider} />
            <Text style={styles.h2}>Side Quests (roadmap goals)</Text>
            {(cards || []).length === 0 ? (
              <Text style={styles.hint}>No goal cards yet.</Text>
            ) : (
              (cards || []).map((c) => {
                const goals = c.goals || [];
                const done = goals.filter(
                  (g) => (g.tasks || []).length > 0 && (g.tasks || []).every((t) => t.done)
                ).length;
                return <Row key={c.id} label={c.title} value={`${done}/${goals.length} goals`} />;
              })
            )}
            {(guides || []).length > 0 ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.h2}>Lessons</Text>
                {guides.map((g) => (
                  <TouchableOpacity key={g.id} style={styles.row} onPress={() => onOpenGuide && onOpenGuide(g.id)}>
                    <Text style={styles.rowLabel}>
                      {g.icon}  {g.name}
                    </Text>
                    <Text style={styles.rowValue}>
                      {g.pct}% · {g.done}/{g.total}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={() => onManageCards && onManageCards()}>
              <Text style={styles.rowLabel}>🗂️  Manage Roadmap Cards</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => onOpenStats && onOpenStats()}>
              <Text style={styles.rowLabel}>📊  Stats & Rewards</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}

        {activeTab === 'zones' ? (
          <ScrollView contentContainerStyle={styles.panel}>
            <Text style={styles.h1}>Provinces</Text>
            {REALMS.map((r) => {
              const unlocked = level >= r.unlockLevel;
              const active = r.id === realm.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  disabled={!unlocked}
                  style={styles.row}
                  onPress={() => setSelectedRealmId(r.id)}
                >
                  <Text style={[styles.rowLabel, active && styles.valueGood, !unlocked && styles.dim]}>
                    {active ? '⚔️ ' : unlocked ? '🏯 ' : '🔒 '}
                    {r.name}
                  </Text>
                  <Text style={[styles.rowValue, !unlocked && styles.dim]}>
                    {unlocked ? `${r.tier}x Koku/kill` : `locked - Rank ${r.unlockLevel}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {activeTab === 'storage' ? (
          <ScrollView contentContainerStyle={styles.panel}>
            <Text style={styles.h1}>Hoard</Text>
            <Row icon="🪙" label="Koku" value={String(rewardPoints ?? '—')} valueStyle={styles.valueGold} />
            <Row icon="✨" label="Honor (session)" value={String(embers)} valueStyle={styles.valueHonor} />
            <Row icon="💀" label="Foes Slain (session)" value={String(sessionKills)} valueStyle={styles.valueDanger} />
            <Row icon="💢" label="XP to next Rank" value={String(Math.max(0, Math.round(needed - xp)))} />
            <Row icon="🗡️" label="Weapon" value={weapon.name} />
            <Row icon="🛡️" label="Armor" value={armor.name} />
            <Row icon="🏯" label="Current Province" value={realm.name} />
          </ScrollView>
        ) : null}

        {activeTab === 'forge' ? (
          <ScrollView contentContainerStyle={styles.panel}>
            <Text style={styles.h1}>Smithy</Text>
            <Row icon="🪙" label="Koku" value={String(rewardPoints ?? 0)} valueStyle={styles.valueGold} />
            <View style={styles.divider} />

            <Text style={styles.h2}>Weapons</Text>
            {WEAPON_TIERS.map((w, i) => {
              const owned = ownedWeaponTiers.includes(i);
              const equipped = hero.weaponTier === i;
              const affordable = owned || (rewardPoints ?? 0) >= w.cost;
              return (
                <View key={w.name} style={styles.shopRow}>
                  {w.image ? (
                    <Image source={{ uri: w.image }} style={styles.shopIcon} resizeMode="contain" />
                  ) : (
                    <View style={styles.shopIcon} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{w.name}</Text>
                    <Text style={styles.hint}>
                      {w.atk} ATK{owned ? '' : ` · ${w.cost} Koku`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.shopBtn,
                      equipped && styles.shopBtnEquipped,
                      !affordable && !equipped && styles.shopBtnDisabled,
                    ]}
                    disabled={!affordable && !owned}
                    onPress={() => buyOrEquipWeapon(i)}
                  >
                    <Text style={[styles.shopBtnText, (equipped || (!affordable && !owned)) && styles.shopBtnTextLight]}>
                      {equipped ? 'Equipped' : owned ? 'Equip' : affordable ? 'Buy' : 'Locked'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <View style={styles.divider} />
            <Text style={styles.h2}>Armor</Text>
            {ARMOR_TIERS.map((a, i) => {
              const owned = ownedArmorTiers.includes(i);
              const equipped = hero.armorTier === i;
              const affordable = owned || (rewardPoints ?? 0) >= a.cost;
              return (
                <View key={a.name} style={styles.shopRow}>
                  <View style={[styles.shopIcon, { backgroundColor: a.glowColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{a.name}</Text>
                    <Text style={styles.hint}>
                      +{a.hp} HP{owned ? '' : ` · ${a.cost} Koku`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.shopBtn,
                      equipped && styles.shopBtnEquipped,
                      !affordable && !equipped && styles.shopBtnDisabled,
                    ]}
                    disabled={!affordable && !owned}
                    onPress={() => buyOrEquipArmor(i)}
                  >
                    <Text style={[styles.shopBtnText, (equipped || (!affordable && !owned)) && styles.shopBtnTextLight]}>
                      {equipped ? 'Equipped' : owned ? 'Equip' : affordable ? 'Buy' : 'Locked'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        ) : null}

        {activeTab === 'affinity' ? (
          <ScrollView contentContainerStyle={styles.panel}>
            <Text style={styles.h1}>Abilities</Text>
            <Row icon="🪙" label="Koku" value={String(rewardPoints ?? 0)} valueStyle={styles.valueGold} />
            <Row icon="✨" label="Honor" value={String(embers)} valueStyle={styles.valueHonor} />
            <View style={styles.divider} />

            {ABILITIES.map((a) => {
              const unlocked = unlockedAbilities.includes(a.id);
              const readyAt = abilityCooldowns[a.id] || 0;
              const onCooldown = readyAt > Date.now();
              const cooldownSecs = onCooldown ? Math.ceil((readyAt - Date.now()) / 1000) : 0;
              const canUse = unlocked && !onCooldown && embers >= a.honorCost;
              const canUnlock = !unlocked && (rewardPoints ?? 0) >= a.unlockCost;

              return (
                <View key={a.id} style={styles.shopRow}>
                  <Text style={{ fontSize: 26, marginRight: 12 }}>{a.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{a.name}</Text>
                    <Text style={styles.hint}>{a.description}</Text>
                    <Text style={styles.hint}>
                      {unlocked ? `${a.honorCost} Honor · ${a.cooldownMs / 1000}s cooldown` : `${a.unlockCost} Koku to unlock`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.shopBtn,
                      unlocked && !canUse && styles.shopBtnDisabled,
                      !unlocked && !canUnlock && styles.shopBtnDisabled,
                    ]}
                    disabled={unlocked ? !canUse : !canUnlock}
                    onPress={() => (unlocked ? useAbility(a.id) : unlockAbility(a.id))}
                  >
                    <Text
                      style={[
                        styles.shopBtnText,
                        ((unlocked && !canUse) || (!unlocked && !canUnlock)) && styles.shopBtnTextLight,
                      ]}
                    >
                      {unlocked ? (onCooldown ? `${cooldownSecs}s` : 'Use') : canUnlock ? 'Unlock' : 'Locked'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        ) : null}

        {activeTab === 'settings' ? (
          <ScrollView contentContainerStyle={styles.panel}>
            <Text style={styles.h1}>{menuItemFor(activeTab)?.label}</Text>
            <Text style={styles.hint}>Not built yet - this is next on the list.</Text>
          </ScrollView>
        ) : null}
      </View>

      {drawerOpen ? (
        <View style={styles.drawerBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDrawerOpen(false)} />
        </View>
      ) : null}
      {drawerOpen ? (
        <View style={[styles.drawer, { paddingTop: insets.top }]}>
          {/* "Arashi Sangoro as a Ronin Samurai Standing on the Bank,"
              Katsukawa Shunshō, ca. 1777, The Metropolitan Museum of Art.
              Public Domain / CC0 - Met Open Access, verified directly on
              the museum's own object page before use here. */}
          <Image
            source={{ uri: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/36841/134250/main-image' }}
            style={styles.drawerArt}
            resizeMode="cover"
          />
          <Text style={styles.drawerArtCredit}>Katsukawa Shunshō, ca. 1777 · The Met, Public Domain</Text>
          <Text style={styles.h1}>RONIN</Text>
          <Row icon="🎖️" label="Rank" value={String(level)} valueStyle={styles.valueGold} />
          <Row icon="💠" label="XP" value={`${Math.round(xp)} / ${Math.round(needed)}`} />
          <View style={styles.divider} />
          {MENU_ITEMS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={styles.row}
              onPress={() => {
                setActiveTab(m.goesTo);
                setDrawerOpen(false);
              }}
            >
              <Text style={[styles.rowLabel, activeTab === m.goesTo && styles.valueGood]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {[
          { key: 'combat', label: 'Combat' },
          { key: 'quests', label: 'Quests' },
          { key: 'missions', label: 'Missions' },
          { key: 'zones', label: 'Provinces' },
          { key: 'storage', label: 'Storage' },
        ].map((t) => (
          <TouchableOpacity key={t.key} style={styles.tabBtn} onPress={() => setActiveTab(t.key)}>
            <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Row({ icon, label, value, valueStyle }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
      <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  iconBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  iconBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  topBarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  content: { flex: 1 },
  panel: { padding: 16 },
  h1: {
    color: '#ffd54a', fontSize: 22, fontWeight: '800', marginBottom: 12,
    fontFamily: 'serif', letterSpacing: 1.5, textShadowColor: 'rgba(255,154,60,0.4)', textShadowRadius: 8,
  },
  arenaBox: {
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
    justifyContent: 'flex-end',
  },
  arenaBoxImage: { borderRadius: 10 },
  combatScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  abilityFlash: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffd54a',
  },
  arenaRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-evenly' },
  spriteWrap: { alignItems: 'center', paddingBottom: 16 },
  sprite: { width: 96, height: 96 },
  oniSprite: { width: 100, height: 120 },
  minionSprite: { width: 60, height: 60 },
  shopRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  shopIcon: {
    width: 36, height: 36, borderRadius: 8, marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  shopBtn: {
    backgroundColor: '#ffd54a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
  },
  shopBtnEquipped: { backgroundColor: 'rgba(255,255,255,0.08)' },
  shopBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)' },
  shopBtnText: { color: '#1c1206', fontSize: 12, fontWeight: '700' },
  shopBtnTextLight: { color: '#c7c0b5' },
  oniHealthTrack: {
    width: 100, height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,90,90,0.6)', marginTop: 6,
  },
  oniHealthFill: { height: '100%', backgroundColor: '#e33', borderRadius: 5 },
  minionHealthTrack: {
    width: 60, height: 7, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(140,220,140,0.6)', marginTop: 5,
  },
  minionHealthFill: { height: '100%', backgroundColor: '#5cb85c', borderRadius: 4 },
  attackBtn: {
    backgroundColor: '#ffd54a', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10,
  },
  attackBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  attackBtnText: { color: '#1c1206', fontSize: 14, fontWeight: '700' },
  attackBtnTextDisabled: { color: '#c7c0b5' },
  h2: {
    color: '#ffd54a', fontSize: 16, fontWeight: '800', marginTop: 6, marginBottom: 10,
    fontFamily: 'serif', letterSpacing: 0.8,
  },
  hint: { color: '#999', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: 'rgba(255,154,60,0.2)', marginVertical: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  rowLabel: { color: '#b8bfcc', fontSize: 13, flex: 1, letterSpacing: 0.2 },
  rowValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  valueGood: { color: '#7fdc7f' },
  valueGold: { color: '#ffd54a' },
  valueHonor: { color: '#c9a6ff' },
  valueDanger: { color: '#ff6b6b' },
  dim: { color: '#666' },
  drawerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 40 },
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 240,
    backgroundColor: '#0a0a0a', borderRightWidth: 1, borderRightColor: '#333',
    padding: 16, zIndex: 41,
  },
  drawerArt: {
    width: '100%', height: 160, borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: 'rgba(217,164,65,0.3)',
  },
  drawerArtCredit: {
    color: '#7a7268', fontSize: 9, marginBottom: 14, textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabBtnText: { color: '#888', fontSize: 12, fontWeight: '600' },
  tabBtnTextActive: { color: '#fff', fontWeight: '800' },
});
