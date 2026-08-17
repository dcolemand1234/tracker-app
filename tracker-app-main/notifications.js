import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const LOOKAHEAD_DAYS = 14;

export async function ensureNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync({
      android: {},
      ios: { allowAlert: true, allowSound: true, allowBadge: false, allowCriticalAlerts: true },
    });
  }
  if (Platform.OS === 'android') {
    // MAX importance + bypassDnd + a long vibration pattern is as close
    // to alarm behaviour as a normal app can get through the standard
    // notification system: it makes a heads-up banner appear over
    // whatever is on screen, sound at alarm volume, and vibrate hard.
    await Notifications.setNotificationChannelAsync('habits', {
      name: 'Habit alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 600, 300, 600, 300, 600],
      enableVibrate: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
  }
}

function habitScheduledOnDow(habit, dow) {
  return !habit.days || !habit.days.length || habit.days.includes(dow);
}

// Cancels every notification this habit currently has scheduled and
// clears the tracking list — used before rescheduling from scratch, or
// when a habit is deleted.
export async function cancelAllForHabit(habit) {
  const entries = habit.scheduledNotifications || [];
  for (const entry of entries) {
    try {
      await Notifications.cancelScheduledNotificationAsync(entry.id);
    } catch (e) {
      // already fired or invalid — fine to ignore
    }
  }
}

// Schedules one-off notifications (not a repeating trigger) for the next
// LOOKAHEAD_DAYS days that match the habit's day pattern and time. Using
// individual one-offs (instead of a single repeating schedule) is what
// lets a single day's notification be cancelled on its own once that
// day's habit gets checked off, without touching any other day.
export async function scheduleHabitNotifications(habit) {
  if (!habit.time || !/^\d{1,2}:\d{2}$/.test(habit.time)) {
    return []; // no time set, nothing to schedule
  }
  await cancelAllForHabit(habit);

  const [hh, mm] = habit.time.split(':').map(Number);
  const scheduled = [];
  const now = new Date();

  for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    day.setHours(hh, mm, 0, 0);
    if (day <= now) continue; // don't schedule for a time already passed today
    if (!habitScheduledOnDow(habit, day.getDay())) continue;

    const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ ' + habit.text,
          body: "It's time — tap to check it off in Tracker.",
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 600, 300, 600, 300, 600],
          sticky: true, // best-effort: Android 14+ no longer lets any
          // regular app fully block swipe-to-dismiss (an OS policy
          // change, not something we can override), but this still
          // helps on older Android versions.
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: day,
          channelId: 'habits',
        },
      });
      scheduled.push({ date: dateKey, id });
    } catch (e) {
      // skip this occurrence on failure, keep going with the rest
    }
  }
  return scheduled;
}

// Cancels and removes just today's scheduled notification for this habit
// (called when the habit gets marked done, so it stops nagging you for
// something you've already completed) without touching future days.
export async function cancelTodayForHabit(habit, todayKey) {
  const entries = habit.scheduledNotifications || [];
  const todays = entries.filter((e) => e.date === todayKey);
  for (const entry of todays) {
    try {
      // Covers a notification that hasn't fired yet...
      await Notifications.cancelScheduledNotificationAsync(entry.id);
    } catch (e) {}
    try {
      // ...and one that already fired and is sitting in the tray.
      await Notifications.dismissNotificationAsync(entry.id);
    } catch (e) {}
  }
  return entries.filter((e) => e.date !== todayKey);
}

// Called once per app load: wipes every notification this app has
// scheduled and rebuilds each habit's window from scratch. This is
// intentionally a clean-slate approach rather than an incremental
// top-up — topping up individual habits risks leaving old, orphaned
// schedules behind if state ever gets out of sync (e.g. across repeated
// app restarts during testing), which shows up as duplicate
// notifications. Cancelling everything and rebuilding removes that
// possibility entirely.
export async function resyncAllHabitNotifications(habits) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const updates = {};
  for (const habit of habits) {
    if (!habit.time) {
      updates[habit.id] = [];
      continue;
    }
    updates[habit.id] = await scheduleHabitNotifications({ ...habit, scheduledNotifications: [] });
  }
  return updates;
}

// Fires a notification a few seconds from now. Purely a diagnostic: if
// this does not appear, the problem is permissions/channel/OS settings
// rather than anything to do with how habits are scheduled.
export async function sendTestNotification() {
  await ensureNotificationPermissions();
  const when = new Date(Date.now() + 5000);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Tracker notifications work',
      body: 'If you can see this, habit reminders can fire too.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: 'habits',
    },
  });
}

// How many reminders are actually queued with the OS right now, and for
// which habits — the honest answer to "is anything scheduled at all?".
export async function getScheduledSummary() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return { count: all.length };
}

// One-off reminder for a To Do item, unlike habits' recurring
// day-pattern scheduling - a To Do just needs a single notification at
// one specific date+time. Returns the notification id (or null if no
// reminder was actually scheduled) so it can be cancelled later.
export async function scheduleTodoNotification(todo) {
  if (!todo.dueDate || !todo.reminderTime || !/^\d{1,2}:\d{2}$/.test(todo.reminderTime)) {
    return null;
  }
  const [hh, mm] = todo.reminderTime.split(':').map(Number);
  const when = new Date(`${todo.dueDate}T00:00:00`);
  when.setHours(hh, mm, 0, 0);
  if (when <= new Date()) return null; // already in the past, nothing to schedule

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📝 ' + todo.text,
        body: "It's time — tap to check it off in Tracker.",
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 600, 300, 600, 300, 600],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: 'habits',
      },
    });
    return id;
  } catch (e) {
    return null;
  }
}

// Cancels a To Do's pending reminder - called when the item is edited
// (before rescheduling), marked done, or deleted, so a stale
// notification never fires for something that's no longer relevant.
export async function cancelTodoNotification(todo) {
  if (!todo.reminderNotificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(todo.reminderNotificationId);
  } catch (e) {
    // already fired or invalid — fine to ignore
  }
}

