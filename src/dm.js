const DM_HOST = 'dm.cpilsworth.workers.dev';
const DM_BACKEND = 'dm';
const DM_PATH_PREFIX = '/adobe/assets';

const AUTH_HOST = 'auth.cpilsworth.workers.dev';
const AUTH_BACKEND = 'auth';

function parseCookies(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = {};
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  }
  return cookies;
}

async function checkAuth(req) {
  const cookies = parseCookies(req);
  const allowed = cookies['allowed'] || 'false';
  const delay = cookies['delay'] || '0';

  const authUrl = new URL(`https://${AUTH_HOST}/check-auth`);
  authUrl.searchParams.set('allowed', allowed);
  authUrl.searchParams.set('delay', delay);

  const authResponse = await fetch(authUrl.toString(), {
    backend: AUTH_BACKEND,
    method: 'GET',
  });

  if (!authResponse.ok) {
    return false;
  }

  const body = await authResponse.json();
  return body.authorized === true;
}

function getAssetPath(req) {
  const { pathname } = new URL(req.url);
  if (!pathname.startsWith(DM_PATH_PREFIX)) {
    return '';
  }

  return pathname;
}

function buildTargetUrl(req) {
  const incomingUrl = new URL(req.url);
  const assetPath = getAssetPath(req);
  const targetUrl = new URL(`https://${DM_HOST}${assetPath}`);

  targetUrl.search = incomingUrl.search;
  return targetUrl;
}

function buildProxyHeaders(req) {
  const headers = new Headers(req.headers);
  headers.set('host', DM_HOST);

  if (req.method === 'GET' || req.method === 'HEAD') {
    headers.delete('content-length');
    headers.delete('content-type');
    headers.delete('transfer-encoding');
  }

  return headers;
}

export async function dmProxyHandler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || '*',
      },
    });
  }

  if (!getAssetPath(req)) {
    return new Response(
      'Missing Dynamic Media asset path. Expected /adobe/assets/{assetId}/as/{seoName}',
      {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      },
    );
  }

  // Mock authorization check via Cloudflare Worker
  try {
    const authorized = await checkAuth(req);
    if (!authorized) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  } catch (error) {
    console.error('Error checking authorization:', error);
    return new Response('Authorization Service Unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const targetUrl = buildTargetUrl(req);
  const hasRequestBody = req.method !== 'GET' && req.method !== 'HEAD';
  const upstreamRequestInit = {
    backend: DM_BACKEND,
    method: req.method,
    headers: buildProxyHeaders(req),
  };

  if (hasRequestBody) {
    upstreamRequestInit.body = req.body;
    upstreamRequestInit.duplex = 'half';
  }

  try {
    return await fetch(targetUrl.toString(), upstreamRequestInit);
  } catch (error) {
    console.error('Error proxying request to DM backend:', error);
    return new Response('Bad Gateway', {
      status: 502,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
