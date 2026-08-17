import React, { useState, useEffect } from 'react';
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
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { applyXPDelta } from './leveling';
import { HABIT_POINTS } from './habitUtils';
import {
  habitDaysLabel,
  habitScheduledOn,
  habitDoneOn,
  todayDateKey,
  habitStreak,
  habitTotalCompletions,
  toggleHabitCompletion,
  formatTimeDisplay,
} from './habitUtils';
import { fetchPlaylistVideos } from './youtubePlaylist';
import { cancelTodayForHabit, scheduleHabitNotifications, cancelAllForHabit } from './notifications';
import HabitVideoPlayer from './HabitVideoPlayer';
import MeditationSession, {
  meditationLevelSpec,
  meditationLevelLabel,
  MEDITATION_MAX_LEVEL,
  DAYS_PER_LEVEL,
} from './MeditationSession';
import { setPhoneAlarmForHabit, openPhoneClock, canSetPhoneAlarm } from './phoneAlarm';
import SelfCareSession from './SelfCareSession';
import BookShelf from './BookShelf';
import { bookProgressPct } from './bookUtils';
import ChessBoard from './ChessBoard';
import ChessLessonSession from './ChessLessonSession';
import { CHESS_LESSONS, chessLessonProgress, nextChessLesson } from './chessLessons';
import LessonVideo from './LessonVideo';
import CardistryPracticeSession from './CardistryPracticeSession';
import { pickCompressedImage } from './imagePicker';
import {
  CARDISTRY_RANKS,
  rankProgress,
  currentRankIndex,
  isRankUnlocked,
  chapterForPage,
} from './cardistryRanks';
import GuidedWorkoutSession, {
  WORKOUT_TEMPLATES,
  REPS_TO_ADVANCE,
  WORKOUT_MAX_LEVEL,
  workoutLevelSpec,
} from './GuidedWorkoutSession';

function makeId(prefix = 'h') {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

// A stored habit time is always a clean "HH:MM" (24-hour) string,
// produced only by the native time picker — never free-typed — so it
// can never fail to parse for notification scheduling.
function timeStringToDate(timeStr) {
  const d = new Date();
  if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

function dateToTimeString(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function HabitsDetailScreen({ habits, setHabits, level, setLevel, rewardPoints, setRewardPoints, hero, setHero, meditationSettings, bodyWorkouts, setBodyWorkouts, bodyExercises, pendingHabitId, onPendingHandled,
  bodyRoutines, setBodyRoutines }) {
  const [detailId, setDetailId] = useState(null);
  // Separate from detailId on purpose: detailId controls the detail
  // Modal, activeHabitId controls the video/meditation Modal. Both used
  // to be driven by the same state, which meant tapping a habit to
  // watch its video ALSO left the detail Modal's visible={true}
  // condition satisfied underneath it — two real native Modal layers
  // simultaneously visible, fighting for stacking order. That's what
  // caused the detail view to intermittently surface over the video,
  // especially around the fullscreen transition.
  const [activeHabitId, setActiveHabitId] = useState(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [videoOpen, setVideoOpen] = useState(false);
  const [meditationOpen, setMeditationOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [selfCareOpen, setSelfCareOpen] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);
  const [chessOpen, setChessOpen] = useState(false);
  const [chessLessonId, setChessLessonId] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(null);
  const [openRankId, setOpenRankId] = useState(null);
  const [openTechId, setOpenTechId] = useState(null);
  const [practiceTech, setPracticeTech] = useState(null); // { habit, technique } or null

  const detailHabit = habits.find((h) => h.id === detailId);
  const activeHabit = habits.find((h) => h.id === activeHabitId);

  // Arriving from a Calendar tap: open that habit's session straight away.
  useEffect(() => {
    if (!pendingHabitId) return;
    const h = habits.find((x) => x.id === pendingHabitId);
    if (!h) return;
    setActiveHabitId(h.id);
    if (h.linkedContent && h.text !== 'Chess') setVideoOpen(true);
    else if (h.sessionType === 'workout') setWorkoutOpen(true);
    else if (h.sessionType === 'reading') setReadingOpen(true);
    else if (h.sessionType === 'selfcare') setSelfCareOpen(true);
    else if (h.sessionType === 'breathing') setMeditationOpen(true);
    else setDetailId(h.id);
    if (onPendingHandled) onPendingHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHabitId, habits]);

  const CHESS_PLAYLIST_URL = 'https://youtube.com/playlist?list=PLQKBpQZcRycrvUUxLdVmlfMChJS0S5Zw0';

  // Purpose-built habits get set up here in code, one at a time, rather
  // than through a generic add form — Chess is the first. It no longer
  // auto-links a video playlist; the lesson sequence replaced that.
  useEffect(() => {
    const alreadyExists = habits.some((h) => h.text === 'Chess');
    if (alreadyExists) return;
    setHabits((prev) => [
      ...prev,
      {
        id: makeId(),
        text: 'Chess',
        days: [],
        time: '',
        doneDates: {},
        addedAt: Date.now(),
        linkedContent: null,
        scheduledNotifications: [],
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Migration: earlier versions of this habit auto-linked a YouTube
  // playlist. If that already happened before this update, clear it so
  // the old video path can never be reached again, even indirectly.
  useEffect(() => {
    const stale = habits.find((h) => h.text === 'Chess' && h.linkedContent);
    if (!stale) return;
    setHabits((prev) =>
      prev.map((h) => (h.id === stale.id ? { ...h, linkedContent: null } : h))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits]);

  // Self-care routines used to live in their own Body tab. They are
  // habits in every meaningful sense — scheduled, done daily, tracked —
  // so they get migrated across once and the Body tab retired.
  useEffect(() => {
    if (!bodyRoutines || !bodyRoutines.length) return;
    const existing = new Set(habits.map((h) => (h.text || '').toLowerCase()));
    const toAdd = bodyRoutines
      .filter((r) => r.name && !existing.has(r.name.toLowerCase()))
      .map((r) => ({
        id: makeId(),
        text: r.name,
        days: r.days || [],
        time: r.time || '',
        doneDates: r.doneDates || {},
        addedAt: r.addedAt || Date.now(),
        linkedContent: null,
        sessionType: 'selfcare',
        steps: r.steps || [],
        notes: r.notes || '',
        scheduledNotifications: [],
      }));
    if (toAdd.length) setHabits((prev) => [...prev, ...toAdd]);
    // Clear the old list so the migration cannot run twice.
    if (setBodyRoutines) setBodyRoutines([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Self care, Reading, and Cardistry. Self care only arrived before by
  // migrating routines out of the old Body tab — if you never made any
  // there, nothing appeared, so it gets seeded here like the others.
  useEffect(() => {
    const existing = new Set(habits.map((h) => (h.text || '').toLowerCase()));
    const additions = [];

    if (!existing.has('self care')) {
      additions.push({
        id: makeId(),
        text: 'Self Care',
        days: [],
        time: '',
        doneDates: {},
        addedAt: Date.now(),
        linkedContent: null,
        sessionType: 'selfcare',
        steps: [
          { id: makeId('st'), text: 'Wash face', minutes: '' },
          { id: makeId('st'), text: 'Moisturise', minutes: '' },
          { id: makeId('st'), text: 'Brush and floss', minutes: '2' },
        ],
        notes: '',
        scheduledNotifications: [],
      });
    }

    if (!existing.has('reading')) {
      additions.push({
        id: makeId(),
        text: 'Reading',
        days: [],
        time: '',
        doneDates: {},
        addedAt: Date.now(),
        linkedContent: null,
        sessionType: 'reading',
        pagesPerSession: 10,
        readingLog: [],
        scheduledNotifications: [],
      });
    }

    if (!existing.has('cardistry')) {
      additions.push({
        id: makeId(),
        text: 'Cardistry',
        days: [],
        time: '',
        doneDates: {},
        addedAt: Date.now(),
        linkedContent: null,
        sessionType: 'cardistry',
        scheduledNotifications: [],
      });
    }

    if (additions.length) setHabits((prev) => [...prev, ...additions]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Workout: third purpose-built habit. Cycles through the three
  // bodyweight programs the same way Chess advances through its
  // playlist, so you always know what today's session is without
  // having to choose.
  useEffect(() => {
    if (habits.some((h) => h.text === 'Workout')) return;
    setHabits((prev) => [
      ...prev,
      {
        id: makeId(),
        text: 'Workout',
        days: [],
        time: '',
        doneDates: {},
        addedAt: Date.now(),
        linkedContent: null,
        sessionType: 'workout',
        workoutLevel: 0,
        workoutLevelReps: 0,
        scheduledNotifications: [],
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Meditation: second purpose-built habit, a guided breathing session
  // instead of video content — its own dedicated flow entirely.
  useEffect(() => {
    const alreadyExists = habits.some((h) => h.text === 'Meditation');
    if (alreadyExists) return;
    setHabits((prev) => [
      ...prev,
      {
        id: makeId(),
        text: 'Meditation',
        days: [],
        time: '',
        doneDates: {},
        addedAt: Date.now(),
        linkedContent: null,
        sessionType: 'breathing',
        breathHoldHistory: [],
        scheduledNotifications: [],
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function doToggleToday(habit) {
    try {
      return doToggleTodayInner(habit);
    } catch (e) {
      // Completion was failing with no visible symptom, which made it
      // impossible to tell whether the session, the state update, or the
      // reward wiring was at fault. Any error now surfaces.
      Alert.alert('Could not mark this habit done', (e && e.message) || String(e));
      return false;
    }
  }

  function doToggleTodayInner(habit) {
    if (!habit) throw new Error('No habit was passed to the completion handler.');
    const newDone = toggleHabitCompletion(habit, {
      setHabits,
      setLevel,
      setRewardPoints,
      setHero,
      applyXPDelta,
      HABIT_POINTS,
    });
    if (newDone) {
      cancelTodayForHabit(habit, todayDateKey()).then((remaining) => {
        setHabits((prev) =>
          prev.map((h) => (h.id === habit.id ? { ...h, scheduledNotifications: remaining } : h))
        );
      });
    }
  }

  function toggleTechnique(habit, techId) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const mastered = { ...(h.mastered || {}) };
        if (mastered[techId]) delete mastered[techId];
        else mastered[techId] = true;
        return { ...h, mastered };
      })
    );
  }

  // Used by the practice session — only ever sets mastered, never toggles
  // it off, since finishing a 5-minute practice block is a one-way step.
  function markTechniqueMastered(habit, techId) {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, mastered: { ...(h.mastered || {}), [techId]: true } }
          : h
      )
    );
  }

  // Photos come from your own copies of the books — the app supplies the
  // slot, you supply the reference shot.
  async function attachTechniquePhoto(habit, techId) {
    const uri = await pickCompressedImage();
    if (!uri) return;
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, techniquePhotos: { ...(h.techniquePhotos || {}), [techId]: uri } }
          : h
      )
    );
  }

  function removeTechniquePhoto(habit, techId) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const photos = { ...(h.techniquePhotos || {}) };
        delete photos[techId];
        return { ...h, techniquePhotos: photos };
      })
    );
  }

  async function setHabitTime(habit, newTime) {
    const updated = { ...habit, time: newTime };
    // Setting the time is the whole action — the system alarm is created
    // here rather than behind a separate button. This used to fire
    // silent:true without checking the result at all, so a failure (a
    // rejected intent, a device that doesn't support it, etc.) gave zero
    // feedback - it just looked like nothing happened. Now actually
    // awaited, and a failure surfaces a real alert instead of being
    // swallowed silently. Success still stays quiet, since the "alarm
    // hint" text that appears once a time is set already confirms it.
    if (newTime) {
      const result = await setPhoneAlarmForHabit(updated, { silent: true });
      if (!result.success) {
        Alert.alert(
          "Couldn't create the phone alarm",
          `The reminder time is saved, but a system alarm for ${formatTimeDisplay(newTime)} could not be created automatically. You can set one yourself in your Clock app.\n\nDetails: ${result.errorMessage}`
        );
      }
    }
    const scheduledNotifications = newTime
      ? await scheduleHabitNotifications(updated)
      : (await cancelAllForHabit(habit), []);
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, time: newTime, scheduledNotifications } : h))
    );
  }

  function openLinkPlaylist() {
    setLinkUrl('');
    setLinkError('');
    setLinkOpen(true);
  }

  async function fetchAndLink() {
    if (!linkUrl.trim()) {
      setLinkError('Paste a playlist link first.');
      return;
    }
    setLinkLoading(true);
    setLinkError('');
    try {
      const videos = await fetchPlaylistVideos(linkUrl.trim());
      setHabits((prev) =>
        prev.map((h) =>
          h.id === detailId
            ? {
                ...h,
                linkedContent: {
                  playlistUrl: linkUrl.trim(),
                  items: videos,
                  progressIndex: 0,
                },
              }
            : h
        )
      );
      setLinkOpen(false);
    } catch (e) {
      setLinkError(e.message || 'Something went wrong.');
    } finally {
      setLinkLoading(false);
    }
  }

  // Completing marks the habit done, but the playlist does NOT advance
  // yet. Advancing here changed the player's key mid-watch, remounting
  // it onto the next video and throwing away where you were. The
  // advance is deferred to when the video is actually closed.
  function handleVideoComplete() {
    try {
      return handleVideoCompleteInner();
    } catch (e) {
      Alert.alert("Session did not register", (e && e.message) || String(e));
    }
  }

  function handleVideoCompleteInner() {
    const habit = activeHabit;
    if (!habit || !habit.linkedContent) return;
    setPendingAdvance(habit.id);
    if (!habitDoneOn(habit, todayDateKey())) doToggleToday(habit);
  }

  // Runs on closing the video: banks the finished video and moves the
  // playlist on, so reopening tomorrow starts on the next one.
  function closeVideo() {
    const habitId = pendingAdvance;
    setVideoOpen(false);
    if (!habitId) return;
    setPendingAdvance(null);
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId && h.linkedContent
          ? {
              ...h,
              linkedContent: {
                ...h.linkedContent,
                progressIndex: Math.min(
                  h.linkedContent.items.length - 1,
                  h.linkedContent.progressIndex + 1
                ),
                watchedSeconds: 0,
                watchedDate: null,
              },
            }
          : h
      )
    );
  }

  function handleWorkoutComplete(result) {
    try {
      return handleWorkoutCompleteInner(result);
    } catch (e) {
      Alert.alert("Session did not register", (e && e.message) || String(e));
    }
  }

  function handleWorkoutCompleteInner(result) {
    const habit = activeHabit;
    if (!habit) return;
    const byName = {};
    result.entries.forEach((e) => {
      if (!byName[e.name]) byName[e.name] = [];
      byName[e.name].push({
        weight: '',
        reps: e.mode === 'time' ? `${e.value}s` : String(e.value),
      });
    });
    const exercises = Object.keys(byName).map((name) => {
      const known = (bodyExercises || []).find(
        (ex) => ex.name.toLowerCase() === name.toLowerCase()
      );
      return { exerciseId: known ? known.id : makeId('bex'), name, sets: byName[name] };
    });
    if (setBodyWorkouts) {
      setBodyWorkouts((prev) => [
        {
          id: makeId('bw'),
          title: `${result.templateName} (Guided)`,
          date: todayDateKey(),
          exercises,
          notes: `${result.rounds} rounds completed.`,
        },
        ...prev,
      ]);
    }
    const alreadyDoneToday = habitDoneOn(habit, todayDateKey());
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const nextReps = (h.workoutLevelReps || 0) + 1;
        if (nextReps >= REPS_TO_ADVANCE && (h.workoutLevel || 0) < WORKOUT_MAX_LEVEL) {
          return { ...h, workoutLevel: (h.workoutLevel || 0) + 1, workoutLevelReps: 0 };
        }
        return { ...h, workoutLevelReps: Math.min(nextReps, REPS_TO_ADVANCE) };
      })
    );
    if (!alreadyDoneToday) doToggleToday(habit);
  }

  function handleMeditationComplete(holdSeconds) {
    try {
      return handleMeditationCompleteInner(holdSeconds);
    } catch (e) {
      Alert.alert("Session did not register", (e && e.message) || String(e));
    }
  }

  function handleMeditationCompleteInner(holdSeconds) {
    const habit = activeHabit;
    if (!habit) return;
    const alreadyDoneToday = habitDoneOn(habit, todayDateKey());

    // Streak counted including today, since this session is what makes
    // today count. Level up every 7 consecutive days.
    const withToday = {
      ...habit,
      doneDates: { ...(habit.doneDates || {}), [todayDateKey()]: true },
    };
    const streak = habitStreak(withToday);
    let level = habit.meditationLevel || 0;
    let base = habit.levelStreakBase || 0;
    // A broken streak never demotes you — it just restarts the count
    // toward the next level from wherever the streak now stands.
    if (streak < base) base = 0;
    if (streak - base >= DAYS_PER_LEVEL && level < MEDITATION_MAX_LEVEL) {
      level += 1;
      base = streak;
    }

    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              meditationLevel: level,
              levelStreakBase: base,
              breathHoldHistory: [
                { date: todayDateKey(), seconds: holdSeconds },
                ...(h.breathHoldHistory || []),
              ].slice(0, 50),
            }
          : h
      )
    );
    if (!alreadyDoneToday) {
      doToggleToday(habit);
    }
  }

  const todayDow = new Date().getDay();
  const sorted = [...habits].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Habits</Text>
        <Text style={shared.tagline}>
          Streaks, schedules, and content-linked habits in one place
        </Text>

        {sorted.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              No habits yet
            </Text>
            <Text style={shared.tagline}>Habits get added here one at a time as we build them.</Text>
          </View>
        ) : (
          sorted.map((h) => {
            const streak = habitStreak(h);
            const total = habitTotalCompletions(h);
            const doneToday = habitDoneOn(h, todayDateKey());
            const scheduledToday = habitScheduledOn(h, todayDow);
            return (
              <TouchableOpacity
                key={h.id}
                style={[styles.row, doneToday && styles.rowDone]}
                onPress={() => {
                  if (h.linkedContent && h.text !== 'Chess') {
                    setActiveHabitId(h.id);
                    setVideoOpen(true);
                  } else if (h.sessionType === 'workout') {
                    setActiveHabitId(h.id);
                    setWorkoutOpen(true);
                  } else if (h.sessionType === 'reading') {
                    setActiveHabitId(h.id);
                    setReadingOpen(true);
                  } else if (h.sessionType === 'cardistry') {
                    setDetailId(h.id);
                  } else if (h.sessionType === 'selfcare') {
                    setActiveHabitId(h.id);
                    setSelfCareOpen(true);
                  } else if (h.sessionType === 'breathing') {
                    setActiveHabitId(h.id);
                    setMeditationOpen(true);
                  } else {
                    setDetailId(h.id);
                  }
                }}
                onLongPress={videoOpen || meditationOpen ? undefined : () => setDetailId(h.id)}
                delayLongPress={400}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowText, doneToday && styles.rowTextDone]}>
                    {doneToday ? '✓ ' : ''}{h.text}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {habitDaysLabel(h)}
                    {h.time ? ` • ⏰ ${formatTimeDisplay(h.time)}` : ''}
                    {h.linkedContent ? ' • 🔗 linked' : ''}
                  </Text>
                  {!h.time ? (
                    <Text style={styles.noReminder}>
                      No reminder — long-press to set one
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.streakText}>
                    {streak > 0 ? `🔥 ${streak}` : `${total} logged`}
                  </Text>
                  {scheduledToday ? (
                    <Text style={[styles.todayBadge, doneToday && styles.todayBadgeDone]}>
                      {doneToday ? 'Done today' : 'Due today'}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Habit detail */}
      <Modal
        visible={!!detailHabit}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailId(null)}
      >
        {detailHabit ? (
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <ScrollView>
                <Text style={styles.sheetTitle}>{detailHabit.text}</Text>
                <Text style={[shared.tagline, { marginTop: -8 }]}>
                  {habitDaysLabel(detailHabit)}
                  {detailHabit.time ? ` • ${formatTimeDisplay(detailHabit.time)}` : ''}
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNum}>{habitStreak(detailHabit)}</Text>
                    <Text style={styles.statLabel}>day streak</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNum}>{habitTotalCompletions(detailHabit)}</Text>
                    <Text style={styles.statLabel}>total logged</Text>
                  </View>
                </View>

                <Text style={styles.label}>Reminder</Text>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.timeBtnText}>
                    {detailHabit.time ? formatTimeDisplay(detailHabit.time) : 'Set a reminder time'}
                  </Text>
                </TouchableOpacity>
                {detailHabit.time ? (
                  <TouchableOpacity
                    style={styles.clearTimeBtn}
                    onPress={() => setHabitTime(detailHabit, '')}
                  >
                    <Text style={styles.clearTimeBtnText}>Clear reminder</Text>
                  </TouchableOpacity>
                ) : null}
                {detailHabit.time && canSetPhoneAlarm() ? (
                  <>
                    <Text style={styles.alarmHint}>
                      A real alarm is set on your phone automatically for this
                      time - it rings properly rather than just pinging.
                    </Text>
                    <TouchableOpacity style={styles.clockLink} onPress={openPhoneClock}>
                      <Text style={styles.clockLinkText}>Manage alarms in Clock</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {showTimePicker ? (
                  <DateTimePicker
                    value={timeStringToDate(detailHabit.time)}
                    mode="time"
                    is24Hour={false}
                    onChange={(event, selectedDate) => {
                      setShowTimePicker(false);
                      if (event.type !== 'dismissed' && selectedDate) {
                        setHabitTime(detailHabit, dateToTimeString(selectedDate));
                      }
                    }}
                  />
                ) : null}

                {detailHabit.linkedContent || detailHabit.sessionType === 'breathing' || detailHabit.sessionType === 'workout' || detailHabit.sessionType === 'selfcare' || detailHabit.sessionType === 'reading' ? (
                  <Text style={styles.autoStatusText}>
                    {habitDoneOn(detailHabit, todayDateKey())
                      ? `✓ Done today — tracked automatically from ${
                          detailHabit.linkedContent ? 'watching' : 'your session'
                        }`
                      : `Not done yet today — ${
                          detailHabit.linkedContent
                            ? 'watch the video below to complete it'
                            : 'complete a session below to finish it'
                        }`}
                  </Text>
                ) : null}

                {detailHabit.sessionType === 'reading' ? (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>Your Shelf</Text>
                    {(detailHabit.books || []).length ? (
                      <View style={styles.currentVideoCard}>
                        <Text style={styles.currentVideoLabel}>
                          {detailHabit.books.length}{' '}
                          {detailHabit.books.length === 1 ? 'BOOK' : 'BOOKS'}
                        </Text>
                        <Text style={styles.currentVideoTitle} numberOfLines={2}>
                          {(() => {
                            const active = [...detailHabit.books].sort(
                              (a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0)
                            )[0];
                            return `Most recent: ${active.name} — ${bookProgressPct(active)}%`;
                          })()}
                        </Text>
                      </View>
                    ) : (
                      <Text style={shared.tagline}>
                        Nothing on the shelf yet — open it and add a book or audiobook.
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.watchBtn}
                      onPress={() => {
                        setActiveHabitId(detailHabit.id);
                        setDetailId(null);
                        setReadingOpen(true);
                      }}
                    >
                      <Text style={styles.watchBtnText}>
                        {(detailHabit.books || []).length
                          ? '📚 Open Bookshelf'
                          : '📚 Add a Book'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : detailHabit.sessionType === 'cardistry' ? (
                  <>
                    {(() => {
                      const mastered = detailHabit.mastered || {};
                      const cardCollegeBook = (
                        habits.find((h) => h.sessionType === 'reading')?.books || []
                      ).find((b) => (b.name || '').toLowerCase().includes('card college'));
                      const readingChapter = cardCollegeBook
                        ? chapterForPage(cardCollegeBook.page)
                        : null;
                      const curIdx = currentRankIndex(mastered);
                      const cur = CARDISTRY_RANKS[curIdx];
                      const curP = rankProgress(cur, mastered);
                      const totalDone = CARDISTRY_RANKS.reduce(
                        (n, r) => n + rankProgress(r, mastered).done,
                        0
                      );
                      const totalAll = CARDISTRY_RANKS.reduce((n, r) => n + r.techniques.length, 0);
                      return (
                        <>
                          <Text style={[styles.label, { marginTop: 20 }]}>Current Rank</Text>
                          <View style={styles.currentVideoCard}>
                            <Text style={styles.currentVideoLabel}>
                              {cur.volume.toUpperCase()}
                            </Text>
                            <Text style={styles.currentVideoTitle}>{cur.name}</Text>
                            <Text style={styles.rankBlurb}>{cur.blurb}</Text>
                          </View>
                          {readingChapter ? (
                            <Text style={styles.readingLinkNote}>
                              📖 Your shelf has you at page {cardCollegeBook.page} —{' '}
                              {readingChapter.id === cur.id
                                ? "right in this chapter's material."
                                : `that's ${readingChapter.name} (Chapter ${readingChapter.volume.split('Chapter ')[1]}).`}
                            </Text>
                          ) : null}
                          <View style={styles.levelBarTrack}>
                            <View
                              style={[
                                styles.levelBarFill,
                                { width: `${Math.round((curP.done / curP.total) * 100)}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.levelBarMeta}>
                            {curP.done}/{curP.total} in this rank - {totalDone}/{totalAll} overall
                          </Text>

                          <Text style={[styles.label, { marginTop: 20 }]}>Techniques</Text>
                          {CARDISTRY_RANKS.map((rank, ri) => {
                            const unlocked = isRankUnlocked(ri, mastered);
                            const rp = rankProgress(rank, mastered);
                            const expanded = openRankId === rank.id;
                            return (
                              <View key={rank.id} style={styles.rankBlock}>
                                <TouchableOpacity
                                  style={styles.rankHead}
                                  onPress={() => setOpenRankId(expanded ? null : rank.id)}
                                >
                                  <Text style={styles.rankLock}>
                                    {unlocked ? (rp.complete ? '✅' : '▸') : '🔒'}
                                  </Text>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.rankName, !unlocked && styles.rankLocked]}>
                                      {rank.name}
                                    </Text>
                                    <Text style={styles.rankVolume}>{rank.volume}</Text>
                                  </View>
                                  <Text style={styles.rankCount}>
                                    {rp.done}/{rp.total}
                                  </Text>
                                </TouchableOpacity>
                                {expanded ? (
                                  unlocked ? (
                                    rank.techniques.map((t, ti) => {
                                      const done = !!mastered[t.id];
                                      const techLocked =
                                        ti > 0 && !mastered[rank.techniques[ti - 1].id];
                                      const techOpen = openTechId === t.id;
                                      const photo = (detailHabit.techniquePhotos || {})[t.id];

                                      if (techLocked) {
                                        return (
                                          <View key={t.id} style={styles.techRow}>
                                            <Text style={styles.techLockIcon}>🔒</Text>
                                            <View style={{ flex: 1 }}>
                                              <Text style={styles.techNameLocked}>{t.name}</Text>
                                              <Text style={styles.techNote}>
                                                Master "{rank.techniques[ti - 1].name}" first
                                              </Text>
                                            </View>
                                          </View>
                                        );
                                      }

                                      return (
                                        <View key={t.id}>
                                          <View style={styles.techRow}>
                                            <View
                                              style={[styles.checkbox, done && styles.checkboxDone]}
                                            >
                                              {done ? <Text style={styles.checkMark}>✓</Text> : null}
                                            </View>
                                            <TouchableOpacity
                                              style={{ flex: 1 }}
                                              onPress={() => {
                                                if (done) {
                                                  setOpenTechId(techOpen ? null : t.id);
                                                } else {
                                                  setPracticeTech({ habit: detailHabit, technique: t });
                                                }
                                              }}
                                            >
                                              <Text style={[styles.techName, done && styles.techNameDone]}>
                                                {t.name}
                                              </Text>
                                              <Text style={styles.techNote}>
                                                {done
                                                  ? t.note || `p.${t.page}`
                                                  : 'Tap to start a 5-minute practice session'}
                                                {done && t.note ? ` · p.${t.page}` : ''}
                                              </Text>
                                            </TouchableOpacity>
                                          </View>

                                          {techOpen && done ? (
                                            <View style={styles.techBody}>
                                              {t.video ? (
                                                <LessonVideo
                                                  video={t.video}
                                                  watched={false}
                                                  onWatched={() => {}}
                                                />
                                              ) : null}
                                              {(t.steps || []).map((st, si) => (
                                                <View key={si} style={styles.stepRow}>
                                                  <Text style={styles.stepNum}>{si + 1}</Text>
                                                  <Text style={styles.stepText}>{st}</Text>
                                                </View>
                                              ))}

                                              {photo ? (
                                                <>
                                                  <Image
                                                    source={{ uri: photo }}
                                                    style={styles.techPhoto}
                                                    resizeMode="contain"
                                                  />
                                                  <TouchableOpacity
                                                    onPress={() =>
                                                      removeTechniquePhoto(detailHabit, t.id)
                                                    }
                                                  >
                                                    <Text style={styles.photoRemove}>
                                                      Remove photo
                                                    </Text>
                                                  </TouchableOpacity>
                                                </>
                                              ) : (
                                                <TouchableOpacity
                                                  style={styles.photoBtn}
                                                  onPress={() =>
                                                    attachTechniquePhoto(detailHabit, t.id)
                                                  }
                                                >
                                                  <Text style={styles.photoBtnText}>
                                                    📷 Add a reference photo
                                                  </Text>
                                                </TouchableOpacity>
                                              )}
                                            </View>
                                          ) : null}
                                        </View>
                                      );
                                    })
                                  ) : (
                                    <Text style={styles.rankLockedMsg}>
                                      Finish every technique in {CARDISTRY_RANKS[ri - 1].name} first
                                      - each rank assumes the handling from the one before.
                                    </Text>
                                  )
                                ) : null}
                              </View>
                            );
                          })}
                        </>
                      );
                    })()}
                  </>
                ) : detailHabit.sessionType === 'selfcare' ? (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>Steps</Text>
                    {(detailHabit.steps || []).length === 0 ? (
                      <Text style={shared.tagline}>No steps yet.</Text>
                    ) : (
                      detailHabit.steps.map((st, i) => (
                        <View key={st.id || i} style={styles.historyRow}>
                          <Text style={styles.historyDate}>
                            {i + 1}. {st.text}
                          </Text>
                          {st.minutes ? (
                            <Text style={styles.historySeconds}>{st.minutes}m</Text>
                          ) : null}
                        </View>
                      ))
                    )}
                    <TouchableOpacity
                      style={styles.watchBtn}
                      onPress={() => {
                        setActiveHabitId(detailHabit.id);
                        setDetailId(null);
                        setSelfCareOpen(true);
                      }}
                    >
                      <Text style={styles.watchBtnText}>✨ Begin Routine</Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { marginTop: 20 }]}>Tracker</Text>
                    {(() => {
                      const log = detailHabit.selfCareLog || [];
                      if (!log.length) {
                        return (
                          <Text style={shared.tagline}>
                            Run the routine and each session gets logged here with
                            how much of it you actually finished.
                          </Text>
                        );
                      }
                      const full = log.filter((e) => e.total && e.steps.length >= e.total).length;
                      return (
                        <>
                          <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                              <Text style={styles.statNum}>{log.length}</Text>
                              <Text style={styles.statLabel}>sessions</Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statNum}>{full}</Text>
                              <Text style={styles.statLabel}>fully completed</Text>
                            </View>
                          </View>
                          {log.slice(0, 7).map((e, i) => (
                            <View key={i} style={styles.historyRow}>
                              <Text style={styles.historyDate}>{e.date}</Text>
                              <Text style={styles.historySeconds}>
                                {e.steps.length}/{e.total || '?'} steps
                              </Text>
                            </View>
                          ))}
                        </>
                      );
                    })()}
                  </>
                ) : detailHabit.sessionType === 'workout' ? (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>Today's Program</Text>
                    {(() => {
                      const spec = workoutLevelSpec(detailHabit.workoutLevel || 0);
                      const repsIn = detailHabit.workoutLevelReps || 0;
                      return (
                        <>
                          <View style={styles.currentVideoCard}>
                            <Text style={styles.currentVideoLabel}>
                              LEVEL {spec.level + 1} OF {WORKOUT_TEMPLATES.length}
                            </Text>
                            <Text style={styles.currentVideoTitle}>{spec.template.name}</Text>
                            <Text style={styles.rankBlurb}>{spec.template.subtitle}</Text>
                          </View>
                          <Text style={styles.readingLinkNote}>
                            {spec.isMax
                              ? 'Top level reached — this is the ladder\'s hardest session.'
                              : `${repsIn}/${REPS_TO_ADVANCE} completions at this level — level up after ${REPS_TO_ADVANCE - repsIn} more.`}
                          </Text>
                        </>
                      );
                    })()}
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statNum}>
                          {(bodyWorkouts || []).filter((w) => (w.title || '').includes('(Guided)')).length}
                        </Text>
                        <Text style={styles.statLabel}>sessions logged</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statNum}>{habitStreak(detailHabit)}</Text>
                        <Text style={styles.statLabel}>day streak</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.watchBtn}
                      onPress={() => {
                        setActiveHabitId(detailHabit.id);
                        setDetailId(null);
                        setWorkoutOpen(true);
                      }}
                    >
                      <Text style={styles.watchBtnText}>🏋️ Begin Workout</Text>
                    </TouchableOpacity>
                  </>
                ) : detailHabit.sessionType === 'breathing' ? (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>Progression</Text>
                    {(() => {
                      const lvl = detailHabit.meditationLevel || 0;
                      const spec = meditationLevelSpec(lvl);
                      const streak = habitStreak(detailHabit);
                      const base = detailHabit.levelStreakBase || 0;
                      const into = Math.max(0, Math.min(DAYS_PER_LEVEL, streak - base));
                      const pct = Math.round((into / DAYS_PER_LEVEL) * 100);
                      return (
                        <>
                          <View style={styles.currentVideoCard}>
                            <Text style={styles.currentVideoLabel}>
                              LEVEL {lvl + 1} OF {MEDITATION_MAX_LEVEL + 1}
                            </Text>
                            <Text style={styles.currentVideoTitle}>
                              {meditationLevelLabel(lvl)}
                            </Text>
                          </View>
                          {spec.isMax ? (
                            <Text style={styles.autoStatusText}>
                              Top level - 30 breaths x 3 rounds
                            </Text>
                          ) : (
                            <>
                              <View style={styles.levelBarTrack}>
                                <View style={[styles.levelBarFill, { width: `${pct}%` }]} />
                              </View>
                              <Text style={styles.levelBarMeta}>
                                {into}/{DAYS_PER_LEVEL} days toward{' '}
                                {meditationLevelLabel(lvl + 1)}
                              </Text>
                            </>
                          )}
                        </>
                      );
                    })()}

                    <Text style={[styles.label, { marginTop: 20 }]}>Breath Hold Tracker</Text>
                    {(() => {
                      const history = detailHabit.breathHoldHistory || [];
                      const best = history.length
                        ? Math.max(...history.map((h) => h.seconds))
                        : 0;
                      return (
                        <>
                          <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                              <Text style={styles.statNum}>{best}s</Text>
                              <Text style={styles.statLabel}>personal best</Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statNum}>{history.length}</Text>
                              <Text style={styles.statLabel}>sessions logged</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.watchBtn}
                            onPress={() => {
                              setActiveHabitId(detailHabit.id);
                              setDetailId(null);
                              setMeditationOpen(true);
                            }}
                          >
                            <Text style={styles.watchBtnText}>🧘 Begin Session</Text>
                          </TouchableOpacity>
                          {history.slice(0, 5).map((entry, i) => (
                            <View key={i} style={styles.historyRow}>
                              <Text style={styles.historyDate}>{entry.date}</Text>
                              <Text style={styles.historySeconds}>{entry.seconds}s</Text>
                            </View>
                          ))}
                        </>
                      );
                    })()}
                  </>
                ) : detailHabit.text === 'Chess' ? (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>Lessons</Text>
                    {(() => {
                      const chessMastered = detailHabit.chessLessons || {};
                      const prog = chessLessonProgress(chessMastered);
                      const next = nextChessLesson(chessMastered);
                      return (
                        <>
                          <View style={styles.currentVideoCard}>
                            <Text style={styles.currentVideoLabel}>
                              {prog.done} OF {prog.total} LESSONS
                            </Text>
                            <Text style={styles.currentVideoTitle}>
                              {next ? `Next: ${next.title}` : 'All lessons complete'}
                            </Text>
                          </View>

                          {next ? (
                            <TouchableOpacity
                              style={styles.watchBtn}
                              onPress={() => {
                                setActiveHabitId(detailHabit.id);
                                setDetailId(null);
                                setChessLessonId(next.id);
                              }}
                            >
                              <Text style={styles.watchBtnText}>
                                {next.icon} Continue: {next.title}
                              </Text>
                            </TouchableOpacity>
                          ) : null}

                          <View style={styles.lessonListBox}>
                            {CHESS_LESSONS.map((l, li) => {
                              const done = !!chessMastered[l.id];
                              const locked = li > 0 && !chessMastered[CHESS_LESSONS[li - 1].id];
                              return (
                                <TouchableOpacity
                                  key={l.id}
                                  style={styles.lessonRow}
                                  disabled={locked}
                                  onPress={() => {
                                    setActiveHabitId(detailHabit.id);
                                    setDetailId(null);
                                    setChessLessonId(l.id);
                                  }}
                                >
                                  <Text style={styles.lessonMark}>
                                    {done ? '✓' : locked ? '🔒' : l.icon}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.lessonName,
                                      done && styles.lessonNameDone,
                                      locked && styles.lessonNameLocked,
                                    ]}
                                  >
                                    {l.title}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <TouchableOpacity
                            style={[styles.watchBtn, styles.boardBtn]}
                            onPress={() => {
                              setActiveHabitId(detailHabit.id);
                              setDetailId(null);
                              setChessOpen(true);
                            }}
                          >
                            <Text style={[styles.watchBtnText, styles.boardBtnText]}>
                              ♟ Free Play (open board, no lesson)
                            </Text>
                          </TouchableOpacity>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>Linked Content</Text>
                    {detailHabit.linkedContent ? (
                      <>
                        <View style={styles.currentVideoCard}>
                          <Text style={styles.currentVideoLabel}>
                            Video {detailHabit.linkedContent.progressIndex + 1} of{' '}
                            {detailHabit.linkedContent.items.length}
                          </Text>
                          <Text style={styles.currentVideoTitle} numberOfLines={2}>
                            {detailHabit.linkedContent.items[detailHabit.linkedContent.progressIndex].title}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.watchBtn}
                          onPress={() => {
                            setActiveHabitId(detailHabit.id);
                            setDetailId(null);
                            setVideoOpen(true);
                          }}
                        >
                          <Text style={styles.watchBtnText}>
                            ▶ Watch Today's Video (5 min counts as done)
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity style={styles.linkBtn} onPress={openLinkPlaylist}>
                        <Text style={styles.linkBtnText}>🔗 Link a YouTube Playlist</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setDetailId(null)}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        ) : (
          <View />
        )}
      </Modal>

      {/* Link playlist */}
      <Modal
        visible={linkOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLinkOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Link a Playlist</Text>
            <Text style={[shared.tagline, { marginTop: -8 }]}>
              Only the first video starts unlocked — each one unlocks the
              next once you've watched 5 real minutes of it.
            </Text>
            <TextInput
              style={styles.input}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://youtube.com/playlist?list=..."
              placeholderTextColor="#9aa5b1"
              autoCapitalize="none"
            />
            {linkError ? <Text style={styles.linkError}>{linkError}</Text> : null}
            <TouchableOpacity style={styles.saveBtn} disabled={linkLoading} onPress={fetchAndLink}>
              <Text style={styles.saveBtnText}>
                {linkLoading ? 'Fetching...' : 'Fetch & Link'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLinkOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Video player */}
      <Modal
        visible={videoOpen}
        animationType="slide"
        onRequestClose={closeVideo}
      >
        <View style={styles.videoScreen}>
          {activeHabit?.linkedContent ? (
            <HabitVideoPlayer
              key={activeHabit.linkedContent.items[activeHabit.linkedContent.progressIndex].videoId}
              videoId={activeHabit.linkedContent.items[activeHabit.linkedContent.progressIndex].videoId}
              requiredSeconds={300}
              initialWatched={
                activeHabit.linkedContent.watchedDate === todayDateKey()
                  ? activeHabit.linkedContent.watchedSeconds || 0
                  : 0
              }
              onProgress={(seconds) => {
                setHabits((prev) =>
                  prev.map((h) =>
                    h.id === activeHabit.id
                      ? {
                          ...h,
                          linkedContent: {
                            ...h.linkedContent,
                            watchedSeconds: seconds,
                            watchedDate: todayDateKey(),
                          },
                        }
                      : h
                  )
                );
              }}
              onComplete={handleVideoComplete}
            />
          ) : null}
          <TouchableOpacity
            style={styles.videoFloatingClose}
            onPress={closeVideo}
          >
            <Text style={styles.videoCloseX}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Guided workout session */}
      <Modal
        visible={workoutOpen}
        animationType="slide"
        onRequestClose={() => setWorkoutOpen(false)}
      >
        {workoutOpen && activeHabit ? (
          <GuidedWorkoutSession
            key={`${activeHabitId}-${activeHabit.workoutLevel || 0}`}
            template={workoutLevelSpec(activeHabit.workoutLevel || 0).template}
            onComplete={handleWorkoutComplete}
            onExit={() => setWorkoutOpen(false)}
          />
        ) : null}
      </Modal>

      {/* Chess board */}
      <Modal visible={chessOpen} animationType="slide" onRequestClose={() => setChessOpen(false)}>
        {chessOpen ? (
          <ChessBoard
            onSessionDone={() => {
              if (activeHabit && !habitDoneOn(activeHabit, todayDateKey())) {
                doToggleToday(activeHabit);
              }
            }}
            onExit={() => setChessOpen(false)}
          />
        ) : null}
      </Modal>

      {/* Reading */}
      <Modal
        visible={readingOpen}
        animationType="slide"
        onRequestClose={() => setReadingOpen(false)}
      >
        {readingOpen && activeHabit ? (
          <BookShelf
            key={activeHabitId}
            habit={activeHabit}
            onUpdateBooks={(books) =>
              setHabits((prev) =>
                prev.map((h) => (h.id === activeHabit.id ? { ...h, books } : h))
              )
            }
            onComplete={() => {
              if (!habitDoneOn(activeHabit, todayDateKey())) doToggleToday(activeHabit);
            }}
            onExit={() => setReadingOpen(false)}
          />
        ) : null}
      </Modal>

      {/* Cardistry practice session - 5 minutes forced, then mastered/exit */}
      <Modal
        visible={!!practiceTech}
        animationType="slide"
        onRequestClose={() => setPracticeTech(null)}
      >
        {practiceTech ? (
          <CardistryPracticeSession
            key={practiceTech.technique.id}
            technique={practiceTech.technique}
            onMastered={() => {
              markTechniqueMastered(practiceTech.habit, practiceTech.technique.id);
              if (!habitDoneOn(practiceTech.habit, todayDateKey())) {
                doToggleToday(practiceTech.habit);
              }
              setPracticeTech(null);
            }}
            onExit={() => {
              if (!habitDoneOn(practiceTech.habit, todayDateKey())) {
                doToggleToday(practiceTech.habit);
              }
              setPracticeTech(null);
            }}
          />
        ) : null}
      </Modal>

      {/* Chess lesson - reuses the real board, gated by a small move count */}
      <Modal
        visible={!!chessLessonId}
        animationType="slide"
        onRequestClose={() => setChessLessonId(null)}
      >
        {chessLessonId && activeHabit ? (
          <ChessLessonSession
            key={chessLessonId}
            lesson={CHESS_LESSONS.find((l) => l.id === chessLessonId)}
            onComplete={() => {
              setHabits((prev) =>
                prev.map((h) =>
                  h.id === activeHabit.id
                    ? { ...h, chessLessons: { ...(h.chessLessons || {}), [chessLessonId]: true } }
                    : h
                )
              );
              if (!habitDoneOn(activeHabit, todayDateKey())) doToggleToday(activeHabit);
              setChessLessonId(null);
            }}
            onExit={() => {
              if (!habitDoneOn(activeHabit, todayDateKey())) doToggleToday(activeHabit);
              setChessLessonId(null);
            }}
          />
        ) : null}
      </Modal>

      {/* Self care routine */}
      <Modal
        visible={selfCareOpen}
        animationType="slide"
        onRequestClose={() => setSelfCareOpen(false)}
      >
        {selfCareOpen && activeHabit ? (
          <SelfCareSession
            key={activeHabitId}
            routine={activeHabit}
            onComplete={(completedStepIds) => {
              setHabits((prev) =>
                prev.map((h) =>
                  h.id === activeHabit.id
                    ? {
                        ...h,
                        selfCareLog: [
                          {
                            date: todayDateKey(),
                            steps: completedStepIds || [],
                            total: (h.steps || []).length,
                          },
                          ...(h.selfCareLog || []).filter((e) => e.date !== todayDateKey()),
                        ].slice(0, 60),
                      }
                    : h
                )
              );
              if (!habitDoneOn(activeHabit, todayDateKey())) doToggleToday(activeHabit);
            }}
            onExit={() => setSelfCareOpen(false)}
          />
        ) : null}
      </Modal>

      {/* Meditation session */}
      <Modal
        visible={meditationOpen}
        animationType="slide"
        onRequestClose={() => setMeditationOpen(false)}
      >
        <View style={styles.videoScreen}>
          <View style={styles.videoHeader}>
            <Text style={styles.videoHeaderTitle}>Meditation</Text>
            <TouchableOpacity onPress={() => setMeditationOpen(false)}>
              <Text style={styles.videoCloseX}>✕</Text>
            </TouchableOpacity>
          </View>
          {meditationOpen ? (
            <MeditationSession
              key={activeHabitId}
              settings={meditationSettings}
              levelIndex={activeHabit ? activeHabit.meditationLevel || 0 : 0}
              streakInfo={
                activeHabit
                  ? {
                      daysToNext: Math.max(
                        1,
                        DAYS_PER_LEVEL -
                          (habitStreak(activeHabit) - (activeHabit.levelStreakBase || 0))
                      ),
                    }
                  : null
              }
              onComplete={(holdSeconds) => {
                handleMeditationComplete(holdSeconds);
              }}
            />
          ) : null}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowText: { fontSize: 15, fontWeight: '600', color: INK },
  rowMeta: { fontSize: 11, color: DIM, marginTop: 3 },
  // Completed habits stay visible but visibly spent, so it's
  // obvious at a glance what's already been done today.
  rowDone: { opacity: 0.45 },
  rowTextDone: { color: DIM, textDecorationLine: 'line-through' },
  noReminder: { fontSize: 11, color: ROSE, marginTop: 3, fontWeight: '600' },
  alarmBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  alarmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  alarmHint: { color: DIM, fontSize: 11, marginTop: 8, lineHeight: 16 },
  clockLink: { alignItems: 'center', paddingVertical: 8 },
  clockLinkText: { color: GOLD, fontSize: 12, fontWeight: '600' },
  streakText: { fontSize: 12, fontWeight: '700', color: GOLD },
  todayBadge: { fontSize: 10, color: DIM, marginTop: 4, fontWeight: '600' },
  todayBadgeDone: { color: '#2e9e5b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 6 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: '#232d3a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: INK },
  statLabel: { fontSize: 11, color: DIM, marginTop: 2 },
  toggleBtn: {
    backgroundColor: '#232d3a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  toggleBtnDone: { backgroundColor: GOLD },
  toggleBtnText: { color: INK, fontSize: 14, fontWeight: '700' },
  autoStatusText: {
    fontSize: 13,
    color: DIM,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  levelBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 10,
  },
  levelBarFill: { height: '100%', borderRadius: 4, backgroundColor: GOLD },
  levelBarMeta: { color: DIM, fontSize: 12, marginTop: 6 },
  rankBlurb: { color: DIM, fontSize: 12, marginTop: 4, lineHeight: 17 },
  readingLinkNote: { color: GOLD, fontSize: 12, fontWeight: '600', marginTop: 10, lineHeight: 18 },
  rankBlock: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: 10 },
  rankHead: { flexDirection: 'row', alignItems: 'center' },
  rankLock: { fontSize: 14, width: 26 },
  rankName: { color: INK, fontSize: 15, fontWeight: '700' },
  rankLocked: { color: DIM },
  rankVolume: { color: DIM, fontSize: 11, marginTop: 1 },
  rankCount: { color: GOLD, fontSize: 13, fontWeight: '800' },
  rankLockedMsg: { color: DIM, fontSize: 12, marginTop: 8, marginLeft: 26, lineHeight: 17 },
  techRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, marginLeft: 26 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: GOLD,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxDone: { backgroundColor: GOLD },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  techName: { color: INK, fontSize: 14, fontWeight: '600' },
  techNameLocked: { color: DIM, fontSize: 14, fontWeight: '600' },
  techLockIcon: { fontSize: 15, marginRight: 12, marginTop: 2 },
  techNameDone: { color: DIM, textDecorationLine: 'line-through' },
  techNote: { color: DIM, fontSize: 12, marginTop: 3, lineHeight: 17 },
  techBody: { marginLeft: 56, marginTop: 8, marginBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  stepNum: { color: GOLD, fontSize: 12, fontWeight: '800', width: 18, marginTop: 1 },
  stepText: { flex: 1, color: '#c3ccd6', fontSize: 13, lineHeight: 19 },
  techPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#0c1117',
  },
  photoRemove: { color: ROSE, fontSize: 12, fontWeight: '600', marginTop: 8 },
  photoBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  photoBtnText: { color: GOLD, fontSize: 12, fontWeight: '700' },
  boardBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: GOLD },
  boardBtnText: { color: GOLD },
  lessonListBox: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 4, marginTop: 14,
  },
  lessonRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  lessonMark: { fontSize: 15, width: 26 },
  lessonName: { color: INK, fontSize: 13.5, fontWeight: '600', flex: 1 },
  lessonNameDone: { color: DIM },
  lessonNameLocked: { color: DIM },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  historyDate: { fontSize: 13, color: DIM },
  historySeconds: { fontSize: 13, color: INK, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  timeBtn: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeBtnText: { fontSize: 15, color: INK, fontWeight: '600' },
  clearTimeBtn: { alignItems: 'center', marginTop: 6, marginBottom: 4 },
  clearTimeBtnText: { fontSize: 12, color: DIM },
  currentVideoCard: {
    backgroundColor: 'rgba(217,164,65,0.18)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  currentVideoLabel: { fontSize: 11, color: GOLD, fontWeight: '700', marginBottom: 4 },
  currentVideoTitle: { fontSize: 14, color: INK, fontWeight: '600' },
  watchBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  watchBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  linkBtn: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkBtnText: { color: GOLD, fontSize: 14, fontWeight: '700' },
  linkError: { color: ROSE, fontSize: 12, marginTop: 8 },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
  videoScreen: { flex: 1, backgroundColor: '#000' },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  videoHeaderTitle: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700', marginRight: 12 },
  videoCloseX: { color: '#fff', fontSize: 22 },
  videoFloatingClose: {
    position: 'absolute',
    top: 46,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
