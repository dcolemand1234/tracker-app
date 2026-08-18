#!/bin/bash
set -e

# Run this from the root of your tracker-app project.
#
# What this fixes: photos were being stored as base64 text directly in
# your app data, and your whole backup (habits, inventory, recipes,
# everything) gets pushed to ONE Firestore document capped at ~900KB.
# A handful of photos as base64 blows past that instantly - that's the
# "Firebase image memory is at its limit" error.
#
# The fix: before syncing to the cloud, every base64 photo now gets
# uploaded to Firebase Storage once, and only its short download URL
# goes into the Firestore document instead of the full image data.
# Your local on-device data is untouched - it still keeps full photos,
# this only changes what gets sent to the cloud.

echo "==> Writing firebaseStorage.js"
cat > firebaseStorage.js << 'FILE_EOF'
import { getStorage, ref, putString, getDownloadURL } from '@react-native-firebase/storage';
import { getAuth } from '@react-native-firebase/auth';

// The rest of the app stores photos as base64 data URIs
// (data:image/jpeg;base64,...) straight in app state, which is what let
// them end up embedded in the single Firestore backup document and blow
// past its size limit. Rather than touching every screen that picks a
// photo, this file intercepts the payload right before it goes to the
// cloud: any base64 image it finds gets uploaded to Firebase Storage
// once, and the (tiny) download URL is swapped in for the (huge) base64
// string. Local storage on-device is untouched - it still keeps the
// real base64 data, so nothing about local/offline behavior changes.

// In-memory cache so the same photo isn't re-uploaded on every autosave
// during a single app session. Keyed by a hash of the data URI itself,
// so it survives across saves without needing anywhere else to persist
// state, and two identical images (even in different fields) share one
// upload.
const uploadCache = new Map(); // dataUri -> https download URL

// Cheap, non-cryptographic string hash - only used to build a stable,
// short storage filename per unique image so re-saving the same photo
// doesn't create duplicate files in Storage.
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

const DATA_URI_RE = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/;

// Uploads a single base64 image data URI to this user's private Storage
// folder if it hasn't been uploaded already, returning the https
// download URL. Non-image strings (already-uploaded URLs, plain text,
// etc.) are returned unchanged. Upload failures (e.g. no network) are
// swallowed and the original data URI is returned as-is, so a single
// bad photo can't break the whole backup - the size guard in
// firebaseSync.js is still the final safety net.
export async function uploadDataUriIfNeeded(dataUri) {
  if (uploadCache.has(dataUri)) return uploadCache.get(dataUri);

  const match = DATA_URI_RE.exec(dataUri);
  if (!match) return dataUri; // not a base64 image - nothing to do

  const uid = getAuth().currentUser?.uid;
  if (!uid) return dataUri; // not signed in - can't upload yet

  const [, mime, base64Data] = match;
  const ext = mime.split('/')[1] || 'jpg';
  const name = `${hashString(dataUri)}.${ext}`;

  try {
    const storageRef = ref(getStorage(), `users/${uid}/images/${name}`);
    await putString(storageRef, base64Data, 'base64', { contentType: mime });
    const url = await getDownloadURL(storageRef);
    uploadCache.set(dataUri, url);
    return url;
  } catch (e) {
    // Best-effort - leave this one image as base64 for now, it'll be
    // retried on the next sync attempt.
    return dataUri;
  }
}

// Recursively walks any JSON-shaped value (the kind that comes out of
// JSON.parse / goes into JSON.stringify - plain objects, arrays,
// strings, numbers, booleans, null) and replaces every base64 image
// data URI it finds with its uploaded Storage URL. Everything else is
// left exactly as it was.
export async function replaceBase64ImagesWithUrls(value) {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) {
      return uploadDataUriIfNeeded(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map(replaceBase64ImagesWithUrls));
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    const resolved = await Promise.all(
      keys.map((k) => replaceBase64ImagesWithUrls(value[k]))
    );
    const out = {};
    keys.forEach((k, i) => {
      out[k] = resolved[i];
    });
    return out;
  }
  return value;
}
FILE_EOF

echo "==> Writing storage.rules"
cat > storage.rules << 'FILE_EOF'
rules_version = '2';

// Backup photos are uploaded to users/{uid}/images/... by
// firebaseStorage.js. Each signed-in user can only read and write
// inside their own uid folder - nobody can browse or overwrite another
// user's photos.
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/images/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
FILE_EOF

echo "==> Updating firebaseSync.js"
if [ ! -f firebaseSync.js ]; then
  echo "ERROR: firebaseSync.js not found - run this from your project root." >&2
  exit 1
fi
cat > firebaseSync.js << 'FILE_EOF'
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { replaceBase64ImagesWithUrls } from './firebaseStorage';

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

  // Photos live in the payload as base64 data URIs, which is what was
  // actually filling up the 1MB document limit - a handful of photos
  // alone can be several hundred KB each as base64 text. Swap every one
  // of them for its Firebase Storage download URL (a short string)
  // before ever measuring or writing the document. Local storage keeps
  // the original base64 payload untouched - only what gets sent to the
  // cloud is sanitized here.
  const cloudPayload = await replaceBase64ImagesWithUrls(payload);

  const size = JSON.stringify(cloudPayload).length;
  if (size > MAX_SAFE_PAYLOAD_BYTES) {
    const err = new Error(
      `Backup too large to sync to the cloud (${(size / 1024).toFixed(0)}KB, limit ~${(MAX_SAFE_PAYLOAD_BYTES / 1024).toFixed(0)}KB). Everything is still saved locally - it just can't sync until the data is smaller (usually means removing some photos).`
    );
    err.isPayloadTooLarge = true;
    throw err;
  }
  const db = getFirestore();
  await setDoc(doc(db, 'trackerBackups', uid), {
    data: cloudPayload,
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
FILE_EOF

echo "==> Adding @react-native-firebase/storage to app.json plugins"
node -e "
const fs = require('fs');
const p = './app.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const plugins = j.expo.plugins || [];
if (!plugins.includes('@react-native-firebase/storage')) {
  const idx = plugins.indexOf('@react-native-firebase/auth');
  const insertAt = idx === -1 ? plugins.length : idx + 1;
  plugins.splice(insertAt, 0, '@react-native-firebase/storage');
  j.expo.plugins = plugins;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  console.log('  added plugin');
} else {
  console.log('  already present, skipped');
}
"

echo "==> Adding firebase.json storage config"
node -e "
const fs = require('fs');
const p = './firebase.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.storage = { rules: 'storage.rules' };
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
"

echo "==> Installing @react-native-firebase/storage"
npm install @react-native-firebase/storage@^26.1.0

echo ""
echo "Done. Remaining manual steps:"
echo "  1. In the Firebase console, make sure Cloud Storage is enabled"
echo "     for this project (Build > Storage > Get started), if you"
echo "     haven't used it before."
echo "  2. Deploy the storage rules: firebase deploy --only storage"
echo "  3. Native config changed (new plugin), so rebuild the native"
echo "     app rather than just reloading JS:"
echo "       npx expo prebuild --clean"
echo "       npx expo run:android   (or run:ios / eas build)"
echo "  4. Sign in and background/foreground the app once - the next"
echo "     autosave will upload existing photos to Storage and shrink"
echo "     the cloud backup automatically."