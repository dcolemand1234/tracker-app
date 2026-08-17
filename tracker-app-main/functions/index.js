const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

// Both kept in Secret Manager, not this file. client_secret is genuinely
// sensitive (never belongs in a committed file or a mobile app bundle -
// that's the whole reason this proxy exists). client_id isn't as
// sensitive, but there's no cost to keeping it out of source too, so
// both go through the same mechanism for consistency.
//
// Set these from the Codespace terminal (values are entered at a secure
// prompt, never typed into a file):
//   firebase functions:secrets:set KROGER_CLIENT_ID
//   firebase functions:secrets:set KROGER_CLIENT_SECRET
const KROGER_CLIENT_ID = defineSecret('KROGER_CLIENT_ID');
const KROGER_CLIENT_SECRET = defineSecret('KROGER_CLIENT_SECRET');

const TOKEN_URL = 'https://api.kroger.com/v1/connect/oauth2/token';
const LOCATIONS_URL = 'https://api.kroger.com/v1/locations';
const PRODUCTS_URL = 'https://api.kroger.com/v1/products';

// Module-level cache. Cloud Function instances get reused between
// invocations while "warm," so caching here avoids a fresh OAuth2
// exchange on every single price lookup - only refetch once the token
// is actually close to Kroger's 30-minute expiry.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger token request failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  // Refresh a little early (60s buffer) rather than cutting it exactly
  // at the real expiry, so a request that starts right at the edge
  // doesn't fail mid-flight.
  cachedTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function findLocationId(token, zip) {
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

async function searchProducts(token, term, locationId) {
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

// GET /krogerPriceLookup?term=milk&zip=90274
// Returns: { locationId, results: [{ description, regularPrice, promoPrice, ... }] }
exports.krogerPriceLookup = onRequest(
  { secrets: [KROGER_CLIENT_ID, KROGER_CLIENT_SECRET], cors: true },
  async (req, res) => {
    const term = (req.query.term || '').toString().trim();
    const zip = (req.query.zip || '').toString().trim();

    if (!term) {
      res.status(400).json({ error: 'Missing required "term" query param.' });
      return;
    }
    if (!zip) {
      res.status(400).json({ error: 'Missing required "zip" query param - Kroger prices are store-specific.' });
      return;
    }

    try {
      const token = await getAccessToken(KROGER_CLIENT_ID.value(), KROGER_CLIENT_SECRET.value());
      const locationId = await findLocationId(token, zip);
      if (!locationId) {
        res.status(404).json({ error: `No Kroger-family store found near zip ${zip}.` });
        return;
      }
      const results = await searchProducts(token, term, locationId);
      res.status(200).json({ locationId, results });
    } catch (err) {
      logger.error('krogerPriceLookup failed', err);
      res.status(502).json({ error: 'Kroger lookup failed. Try again in a moment.' });
    }
  }
);
