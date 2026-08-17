import { getAuth, GoogleAuthProvider, signInWithCredential, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from '@react-native-firebase/firestore';

// Migrated to the modular API (React Native Firebase v22+). The old
// namespaced style this used before - `auth.GoogleAuthProvider`,
// `auth().signInWithCredential(...)`, `firestore().collection(...)` -
// is what caused "Cannot read property GoogleAuthProvider of
// undefined": at v22+, GoogleAuthProvider is its own top-level export,
// not a property attached to the default `auth` import, and the two
// API styles can't be mixed - auth and firestore both had to move
// together, not one at a time.

// Exchanges the Google tokens (already obtained via
// @react-native-google-signin/google-signin) for a real Firebase Auth
// session, so Firestore's security rules can recognize this user via
// request.auth.uid. Firebase's *native* Android auth module (unlike the
// plain web SDK) requires both idToken and accessToken together, even
// though Firebase's own docs list accessToken as optional.
export async function signInToFirebaseWithGoogle(idToken, accessToken) {
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const result = await signInWithCredential(getAuth(), credential);
  return result.user.uid;
}

export async function signOutOfFirebase() {
  try {
    await signOut(getAuth());
  } catch (e) {
    // ignore — local state gets cleared regardless
  }
}

export function currentFirebaseUid() {
  return getAuth().currentUser?.uid || null;
}

// Pushes the full app data payload to this user's backup document,
// overwriting whatever was there before.
//
// Firestore's hard document-size limit is 1MB, but the actual crash
// this guards against happens earlier than that: Android's local
// SQLite CursorWindow (used by Firestore's own offline persistence
// cache) throws a native RuntimeException - not a catchable JS
// rejection - once a single row/document gets too large. That crash
// happens below the JS bridge, so a try/catch around setDoc can't stop
// it; the payload size has to be checked and refused BEFORE the write
// is ever attempted.
const MAX_SAFE_PAYLOAD_BYTES = 900 * 1024; // stay comfortably under Firestore's 1MB document limit

export async function pushBackupToCloud(payload) {
  const uid = currentFirebaseUid();
  if (!uid) throw new Error('Not signed in.');
  const size = JSON.stringify(payload).length;
  if (size > MAX_SAFE_PAYLOAD_BYTES) {
    const err = new Error(
      `Backup too large to sync to the cloud (${(size / 1024).toFixed(0)}KB, limit ~${(MAX_SAFE_PAYLOAD_BYTES / 1024).toFixed(0)}KB). Everything is still saved locally - it just can't sync until the data is smaller (usually means removing some photos).`
    );
    err.isPayloadTooLarge = true;
    throw err;
  }
  const db = getFirestore();
  await setDoc(doc(db, 'trackerBackups', uid), {
    data: payload,
    updatedAt: serverTimestamp(),
  });
}

// Pulls this user's backup document. Returns null if nothing's been
// synced yet.
export async function pullBackupFromCloud() {
  const uid = currentFirebaseUid();
  if (!uid) throw new Error('Not signed in.');
  const db = getFirestore();
  const snap = await getDoc(doc(db, 'trackerBackups', uid));
  // exists is a METHOD in the modular API, not a property like it was
  // in the old namespaced style - a easy thing to get wrong silently.
  if (!snap.exists()) return null;
  const data = snap.data();
  return data?.data || null;
}
