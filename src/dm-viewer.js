const DEFAULT_ASSETS = [
  {
    label: 'Video',
    path: '/adobe/assets/urn:aaid:aem:7091fd88-9d0f-4aa6-8bfb-2746ce1d815f/play',
  },
  {
    label: 'Image',
    path: '/adobe/assets/urn:aaid:aem:c0061952-5dcc-41a5-b5d4-e7fee04fb1eb/as/image.jpg',
  },
];
const DM_BACKEND_ORIGIN = 'https://dm.cpilsworth.workers.dev';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildOptions() {
  return DEFAULT_ASSETS.map(
    ({ label, path }, index) => `<option value="${escapeHtml(path)}"${index === 0 ? ' selected' : ''}>${escapeHtml(label)} - ${escapeHtml(path)}</option>`,
  ).join('');
}

export function dmViewerHandler(req) {
  const { origin } = new URL(req.url);
  const initialAsset = DEFAULT_ASSETS[0].path;
  const initialHostUrl = origin + initialAsset;
  const initialBackendUrl = DM_BACKEND_ORIGIN + initialAsset;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DM Asset Viewer</title>
  <style>
    :root {
      --bg: #f6f2e8;
      --panel: rgba(255, 251, 245, 0.92);
      --ink: #1a1a18;
      --muted: #635d53;
      --line: rgba(54, 44, 25, 0.12);
      --accent: #c24d2c;
      --accent-deep: #7c2813;
      --shadow: 0 20px 60px rgba(58, 42, 18, 0.16);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(194, 77, 44, 0.14), transparent 30%),
        radial-gradient(circle at bottom right, rgba(34, 88, 104, 0.12), transparent 28%),
        linear-gradient(180deg, #f9f5ee 0%, #efe4d2 100%);
      font-family: Georgia, "Times New Roman", serif;
    }

    .page {
      width: min(1200px, calc(100vw - 32px));
      margin: 24px auto;
      display: grid;
      gap: 16px;
    }

    .hero,
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }

    .hero {
      padding: 24px;
    }

    .hero h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 4vw, 3.4rem);
      line-height: 0.95;
      letter-spacing: -0.04em;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 1rem;
      max-width: 60ch;
    }

    .panel {
      padding: 20px;
    }

    .section-block + .section-block {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
    }

    .section-heading {
      margin: 0 0 14px;
      font-size: 1.35rem;
      line-height: 1;
      letter-spacing: -0.03em;
    }

    .controls {
      display: grid;
      gap: 12px;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
    }

    label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.88rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    select,
    button,
    input {
      width: 100%;
      border-radius: 12px;
      border: 1px solid rgba(92, 67, 23, 0.18);
      padding: 12px 14px;
      font: inherit;
      color: var(--ink);
      background: rgba(255, 255, 255, 0.82);
    }

    button {
      width: auto;
      min-width: 140px;
      cursor: pointer;
      color: #fff7f0;
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      border: none;
    }

    .layout {
      display: grid;
      gap: 16px;
      grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
    }

    .frame-wrap {
      height: 72vh;
      min-height: 420px;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: #fffdfa;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      background: white;
    }

    .meta {
      display: grid;
      gap: 12px;
    }

    .status {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(194, 77, 44, 0.1);
      color: var(--accent-deep);
      font-family: "Courier New", monospace;
      white-space: pre-wrap;
    }

    pre {
      margin: 0;
      min-height: 320px;
      padding: 16px;
      border-radius: 16px;
      overflow: auto;
      background: #191816;
      color: #f4efe6;
      font-size: 0.88rem;
      line-height: 1.5;
    }

    .path-row {
      display: grid;
      gap: 12px;
    }

    .cookie-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hint {
      color: var(--muted);
      font-size: 0.92rem;
    }

    @media (max-width: 900px) {
      .controls,
      .layout,
      .cookie-grid {
        grid-template-columns: 1fr;
      }

      .frame-wrap {
        height: 52vh;
      }

      button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <h1>Dynamic Media Asset Viewer</h1>
      <p>Switch between proxied Dynamic Media assets, render them in the frame, and inspect the response headers returned by this edge function.</p>
    </section>

    <section class="panel">
      <div class="section-block">
        <h2 class="section-heading">Asset</h2>
        <div class="controls">
          <div>
            <label for="asset-select">Asset</label>
            <select id="asset-select">${buildOptions()}</select>
          </div>
          <button id="load-button" type="button">Load Asset</button>
        </div>
        <div class="path-row" style="margin-top: 12px;">
          <div>
            <label for="asset-path">Selected Path</label>
            <input id="asset-path" type="text" value="${escapeHtml(initialAsset)}" spellcheck="false">
          </div>
          <div class="hint">Host URL: <a id="host-url" href="${escapeHtml(initialHostUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(initialHostUrl)}</a></div>
          <div class="hint">Backend URL: <a id="backend-url" href="${escapeHtml(initialBackendUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(initialBackendUrl)}</a></div>
        </div>
      </div>
      <div class="section-block">
        <h2 class="section-heading">Authorisation</h2>
        <div class="cookie-grid">
          <div>
            <label for="allowed-cookie">allowed Cookie</label>
            <input id="allowed-cookie" type="text" value="" placeholder="e.g. true">
          </div>
          <div>
            <label for="delay-cookie">delay Cookie</label>
            <input id="delay-cookie" type="text" value="" placeholder="e.g. 250">
          </div>
        </div>
        <div class="controls" style="margin-top: 12px;">
          <div class="hint">Active cookies: <span id="cookie-status"></span></div>
          <button id="apply-cookies-button" type="button">Apply Cookies</button>
        </div>
      </div>
    </section>

    <section class="layout">
      <div class="panel frame-wrap">
        <iframe id="asset-frame" title="Dynamic Media Asset Frame" src="${escapeHtml(initialAsset)}"></iframe>
      </div>

      <div class="meta">
        <section class="panel">
          <div class="status" id="status">Loading headers...</div>
        </section>
        <section class="panel">
          <pre id="headers"></pre>
        </section>
      </div>
    </section>
  </main>

  <script>
    const assetSelect = document.getElementById('asset-select');
    const assetPathInput = document.getElementById('asset-path');
    const loadButton = document.getElementById('load-button');
    const applyCookiesButton = document.getElementById('apply-cookies-button');
    const assetFrame = document.getElementById('asset-frame');
    const hostUrl = document.getElementById('host-url');
    const backendUrl = document.getElementById('backend-url');
    const allowedCookieInput = document.getElementById('allowed-cookie');
    const delayCookieInput = document.getElementById('delay-cookie');
    const cookieStatus = document.getElementById('cookie-status');
    const headersNode = document.getElementById('headers');
    const statusNode = document.getElementById('status');
    const backendOrigin = ${JSON.stringify(DM_BACKEND_ORIGIN)};

    function getCookieValue(name) {
      const cookies = document.cookie ? document.cookie.split('; ') : [];
      const prefix = name + '=';
      const match = cookies.find((cookie) => cookie.startsWith(prefix));
      return match ? decodeURIComponent(match.slice(prefix.length)) : '';
    }

    function updateCookieStatus() {
      cookieStatus.textContent = document.cookie || '(none)';
    }

    function writeCookie(name, value) {
      if (value) {
        document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; SameSite=Lax';
        return;
      }

      document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }

    function applyCookies() {
      writeCookie('allowed', allowedCookieInput.value.trim());
      writeCookie('delay', delayCookieInput.value.trim());
      updateCookieStatus();
    }

    function normalizePath(value) {
      if (!value) {
        return '';
      }

      return value.startsWith('/') ? value : '/' + value;
    }

    function syncSelectionFromInput() {
      const normalizedPath = normalizePath(assetPathInput.value.trim());
      assetPathInput.value = normalizedPath;

      const matchingOption = Array.from(assetSelect.options).find((option) => option.value === normalizedPath);
      if (matchingOption) {
        assetSelect.value = normalizedPath;
      }

      hostUrl.textContent = window.location.origin + normalizedPath;
      hostUrl.href = window.location.origin + normalizedPath;
      backendUrl.textContent = backendOrigin + normalizedPath;
      backendUrl.href = backendOrigin + normalizedPath;
      return normalizedPath;
    }

    async function loadAsset() {
      const assetPath = syncSelectionFromInput();
      if (!assetPath) {
        statusNode.textContent = 'No asset path selected.';
        headersNode.textContent = '';
        assetFrame.src = 'about:blank';
        return;
      }

      statusNode.textContent = 'Fetching headers...';
      headersNode.textContent = '';
      assetFrame.src = 'about:blank';

      try {
        const response = await fetch(assetPath, { method: 'HEAD' });
        const headerLines = ['HTTP ' + response.status + ' ' + response.statusText];

        response.headers.forEach((value, key) => {
          headerLines.push(key + ': ' + value);
        });

        statusNode.textContent = response.status + ' ' + response.statusText;
        headersNode.textContent = headerLines.join('\\n');

        if (response.ok) {
          assetFrame.src = assetPath;
        }
      } catch (error) {
        statusNode.textContent = 'Header request failed';
        headersNode.textContent = String(error);
      }
    }

    assetSelect.addEventListener('change', () => {
      assetPathInput.value = assetSelect.value;
      loadAsset();
    });

    applyCookiesButton.addEventListener('click', () => {
      applyCookies();
      loadAsset();
    });

    loadButton.addEventListener('click', loadAsset);
    assetPathInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        loadAsset();
      }
    });

    allowedCookieInput.value = getCookieValue('allowed');
    delayCookieInput.value = getCookieValue('delay');
    updateCookieStatus();
    loadAsset();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
