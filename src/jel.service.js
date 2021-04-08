const UNNAMED_WORLD = "Unnamed World";

// Play the sound effect for a notification at most every 5 minutes since desktop
// notification sound isn't customizable and can be annoying.
const DESKTOP_SOUND_DELAY_MS = 5 * 60.0 * 1000.0;
let lastDesktopSoundPlayedAt = 0;

self.addEventListener("install", function(e) {
  return e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function(e) {
  return e.waitUntil(self.clients.claim());
});

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
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // catch is only triggered if an exception is thrown, which is likely
          // due to a network error.
          // If fetch() returns a valid HTTP response with a response code in
          // the 4xx or 5xx range, the catch() will NOT be called.
          console.log("Fetch failed; returning offline page instead.", error);
          const offline = { status: 200, statusText: "Worker is offline" };
          return new Response("Jel offline mode is not supported.", offline);
        }
      })()
    );
  }
});

self.addEventListener("push", function(e) {
  const payload = JSON.parse(e.data.text());

  return e.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function(clientList) {
      const now = performance.now();

      if (payload.type === "matrix") {
        if (payload.counts && navigator.setAppBadge) {
          const { unread } = payload.counts;

          if (unread >= 0 && unread <= 9) {
            navigator.setAppBadge(unread);
          } else if (unread > 9) {
            navigator.setAppBadge();
          }
        }
      }

      let openClient = null;

      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];

        if (client.url.startsWith(payload.origin)) {
          // Don't show a notification if client app is already focused on this computer
          if (client.focused) return;

          // TODO need to push matrix notification to client if we want to filter by the currently
          // selected room and show others.

          openClient = client;
        }
      }

      // Silence (annoying) desktop notification sound if we can send it to a client
      // or if we've been playing it too excessively.
      const silent = !!(openClient || now - lastDesktopSoundPlayedAt < DESKTOP_SOUND_DELAY_MS);

      if (!silent) {
        lastDesktopSoundPlayedAt = now;
      }

      if (openClient) {
        // Client can play custom notificaiton
        openClient.postMessage({ action: "play_notification_sound" });

        // TODO need to push notifications into the client if we want to show the proper avatar URL
      }

      if (payload.type === "matrix") {
        const matrixWantsSound = payload && payload.tweaks && payload.tweaks.sound;
        let body;

        switch (payload.content && payload.content.msgtype) {
          case "m.text":
            body = `${payload.sender_display_name} in ${payload.room_name}: ${payload.content.body}`;
            break;
        }

        if (body && payload.matrix_type) {
          return self.registration.showNotification("Jel", {
            body,
            icon: "/app-icon.png",
            badge: "/app-icon.png",
            tag: payload.hub_id,
            data: { hub_url: payload.hub_url },
            silent: silent || !matrixWantsSound
          });
        }
      } else {
        return self.registration.showNotification("Jel", {
          body: payload.type === "join" ? "Someone has joined " + (payload.hub_name || UNNAMED_WORLD) : payload.body,
          icon: "/app-icon.png",
          badge: "/app-icon.png",
          tag: payload.type === "join" ? payload.hub_id : payload.body,
          data: { hub_url: payload.hub_url },
          silent
        });
      }
    })
  );
});

self.addEventListener("notificationclick", function(e) {
  e.notification.close();

  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.indexOf(e.notification.data.hub_url) >= 0 && "focus" in client) return client.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(e.notification.data.hub_url);
      }
    })
  );
});
