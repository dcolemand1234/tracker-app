// Standalone base64 -> Uint8Array decoder.
//
// Why this exists: THREE.TextureLoader (and the browser Image element it
// relies on internally) needs `document`, which doesn't exist in this
// bare expo-gl / Hermes environment - that's what caused every terrain
// texture to fail with "Property 'document' doesn't exist". This decoder
// has zero environment dependencies (no `Buffer`, no `atob`, no DOM), so
// terrainTiles.js / decorationTiles.js can ship raw RGBA pixel bytes and
// RoadmapWorld3D.js can hand them straight to THREE.DataTexture, skipping
// image decoding entirely.

const B64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const REVERSE_LOOKUP = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < B64_CHARS.length; i++) {
    table[B64_CHARS.charCodeAt(i)] = i;
  }
  return table;
})();

export function base64ToUint8Array(base64) {
  // Strip any whitespace/newlines defensively; ignore '=' padding chars.
  let len = base64.length;
  while (len > 0 && base64.charCodeAt(len - 1) === 61 /* '=' */) len--;

  const byteLength = Math.floor((len * 3) / 4);
  const out = new Uint8Array(byteLength);

  let outIdx = 0;
  let buffer = 0;
  let bitsCollected = 0;

  for (let i = 0; i < len; i++) {
    const c = base64.charCodeAt(i);
    if (c === 10 || c === 13 || c === 32) continue; // skip whitespace
    const value = REVERSE_LOOKUP[c];
    buffer = (buffer << 6) | value;
    bitsCollected += 6;
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      out[outIdx++] = (buffer >> bitsCollected) & 0xff;
    }
  }

  return outIdx === byteLength ? out : out.slice(0, outIdx);
}
