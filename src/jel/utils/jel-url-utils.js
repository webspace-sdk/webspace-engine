const qs = new URLSearchParams(location.search);

function getSidsFromHistory() {
  if (qs.get("hub_id")) return qs.get("hub_id");
  const slugParts = history.location.pathname
    .substring(1)
    .split("/")[0]
    .split("-");
  return slugParts[slugParts.length - 1];
}

export function getHubIdFromHistory() {
  return getSidsFromHistory().substring(5);
}

export function getSpaceIdFromHistory() {
  return getSidsFromHistory().substring(0, 5);
}

export function setupPeerConnectionConfig(adapter, host, turn) {
  const forceTurn = qs.get("force_turn");
  const forceTcp = qs.get("force_tcp");
  const peerConnectionConfig = {};

  if (turn && turn.enabled) {
    const iceServers = [];

    turn.transports.forEach(ts => {
      // Try both TURN DTLS and TCP/TLS
      if (!forceTcp) {
        iceServers.push({ urls: `turns:${host}:${ts.port}`, username: turn.username, credential: turn.credential });
      }

      iceServers.push({
        urls: `turns:${host}:${ts.port}?transport=tcp`,
        username: turn.username,
        credential: turn.credential
      });
    });

    iceServers.push({ urls: "stun:stun1.l.google.com:19302" });

    peerConnectionConfig.iceServers = iceServers;
    peerConnectionConfig.iceTransportPolicy = "all";

    if (forceTurn || forceTcp) {
      peerConnectionConfig.iceTransportPolicy = "relay";
    }
  } else {
    peerConnectionConfig.iceServers = [
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" }
    ];
  }

  adapter.setPeerConnectionConfig(peerConnectionConfig);
}
