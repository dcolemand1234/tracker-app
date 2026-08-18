import { getAuth, GoogleAuthProvider, signInWithCredential, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, writeBatch, serverTimestamp } from '@react-native-firebase/firestore';

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

// Firestore caps a single document at ~1MB, and (on Android) the local
// SQLite CursorWindow used by Firestore's own offline cache can crash
// natively even before that if one document/row gets too large. Rather
// than uploading photos to Cloud Storage (which Google now requires a
// paid Blaze plan to use), the backup is instead split across many
// small documents in a `chunks` subcollection - each one safely under
// the limit - which stays entirely on Firestore's free Spark plan.
const CHUNK_SIZE = 700 * 1024; // characters per chunk document, comfortably under the 1MB doc cap
const MAX_TOTAL_BYTES = 15 * 1024 * 1024; // sanity ceiling so a runaway payload fails loudly instead of writing hundreds of docs

function chunksCollectionPath(uid) {
  return ['trackerBackups', uid, 'chunks'];
}

// Pushes the full app data payload to this user's backup, overwriting
// whatever was there before. The payload is JSON-stringified once and
// sliced into fixed-size chunks, each written as its own small
// document; a manifest document records how many chunks make up the
// current backup (and any leftover chunks from a previously LARGER
// backup are deleted in the same batch, so old data can't linger).
export async function pushBackupToCloud(payload) {
  const uid = currentFirebaseUid();
  if (!uid) throw new Error('Not signed in.');

  const json = JSON.stringify(payload);
  if (json.length > MAX_TOTAL_BYTES) {
    const err = new Error(
      `Backup too large to sync to the cloud (${(json.length / 1024 / 1024).toFixed(1)}MB, limit ~${(MAX_TOTAL_BYTES / 1024 / 1024).toFixed(0)}MB). Everything is still saved locally - it just can't sync until the data is smaller (usually means removing some photos).`
    );
    err.isPayloadTooLarge = true;
    throw err;
  }

  const chunkCount = Math.max(1, Math.ceil(json.length / CHUNK_SIZE));
  const db = getFirestore();
  const manifestRef = doc(db, 'trackerBackups', uid);

  // Need the previous chunk count so a backup that SHRANK (e.g. photos
  // removed) doesn't leave stale trailing chunk documents behind.
  const prevManifestSnap = await getDoc(manifestRef);
  const prevChunkCount = prevManifestSnap.exists() ? prevManifestSnap.data()?.chunkCount || 0 : 0;

  const batch = writeBatch(db);
  for (let i = 0; i < chunkCount; i++) {
    const chunkData = json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    batch.set(doc(db, ...chunksCollectionPath(uid), String(i)), { data: chunkData });
  }
  for (let i = chunkCount; i < prevChunkCount; i++) {
    batch.delete(doc(db, ...chunksCollectionPath(uid), String(i)));
  }
  batch.set(manifestRef, { chunkCount, updatedAt: serverTimestamp() });

  await batch.commit();
}

// Pulls this user's backup, reassembling it from its chunk documents.
// Returns null if nothing's been synced yet.
export async function pullBackupFromCloud() {
  const uid = currentFirebaseUid();
  if (!uid) throw new Error('Not signed in.');
  const db = getFirestore();

  const manifestSnap = await getDoc(doc(db, 'trackerBackups', uid));
  // exists is a METHOD in the modular API, not a property like it was
  // in the old namespaced style - a easy thing to get wrong silently.
  if (!manifestSnap.exists()) return null;
  const manifestData = manifestSnap.data();
  const chunkCount = manifestData?.chunkCount || 0;

  if (chunkCount === 0) {
    // Backwards compatibility: backups written before the chunked-
    // storage migration stored the full payload directly under a
    // `data` field on this same manifest document, with no
    // chunkCount at all. Treating that as "no backup" would silently
    // throw away a perfectly good pre-migration backup - read it the
    // old way instead.
    if (manifestData && manifestData.data) {
      return manifestData.data;
    }
    return null;
  }

  const chunkSnaps = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) => getDoc(doc(db, ...chunksCollectionPath(uid), String(i))))
  );
  const json = chunkSnaps.map((snap) => snap.data()?.data || '').join('');

  try {
    return JSON.parse(json);
  } catch (e) {
    throw new Error('Cloud backup is corrupted or incomplete - try syncing again from a device with the full data.');
  }
}
