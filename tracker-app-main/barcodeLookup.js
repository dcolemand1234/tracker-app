// Barcode lookup uses Open Food Facts: a free, open product database
// with no API key and no signup. It is community-maintained, so coverage
// is good for packaged groceries and patchy for loose produce and
// store-own brands — the UI always lets you correct or type the name
// yourself when a lookup comes back empty.
const OFF_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product/';

// Maps Open Food Facts category keywords onto this app's own inventory
// categories, so a scanned item lands somewhere sensible by default.
const CATEGORY_HINTS = [
  { match: ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'dairy'], cat: 'Dairy' },
  { match: ['meat', 'beef', 'pork', 'chicken', 'poultry', 'fish', 'seafood', 'bacon', 'sausage'], cat: 'Meats' },
  { match: ['fruit', 'vegetable', 'produce', 'salad', 'fresh-'], cat: 'Produce' },
  { match: ['spice', 'seasoning', 'herb', 'condiment', 'sauce', 'salt', 'pepper'], cat: 'Seasonings' },
];

function guessCategory(offCategories) {
  const text = (offCategories || '').toLowerCase();
  for (const hint of CATEGORY_HINTS) {
    if (hint.match.some((m) => text.includes(m))) return hint.cat;
  }
  return 'Pantry';
}

// Typical fridge/counter life once you bring it home, in days. These are
// deliberate rough guides for "check this soon", not food-safety advice
// — always trust your own eyes and nose over a number in an app.
export const SHELF_LIFE_DAYS = {
  Produce: 5,
  Dairy: 7,
  Meats: 3,
  Pantry: 180,
  Seasonings: 365,
  Other: 30,
};

// Items people most often lose track of, with tighter estimates than the
// category default. Matched loosely against the item name.
const FAST_SPOILERS = [
  { match: ['spinach', 'lettuce', 'rocket', 'arugula', 'salad', 'herbs', 'basil', 'coriander', 'cilantro'], days: 4 },
  { match: ['berry', 'berries', 'strawberr', 'raspberr', 'blueberr'], days: 4 },
  { match: ['banana', 'avocado', 'peach', 'mango'], days: 5 },
  { match: ['mushroom', 'asparagus', 'broccoli', 'courgette', 'zucchini'], days: 6 },
  { match: ['mince', 'ground beef', 'chicken', 'fish', 'salmon', 'prawn', 'shrimp'], days: 2 },
  { match: ['milk', 'cream', 'yogurt', 'yoghurt'], days: 7 },
  { match: ['bread', 'tortilla', 'wrap'], days: 5 },
];

export function estimateShelfLifeDays(name, category) {
  const n = (name || '').toLowerCase();
  for (const s of FAST_SPOILERS) {
    if (s.match.some((m) => n.includes(m))) return s.days;
  }
  return SHELF_LIFE_DAYS[category] || SHELF_LIFE_DAYS.Other;
}

export function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Days until the expiry date. Negative means already past.
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export function spoilStatus(item) {
  const d = daysUntil(item.expDate);
  if (d === null) return null;
  if (d < 0) return { level: 'expired', days: d, label: `${Math.abs(d)}d past` };
  if (d === 0) return { level: 'today', days: d, label: 'Today' };
  if (d <= 3) return { level: 'soon', days: d, label: `${d}d left` };
  return { level: 'ok', days: d, label: `${d}d left` };
}

export async function lookupBarcode(code) {
  try {
    // No `fields` filter on purpose: Open Food Facts builds the image
    // URLs as computed fields, and asking for a narrowed field list can
    // drop them from the response entirely — which is why scanned items
    // were coming back without a photo.
    // Open Food Facts asks every client to identify itself; requests
    // without a User-Agent can be throttled or refused outright, which
    // looks identical to "product not found" from in here.
    const res = await fetch(`${OFF_ENDPOINT}${encodeURIComponent(code)}.json`, {
      headers: { 'User-Agent': 'TrackerApp - Android - personal use' },
    });
    if (!res.ok) return { found: false };
    const json = await res.json();
    if (!json || json.status !== 1 || !json.product) return { found: false };
    const p = json.product;
    const name = (p.product_name || '').trim();
    if (!name) return { found: false };
    const category = guessCategory(p.categories);
    return {
      found: true,
      name: p.brands ? `${name} (${p.brands.split(',')[0].trim()})` : name,
      category,
      amount: (p.quantity || '').trim(),
      // Several image keys exist depending on how the product was
      // photographed; take whichever is present.
      image:
        p.image_front_small_url ||
        p.image_small_url ||
        p.image_front_url ||
        p.image_url ||
        (p.selected_images &&
          p.selected_images.front &&
          p.selected_images.front.small &&
          Object.values(p.selected_images.front.small)[0]) ||
        null,
      shelfLifeDays: estimateShelfLifeDays(name, category),
    };
  } catch (e) {
    return { found: false, error: true };
  }
}

