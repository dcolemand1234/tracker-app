// Tesseract.js (used by the web app) is a browser/WASM library and can't
// run inside Expo Go. This uses OCR.space's free API instead — same end
// result (a photo in, cleaned text lines out), different engine under the
// hood. The demo key below is rate-limited and shared publicly; if scans
// start failing or feel slow, get a free personal key at ocr.space/ocrapi
// and swap it in.
const OCR_API_KEY = 'helloworld';

export async function runOcr(base64Image) {
  const form = new FormData();
  form.append('apikey', OCR_API_KEY);
  form.append('language', 'eng');
  form.append('isOverlayRequired', 'false');
  form.append('OCREngine', '2');
  form.append('base64Image', `data:image/jpeg;base64,${base64Image}`);

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (json.IsErroredOnProcessing) {
    throw new Error(
      (json.ErrorMessage && json.ErrorMessage.join(', ')) || 'OCR failed'
    );
  }
  const rawText = json.ParsedResults?.[0]?.ParsedText || '';
  const rawLines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return rawLines.map(stripOcrBullet).filter((l) => !isLikelyJunkOcrLine(l));
}

// OCR often misreads the same bullet glyph (•) as different characters
// across scans (*, «, », +, ®, -, etc). Strip these so identical items
// dedupe correctly.
function stripOcrBullet(line) {
  return line.replace(/^[*«»+®·•\-–—.\s]+/, '').trim();
}

function isLikelyJunkOcrLine(line) {
  const letters = (line.match(/[a-zA-Z]/g) || []).length;
  const total = line.length;
  if (total < 3) return true;
  if (letters / total < 0.5) return true; // mostly symbols/digits
  if (/[<>{}[\]=~^`|]/.test(line)) return true; // UI chrome symbols
  if (/^\d{1,2}:\d{2}\b/.test(line)) return true; // clock/status bar reading
  if (/^[a-z]/.test(line)) return true; // wrapped sentence continuation
  return false;
}

