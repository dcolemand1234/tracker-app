// Kroger price-lookup proxy, running on Cloudflare Workers' free tier
// (no credit card required, 100,000 requests/day free) instead of
// Firebase Cloud Functions, which required the paid Blaze plan just to
// enable Secret Manager. Same job either way: keep KROGER_CLIENT_SECRET
// off the device entirely, since it can never safely live in a mobile
// app bundle.
//
// Secrets are set via the Wrangler CLI, never written into this file:
//   wrangler secret put KROGER_CLIENT_ID
//   wrangler secret put KROGER_CLIENT_SECRET
//
// Workers run on V8 isolates, not Node.js, so this uses Web Platform
// APIs (fetch, btoa, URL) rather than Node built-ins like Buffer.

// This app is registered under Kroger's Certification environment
// (api-ce.kroger.com), not Production (api.kroger.com) - same
// credentials, different host. Certification doesn't support
// user-account features (Identity, Cart), but client-credential
// product/location lookups - all this Worker does - work fine there.
//
// Open question worth checking once this is fully working: confirm the
// prices coming back match real shelf prices, in case Certification
// returns sample/test data rather than live pricing. If so, that means
// re-registering under Production (likely needs Kroger's approval
// process for that environment) and swapping this base URL back.
const KROGER_BASE = 'https://api-ce.kroger.com/v1';
const TOKEN_URL = `${KROGER_BASE}/connect/oauth2/token`;
const LOCATIONS_URL = `${KROGER_BASE}/locations`;
const PRODUCTS_URL = `${KROGER_BASE}/products`;

// Kroger requires a SEPARATE token per scope, not one shared token
// reused everywhere - a blank-scope token works for Locations but gets
// rejected as "invalid token" on Products, and vice versa. Caching
// keyed by scope so each endpoint gets the token it actually needs.
const tokenCache = {}; // scope -> { token, expiresAt }

async function getAccessToken(clientId, clientSecret, scope) {
  const key = scope || '';
  const cached = tokenCache[key];
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }
  const basic = btoa(`${clientId}:${clientSecret}`);
  const body = scope ? `grant_type=client_credentials&scope=${encodeURIComponent(scope)}` : 'grant_type=client_credentials';
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger token request failed for scope "${key}" (${res.status}): ${text}`);
  }
  const data = await res.json();
  tokenCache[key] = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

async function findLocationId(clientId, clientSecret, zip) {
  // Blank scope for Locations, per Kroger's documented pattern.
  const token = await getAccessToken(clientId, clientSecret, '');
  const url = `${LOCATIONS_URL}?filter.zipCode.near=${encodeURIComponent(zip)}&filter.limit=1`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger location lookup failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const first = (data.data || [])[0];
  return first ? first.locationId : null;
}

async function searchProducts(clientId, clientSecret, term, locationId) {
  // product.compact scope specifically for Products, per Kroger's
  // documented pattern - reusing the blank-scope Locations token here
  // is what was causing "AUTH-1007: Invalid token on request" earlier.
  const token = await getAccessToken(clientId, clientSecret, 'product.compact');
  const params = new URLSearchParams({ 'filter.term': term, 'filter.limit': '5' });
  if (locationId) params.set('filter.locationId', locationId);
  const res = await fetch(`${PRODUCTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger product search failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return (data.data || []).map((p) => {
    const item = (p.items || [])[0] || {};
    const price = item.price || {};
    return {
      productId: p.productId,
      description: p.description,
      brand: p.brand,
      size: item.size || null,
      regularPrice: price.regular ?? null,
      promoPrice: price.promo ?? null,
    };
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Only ever called from the app itself, but a permissive CORS
      // header makes it easy to also test this straight from a browser.
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
      });
    }

    const url = new URL(request.url);
    const term = (url.searchParams.get('term') || '').trim();
    const zip = (url.searchParams.get('zip') || '').trim();

    if (!term) {
      return jsonResponse({ error: 'Missing required "term" query param.' }, 400);
    }
    if (!zip) {
      return jsonResponse(
        { error: 'Missing required "zip" query param - Kroger prices are store-specific.' },
        400
      );
    }

    try {
      const locationId = await findLocationId(env.KROGER_CLIENT_ID, env.KROGER_CLIENT_SECRET, zip);
      if (!locationId) {
        return jsonResponse({ error: `No Kroger-family store found near zip ${zip}.` }, 404);
      }
      const results = await searchProducts(env.KROGER_CLIENT_ID, env.KROGER_CLIENT_SECRET, term, locationId);
      return jsonResponse({ locationId, results });
    } catch (err) {
      console.error('krogerPriceLookup failed', err);
      return jsonResponse({ error: 'Kroger lookup failed. Try again in a moment.' }, 502);
    }
  },
};
