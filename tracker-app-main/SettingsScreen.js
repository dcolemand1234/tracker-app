import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { signInToFirebaseWithGoogle, signOutOfFirebase, pullBackupFromCloud, pushBackupToCloud, currentFirebaseUid } from './firebaseSync';
import { resetRoadmapProgress } from './leveling';
import { resetTodayHabits } from './habitUtils';
import { sendTestNotification, getScheduledSummary, resyncAllHabitNotifications } from './notifications';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import ColorWheelPicker from './ColorWheelPicker';

// This must match whatever Web Client ID Firebase's own Google sign-in
// provider is configured to trust (Firebase Console -> Authentication ->
// Sign-in method -> Google -> Web SDK configuration) — otherwise the ID
// tokens we generate carry the wrong "audience" and Firebase rejects
// them with auth/invalid-credential. This is the original client tied
// to the project from the start (also the one referenced in
// google-services.json), not the newer one created during Android
// OAuth client setup.
const WEB_CLIENT_ID = '973257404060-grcm9hekanhh1ct8i27sfrtkf9b0oqg7.apps.googleusercontent.com';

GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });

// A rough but genuinely useful estimate - not the exact on-disk size
// (chunking/compression means the real number differs slightly), but
// accurate enough to answer the actual question: which category is
// actually eating the storage.
function estimateBytes(collection) {
  try {
    return JSON.stringify(collection).length;
  } catch (e) {
    return 0;
  }
}
function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SettingsScreen({
  googleUser,
  setGoogleUser,
  setLevel,
  setStats,
  setRewardPoints,
  setRewardHistory,
  setHero,
  customColors,
  setCustomColors,
  calendarViewMode,
  setCalendarViewMode,
  habits,
  setHabits,
  saveError,
  loadError,
  storageBreakdown,
  saveBytes,
  meditationSettings,
  setMeditationSettings,
  applyFullPayload,
  cloudSyncError,
  getLatestPayload,
}) {
  const [busy, setBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState('');
  const [colorError, setColorError] = useState('');
  const [notifStatus, setNotifStatus] = useState('');

  async function runNotificationTest() {
    setNotifStatus('Sending a test notification in 5 seconds...');
    try {
      await sendTestNotification();
      const { count } = await getScheduledSummary();
      setNotifStatus(
        `Test sent — watch for it in ~5s.\n${count} reminder${count === 1 ? '' : 's'} currently queued.`
      );
    } catch (e) {
      setNotifStatus('Failed: ' + e.message);
    }
  }

  async function rescheduleAll() {
    setNotifStatus('Rebuilding reminders...');
    try {
      const updates = await resyncAllHabitNotifications(habits);
      setHabits((prev) =>
        prev.map((h) =>
          updates[h.id] !== undefined ? { ...h, scheduledNotifications: updates[h.id] } : h
        )
      );
      const { count } = await getScheduledSummary();
      const withTime = habits.filter((h) => h.time).length;
      setNotifStatus(
        `${count} reminder${count === 1 ? '' : 's'} queued from ${withTime} habit${withTime === 1 ? '' : 's'} with a time set.` +
          (withTime === 0
            ? '\n\nNo habit has a reminder time yet — long-press a habit in Habits and set one under Reminder.'
            : '')
      );
    } catch (e) {
      setNotifStatus('Failed: ' + e.message);
    }
  }

  function removeCustomColor(hex) {
    Alert.alert('Remove this color?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setCustomColors((prev) => prev.filter((c) => c !== hex)),
      },
    ]);
  }

  async function signIn() {
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const user = response.data?.user;

      // Always show the profile once Google itself confirms sign-in,
      // even if the Firebase bridge below has trouble — otherwise a
      // Firebase-side hiccup makes sign-in look totally broken from the
      // UI's perspective when the Google part actually succeeded fine.
      if (user) {
        setGoogleUser({ name: user.name, email: user.email, picture: user.photo });
      }

      const tokens = await GoogleSignin.getTokens();
      await signInToFirebaseWithGoogle(tokens.idToken, tokens.accessToken);
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break;
          case statusCodes.IN_PROGRESS:
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert('Google Play Services needed', 'This device is missing or has outdated Google Play Services.');
            break;
          default:
            Alert.alert('Sign-in failed', `${error.message || 'Something went wrong.'} (code: ${error.code})`);
        }
      } else {
        // This branch used to always show a generic message no matter
        // what the actual error was - meaning a real, specific Firebase
        // error (e.g. "auth/operation-not-allowed" if Google isn't
        // enabled as a sign-in provider in the Firebase console) was
        // being thrown away instead of shown. Now it surfaces whatever
        // Firebase actually reports.
        Alert.alert(
          'Sign-in failed',
          (error && (error.message || error.code)) || 'Something went wrong.'
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    Alert.alert('Sign out?', 'This only signs you out on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await GoogleSignin.signOut();
          } catch (e) {}
          await signOutOfFirebase();
          setGoogleUser(null);
          setSyncStatus('');
        },
      },
    ]);
  }

  async function handlePush() {
    setPushBusy(true);
    setPushStatus('Backing up to cloud...');
    try {
      const payload = getLatestPayload ? getLatestPayload() : null;
      if (!payload) {
        setPushStatus('Nothing to back up yet - make a change first.');
        return;
      }
      await pushBackupToCloud(payload);
      setPushStatus('Backed up to cloud just now.');
    } catch (e) {
      setPushStatus('Backup failed: ' + e.message);
    } finally {
      setPushBusy(false);
    }
  }

  async function handleRestore() {
    setRestoreBusy(true);
    const uid = currentFirebaseUid();
    setRestoreStatus(`Checking cloud backup for uid: ${uid || '(none - not signed in)'}...`);
    try {
      const cloudData = await pullBackupFromCloud();
      if (!cloudData) {
        setRestoreStatus(
          `No backup document found at trackerBackups/${uid}. ` +
            'If that uid doesn\'t match what you see in the Firebase console, this is a sign-in/account issue, not missing data.'
        );
        return;
      }
      setRestoreStatus('');
      Alert.alert(
        'Restore from cloud?',
        'This replaces everything currently in this app with your latest cloud backup. Anything only on this device that never made it to the cloud will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              applyFullPayload(cloudData);
              setRestoreStatus('Restored from cloud backup.');
            },
          },
        ]
      );
    } catch (e) {
      setRestoreStatus(
        `Restore failed [uid: ${uid || 'none'}]${e.code ? ` (${e.code})` : ''}: ${e.message}`
      );
    } finally {
      setRestoreBusy(false);
    }
  }

  function resetGame() {
    Alert.alert(
      'Reset all Roadmap progress?',
      "This resets your Level, XP, every Stat's level, your Rewards points/history, and your hero's gear back to zero. Your Cards, Goals, and Tasks stay exactly as they are.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetRoadmapProgress({ setLevel, setStats, setRewardPoints, setRewardHistory, setHero });
          },
        },
      ]
    );
  }

  function handleResetToday() {
    Alert.alert(
      "Reset today's habits?",
      "This un-checks every habit for today only (including today's Meditation breath-hold entry, if any). Streaks and past history stay intact — this only clears today.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetTodayHabits(habits, setHabits),
        },
      ]
    );
  }

  const breakdownEntries = storageBreakdown
    ? Object.entries(storageBreakdown)
        .map(([label, collection]) => ({ label, bytes: estimateBytes(collection) }))
        .sort((a, b) => b.bytes - a.bytes)
    : [];
  const breakdownTotal = breakdownEntries.reduce((sum, e) => sum + e.bytes, 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Settings</Text>
        <Text style={shared.tagline}>Your account and app preferences</Text>

        <View style={shared.blockAccent}>
          <Text style={styles.sectionLabel}>Storage</Text>
          {saveError ? (
            <Text style={styles.storageBad}>
              ⚠️ Last save failed: {saveError}
            </Text>
          ) : (
            <Text style={styles.storageOk}>✓ Last save succeeded</Text>
          )}
          <Text style={{ color: DIM, fontSize: 12, marginTop: 4, marginBottom: 10 }}>
            Last successful save: {saveBytes ? formatBytes(saveBytes) : '—'}
          </Text>
          {breakdownEntries.length > 0 ? (
            <>
              <Text style={{ color: DIM, fontSize: 11, marginBottom: 8 }}>
                What's actually using space right now, biggest first:
              </Text>
              {breakdownEntries.map((e) => (
                <View key={e.label} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ color: INK, fontSize: 13 }}>{e.label}</Text>
                    <Text style={{ color: GOLD, fontSize: 13, fontWeight: '700' }}>{formatBytes(e.bytes)}</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <View
                      style={{
                        height: '100%',
                        width: `${breakdownTotal > 0 ? Math.max(2, (e.bytes / breakdownTotal) * 100) : 0}%`,
                        backgroundColor: GOLD,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              ))}
              <Text style={{ color: DIM, fontSize: 11, marginTop: 6 }}>
                Most of this is photos - each one is stored as image data, not a
                link, so categories with lots of photos (Restaurants and its
                menu items especially) add up fastest. If storage is full,
                removing a few photos from the largest category above is the
                most direct way to free up space right now.
              </Text>
            </>
          ) : null}
        </View>

        <View style={shared.block}>
          <Text style={styles.sectionLabel}>Account</Text>
          {googleUser ? (
            <View style={styles.profileRow}>
              {googleUser.picture ? (
                <Image source={{ uri: googleUser.picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarLetter}>
                    {(googleUser.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.profileName}>{googleUser.name}</Text>
                <Text style={styles.profileEmail}>{googleUser.email}</Text>
              </View>
            </View>
          ) : (
            <Text style={[shared.tagline, { marginBottom: 12 }]}>
              Not signed in yet.
            </Text>
          )}

          {googleUser ? (
            <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.signInBtn} disabled={busy} onPress={signIn}>
              <Text style={styles.signInBtnText}>
                {busy ? 'Signing in...' : 'Sign in with Google'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {googleUser ? (
          <View style={shared.block}>
            <Text style={styles.sectionLabel}>Cloud Sync</Text>
            <Text style={[shared.tagline, { marginBottom: 12 }]}>
              Your data syncs to the cloud automatically whenever you're
              signed in and change something - the button below is only
              for forcing an immediate backup and seeing it confirmed.
            </Text>
            {cloudSyncError ? (
              <Text style={{ color: ROSE, fontSize: 12, marginBottom: 10 }}>
                ⚠️ Last automatic sync failed: {cloudSyncError}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.signOutBtn}
              disabled={pushBusy}
              onPress={handlePush}
            >
              <Text style={styles.signOutBtnText}>
                {pushBusy ? 'Backing up...' : 'Backup to Cloud'}
              </Text>
            </TouchableOpacity>
            {pushStatus ? (
              <Text style={{ color: pushStatus.includes('failed') ? ROSE : INK, marginTop: 4, marginBottom: 8 }}>
                {pushStatus}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.signOutBtn, { marginTop: 8 }]}
              disabled={restoreBusy}
              onPress={handleRestore}
            >
              <Text style={styles.signOutBtnText}>
                {restoreBusy ? 'Checking...' : 'Restore from Cloud'}
              </Text>
            </TouchableOpacity>
            <Text style={[shared.tagline, { marginTop: 8, marginBottom: 4 }]}>
              Restore pulls your latest cloud backup back down - use it if
              local data was ever wiped (e.g. after clearing app storage).
            </Text>
            {restoreStatus ? (
              <Text style={{ color: restoreStatus.includes('failed') ? ROSE : INK, marginTop: 4 }}>
                {restoreStatus}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={shared.block}>
          <Text style={styles.sectionLabel}>Roadmap Game</Text>
          <Text style={[shared.tagline, { marginBottom: 12 }]}>
            Start your Level, Stats, Rewards, and hero gear over from
            scratch. Your Cards, Goals, and Tasks aren't affected.
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={resetGame}>
            <Text style={styles.resetBtnText}>Reset All Progress</Text>
          </TouchableOpacity>
        </View>

        <View style={shared.block}>
          <Text style={styles.sectionLabel}>Custom Colors</Text>
          <Text style={[shared.tagline, { marginBottom: 12 }]}>
            Add your own colors to use alongside the built-in palette
            anywhere you pick a color (Roadmap cards, stats, rewards).
          </Text>
          {customColors.length > 0 ? (
            <View style={styles.colorSwatchRow}>
              {customColors.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }]}
                  onPress={() => removeCustomColor(c)}
                />
              ))}
            </View>
          ) : null}
          <ColorWheelPicker
            onPick={(hex) => {
              if (customColors.includes(hex)) {
                setColorError('Already added.');
                return;
              }
              setCustomColors((prev) => [...prev, hex]);
              setColorError('');
            }}
          />
          {colorError ? <Text style={styles.colorErrorText}>{colorError}</Text> : null}
          <Text style={styles.tapHint}>Tap a swatch above to remove it.</Text>
        </View>

        <View style={shared.block}>
          <Text style={styles.sectionLabel}>Calendar View</Text>
          <Text style={[shared.tagline, { marginBottom: 12 }]}>
            Choose how the Calendar tab displays.
          </Text>
          <View style={styles.viewModeRow}>
            <TouchableOpacity
              style={[styles.viewModeBtn, calendarViewMode === 'agenda' && styles.viewModeBtnSel]}
              onPress={() => setCalendarViewMode('agenda')}
            >
              <Text
                style={[
                  styles.viewModeBtnText,
                  calendarViewMode === 'agenda' && styles.viewModeBtnTextSel,
                ]}
              >
                Agenda
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, calendarViewMode === 'grid' && styles.viewModeBtnSel]}
              onPress={() => setCalendarViewMode('grid')}
            >
              <Text
                style={[
                  styles.viewModeBtnText,
                  calendarViewMode === 'grid' && styles.viewModeBtnTextSel,
                ]}
              >
                Calendar Grid
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={shared.block}>
          <Text style={styles.sectionLabel}>Today's Habits</Text>
          <Text style={[shared.tagline, { marginBottom: 12 }]}>
            Made a mistake today? Clear just today's check-offs without
            touching your streaks or past history.
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetToday}>
            <Text style={styles.resetBtnText}>Reset Today's Habits</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  storageOk: { color: '#4f9e5c', fontSize: 13, fontWeight: '700' },
  storageBad: { color: ROSE, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DIM,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 22, fontWeight: '700' },
  profileName: { fontSize: 16, fontWeight: '700', color: INK },
  profileEmail: { fontSize: 13, color: DIM, marginTop: 2 },
  signInBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signInBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  signOutBtn: {
    borderWidth: 1,
    borderColor: ROSE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutBtnText: { color: ROSE, fontSize: 15, fontWeight: '700' },
  syncBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  syncBtnAlt: { backgroundColor: CARD, borderWidth: 1, borderColor: GOLD, marginBottom: 0 },
  syncBtnTextAlt: { color: GOLD },
  syncStatus: { color: INK, fontSize: 13, marginTop: 12, textAlign: 'center' },
  resetBtn: {
    borderWidth: 1,
    borderColor: ROSE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetBtnText: { color: ROSE, fontSize: 14, fontWeight: '700' },
  colorSwatchRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  colorErrorText: { color: ROSE, fontSize: 12, marginTop: 8 },
  tapHint: { color: DIM, fontSize: 11, marginTop: 10 },
  viewModeRow: { flexDirection: 'row', gap: 10 },
  viewModeBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#232d3a',
    borderWidth: 1,
    borderColor: BORDER,
  },
  viewModeBtnSel: { backgroundColor: GOLD, borderColor: GOLD },
  viewModeBtnText: { color: INK, fontWeight: '700', fontSize: 13 },
  viewModeBtnTextSel: { color: '#fff' },
  miniLabel: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#232d3a',
    borderWidth: 1,
    borderColor: BORDER,
  },
  optionChipSel: { backgroundColor: GOLD, borderColor: GOLD },
  optionChipText: { color: INK, fontSize: 13, fontWeight: '600' },
  optionChipTextSel: { color: '#fff', fontWeight: '800' },
});

