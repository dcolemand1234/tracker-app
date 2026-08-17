import * as IntentLauncher from 'expo-intent-launcher';
import { Platform, Alert, Linking } from 'react-native';

// Why this exists:
// expo-notifications can only ever produce a NOTIFICATION — a banner
// with a short sound. A real alarm (screen wakes, keeps sounding until
// you dismiss it, plays at alarm volume even in silent mode) is a
// different Android mechanism entirely, and the library gives no access
// to it. Rather than keep tuning notification settings that can never
// behave like an alarm, this hands the job to the app that already does
// it properly: your phone's own Clock app.
//
// ACTION_SET_ALARM is a standard Android intent that any clock app
// implements. The alarm it creates is a real system alarm, indenpendent
// of this app — it fires even if Tracker is closed or force-stopped.

const ACTION_SET_ALARM = 'android.intent.action.SET_ALARM';

// Android's alarm intent numbers days Monday=2 ... Sunday=1, matching
// java.util.Calendar, whereas the app stores Sunday=0 ... Saturday=6.
function toCalendarDay(dow) {
  return dow === 0 ? 1 : dow + 1;
}

export function canSetPhoneAlarm() {
  return Platform.OS === 'android';
}

// Opens the Clock app pre-filled with this habit's time and days. The
// user confirms it there, which is deliberate: it means no surprise
// alarms, and it's also why this needs no runtime permission prompt.
export async function setPhoneAlarmForHabit(habit, options) {
  const silent = !!(options && options.silent);
  // Separate from `silent` on purpose - silent originally controlled
  // both "don't show error alerts" AND "skip the Clock app's
  // confirmation UI" as one flag, which conflated two different
  // concerns. SKIP_UI=true (create the alarm with zero user
  // interaction) is exactly the kind of silent-automation behavior
  // newer Android versions have gotten stricter about blocking for
  // security reasons - defaulting to false (show the Clock app's own
  // confirmation, one tap) trades a little convenience for actually
  // working reliably.
  const skipUI = options && options.skipUI != null ? !!options.skipUI : false;
  if (!canSetPhoneAlarm()) {
    if (!silent) {
      Alert.alert('Android only', 'Creating a system alarm this way is an Android feature.');
    }
    return { success: false, errorMessage: 'Not on Android.' };
  }
  if (!habit.time || !/^\d{1,2}:\d{2}$/.test(habit.time)) {
    if (!silent) Alert.alert('No time set', 'Set a reminder time for this habit first.');
    return { success: false, errorMessage: 'No time set.' };
  }

  const [hour, minutes] = habit.time.split(':').map(Number);

  const base = {
    'android.intent.extra.alarm.HOUR': hour,
    'android.intent.extra.alarm.MINUTES': minutes,
    'android.intent.extra.alarm.MESSAGE': habit.text,
    'android.intent.extra.alarm.SKIP_UI': skipUI,
  };

  const days =
    habit.days && habit.days.length
      ? habit.days.map(toCalendarDay)
      : [1, 2, 3, 4, 5, 6, 7];

  // Two attempts on purpose. Passing an array through the native bridge
  // is the fragile part here — if the repeat-days extra is rejected the
  // whole intent fails and no alarm is created at all. So try with the
  // days, and if anything goes wrong fall back to a one-off alarm at the
  // right time, which is far better than silently doing nothing.
  try {
    await IntentLauncher.startActivityAsync(ACTION_SET_ALARM, {
      extra: { ...base, 'android.intent.extra.alarm.DAYS': days },
    });
    return { success: true, errorMessage: null };
  } catch (withDaysError) {
    try {
      await IntentLauncher.startActivityAsync(ACTION_SET_ALARM, { extra: base });
      return { success: true, errorMessage: null };
    } catch (e) {
      // TEMP DEBUG: returning the real exception detail (previously
      // only shown when NOT silent, so the auto-triggered silent:true
      // call never surfaced it) so we can see Android's actual reason
      // for the failure instead of guessing at more theories blind.
      const detail = (e && e.message ? e.message : String(e)) || 'unknown error';
      if (!silent) {
        Alert.alert(
          "Couldn't create the alarm",
          'Set one for ' + habit.time + ' manually in your Clock app.\n\nDetails: ' + detail
        );
      }
      return { success: false, errorMessage: detail };
    }
  }
}

// Opens the Clock app so alarms created earlier can be edited or removed.
export async function openPhoneClock() {
  if (!canSetPhoneAlarm()) return;
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.SHOW_ALARMS');
  } catch (e) {
    Linking.openURL('clock://').catch(() => {});
  }
}

