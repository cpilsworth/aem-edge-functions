const DM_HOST = 'dm.cpilsworth.workers.dev';
const DM_BACKEND = 'dm';
const DM_PATH_PREFIX = '/adobe/assets';

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
