export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const HABIT_POINTS = 3;

export function habitDaysLabel(habit) {
  const days = (habit.days || []).slice().sort();
  if (!days.length || days.length === 7) return 'Daily';
  const set = days.join(',');
  if (set === '1,2,3,4,5') return 'Weekdays';
  if (set === '0,6') return 'Weekends';
  return days.map((d) => DAY_LETTERS[d]).join('');
}

export function habitScheduledOn(habit, dow) {
  return !habit.days || !habit.days.length || habit.days.includes(dow);
}

export function habitDoneOn(habit, dateKey) {
  return !!(habit.doneDates && habit.doneDates[dateKey]);
}

// Local calendar date as YYYY-MM-DD. Deliberately NOT toISOString(),
// which converts to UTC first: anywhere behind UTC that rolls the date
// over during the evening, so habits completed at night were recorded
// against tomorrow and today never showed as done.
export function localDateKey(d) {
  const dt = d || new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayDateKey() {
  return localDateKey();
}

export function habitStreak(habit) {
  let streak = 0;
  let cursor = new Date();
  let dow = cursor.getDay();
  let key = localDateKey(cursor);
  if (habitScheduledOn(habit, dow) && !habitDoneOn(habit, key)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 1000; i++) {
    dow = cursor.getDay();
    key = localDateKey(cursor);
    if (habitScheduledOn(habit, dow)) {
      if (habitDoneOn(habit, key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    } else {
      cursor.setDate(cursor.getDate() - 1);
    }
  }
  return streak;
}

export function habitTotalCompletions(habit) {
  return Object.keys(habit.doneDates || {}).length;
}

// Converts a stored "HH:MM" (24-hour) time string into a 12-hour
// AM/PM display string, e.g. "19:00" -> "7:00 PM". Shared so every
// screen that shows a habit's time displays it the same way.
export function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Shared completion logic used by both the Calendar and To Do screens, so
// points/XP/energy/notification effects stay identical no matter where a
// habit gets checked off. Returns the new `newDone` value so callers can
// react (e.g. cancel a pending notification) without re-deriving it.
export function toggleHabitCompletion(habit, setters) {
  const { setHabits, setLevel, setRewardPoints, setHero, applyXPDelta, HABIT_POINTS } = setters;
  const todayKey = todayDateKey();
  const newDone = !habitDoneOn(habit, todayKey);
  const delta = newDone ? HABIT_POINTS : -HABIT_POINTS;

  setHabits((prev) =>
    prev.map((h) => {
      if (h.id !== habit.id) return h;
      const doneDates = { ...(h.doneDates || {}) };
      if (newDone) doneDates[todayKey] = true;
      else delete doneDates[todayKey];
      return { ...h, doneDates };
    })
  );
  setRewardPoints((p) => Math.max(0, p + delta));
  if (newDone && setHero) {
    setHero((h) => ({ ...h, energy: Math.min(100, h.energy + 15) }));
  }
  setLevel((prev) => {
    const next = applyXPDelta(prev, delta);
    return { level: next.level, xp: next.xp };
  });
  return newDone;
}

// Clears today's completion for every habit — un-checks today's date on
// each habit, and removes today's breath-hold entry for Meditation-style
// habits, without touching any other day's history or streak data.
export function resetTodayHabits(habits, setHabits) {
  const todayKey = todayDateKey();
  setHabits((prev) =>
    prev.map((h) => {
      const doneDates = { ...(h.doneDates || {}) };
      delete doneDates[todayKey];
      const breathHoldHistory = (h.breathHoldHistory || []).filter(
        (entry) => entry.date !== todayKey
      );
      return { ...h, doneDates, breathHoldHistory };
    })
  );
}

