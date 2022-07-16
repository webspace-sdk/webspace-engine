import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";

const qs = new URLSearchParams(location.search);

function getSidsFromHistory(history) {
  if (qs.get("hub_id")) return qs.get("hub_id");
  const slugParts = history.location.pathname
    .substring(1)
    .split("/")[0]
    .split("-");
  return slugParts[slugParts.length - 1];
}

export function getHubIdFromHistory(history) {
  if (qs.get("hub_id")) return qs.get("hub_id");
  return getSidsFromHistory(history).substring(5);
}

export function getSpaceIdFromHistory(history) {
  if (qs.get("space_id")) return qs.get("space_id");
  return getSidsFromHistory(history).substring(0, 5);
}

export function navigateToHubUrl(history, url, replace = false) {
  const search = history.location.search;
  const path = new URL(url, document.location.origin).pathname;
  (replace ? replaceHistoryPath : pushHistoryPath)(history, path, search);
}

// export function setupPeerConnectionConfig(adapter, host, turn) {
//   const forceTurn = qs.get("force_turn");
//   const forceTcp = qs.get("force_tcp");
//   const peerConnectionConfig = {};
//
//   if (turn && turn.enabled) {
//     const iceServers = [];
//
//     turn.transports.forEach(ts => {
//       // Try both TURN DTLS and TCP/TLS
//       if (!forceTcp) {
//         iceServers.push({ urls: `turns:${host}:${ts.port}`, username: turn.username, credential: turn.credential });
//       }
//
//       iceServers.push({
//         urls: `turns:${host}:${ts.port}?transport=tcp`,
//         username: turn.username,
//         credential: turn.credential
//       });
//     });
//
//     iceServers.push({ urls: "stun:stun1.l.google.com:19302" });
//
//     peerConnectionConfig.iceServers = iceServers;
//     peerConnectionConfig.iceTransportPolicy = "all";
//
//     if (forceTurn || forceTcp) {
//       peerConnectionConfig.iceTransportPolicy = "relay";
//     }
//   } else {
//     peerConnectionConfig.iceServers = [
//       { urls: "stun:stun1.l.google.com:19302" },
//       { urls: "stun:stun2.l.google.com:19302" }
//     ];
//   }
//
//   adapter.setPeerConnectionConfig(peerConnectionConfig);
// }
