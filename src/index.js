/// <reference types="@fastly/js-compute" />

import * as response from './lib/response.js';
import { log } from './lib/log.js';
import { dmProxyHandler } from "./dm.js";
import { dmViewerHandler } from "./dm-viewer.js";

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  const req = event.request;
  const url = new URL(req.url);

  let finalResponse;

  try {
    // Route matching
    if (url.pathname === "/" && req.method === "GET") {
      finalResponse = new Response("Hello World from the edge!", { status: 200 });
    } else if (url.pathname === "/test" && req.method === "GET") {
      finalResponse = dmViewerHandler(req);
    } else if (url.pathname.startsWith("/adobe/assets")) {
      finalResponse = await dmProxyHandler(req);
    } else {
      finalResponse = response.notFound();
    }
  } catch (err) {
    console.log(err);
    finalResponse = response.error();
  }

  // Log the request and response
  log(req, finalResponse);

  return finalResponse;
}
