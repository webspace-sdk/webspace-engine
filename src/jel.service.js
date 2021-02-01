const UNNAMED_WORLD = "Unnamed World";

self.addEventListener("install", function(e) {
  return e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function(e) {
  return e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function() {});

self.addEventListener("push", function(e) {
  const payload = JSON.parse(e.data.text());

  return e.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.indexOf(payload.hub_id) >= 0 && client.focused) return;
      }

      return self.registration.showNotification("Jel", {
        body: payload.type === "join" ? "Someone has joined " + (payload.hub_name || UNNAMED_WORLD) : payload.body,
        icon: "/app-icon.png",
        badge: "/app-icon.png",
        tag: payload.type === "join" ? payload.hub_id : payload.body,
        data: { hub_url: payload.hub_url }
      });
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
