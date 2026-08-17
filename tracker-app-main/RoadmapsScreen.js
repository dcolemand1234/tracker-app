import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { pickCompressedImage } from './imagePicker';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER, SWATCHES } from './theme';
import { xpForLevel, applyXPDelta, resetRoadmapProgress } from './leveling';
import { DAY_LETTERS } from './habitUtils';
import HeroArena from './RoadmapIdleWorld';
import RoadmapGuideView from './RoadmapGuideView';
import RoadmapCourseView from './RoadmapCourseView';
import { ROADMAP_GUIDES, guideStepCount, guideDoneCount } from './roadmapGuides';
import { WEAPON_TIERS, ARMOR_TIERS, ENERGY_PER_TASK, MAX_ENERGY, minionFightCost } from './heroUtils';

const POINTS = { TASK: 5, GOAL_BONUS: 20, CARD_BONUS: 100 };
const ICON_CHOICES = ['💪','🧠','🎭','⏱️','🔥','💡','🎯','🍀','⭐','⚔️','🛡️','📚','🎨','🏃','💰','❤️','🎮','🎵','🧘','✨'];

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

function statAbbrev(name) {
  const clean = (name || '').trim();
  if (!clean) return '???';
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    return words.map((w) => w.charAt(0)).join('').slice(0, 4).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

function statIcon(name) {
  const n = (name || '').toLowerCase();
  if (/str|power|might/.test(n)) return '💪';
  if (/mind|int|wis|knowledge/.test(n)) return '🧠';
  if (/cha|social/.test(n)) return '🎭';
  if (/end|stamina/.test(n)) return '⏱️';
  if (/vit|health|energy/.test(n)) return '🔥';
  if (/cre|art/.test(n)) return '💡';
  if (/disc|focus/.test(n)) return '🎯';
  if (/luck/.test(n)) return '🍀';
  return '⭐';
}

function statIconFor(stat) {
  return stat && stat.icon ? stat.icon : statIcon(stat ? stat.name : '');
}

function goalTaskProgress(goal) {
  const tasks = goal.tasks || [];
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const complete = total > 0 && done === total;
  return { total, done, complete };
}

function cardIsFullyComplete(card) {
  const goals = card.goals || [];
  if (!goals.length) return false;
  return goals.every((g) => goalTaskProgress(g).complete);
}

function cardProgress(card) {
  const goals = card.goals || [];
  const total = goals.length;
  let done = 0;
  goals.forEach((g) => {
    if (goalTaskProgress(g).complete) done++;
  });
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

export default function RoadmapsScreen({
  cards,
  setCards,
  stats,
  setStats,
  level,
  setLevel,
  rewardPoints,
  setRewardPoints,
  rewardItems,
  setRewardItems,
  rewardHistory,
  setRewardHistory,
  habits,
  setHabits,
  hero,
  setHero,
  customColors,
  guideProgress,
  setGuideProgress,
  onGoToCalendar,
}) {
  const [openGuideId, setOpenGuideId] = useState(null);
  const ALL_COLORS = [...SWATCHES, ...(customColors || [])];
  const [view, setView] = useState('list'); // 'list' | 'card' | 'goal'
  // Manage-roadmap-cards screen (create/edit goal cards) - real CRUD
  // functionality that doesn't have an in-game equivalent, so it's kept
  // reachable rather than deleted, but it's no longer the default
  // landing screen. The game is.
  const [manageCardsOpen, setManageCardsOpen] = useState(false);
  const [currentCardId, setCurrentCardId] = useState(null);
  const [currentGoalId, setCurrentGoalId] = useState(null);

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardDraft, setCardDraft] = useState(emptyCardDraft());

  const [goalAddOpen, setGoalAddOpen] = useState(false);
  const [goalAddText, setGoalAddText] = useState('');

  const [goalSettingsOpen, setGoalSettingsOpen] = useState(false);
  const [goalSettingsDraft, setGoalSettingsDraft] = useState({ text: '', image: null });

  const [taskAddOpen, setTaskAddOpen] = useState(false);
  const [taskAddText, setTaskAddText] = useState('');

  const [statusOpen, setStatusOpen] = useState(false);
  const [statModalOpen, setStatModalOpen] = useState(false);
  const [editingStatId, setEditingStatId] = useState(null);
  const [statDraft, setStatDraft] = useState({ name: '', color: SWATCHES[0], icon: '' });

  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState(null);
  const [rewardDraft, setRewardDraft] = useState({ title: '', cost: '', color: SWATCHES[0] });


  function emptyCardDraft() {
    return {
      title: '',
      notes: '',
      color: SWATCHES[Math.floor(Math.random() * SWATCHES.length)],
      statIds: [],
      image: null,
    };
  }

  const currentCard = cards.find((c) => c.id === currentCardId);
  const currentGoal = currentCard?.goals?.find((g) => g.id === currentGoalId);

  function updateCard(cardId, updater) {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...updater(c), updatedAt: Date.now() } : c))
    );
  }

  function applyGlobalXP(delta) {
    setLevel((prev) => {
      const next = applyXPDelta(prev, delta);
      if (next.levelsGained > 0) {
        setRewardPoints((p) => Math.max(0, p + next.level * 20 * next.levelsGained));
      }
      return { level: next.level, xp: next.xp };
    });
  }

  function applyStatXP(statIds, delta) {
    if (!statIds || !statIds.length) return;
    setStats((prev) =>
      prev.map((s) => {
        if (!statIds.includes(s.id)) return s;
        const next = applyXPDelta(s, delta);
        return { ...s, level: next.level, xp: next.xp };
      })
    );
  }

  function statIdsForCard(card) {
    return card.statIds || (card.statId ? [card.statId] : []);
  }

  // --- Card CRUD ---
  function openCardAdd() {
    setEditingCardId(null);
    setCardDraft(emptyCardDraft());
    setCardModalOpen(true);
  }

  function openCardEdit(card) {
    setEditingCardId(card.id);
    setCardDraft({
      title: card.title,
      notes: card.notes || '',
      color: card.color || SWATCHES[0],
      statIds: statIdsForCard(card),
      image: card.image || null,
    });
    setCardModalOpen(true);
  }

  async function pickCardImage() {
    const result = await pickCompressedImage();
    if (result.uri) {
      setCardDraft((d) => ({ ...d, image: result.uri }));
    }
  }

  function saveCard() {
    if (!cardDraft.title.trim()) {
      Alert.alert('Title required', 'Give this card a title first.');
      return;
    }
    if (editingCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCardId
            ? {
                ...c,
                title: cardDraft.title.trim(),
                notes: cardDraft.notes.trim(),
                color: cardDraft.color,
                statIds: cardDraft.statIds,
                image: cardDraft.image,
                updatedAt: Date.now(),
              }
            : c
        )
      );
    } else {
      setCards((prev) => [
        ...prev,
        {
          id: makeId('c'),
          title: cardDraft.title.trim(),
          date: '',
          notes: cardDraft.notes.trim(),
          color: cardDraft.color,
          statIds: cardDraft.statIds,
          image: cardDraft.image,
          goals: [],
          updatedAt: Date.now(),
        },
      ]);
    }
    setCardModalOpen(false);
  }

  function deleteCard() {
    Alert.alert('Delete card?', 'This removes all its goals and tasks.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setCards((prev) => prev.filter((c) => c.id !== editingCardId));
          setCardModalOpen(false);
          if (currentCardId === editingCardId) {
            setView('list');
            setCurrentCardId(null);
          }
        },
      },
    ]);
  }

  function toggleCardStat(id) {
    setCardDraft((d) => {
      const has = d.statIds.includes(id);
      return {
        ...d,
        statIds: has ? d.statIds.filter((s) => s !== id) : [...d.statIds, id],
      };
    });
  }

  // --- Goal CRUD ---
  function saveNewGoal() {
    const text = goalAddText.trim();
    if (!text || !currentCardId) return;
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: [...(c.goals || []), { id: makeId('g'), text, tasks: [], image: null }],
    }));
    setGoalAddText('');
    setGoalAddOpen(false);
  }

  function openGoalSettings(goal) {
    setGoalSettingsDraft({ text: goal.text, image: goal.image || null });
    setGoalSettingsOpen(true);
  }

  async function pickGoalImage() {
    const result = await pickCompressedImage();
    if (result.uri) {
      setGoalSettingsDraft((d) => ({ ...d, image: result.uri }));
    }
  }

  function saveGoalSettings() {
    const text = goalSettingsDraft.text.trim();
    if (!text) return;
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: (c.goals || []).map((g) =>
        g.id === currentGoalId ? { ...g, text, image: goalSettingsDraft.image } : g
      ),
    }));
    setGoalSettingsOpen(false);
  }

  function deleteGoal() {
    Alert.alert('Delete goal?', 'This removes its tasks.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          updateCard(currentCardId, (c) => ({
            ...c,
            goals: (c.goals || []).filter((g) => g.id !== currentGoalId),
          }));
          setGoalSettingsOpen(false);
          setView('card');
          setCurrentGoalId(null);
        },
      },
    ]);
  }

  // --- Task CRUD + points ---
  function saveNewTask() {
    const text = taskAddText.trim();
    if (!text || !currentCardId || !currentGoalId) return;
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: (c.goals || []).map((g) =>
        g.id === currentGoalId
          ? { ...g, tasks: [...(g.tasks || []), { id: makeId('t'), text, done: false }] }
          : g
      ),
    }));
    setTaskAddText('');
    setTaskAddOpen(false);
  }

  function toggleTask(task) {
    const card = currentCard;
    const goal = currentGoal;
    if (!card || !goal) return;
    const wasGoalComplete = goalTaskProgress(goal).complete;
    const wasCardComplete = cardIsFullyComplete(card);
    const newDone = !task.done;

    let delta = newDone ? POINTS.TASK : -POINTS.TASK;

    const updatedGoal = {
      ...goal,
      tasks: goal.tasks.map((t) => (t.id === task.id ? { ...t, done: newDone } : t)),
    };
    const isGoalComplete = goalTaskProgress(updatedGoal).complete;
    if (!wasGoalComplete && isGoalComplete) delta += POINTS.GOAL_BONUS;
    if (wasGoalComplete && !isGoalComplete) delta -= POINTS.GOAL_BONUS;

    const updatedCard = {
      ...card,
      goals: card.goals.map((g) => (g.id === goal.id ? updatedGoal : g)),
    };
    const isCardComplete = cardIsFullyComplete(updatedCard);
    if (!wasCardComplete && isCardComplete) delta += POINTS.CARD_BONUS;
    if (wasCardComplete && !isCardComplete) delta -= POINTS.CARD_BONUS;

    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...updatedCard, updatedAt: Date.now() } : c)));
    setRewardPoints((p) => Math.max(0, p + delta));
    if (newDone) {
      setHero((h) => ({ ...h, energy: Math.min(MAX_ENERGY, h.energy + ENERGY_PER_TASK) }));
    }
    applyGlobalXP(delta);
    applyStatXP(statIdsForCard(card), delta);
  }

  function deleteTask(taskId) {
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: (c.goals || []).map((g) =>
        g.id === currentGoalId
          ? { ...g, tasks: (g.tasks || []).filter((t) => t.id !== taskId) }
          : g
      ),
    }));
  }

  // --- Stat CRUD ---
  function openStatAdd() {
    setEditingStatId(null);
    setStatDraft({ name: '', color: SWATCHES[Math.floor(Math.random() * SWATCHES.length)], icon: '' });
    setStatModalOpen(true);
  }

  function openStatEdit(stat) {
    setEditingStatId(stat.id);
    setStatDraft({ name: stat.name, color: stat.color, icon: stat.icon || '' });
    setStatModalOpen(true);
  }

  function saveStat() {
    const name = statDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this stat a name.');
      return;
    }
    if (editingStatId) {
      setStats((prev) =>
        prev.map((s) =>
          s.id === editingStatId
            ? { ...s, name, color: statDraft.color, icon: statDraft.icon }
            : s
        )
      );
    } else {
      setStats((prev) => [
        ...prev,
        { id: makeId('st'), name, color: statDraft.color, icon: statDraft.icon, level: 1, xp: 0 },
      ]);
    }
    setStatModalOpen(false);
  }

  function deleteStat() {
    const inUse = cards.some((c) => statIdsForCard(c).includes(editingStatId));
    const doDelete = () => {
      setStats((prev) => prev.filter((s) => s.id !== editingStatId));
      if (inUse) {
        setCards((prev) =>
          prev.map((c) => ({
            ...c,
            statIds: statIdsForCard(c).filter((id) => id !== editingStatId),
          }))
        );
      }
      setStatModalOpen(false);
    };
    if (inUse) {
      Alert.alert(
        'Stat is in use',
        'Some cards use this stat. Remove it anyway? They will be left unassigned.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: doDelete },
        ]
      );
    } else {
      doDelete();
    }
  }

  function resetProgress() {
    Alert.alert(
      'Reset all progress?',
      "This resets your Level, XP, every Stat's level, your Rewards points/history, and your hero's gear back to zero. Your Cards, Goals, and Tasks stay exactly as they are.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetRoadmapProgress({ setLevel, setStats, setRewardPoints, setRewardHistory, setHero });
            setStatusOpen(false);
          },
        },
      ]
    );
  }

  // --- Reward CRUD ---
  function openRewardAdd() {
    setEditingRewardId(null);
    setRewardDraft({ title: '', cost: '', color: SWATCHES[Math.floor(Math.random() * SWATCHES.length)] });
    setRewardModalOpen(true);
  }

  function openRewardEdit(item) {
    setEditingRewardId(item.id);
    setRewardDraft({ title: item.title, cost: String(item.cost), color: item.color });
    setRewardModalOpen(true);
  }

  function saveReward() {
    const title = rewardDraft.title.trim();
    const cost = Math.max(0, Number(rewardDraft.cost) || 0);
    if (!title) {
      Alert.alert('Title required', 'Give this reward a title.');
      return;
    }
    if (editingRewardId) {
      setRewardItems((prev) =>
        prev.map((r) =>
          r.id === editingRewardId ? { ...r, title, cost, color: rewardDraft.color } : r
        )
      );
    } else {
      setRewardItems((prev) => [...prev, { id: makeId('rw'), title, cost, color: rewardDraft.color }]);
    }
    setRewardModalOpen(false);
  }

  function deleteReward() {
    setRewardItems((prev) => prev.filter((r) => r.id !== editingRewardId));
    setRewardModalOpen(false);
  }

  function redeemReward(item) {
    if (rewardPoints < item.cost) return;
    Alert.alert('Redeem reward?', `Redeem "${item.title}" for ${item.cost} points?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Redeem',
        onPress: () => {
          setRewardPoints((p) => p - item.cost);
          setRewardHistory((prev) => [
            { id: makeId('rh'), title: item.title, cost: item.cost, redeemedAt: Date.now() },
            ...prev,
          ]);
        },
      },
    ]);
  }

  // --- Hero combat ---
  // zoneTier scales the reward - deeper/tougher zones pay out more per
  // kill, which is what actually makes "progressing to a new zone" mean
  // something rather than just a visual reskin.
  function fightMinion(zoneTier = 1) {
    const cost = minionFightCost(hero.weaponTier);
    if (hero.energy < cost) return;
    setHero((h) => ({
      ...h,
      energy: Math.max(0, h.energy - cost),
      minionsDefeated: h.minionsDefeated + 1,
    }));
    setRewardPoints((p) => p + 2 * zoneTier);
  }

  function handleBossDefeated() {
    setHero((h) => ({ ...h, minionsDefeated: 0, bossDamageDealt: 0 }));
  }

  function buyWeaponTier() {
    const nextTier = hero.weaponTier + 1;
    const tier = WEAPON_TIERS[nextTier];
    if (!tier) return;
    if (rewardPoints < tier.cost) return;
    setRewardPoints((p) => p - tier.cost);
    setHero((h) => ({ ...h, weaponTier: nextTier }));
  }

  function buyArmorTier() {
    const nextTier = hero.armorTier + 1;
    const tier = ARMOR_TIERS[nextTier];
    if (!tier) return;
    if (rewardPoints < tier.cost) return;
    setRewardPoints((p) => p - tier.cost);
    setHero((h) => ({ ...h, armorTier: nextTier }));
  }

  const levelPct = Math.min(100, Math.round((level.xp / xpForLevel(level.level)) * 100));

  // ===================== LIST VIEW =====================
  if (view === 'list') {
    const openGuide = ROADMAP_GUIDES.find((g) => g.id === openGuideId);
    if (openGuide && openGuide.id === 'robotics') {
      return (
        <RoadmapCourseView
          guide={openGuide}
          progress={guideProgress}
          setProgress={setGuideProgress}
          onBack={() => setOpenGuideId(null)}
        />
      );
    }
    if (openGuide) {
      return (
        <RoadmapGuideView
          guide={openGuide}
          progress={guideProgress}
          setProgress={setGuideProgress}
          onBack={() => setOpenGuideId(null)}
        />
      );
    }

    // Manage-roadmap-cards screen - real create/edit CRUD for goal cards
    // that doesn't have an in-game equivalent yet, kept reachable from
    // inside the game (via onManageCards) rather than being the default
    // landing screen, and rather than being deleted outright.
    if (manageCardsOpen) {
      return (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={shared.container}>
            <TouchableOpacity onPress={() => setManageCardsOpen(false)} style={{ marginBottom: 8 }}>
              <Text style={{ color: GOLD, fontSize: 15, fontWeight: '700' }}>‹ Back to the game</Text>
            </TouchableOpacity>
            <Text style={shared.h1}>Roadmaps</Text>
            <Text style={shared.tagline}>Quests you're working toward</Text>

            {cards.length === 0 ? (
              <View style={shared.block}>
                <Text style={shared.tagline}>
                  Roadmaps are built into the app — open one above to work through it.
                </Text>
              </View>
            ) : (
              cards.map((card) => {
                const prog = cardProgress(card);
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[styles.cardRow, { borderLeftColor: card.color || GOLD }]}
                    onPress={() => {
                      setCurrentCardId(card.id);
                      setView('card');
                    }}
                    onLongPress={() => openCardEdit(card)}
                    delayLongPress={400}
                  >
                    {card.image ? (
                      <Image source={{ uri: card.image }} style={styles.cardImg} />
                    ) : (
                      <View
                        style={[styles.cardImg, styles.cardImgPlaceholder, { backgroundColor: card.color || GOLD }]}
                      >
                        <Text style={styles.cardImgLetter}>
                          {(card.title || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.cardTitle}>{card.title}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${prog.pct}%`, backgroundColor: card.color || GOLD },
                          ]}
                        />
                      </View>
                      <Text style={styles.cardMeta}>
                        {prog.pct}% complete • {prog.done}/{prog.total} goals
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {renderCardModal()}
          {renderStatusModal()}
          {renderStatModal()}
          {renderRewardsModal()}
          {renderRewardModal()}
        </View>
      );
    }

    // Default landing: the game itself, not a hub screen. Lessons
    // (ROADMAP_GUIDES) and stats/card-management are reachable from
    // inside the game's own menu now, passed down as props/callbacks.
    const guidesWithProgress = ROADMAP_GUIDES.map((g) => {
      const total = guideStepCount(g);
      const done = guideDoneCount(g, guideProgress);
      return {
        id: g.id,
        icon: g.icon,
        name: g.name,
        tagline: g.tagline,
        done,
        total,
        pct: total ? Math.round((done / total) * 100) : 0,
      };
    });

    return (
      <View style={{ flex: 1, backgroundColor: '#0d141c' }}>
        <HeroArena
          level={level.level}
          xp={level.xp}
          hero={hero}
          setHero={setHero}
          habits={habits}
          cards={cards}
          rewardPoints={rewardPoints}
          setRewardPoints={setRewardPoints}
          onFightMinion={fightMinion}
          onBossDefeated={handleBossDefeated}
          onExit={() => onGoToCalendar && onGoToCalendar()}
          guides={guidesWithProgress}
          onOpenGuide={(id) => setOpenGuideId(id)}
          onOpenStats={() => setStatusOpen(true)}
          onManageCards={() => setManageCardsOpen(true)}
        />
        {renderStatusModal()}
        {renderStatModal()}
        {renderRewardsModal()}
        {renderRewardModal()}
      </View>
    );
  }

  // ===================== CARD DETAIL VIEW =====================
  if (view === 'card' && currentCard) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => { setView('list'); setCurrentCardId(null); }}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openCardEdit(currentCard)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={shared.container}>
          <Text style={shared.h1}>{currentCard.title}</Text>
          {currentCard.notes ? (
            <Text style={shared.tagline}>{currentCard.notes}</Text>
          ) : null}

          {(currentCard.goals || []).length === 0 ? (
            <View style={shared.block}>
              <Text style={shared.tagline}>No goals yet — tap + to add one.</Text>
            </View>
          ) : (
            (currentCard.goals || []).map((goal) => {
              const gp = goalTaskProgress(goal);
              const gPct = gp.total ? Math.round((gp.done / gp.total) * 100) : 0;
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalRow}
                  onPress={() => {
                    setCurrentGoalId(goal.id);
                    setView('goal');
                  }}
                >
                  {goal.image ? (
                    <Image source={{ uri: goal.image }} style={styles.goalImg} />
                  ) : null}
                  <View style={{ flex: 1, marginLeft: goal.image ? 10 : 0 }}>
                    <Text style={styles.goalRowName}>
                      {gp.complete ? '✅ ' : ''}
                      {goal.text}
                    </Text>
                    <View style={styles.goalBarTrack}>
                      <View
                        style={[
                          styles.goalBarFill,
                          { width: `${gPct}%`, backgroundColor: currentCard.color || GOLD },
                        ]}
                      />
                    </View>
                    <Text style={styles.goalRowMeta}>
                      {gp.done}/{gp.total} tasks
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setGoalAddText('');
            setGoalAddOpen(true);
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {renderGoalAddModal()}
        {renderCardModal()}
      </View>
    );
  }

  // ===================== GOAL DETAIL VIEW =====================
  if (view === 'goal' && currentCard && currentGoal) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => { setView('card'); setCurrentGoalId(null); }}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openGoalSettings(currentGoal)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text style={shared.h1}>{currentGoal.text}</Text>
        </View>

        <ScrollView contentContainerStyle={shared.container}>
          {(currentGoal.tasks || []).length === 0 ? (
            <Text style={shared.tagline}>No tasks yet — tap the + button to add one.</Text>
          ) : (
            (currentGoal.tasks || []).map((task) => (
              <View key={task.id} style={styles.editRow}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => toggleTask(task)}
                >
                  <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
                    {task.done ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <Text
                    style={[styles.editRowText, task.done && styles.editRowTextDone]}
                  >
                    {task.text}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTask(task.id)}>
                  <Text style={styles.delX}>×</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setTaskAddText('');
            setTaskAddOpen(true);
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {renderTaskAddModal()}
        {renderGoalSettingsModal()}
      </View>
    );
  }

  return null;

  // ===================== MODALS =====================
  function renderCardModal() {
    return (
      <Modal
        visible={cardModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCardModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingCardId ? 'Edit Card' : 'Add Card'}
              </Text>

              {cardDraft.image ? (
                <Image source={{ uri: cardDraft.image }} style={styles.imgPreview} />
              ) : null}
              <TouchableOpacity style={styles.imgBtn} onPress={pickCardImage}>
                <Text style={styles.imgBtnText}>
                  {cardDraft.image ? 'Change Photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={cardDraft.title}
                onChangeText={(v) => setCardDraft((d) => ({ ...d, title: v }))}
                placeholder="e.g. Robotics"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                value={cardDraft.notes}
                onChangeText={(v) => setCardDraft((d) => ({ ...d, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {ALL_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      cardDraft.color === c && styles.colorDotSel,
                    ]}
                    onPress={() => setCardDraft((d) => ({ ...d, color: c }))}
                  />
                ))}
              </View>

              <Text style={styles.label}>Linked Stats (XP goes here when you complete things)</Text>
              <View style={styles.catRow}>
                {stats.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.catChip,
                      cardDraft.statIds.includes(s.id) && { backgroundColor: s.color },
                    ]}
                    onPress={() => toggleCardStat(s.id)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        cardDraft.statIds.includes(s.id) && styles.catChipTextSel,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveCard}>
                <Text style={styles.saveBtnText}>
                  {editingCardId ? 'Save Changes' : 'Add Card'}
                </Text>
              </TouchableOpacity>
              {editingCardId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteCard}>
                  <Text style={styles.deleteBtnText}>Delete Card</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCardModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderGoalAddModal() {
    return (
      <Modal
        visible={goalAddOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalAddOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Goal</Text>
            <TextInput
              style={styles.input}
              value={goalAddText}
              onChangeText={setGoalAddText}
              placeholder="Goal name"
              placeholderTextColor="#9aa5b1"
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNewGoal}>
              <Text style={styles.saveBtnText}>Add Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalAddOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderGoalSettingsModal() {
    return (
      <Modal
        visible={goalSettingsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalSettingsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Edit Goal</Text>
            {goalSettingsDraft.image ? (
              <Image source={{ uri: goalSettingsDraft.image }} style={styles.imgPreview} />
            ) : null}
            <TouchableOpacity style={styles.imgBtn} onPress={pickGoalImage}>
              <Text style={styles.imgBtnText}>
                {goalSettingsDraft.image ? 'Change Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={goalSettingsDraft.text}
              onChangeText={(v) => setGoalSettingsDraft((d) => ({ ...d, text: v }))}
              placeholder="Goal name"
              placeholderTextColor="#9aa5b1"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveGoalSettings}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={deleteGoal}>
              <Text style={styles.deleteBtnText}>Delete Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalSettingsOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderTaskAddModal() {
    return (
      <Modal
        visible={taskAddOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTaskAddOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Task</Text>
            <TextInput
              style={styles.input}
              value={taskAddText}
              onChangeText={setTaskAddText}
              placeholder="Task"
              placeholderTextColor="#9aa5b1"
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNewTask}>
              <Text style={styles.saveBtnText}>Add Task</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setTaskAddOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderStatusModal() {
    return (
      <Modal
        visible={statusOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setStatusOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView>
              <Text style={styles.sheetTitle}>Stats & Rewards</Text>

              <View style={{ marginTop: 4 }}>
                {stats.length === 0 ? (
                  <Text style={shared.tagline}>No stats yet. Tap Settings to add one.</Text>
                ) : (
                  stats.map((s) => {
                    const sNeeded = xpForLevel(s.level);
                    const sPct = Math.min(100, Math.round((s.xp / sNeeded) * 100));
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.attrRow}
                        onPress={() => openStatEdit(s)}
                      >
                        <View style={styles.attrTopRow}>
                          <Text style={styles.attrIcon}>{statIconFor(s)}</Text>
                          <Text style={styles.attrName}>{statAbbrev(s.name)}</Text>
                          <Text style={styles.attrLv}>LV{s.level}</Text>
                        </View>
                        <View style={styles.attrMidRow}>
                          <Text style={[styles.attrPct, { color: s.color }]}>{sPct}%</Text>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                { width: `${sPct}%`, backgroundColor: s.color },
                              ]}
                            />
                          </View>
                        </View>
                        <View style={styles.plaqueLabelRow}>
                          <Text style={{ color: DIM, fontSize: 11 }}>UP {sNeeded}</Text>
                          <Text style={{ color: DIM, fontSize: 11 }}>
                            {s.xp}/{sNeeded}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  setStatusOpen(false);
                  setRewardsOpen(true);
                }}
              >
                <Text style={styles.saveBtnText}>Level Rewards ({rewardPoints} pts)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, styles.saveBtnAlt]}
                onPress={openStatAdd}
              >
                <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>
                  + Add / Manage Stats
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetBtn} onPress={resetProgress}>
                <Text style={styles.resetBtnText}>Reset All Progress</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusOpen(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderStatModal() {
    return (
      <Modal
        visible={statModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setStatModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingStatId ? 'Edit Stat' : 'Add Stat'}
              </Text>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={statDraft.name}
                onChangeText={(v) => setStatDraft((d) => ({ ...d, name: v }))}
                placeholder="e.g. Mind"
                placeholderTextColor="#9aa5b1"
              />
              <Text style={styles.label}>Icon</Text>
              <View style={styles.catRow}>
                {ICON_CHOICES.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconBtn,
                      (statDraft.icon || statIcon(statDraft.name)) === ic && styles.iconBtnSel,
                    ]}
                    onPress={() => setStatDraft((d) => ({ ...d, icon: ic }))}
                  >
                    <Text style={{ fontSize: 18 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {ALL_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      statDraft.color === c && styles.colorDotSel,
                    ]}
                    onPress={() => setStatDraft((d) => ({ ...d, color: c }))}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveStat}>
                <Text style={styles.saveBtnText}>
                  {editingStatId ? 'Save Changes' : 'Add Stat'}
                </Text>
              </TouchableOpacity>
              {editingStatId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteStat}>
                  <Text style={styles.deleteBtnText}>Remove Stat</Text>
                </TouchableOpacity>
              ) : null}

              {stats.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.label}>All Stats</Text>
                  {stats.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.manageRow}
                      onPress={() => openStatEdit(s)}
                    >
                      <View style={[styles.manageDot, { backgroundColor: s.color }]} />
                      <Text style={styles.manageText}>
                        {s.name} <Text style={{ color: DIM }}>Lv{s.level}</Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setStatModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderRewardsModal() {
    const sorted = [...rewardItems].sort((a, b) => a.cost - b.cost);
    return (
      <Modal
        visible={rewardsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRewardsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView>
              <Text style={styles.sheetTitle}>Rewards</Text>
              <Text style={[shared.tagline, { marginTop: -8, marginBottom: 12 }]}>
                {rewardPoints} points available
              </Text>

              <Text style={styles.label}>Hero Upgrades</Text>
              {(() => {
                const nextWeapon = WEAPON_TIERS[hero.weaponTier + 1];
                const nextArmor = ARMOR_TIERS[hero.armorTier + 1];
                return (
                  <>
                    <View style={styles.gearRow}>
                      {WEAPON_TIERS[hero.weaponTier].image ? (
                        <Image
                          source={{ uri: WEAPON_TIERS[hero.weaponTier].image }}
                          style={styles.gearIconImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.gearIcon}>🥊</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gearName}>{WEAPON_TIERS[hero.weaponTier].name}</Text>
                        <Text style={styles.gearMeta}>
                          {nextWeapon ? `Next: ${nextWeapon.name} (${nextWeapon.cost} pts)` : 'Max tier'}
                        </Text>
                      </View>
                      {nextWeapon ? (
                        <TouchableOpacity
                          style={[styles.upgradeBtn, rewardPoints < nextWeapon.cost && styles.upgradeBtnDisabled]}
                          disabled={rewardPoints < nextWeapon.cost}
                          onPress={buyWeaponTier}
                        >
                          <Text style={styles.upgradeBtnText}>Upgrade</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.gearRow}>
                      <Text style={styles.gearIcon}>🛡️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gearName}>{ARMOR_TIERS[hero.armorTier].name}</Text>
                        <Text style={styles.gearMeta}>
                          {nextArmor ? `Next: ${nextArmor.name} (${nextArmor.cost} pts)` : 'Max tier'}
                        </Text>
                      </View>
                      {nextArmor ? (
                        <TouchableOpacity
                          style={[styles.upgradeBtn, rewardPoints < nextArmor.cost && styles.upgradeBtnDisabled]}
                          disabled={rewardPoints < nextArmor.cost}
                          onPress={buyArmorTier}
                        >
                          <Text style={styles.upgradeBtnText}>Upgrade</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </>
                );
              })()}

              <Text style={[styles.label, { marginTop: 20 }]}>Custom Rewards</Text>

              {sorted.length === 0 ? (
                <Text style={shared.tagline}>
                  No rewards yet. Tap + to set up something you can redeem points for.
                </Text>
              ) : (
                sorted.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.rewardRow, { borderLeftColor: r.color }]}
                    onPress={() => openRewardEdit(r)}
                  >
                    <Text style={styles.rewardTitle}>{r.title}</Text>
                    <Text style={styles.rewardCost}>{r.cost} pts</Text>
                    <TouchableOpacity
                      style={[
                        styles.redeemBtn,
                        rewardPoints < r.cost && styles.redeemBtnDisabled,
                      ]}
                      disabled={rewardPoints < r.cost}
                      onPress={(e) => {
                        e.stopPropagation();
                        redeemReward(r);
                      }}
                    >
                      <Text style={styles.redeemBtnText}>Redeem</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}

              <TouchableOpacity style={[styles.saveBtn, styles.saveBtnAlt]} onPress={openRewardAdd}>
                <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>+ Add Reward</Text>
              </TouchableOpacity>

              {rewardHistory.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.label}>Redeemed</Text>
                  {rewardHistory.slice(0, 15).map((h) => (
                    <View key={h.id} style={styles.historyRow}>
                      <Text style={styles.manageText}>{h.title}</Text>
                      <Text style={{ color: ROSE, fontSize: 12, fontWeight: '700' }}>
                        -{h.cost} pts
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRewardsOpen(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderRewardModal() {
    return (
      <Modal
        visible={rewardModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRewardModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editingRewardId ? 'Edit Reward' : 'Add Reward'}
            </Text>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={rewardDraft.title}
              onChangeText={(v) => setRewardDraft((d) => ({ ...d, title: v }))}
              placeholder="e.g. New game"
              placeholderTextColor="#9aa5b1"
            />
            <Text style={styles.label}>Cost (points)</Text>
            <TextInput
              style={styles.input}
              value={rewardDraft.cost}
              onChangeText={(v) => setRewardDraft((d) => ({ ...d, cost: v }))}
              placeholder="e.g. 200"
              placeholderTextColor="#9aa5b1"
              keyboardType="numeric"
            />
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {ALL_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    rewardDraft.color === c && styles.colorDotSel,
                  ]}
                  onPress={() => setRewardDraft((d) => ({ ...d, color: c }))}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveReward}>
              <Text style={styles.saveBtnText}>
                {editingRewardId ? 'Save Changes' : 'Add Reward'}
              </Text>
            </TouchableOpacity>
            {editingRewardId ? (
              <TouchableOpacity style={styles.deleteBtn} onPress={deleteReward}>
                <Text style={styles.deleteBtnText}>Delete Reward</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setRewardModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

}

const styles = StyleSheet.create({
  plaque: {
    backgroundColor: '#1c2b3a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  plaqueTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  plaqueBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  plaqueBadgeText: { color: '#1c2b3a', fontSize: 20, fontWeight: '800' },
  plaqueTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  plaqueSub: { color: '#a9b6c4', fontSize: 12, marginTop: 2 },
  plaqueBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#33475a',
    overflow: 'hidden',
  },
  plaqueFill: { height: 8, borderRadius: 4, backgroundColor: GOLD },
  plaqueLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  plaqueLabel: { color: '#a9b6c4', fontSize: 11 },
  cardRow: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  cardImg: { width: 80, height: 80, borderRadius: 14 },
  cardImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardImgLetter: { color: '#fff', fontSize: 28, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: INK, marginBottom: 6 },
  cardMeta: { fontSize: 11, color: DIM, marginTop: 4 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#e9edf2', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '400', marginTop: -2 },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  backLink: { color: GOLD, fontWeight: '700', fontSize: 14 },
  editLink: { color: GOLD, fontWeight: '700', fontSize: 14 },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  goalRowName: { fontSize: 14, fontWeight: '600', color: INK, marginBottom: 6 },
  goalImg: { width: 68, height: 68, borderRadius: 12 },
  goalBarTrack: { height: 6, borderRadius: 3, backgroundColor: '#e9edf2', overflow: 'hidden' },
  goalBarFill: { height: 6, borderRadius: 3 },
  goalRowMeta: { fontSize: 11, color: DIM, marginTop: 4 },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: GOLD,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: GOLD },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  editRowText: { fontSize: 14, color: INK, flex: 1 },
  editRowTextDone: { color: DIM, textDecorationLine: 'line-through' },
  delX: { fontSize: 22, color: DIM, paddingHorizontal: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  imgPreview: { width: '100%', height: 160, borderRadius: 12, marginBottom: 10 },
  imgBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  imgBtnText: { color: INK, fontSize: 14, fontWeight: '500' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap' },
  colorDot: { width: 34, height: 34, borderRadius: 17, marginRight: 10, marginBottom: 10 },
  colorDotSel: { borderWidth: 3, borderColor: INK },
  catRow: { flexDirection: 'row', flexWrap: 'wrap' },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#232d3a',
    marginRight: 8,
    marginBottom: 8,
  },
  catChipText: { fontSize: 13, color: INK },
  catChipTextSel: { color: '#fff', fontWeight: '600' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#232d3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipSel: { backgroundColor: GOLD },
  dayChipText: { fontSize: 13, fontWeight: '700', color: INK },
  dayChipTextSel: { color: '#fff' },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saveBtnAlt: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: GOLD,
  },
  saveBtnTextAlt: { color: GOLD },
  resetBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: ROSE,
    borderRadius: 12,
  },
  resetBtnText: { color: ROSE, fontSize: 14, fontWeight: '700' },
  guideCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
  },
  guideHead: { flexDirection: 'row', alignItems: 'center' },
  guideIcon: { fontSize: 24, marginRight: 12 },
  guideName: { color: INK, fontSize: 16, fontWeight: '700' },
  guideTagline: { color: DIM, fontSize: 12, marginTop: 2 },
  guidePct: { color: GOLD, fontSize: 16, fontWeight: '800' },
  guideBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 10,
  },
  guideBarFill: { height: '100%', borderRadius: 3, backgroundColor: GOLD },
  guideMeta: { color: DIM, fontSize: 11, marginTop: 6 },
  enterWorldBtn: {
    backgroundColor: '#1c2530',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: GOLD,
  },
  enterWorldTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  enterWorldSub: { color: DIM, fontSize: 12, marginTop: 4 },
  statusLink: {
    backgroundColor: CARD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusLinkText: { color: GOLD, fontWeight: '700', fontSize: 14 },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
  attrRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  attrTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  attrIcon: { fontSize: 16, marginRight: 8 },
  attrName: { flex: 1, fontSize: 13, fontWeight: '700', color: INK },
  attrLv: { fontSize: 12, color: DIM, fontWeight: '600' },
  attrMidRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  attrPct: { fontSize: 12, fontWeight: '700', width: 40 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#232d3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  iconBtnSel: { backgroundColor: 'rgba(217,164,65,0.18)', borderWidth: 2, borderColor: GOLD },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  manageDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  manageText: { fontSize: 14, color: INK },
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232d3a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  gearIcon: { fontSize: 24, marginRight: 10, width: 30, textAlign: 'center' },
  gearIconImg: { width: 26, height: 26, marginRight: 10 },
  gearName: { fontSize: 14, fontWeight: '700', color: INK },
  gearMeta: { fontSize: 11, color: DIM, marginTop: 2 },
  upgradeBtn: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  upgradeBtnDisabled: { backgroundColor: '#4a5568' },
  upgradeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232d3a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  rewardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: INK },
  rewardCost: { fontSize: 12, color: DIM, marginRight: 10 },
  redeemBtn: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  redeemBtnDisabled: { backgroundColor: '#ccc' },
  redeemBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
});

