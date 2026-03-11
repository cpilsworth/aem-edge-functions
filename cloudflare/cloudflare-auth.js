/**
 * Cloudflare Worker — Mock Authorization Service
 *
 * Simulates an authorization check with configurable latency.
 * Used to test the effect of auth-check latency on edge proxy performance.
 *
 * Query parameters:
 *   - allowed: "true" to authorize, anything else to deny
 *   - delay:   milliseconds to wait before responding (simulates latency)
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const allowed = url.searchParams.get('allowed') === 'true';
    const delay = parseInt(url.searchParams.get('delay') || '0', 10);

    if (delay > 0) {
      await sleep(delay);
    }

    const body = JSON.stringify({ authorized: allowed });
    const status = allowed ? 200 : 403;

    return new Response(body, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
