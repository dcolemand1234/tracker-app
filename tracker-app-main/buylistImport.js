// Same technique as recipeImport.js: no DOM in React Native, so this
// fetches the raw HTML as text and regexes out <script type="application/
// ld+json"> blocks looking for schema.org Product data instead of Recipe
// data. Falls back to Open Graph meta tags for sites that don't publish
// full Product schema but do have basic og:title/og:image/price tags.
import { sanitizeRecipeText } from './recipeImport';

function extractImageUrl(imgField) {
  if (!imgField) return null;
  if (typeof imgField === 'string') return imgField;
  if (Array.isArray(imgField)) return extractImageUrl(imgField[0]);
  if (imgField.url) return imgField.url;
  return null;
}

// offers can be a single Offer object, or an AggregateOffer with
// lowPrice/highPrice, or an array of Offers at different price points -
// always take the lowest actual number found, whichever shape it's in.
function extractLowestPrice(offers) {
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  let lowest = null;
  for (const o of list) {
    const candidates = [o.price, o.lowPrice, o.highPrice].filter((v) => v != null);
    for (const c of candidates) {
      const n = parseFloat(c);
      if (!isNaN(n) && (lowest === null || n < lowest)) lowest = n;
    }
  }
  return lowest;
}

// Parses every <script type="application/ld+json"> block on the page
// and returns a flat list of every object found across all of them
// (unwrapping arrays and @graph wrappers) - shared by both the product
// fetch and the menu fetch below, rather than two near-identical parsers.
function parseAllJsonLd(html) {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  const all = [];
  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1].trim());
      if (Array.isArray(data)) all.push(...data);
      else if (data['@graph']) all.push(...data['@graph']);
      else all.push(data);
    } catch (e) {
      // malformed JSON-LD block, skip it
    }
  }
  return all;
}

function hasType(item, typeName) {
  const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
  return types.includes(typeName);
}

function findProductInJsonLd(html) {
  const items = parseAllJsonLd(html);
  return items.find((item) => hasType(item, 'Product')) || null;
}

function findMetaContent(html, property) {
  const re = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

// Fetches a URL and returns { title, image, price } - price may be null
// if the page has no structured price data at all, which is common
// enough that this shouldn't be treated as a hard failure the way a
// missing title/page is.
export async function fetchProductFromUrl(url) {
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

  const product = findProductInJsonLd(html);
  if (product) {
    return {
      title: sanitizeRecipeText(product.name || ''),
      image: extractImageUrl(product.image),
      price: extractLowestPrice(product.offers),
    };
  }

  // No Product schema - fall back to Open Graph tags, which many sites
  // have even without full structured product data.
  const ogTitle = findMetaContent(html, 'og:title');
  const ogImage = findMetaContent(html, 'og:image');
  const ogPrice =
    findMetaContent(html, 'product:price:amount') || findMetaContent(html, 'og:price:amount');

  if (!ogTitle && !ogImage) {
    throw new Error(
      "Couldn't find product info on that page. Not every site supports this."
    );
  }

  return {
    title: sanitizeRecipeText(ogTitle || ''),
    image: ogImage || null,
    price: ogPrice ? parseFloat(ogPrice) : null,
  };
}

// Menus are genuinely less standardized across the web than products -
// most restaurant sites don't publish structured schema.org/Menu data
// at all (menus are often PDFs or images, or loaded client-side via JS
// this fetch can't execute). Rather than guess with a fragile HTML
// heuristic that would produce wrong results on many sites, this only
// extracts a menu when the real schema.org/Menu structure is present,
// and throws a clear, honest error otherwise.
//
// Handles the schema.org shapes actually seen in the wild: a top-level
// Menu, a Menu nested under Restaurant.hasMenu (single object or array),
// and MenuSection/MenuItem normalized whether they're a single object
// or an array (some sites emit malformed singular versions of both).
function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function findMenuInJsonLd(html) {
  const items = parseAllJsonLd(html);
  let menu = items.find((item) => hasType(item, 'Menu'));
  if (menu) return menu;

  const restaurant = items.find((item) => hasType(item, 'Restaurant') && item.hasMenu);
  if (restaurant) {
    const menus = asArray(restaurant.hasMenu);
    if (menus.length) return menus[0];
  }
  return null;
}

export async function fetchMenuFromUrl(url) {
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

  const menu = findMenuInJsonLd(html);
  if (!menu) {
    throw new Error(
      "This page doesn't have a structured menu we can read automatically - most restaurant sites don't publish one. You'll need to add items by hand for this one."
    );
  }

  const sections = asArray(menu.hasMenuSection);
  const categories = sections
    .map((section) => {
      const items = asArray(section.hasMenuItem)
        .map((mi) => ({
          name: sanitizeRecipeText(mi.name || ''),
          description: sanitizeRecipeText(mi.description || ''),
          price: extractLowestPrice(mi.offers),
        }))
        .filter((it) => it.name);
      return { name: sanitizeRecipeText(section.name || 'Menu'), items };
    })
    .filter((cat) => cat.items.length > 0);

  // Some sites skip sections entirely and put items straight on the
  // Menu itself - handle that shape too rather than returning nothing.
  if (categories.length === 0 && menu.hasMenuItem) {
    const items = asArray(menu.hasMenuItem)
      .map((mi) => ({
        name: sanitizeRecipeText(mi.name || ''),
        description: sanitizeRecipeText(mi.description || ''),
        price: extractLowestPrice(mi.offers),
      }))
      .filter((it) => it.name);
    if (items.length) categories.push({ name: 'Menu', items });
  }

  if (categories.length === 0) {
    throw new Error(
      'Found menu data on that page, but no readable items in it. You\'ll need to add items by hand for this one.'
    );
  }

  return categories;
}
