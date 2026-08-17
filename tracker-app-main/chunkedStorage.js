import AsyncStorage from '@react-native-async-storage/async-storage';

// Android's AsyncStorage has a per-item size limit, and this app's
// payload includes base64 photos that push it over. A single oversized
// setItem fails outright — which is what made saves silently stop
// working. Splitting the JSON across several keys keeps every
// individual write comfortably under any per-item cap.
//
// Layout on disk:
//   <key>__meta   -> { chunks: N, length: totalChars }
//   <key>__0..N-1 -> slices of the JSON string
//
// The old single-key format is still read on load, so existing data
// migrates across the first time without anything being lost.

const CHUNK_CHARS = 400000; // ~400KB per slice, well under any limit

function metaKey(base) {
  return `${base}__meta`;
}
function chunkKey(base, i) {
  return `${base}__${i}`;
}

// A save that suddenly shrinks dramatically almost always means state
// was lost in memory rather than genuinely emptied by the user — a crash
// mid-load, a bad render, a screen mounting before hydration. Writing it
// would destroy the good copy on disk. So a shrink past this threshold is
// refused and reported instead, and the previous payload is always kept
// under a separate key so it can be restored.
const SHRINK_GUARD = 0.5;

export async function saveChunked(baseKey, value, opts) {
  const json = JSON.stringify(value);

  if (!(opts && opts.force)) {
    const metaRaw = await AsyncStorage.getItem(metaKey(baseKey));
    if (metaRaw) {
      try {
        const prevMeta = JSON.parse(metaRaw);
        if (prevMeta.length && json.length < prevMeta.length * SHRINK_GUARD) {
          const err = new Error(
            `Refused to save: data shrank from ${prevMeta.length} to ${json.length} characters. ` +
              'Your saved data has been left untouched.'
          );
          err.code = 'SHRINK_GUARD';
          throw err;
        }
      } catch (e) {
        if (e.code === 'SHRINK_GUARD') throw e;
      }
    }
  }

  const chunks = [];
  for (let i = 0; i < json.length; i += CHUNK_CHARS) {
    chunks.push(json.slice(i, i + CHUNK_CHARS));
  }

  const pairs = chunks.map((c, i) => [chunkKey(baseKey, i), c]);
  pairs.push([metaKey(baseKey), JSON.stringify({ chunks: chunks.length, length: json.length })]);

  // multiSet is atomic enough for our purposes and much faster than
  // awaiting each write in turn.
  await AsyncStorage.multiSet(pairs);

  // Clear any leftover chunks from a previously larger save, otherwise a
  // shrinking payload would leave stale tail slices behind.
  const stale = [];
  for (let i = chunks.length; i < chunks.length + 12; i++) {
    stale.push(chunkKey(baseKey, i));
  }
  AsyncStorage.multiRemove(stale).catch(() => {});

  return json.length;
}

export async function loadChunked(baseKey) {
  const metaRaw = await AsyncStorage.getItem(metaKey(baseKey));

  if (!metaRaw) {
    // Falling back to the legacy key whenever meta was missing is what
    // silently reverted the app to a months-old save: if the meta record
    // was lost while the chunks were still on disk, this quietly loaded
    // ancient data and the autosave then wrote it over everything.
    //
    // So check whether chunk data exists first. If it does, the meta is
    // damaged rather than absent, and loading anything else would destroy
    // the real save — fail loudly instead so the caller blocks writing.
    const firstChunk = await AsyncStorage.getItem(chunkKey(baseKey, 0));
    if (firstChunk) {
      throw new Error(
        'Saved data index is missing but the data itself is still on disk. ' +
          'Saving is paused to protect it — use Recover Lost Data in Settings.'
      );
    }
    // Genuinely a first run after upgrading: the single-key format is all
    // there is, so use it.
    const legacy = await AsyncStorage.getItem(baseKey);
    return legacy ? JSON.parse(legacy) : null;
  }

  const meta = JSON.parse(metaRaw);
  const keys = [];
  for (let i = 0; i < meta.chunks; i++) keys.push(chunkKey(baseKey, i));
  const entries = await AsyncStorage.multiGet(keys);

  // multiGet does not guarantee ordering, so reassemble by index rather
  // than by the order results come back in.
  const byKey = {};
  entries.forEach(([k, v]) => {
    byKey[k] = v;
  });
  let json = '';
  for (let i = 0; i < meta.chunks; i++) {
    const part = byKey[chunkKey(baseKey, i)];
    if (part == null) throw new Error(`Saved data is incomplete (missing part ${i + 1} of ${meta.chunks})`);
    json += part;
  }
  if (meta.length && json.length !== meta.length) {
    throw new Error('Saved data looks truncated');
  }
  return JSON.parse(json);
}

// Keeps the last good payload under a parallel key before overwriting, so
// there is always one generation to fall back to.
export async function snapshot(baseKey) {
  try {
    const data = await loadChunked(baseKey);
    if (data) await AsyncStorage.setItem(`${baseKey}__snapshot`, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

// Everything that might still hold recoverable data, newest first.
export async function recoverySources(baseKey) {
  const out = [];
  const snap = await AsyncStorage.getItem(`${baseKey}__snapshot`);
  if (snap) out.push({ id: 'snapshot', label: 'Last good snapshot', size: snap.length, raw: snap });
  // The pre-chunking single-key format is never deleted, so it often
  // survives when the chunked copy has been damaged.
  const legacy = await AsyncStorage.getItem(baseKey);
  if (legacy) out.push({ id: 'legacy', label: 'Original (pre-update) save', size: legacy.length, raw: legacy });
  return out;
}

// Meta is a small record; the chunks are the data. If meta alone is lost
// it can be reconstructed by walking the chunks until one is missing.
export async function repairMeta(baseKey) {
  const parts = [];
  for (let i = 0; i < 500; i++) {
    const c = await AsyncStorage.getItem(chunkKey(baseKey, i));
    if (c == null) break;
    parts.push(c);
  }
  if (!parts.length) return null;
  const json = parts.join('');
  JSON.parse(json); // throws if the reassembled data is incomplete
  await AsyncStorage.setItem(
    metaKey(baseKey),
    JSON.stringify({ chunks: parts.length, length: json.length })
  );
  return { chunks: parts.length, length: json.length };
}

export async function restoreFrom(raw) {
  return JSON.parse(raw);
}

