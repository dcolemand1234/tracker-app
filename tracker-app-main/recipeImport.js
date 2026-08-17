// The web app does this via the browser's DOM (querySelectorAll on
// <script type="application/ld+json">). React Native has no DOM, so this
// fetches the raw HTML as text and pulls out those script blocks with a
// regex instead — same schema.org data, different extraction method.
// Also unlike a browser, RN's fetch isn't subject to CORS, so this can hit
// most recipe sites directly without a proxy.

function extractImageUrl(imgField) {
  if (!imgField) return null;
  if (typeof imgField === 'string') return imgField;
  if (Array.isArray(imgField)) return extractImageUrl(imgField[0]);
  if (imgField.url) return imgField.url;
  return null;
}

// Recipe sites often store instruction/ingredient text that was
// originally pasted from Word or Google Docs into their CMS, and that
// paste brings along literal HTML - <span style="...">, <!--
// StartFragment -->, HTML-escaped entities like &#176; or &nbsp; - which
// then gets serialized as-is into their structured data. Decoding first
// (so escaped tags like &lt;span&gt; become real <span> tags) and then
// stripping actual HTML afterward, in that order, since skipping the
// decode step would leave the escaped tags visible as literal text
// instead of removing them.
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};
function decodeHtmlEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => NAMED_ENTITIES[name]);
}
export function sanitizeRecipeText(str) {
  if (!str) return '';
  let out = decodeHtmlEntities(String(str));
  out = out.replace(/<!--[\s\S]*?-->/g, ''); // HTML comments (e.g. <!--StartFragment-->)
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, ''); // real HTML tags left after decoding
  out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

// Some recipe sites store ingredient quantities as decimals rather than
// fractions in their structured data - and not even clean ones: values
// like 0.66666668653488 (rather than a repeating 0.666...) suggest the
// site did its own unit-conversion math with a floating-point rounding
// artifact baked in, before this data ever reaches us. Converts a
// leading decimal back to the nearest common cooking fraction, since
// nobody writes "0.66666668653488 cup" in a recipe by hand.
const COMMON_FRACTIONS = [
  [1 / 8, '1/8'], [1 / 4, '1/4'], [1 / 3, '1/3'], [3 / 8, '3/8'], [1 / 2, '1/2'],
  [5 / 8, '5/8'], [2 / 3, '2/3'], [3 / 4, '3/4'], [7 / 8, '7/8'],
];
export function prettifyLeadingQuantity(text) {
  const full = (text || '').match(/^(\d+)?\.\d+/);
  if (!full) return text;
  const whole = full[1] ? parseInt(full[1], 10) : 0;
  const value = parseFloat(full[0]);
  const frac = value - whole;
  let best = null;
  let bestDiff = 0.02; // tolerance for floating-point rounding artifacts
  for (const [dec, label] of COMMON_FRACTIONS) {
    const diff = Math.abs(frac - dec);
    if (diff < bestDiff) {
      best = label;
      bestDiff = diff;
    }
  }
  if (!best) return text; // not close to a common fraction - leave it alone rather than guess wrong
  const rest = text.slice(full[0].length);
  const wholePart = whole > 0 ? `${whole} ` : '';
  return `${wholePart}${best}${rest}`;
}

function extractInstructionsText(field) {
  if (!field) return '';
  if (typeof field === 'string') return sanitizeRecipeText(field);
  if (Array.isArray(field)) {
    return field.map(extractInstructionsText).filter(Boolean).join('\n');
  }
  if (typeof field === 'object') {
    if (field.text) return sanitizeRecipeText(field.text);
    if (field.itemListElement) return extractInstructionsText(field.itemListElement);
    if (field.name) return sanitizeRecipeText(field.name);
  }
  return '';
}

function findRecipeInJsonLd(html) {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1].trim());
      const candidates = [];
      if (Array.isArray(data)) candidates.push(...data);
      else if (data['@graph']) candidates.push(...data['@graph']);
      else candidates.push(data);
      for (const item of candidates) {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (types.includes('Recipe')) return item;
      }
    } catch (e) {
      // malformed JSON-LD block, skip it
    }
  }
  return null;
}

// Fetches a URL and returns { title, image, ingredients, instructions }
// or throws if no structured Recipe data could be found.
export async function fetchRecipeFromUrl(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  });
  if (!res.ok) {
    throw new Error(`Couldn't load that page (${res.status})`);
  }
  const html = await res.text();
  const recipe = findRecipeInJsonLd(html);
  if (!recipe) {
    throw new Error(
      "Couldn't find structured recipe data on that page. Not every site supports this."
    );
  }

  const title = sanitizeRecipeText(recipe.name || '');
  const image = extractImageUrl(recipe.image);
  const ingredients = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient.map((s) => prettifyLeadingQuantity(sanitizeRecipeText(s))).filter(Boolean)
    : [];
  const instructions = extractInstructionsText(recipe.recipeInstructions);

  return { title, image, ingredients, instructions };
}

