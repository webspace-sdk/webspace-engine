self.addEventListener("install", function(e) {
  return e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function(e) {
  return e.waitUntil(self.clients.claim());
});

const addCoepHeaders = response => {
  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

self.addEventListener("fetch", function(event) {
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // First, try to use the navigation preload response if it's supported.
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          // Always try the network first.
          return addCoepHeaders(await fetch(event.request));
        } catch (error) {
          // catch is only triggered if an exception is thrown, which is likely
          // due to a network error.
          // If fetch() returns a valid HTTP response with a response code in
          // the 4xx or 5xx range, the catch() will NOT be called.
          console.log("Fetch failed; returning offline page instead.", error);
          const offline = { status: 200, statusText: "Worker is offline" };
          return new Response("Offline mode is not supported.", offline);
        }
      })()
    );
  } else {
    event.respondWith(fetch(event.request));
  }
});
