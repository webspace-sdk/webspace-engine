import configs from "./configs";
import { getDefaultWorldColorPreset } from "./world-color-presets";

const MIN_DEFAULT_WORLD_TYPE = 1;
const MAX_DEFAULT_WORLD_TYPE = 3;

export function hasReticulumServer() {
  return !!configs.RETICULUM_SERVER;
}

const resolverLink = document.createElement("a");

export function getReticulumFetchUrl(path, absolute = false, host = null, port = null) {
  if (host || hasReticulumServer()) {
    return `https://${host || configs.RETICULUM_SERVER}${port ? `:${port}` : ""}${path}`;
  } else if (absolute) {
    resolverLink.href = path;
    return resolverLink.href;
  } else {
    return path;
  }
}

export function fetchReticulumAuthenticated(url, method = "GET", payload) {
  const { token } = window.APP.store.state.credentials;
  const retUrl = getReticulumFetchUrl(url);
  const params = {
    headers: { "content-type": "application/json" },
    method
  };
  if (token) {
    params.headers.authorization = `bearer ${token}`;
  }
  if (payload) {
    params.body = JSON.stringify(payload);
  }
  return fetch(retUrl, params).then(async r => {
    const result = await r.text();
    try {
      return JSON.parse(result);
    } catch (e) {
      // Some reticulum responses, particularly DELETE requests, don't return json.
      return result;
    }
  });
}

export async function createSpace(name) {
  const store = window.APP.store;
  const createUrl = getReticulumFetchUrl("/api/v1/spaces");
  const payload = { space: { name } };

  const headers = { "content-type": "application/json" };
  if (!store.state || !store.state.credentials.token) {
    throw new Error("Must be signed in to create space.");
  }

  headers.authorization = `bearer ${store.state.credentials.token}`;

  const res = await fetch(createUrl, {
    body: JSON.stringify(payload),
    headers,
    method: "POST"
  }).then(r => r.json());

  if (res.error === "invalid_token") {
    // Clear the invalid token from store.
    store.clearCredentials();
    throw new Error("Must be signed in to create space.");
  }

  return res;
}

export async function createHub(
  spaceId,
  name,
  template,
  worldType = null,
  worldSeed = null,
  worldColors = null,
  spawnPosition = null,
  spawnRotation = null,
  spawnRadius = null
) {
  const store = window.APP.store;
  const createUrl = getReticulumFetchUrl("/api/v1/hubs");
  const payload = { hub: { name, space_id: spaceId } };

  if (template) {
    payload.hub.template = template;
  }

  if (worldType !== null) {
    payload.hub.world_type = worldType;
  } else {
    payload.hub.world_type =
      MIN_DEFAULT_WORLD_TYPE + Math.floor(Math.random() * (MAX_DEFAULT_WORLD_TYPE - MIN_DEFAULT_WORLD_TYPE + 1));
  }

  if (worldSeed !== null) {
    payload.hub.world_seed = worldSeed;
  }

  if (worldColors === null) {
    worldColors = getDefaultWorldColorPreset();
  }

  for (const [k, v] of Object.entries(worldColors)) {
    payload.hub[`world_${k}`] = v;
  }

  if (spawnPosition != null) {
    payload.hub.spawn_position_x = spawnPosition.x;
    payload.hub.spawn_position_y = spawnPosition.y;
    payload.hub.spawn_position_z = spawnPosition.z;
  }

  if (spawnRotation != null) {
    payload.hub.spawn_rotation_x = spawnRotation.x;
    payload.hub.spawn_rotation_y = spawnRotation.y;
    payload.hub.spawn_rotation_z = spawnRotation.z;
    payload.hub.spawn_rotation_w = spawnRotation.w;
  }

  if (spawnRadius != null) {
    payload.hub.spawn_radius = spawnRadius;
  }

  const headers = { "content-type": "application/json" };
  if (store.state && store.state.credentials.token) {
    headers.authorization = `bearer ${store.state.credentials.token}`;
  }

  return await fetch(createUrl, {
    body: JSON.stringify(payload),
    headers,
    method: "POST"
  }).then(r => r.json());
}

export function getPresenceEntryForSession(presences, sessionId) {
  const entry = Object.entries(presences || {}).find(([k]) => k === sessionId) || [];
  const presence = entry[1];
  return (presence && presence.metas && presence.metas[0]) || {};
}

export function getPresenceContextForSession(presences, sessionId) {
  return (getPresenceEntryForSession(presences, sessionId) || {}).context || {};
}

export function getPresenceProfileForSession(presences, sessionId) {
  return (getPresenceEntryForSession(presences, sessionId) || {}).profile || {};
}
