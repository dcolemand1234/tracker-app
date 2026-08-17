import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { shared, GOLD, INK, DIM, ROSE } from './theme';
import {
  signInWithGoogleIdToken,
  pushToFirestore,
  pullFromFirestore,
} from './firestoreSync';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID =
  '973257404060-grcm9hekanhh1ct8i27sfrtkf9b0oqg7.apps.googleusercontent.com';

export default function AccountScreen({ getPayload, applyPayload }) {
  const [account, setAccount] = useState(null); // { idToken, uid, email }
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
  });

  useEffect(() => {
    async function handleResponse() {
      if (response?.type === 'success') {
        const googleIdToken = response.authentication?.idToken;
        if (!googleIdToken) {
          setStatus('Google sign-in did not return an ID token.');
          return;
        }
        setBusy(true);
        setStatus('Signing in...');
        try {
          const acct = await signInWithGoogleIdToken(googleIdToken);
          setAccount(acct);
          setStatus(`Signed in as ${acct.email}`);
        } catch (e) {
          setStatus('Sign-in failed: ' + e.message);
        } finally {
          setBusy(false);
        }
      } else if (response?.type === 'error') {
        setStatus('Google sign-in error: ' + JSON.stringify(response.error));
      }
    }
    handleResponse();
  }, [response]);

  async function handlePush() {
    if (!account) return;
    setBusy(true);
    setStatus('Pushing to cloud...');
    try {
      const payload = getPayload();
      await pushToFirestore(account.uid, account.idToken, payload);
      setStatus('Pushed to cloud successfully.');
    } catch (e) {
      setStatus('Push failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePull() {
    if (!account) return;
    setBusy(true);
    setStatus('Pulling from cloud...');
    try {
      const data = await pullFromFirestore(account.uid, account.idToken);
      if (!data) {
        setStatus('No data found in the cloud for this account yet.');
        return;
      }
      Alert.alert(
        'Overwrite local data?',
        'This replaces everything currently shown in this app with what\'s in the cloud.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setStatus('') },
          {
            text: 'Overwrite',
            style: 'destructive',
            onPress: () => {
              applyPayload(data);
              setStatus('Pulled from cloud and applied.');
            },
          },
        ]
      );
    } catch (e) {
      setStatus('Pull failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={shared.container}>
      <Text style={shared.h1}>Account</Text>
      <Text style={shared.tagline}>Google sign-in and cloud sync</Text>

      <View style={shared.block}>
        {account ? (
          <>
            <Text style={{ fontSize: 16, fontWeight: '700', color: INK }}>
              {account.email}
            </Text>
            <Text style={{ fontSize: 12, color: DIM, marginTop: 2 }}>
              UID: {account.uid}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              Not signed in
            </Text>
            <Text style={shared.tagline}>
              Sign in with the same Google account you use on the web app to
              sync with your real Tracker data.
            </Text>
            <TouchableOpacity
              style={styles.signInBtn}
              disabled={!request || busy}
              onPress={() => promptAsync()}
            >
              <Text style={styles.signInBtnText}>Sign in with Google</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {account && (
        <View style={shared.block}>
          <Text style={shared.blockTitle}>Cloud Sync</Text>
          <Text style={[shared.tagline, { marginTop: 4 }]}>
            Manual for now — nothing syncs automatically. Push sends what's
            currently in this app to Firestore. Pull replaces what's in this
            app with whatever is in Firestore.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            disabled={busy}
            onPress={handlePush}
          >
            <Text style={styles.actionBtnText}>Push to Cloud</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnAlt]}
            disabled={busy}
            onPress={handlePull}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnTextAlt]}>
              Pull from Cloud
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {status ? (
        <View style={shared.block}>
          <Text style={{ color: status.includes('failed') ? ROSE : INK }}>
            {status}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  signInBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  signInBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  actionBtnAlt: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GOLD,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionBtnTextAlt: { color: GOLD },
});

