const API_KEY = 'AIzaSyBPAmnkf8lDXBlsPZ2KFmbc0jn8jc6n970';
const PROJECT_ID = 'tracker-c4aad';
const DOC_PATH = (uid) =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/trackerUsers/${uid}`;

// Exchanges a Google ID token for a real Firebase ID token + the Firebase
// UID, using Firebase's Identity Toolkit REST API. This is what makes the
// sign-in "count" the same way it does in the web app (same UID).
export async function signInWithGoogleIdToken(googleIdToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${googleIdToken}&providerId=google.com`,
      requestUri: 'https://tracker-c4aad.firebaseapp.com',
      returnSecureToken: true,
    }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || 'Sign-in failed');
  }
  return {
    idToken: json.idToken,
    uid: json.localId,
    email: json.email,
    displayName: json.displayName,
  };
}

// --- Firestore REST <-> plain JS conversion ---

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val)
      ? { integerValue: String(val) }
      : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const key in val) fields[key] = toFirestoreValue(val[key]);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const key in obj) fields[key] = toFirestoreValue(obj[key]);
  return fields;
}

function parseFirestoreValue(value) {
  if (value == null) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) {
    const out = {};
    const fields = value.mapValue.fields || {};
    for (const key in fields) out[key] = parseFirestoreValue(fields[key]);
    return out;
  }
  if ('arrayValue' in value) {
    const values = value.arrayValue.values || [];
    return values.map(parseFirestoreValue);
  }
  return null;
}

function parseFirestoreDoc(fields) {
  const out = {};
  for (const key in fields) out[key] = parseFirestoreValue(fields[key]);
  return out;
}

// Pushes the full payload to trackerUsers/{uid}, overwriting those fields.
export async function pushToFirestore(uid, idToken, payload) {
  const fieldNames = Object.keys(payload);
  const mask = fieldNames.map((f) => `updateMask.fieldPaths=${f}`).join('&');
  const url = `${DOC_PATH(uid)}?${mask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fields: toFirestoreFields(payload) }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || 'Push failed');
  }
  return true;
}

// Pulls the doc at trackerUsers/{uid}. Returns null if it doesn't exist yet.
export async function pullFromFirestore(uid, idToken) {
  const res = await fetch(DOC_PATH(uid), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const json = await res.json();
  if (json.error) {
    if (json.error.status === 'NOT_FOUND') return null;
    throw new Error(json.error.message || 'Pull failed');
  }
  if (!json.fields) return null;
  return parseFirestoreDoc(json.fields);
}

