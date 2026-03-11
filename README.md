# AEM Edge Functions DM Proxy Demo

This repository is a working AEM Edge Functions sample that proxies Dynamic Media requests through Fastly-based edge code and exposes a browser test harness for inspecting the results.

It is not a generic boilerplate anymore. The project is focused on one specific use case:

- accept requests under `/adobe/assets/...`
- perform a simple authorization check using cookies
- proxy authorized requests to an upstream Dynamic Media backend
- provide a `/test` page for interactive validation of assets, headers, and cookie-driven authorization behavior

## What This Project Does

The edge function currently exposes two meaningful routes:

- `/adobe/assets/...`
  Proxies Dynamic Media asset requests to the configured upstream backend.
- `/test`
  Serves an HTML test application that lets you:
  - switch between sample image and video assets
  - set `allowed` and `delay` cookies
  - inspect the response status and headers
  - open the host URL and backend URL directly
  - preview the selected asset in an iframe

The main request flow is implemented in:

- [src/index.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/index.js)
- [src/dm.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/dm.js)
- [src/dm-viewer.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/dm-viewer.js)

There is also Cloudflare-side support code in:

- [cloudflare/cloudflare-auth.js](/Users/chrisp/projects/chrisp/aem-edge-functions/cloudflare/cloudflare-auth.js)
- [src/cloudflare-proxy.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/cloudflare-proxy.js)

## What It Proves

This repo demonstrates a few useful patterns for AEM Edge Functions:

- AEM Edge Functions can front Dynamic Media style paths directly under `/adobe/assets/...`
- edge code can perform lightweight authorization checks before proxying to the backend
- cookies can be used to drive authorization behavior during development and demo scenarios
- response headers can be preserved and inspected from the edge layer
- local development with `aio aem edge-functions serve` is good enough to exercise real viewer flows, including video playback requests

In practical terms, this project is a small reference implementation for:

- edge-gated asset delivery
- Dynamic Media proxying
- troubleshooting and observability through an in-browser test page

## Architecture

Request flow for `/adobe/assets/...`:

1. the route is matched in [src/index.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/index.js)
2. [src/dm.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/dm.js) reads `allowed` and `delay` cookies
3. the edge function calls the configured auth backend to decide whether the request is authorized
4. if authorized, the request is proxied to the DM backend
5. the upstream response is returned to the caller

The `/test` page is a convenience UI for driving that flow without writing custom scripts.

## Repository Layout

- [src/index.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/index.js)
  Entry point and route dispatch.
- [src/dm.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/dm.js)
  Authorization check plus DM proxy logic.
- [src/dm-viewer.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/dm-viewer.js)
  Browser test application served from `/test`.
- [config/compute.yaml](/Users/chrisp/projects/chrisp/aem-edge-functions/config/compute.yaml)
  Compute service definitions and allowed origins.
- [config/cdn.yaml](/Users/chrisp/projects/chrisp/aem-edge-functions/config/cdn.yaml)
  CDN routing configuration.
- [fastly.toml](/Users/chrisp/projects/chrisp/aem-edge-functions/fastly.toml)
  Local runtime configuration.
- [cloudflare/cloudflare-auth.js](/Users/chrisp/projects/chrisp/aem-edge-functions/cloudflare/cloudflare-auth.js)
  Mock auth service used by the demo.
- [src/cloudflare-proxy.js](/Users/chrisp/projects/chrisp/aem-edge-functions/src/cloudflare-proxy.js)
  Cloudflare-side proxy example.

## Getting Started

### 1. Install prerequisites

Install Adobe CLI:

```bash
npm install -g @adobe/aio-cli
```

Install the AEM Edge Functions plugin:

```bash
aio plugins:install @adobe/aio-cli-plugin-aem-edge-functions
```

Authenticate and configure the plugin:

```bash
aio login
aio aem edge-functions setup
```

Install project dependencies:

```bash
npm install
```

### 2. Build the project

```bash
aio aem edge-functions build
```

This compiles the edge code into the local wasm artifact used by Fastly/AEM Edge Functions.

### 3. Run locally

```bash
aio aem edge-functions serve
```

The local server listens on:

```text
http://127.0.0.1:7676
```

Useful local URLs:

- `http://127.0.0.1:7676/test`
- `http://127.0.0.1:7676/adobe/assets/...`

### 4. Use the test page

Open:

```text
http://127.0.0.1:7676/test
```

From there you can:

- pick a sample asset
- edit the asset path manually
- apply `allowed` and `delay` cookies
- load the asset through the edge function
- inspect the HTTP status and response headers
- compare the host URL with the upstream backend URL

For authorization testing:

- set `allowed=true` to allow the request
- clear `allowed` or set another value to force an unauthorized response
- set `delay=<milliseconds>` to simulate auth latency

## Configuration

### Compute services

The compute service definition lives in [config/compute.yaml](/Users/chrisp/projects/chrisp/aem-edge-functions/config/compute.yaml).

At the time of writing, the primary service is `first-compute` and it declares the external origins needed by the edge function, including the DM and auth backends.

Important: changes to [config/compute.yaml](/Users/chrisp/projects/chrisp/aem-edge-functions/config/compute.yaml) and [config/cdn.yaml](/Users/chrisp/projects/chrisp/aem-edge-functions/config/cdn.yaml) are not deployed by `aio aem edge-functions deploy`. Those configuration files must be deployed through the AEM Cloud Manager configuration pipeline.

### Local backends

Local runtime backends are configured in [fastly.toml](/Users/chrisp/projects/chrisp/aem-edge-functions/fastly.toml).

These are what make local proxying work when you run:

```bash
aio aem edge-functions serve
```

### CDN routing

Production routing is defined in [config/cdn.yaml](/Users/chrisp/projects/chrisp/aem-edge-functions/config/cdn.yaml).

You will need matching CDN origin selector rules so requests actually reach the compute service for the paths you care about.

## Deploying

Deploy the edge function package with:

```bash
aio aem edge-functions deploy first-compute
```

If your compute service has a different name, replace `first-compute` with the correct service ID from [config/compute.yaml](/Users/chrisp/projects/chrisp/aem-edge-functions/config/compute.yaml).

This command deploys edge code only.

If you changed either of these files:

- [config/compute.yaml](/Users/chrisp/projects/chrisp/aem-edge-functions/config/compute.yaml)
- [config/cdn.yaml](/Users/chrisp/projects/chrisp/aem-edge-functions/config/cdn.yaml)

you must commit those changes and deploy them through the AEM Cloud Manager configuration pipeline.

To watch logs from the deployed service:

```bash
aio aem edge-functions tail-logs first-compute
```

## Typical Development Loop

```bash
aio aem edge-functions build
aio aem edge-functions serve
```

Then:

1. open `/test`
2. apply cookies as needed
3. load an image or video asset
4. inspect headers and network behavior
5. stop the local server
6. deploy when ready

## Notes

- The `/test` page intentionally makes a `HEAD` request before loading the asset frame so the response status and headers can be shown.
- Video playback generates additional segment requests after the initial player HTML, CSS, and JS assets load.
- If the upstream auth or DM service changes behavior, local and deployed results will change accordingly.

## References

- Fastly Compute: https://www.fastly.com/documentation/guides/compute/
- AEM Edge Functions CLI: https://www.npmjs.com/package/@adobe/aio-cli-plugin-aem-edge-functions
