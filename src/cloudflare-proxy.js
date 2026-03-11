/**
 * Cloudflare Worker — Reverse Proxy
 *
 * Proxies incoming requests to a configurable backend origin,
 * forwarding headers, method, and body transparently.
 */

const BACKEND_ORIGIN = 'https://delivery-p31359-e1338271.adobeaemcloud.com';

// Headers to strip from the proxied request (lowercase)
const STRIP_REQUEST_HEADERS = new Set([
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cdn-loop',
  'host',
]);

// Headers to strip from the backend response (lowercase)
const STRIP_RESPONSE_HEADERS = new Set([
  'set-cookie',       // uncomment or remove depending on your needs
  'transfer-encoding',
]);

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Build the backend URL, preserving path + query string
      const backendUrl = new URL(url.pathname + url.search, BACKEND_ORIGIN);

      // Clone and filter request headers
      const headers = new Headers();
      for (const [key, value] of request.headers) {
        if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
          headers.set(key, value);
        }
      }

      // Set the Host header to the backend's hostname
      headers.set('Host', backendUrl.hostname);

      // Forward the real client IP
      headers.set('X-Forwarded-For', request.headers.get('cf-connecting-ip') ?? '');
      headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      const hasRequestBody = request.method !== 'GET' && request.method !== 'HEAD';
      if (!hasRequestBody) {
        headers.delete('content-length');
        headers.delete('content-type');
        headers.delete('transfer-encoding');
      }

      // Build the proxied request
      const proxyRequestInit = {
        method: request.method,
        headers,
        redirect: 'manual', // don't auto-follow redirects; let the client handle them
      };

      if (hasRequestBody) {
        proxyRequestInit.body = request.body;
      }

      const proxyRequest = new Request(backendUrl.toString(), proxyRequestInit);

      const response = await fetch(proxyRequest);

      // Clone and filter response headers
      const responseHeaders = new Headers();
      for (const [key, value] of response.headers) {
        if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      }

      // Optional: add CORS headers
      // responseHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },
};
