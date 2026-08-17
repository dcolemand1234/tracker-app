// PricesAPI.io proxy, same pattern as kroger-worker: the API key can
// never safely live in the mobile app bundle (anyone could decompile
// the APK and extract it), so this Worker holds it server-side and the
// app calls this instead of PricesAPI directly.
//
// Secret is set via the Wrangler CLI, never written into this file:
//   wrangler secret put PRICESAPI_KEY
//
// Real, documented risk from PricesAPI's own example code: a cold cache
// miss can take 30-90 seconds to resolve. Cloudflare Workers' free tier
// has execution-time limits that may not comfortably cover that - this
// is untested until we actually deploy and try a real cold query.

const PRICESAPI_URL = 'https://api.pricesapi.io/api/v1/products/search';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
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
    const q = (url.searchParams.get('q') || '').trim();
    const country = (url.searchParams.get('country') || 'us').trim();
    const limit = (url.searchParams.get('limit') || '5').trim();

    if (!q) {
      return jsonResponse({ error: 'Missing required "q" query param (a search term or product URL).' }, 400);
    }

    const params = new URLSearchParams({ q, country, limit });

    // Mirroring PricesAPI's own example: a long timeout since cold
    // cache misses can genuinely take up to ~90 seconds on their end.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 95_000);

    try {
      const res = await fetch(`${PRICESAPI_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${env.PRICESAPI_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        console.error('PricesAPI search failed', res.status, text);
        return jsonResponse({ error: `PricesAPI request failed (${res.status}).` }, 502);
      }

      const data = await res.json();
      return jsonResponse(data);
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err && err.name === 'AbortError';
      console.error('prices-worker failed', err);
      return jsonResponse(
        {
          error: isTimeout
            ? 'PricesAPI took too long to respond (cold-cache lookups can take up to 90s - try again, it may be cached next time).'
            : 'Price lookup failed. Try again in a moment.',
        },
        502
      );
    }
  },
};
