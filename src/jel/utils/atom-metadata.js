import { hasIntersection } from "./set-utils";
import fastDeepEqual from "fast-deep-equal";
import { getMessages } from "../../hubs/utils/i18n";
import { useEffect } from "react";
import { EventTarget } from "event-target-shim";
import { getHubIdFromHistory, getSpaceIdFromHistory } from "./jel-url-utils";

const ATOM_TYPES = {
  HUB: 0,
  SPACE: 1,
  VOX: 2
};

export const ATOM_NOTIFICATION_TYPES = {
  NONE: 0,
  UNREAD: 1,
  NOTIFICATIONS: 2,
  PING_NOTIFICATIONS: 3
};

const NO_COUNTS = {
  notification_count: 0,
  notification_type: 0
};

const VALID_PERMISSIONS = {
  [ATOM_TYPES.HUB]: [
    "update_hub_meta",
    "update_hub_roles",
    "join_hub",
    "close_hub",
    "trash_hub",
    "remove_hub",
    "mute_users",
    "kick_users",
    "tweet",
    "spawn_camera",
    "spawn_drawing",
    "spawn_and_move_media",
    "spawn_emoji",
    "fly",
    "upload_files"
  ],
  [ATOM_TYPES.SPACE]: [
    "create_world_hub",
    "create_channel_hub",
    "view_nav",
    "edit_nav",
    "update_space_meta",
    "create_invite",
    "go_home",
    "publish_world_template"
  ],
  [ATOM_TYPES.VOX]: ["view_vox", "edit_vox"]
};

const META_TAG_PREFIX = "webspace:";

// This value is placed in the metadata lookup table while a fetch is
// in-flight, to debounce the function that enqueues fetching.
const pendingMetadataValue = Symbol("pending");

const VEC_ZERO = { x: 0, y: 0, z: 0 };
const QUAT_IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const COLOR_BLACK = { r: 0, g: 0, b: 0 };

function getIntFromMeta(name, defaultValue = 0) {
  try {
    return (
      parseInt(document.head.querySelector(`meta[name='${META_TAG_PREFIX}${name}']`)?.getAttribute("content")) ||
      defaultValue
    );
  } catch {
    return defaultValue;
  }
}

function getFloatFromMeta(name, defaultValue = 0) {
  try {
    return (
      parseFloat(document.head.querySelector(`meta[name='${META_TAG_PREFIX}${name}']`)?.getAttribute("content")) ||
      defaultValue
    );
  } catch {
    return defaultValue;
  }
}

function getVectorFromMeta(name, defaultValue = VEC_ZERO) {
  try {
    const content = document.head
      .querySelector(`meta[name='${META_TAG_PREFIX}${name}']`)
      ?.getAttribute("content")
      ?.split(" ");

    if (content && content.length === 3) {
      return {
        x: parseFloat(content[0]),
        y: parseFloat(content[1]),
        z: parseFloat(content[2])
      };
    } else {
      return defaultValue;
    }
  } catch {
    return defaultValue;
  }
}

function getColorFromMeta(name, defaultValue = COLOR_BLACK) {
  try {
    const content = document.head
      .querySelector(`meta[name='${META_TAG_PREFIX}${name}']`)
      ?.getAttribute("content")
      ?.split(" ");

    if (content && content.length === 3) {
      return {
        r: parseFloat(content[0]),
        g: parseFloat(content[1]),
        b: parseFloat(content[2])
      };
    } else {
      return defaultValue;
    }
  } catch {
    return defaultValue;
  }
}

function getQuaternionFromMeta(name, defaultValue = QUAT_IDENTITY) {
  try {
    const content = document.head
      .querySelector(`meta[name='${META_TAG_PREFIX}${name}']`)
      ?.getAttribute("content")
      ?.split(" ");

    if (content && content.length === 4) {
      return {
        x: parseFloat(content[0]),
        y: parseFloat(content[1]),
        z: parseFloat(content[2]),
        w: parseFloat(content[3])
      };
    } else {
      return defaultValue;
    }
  } catch {
    return defaultValue;
  }
}

// This source will fetch the metadata for the current hub id from the initial
// DOM, and then listen to the network for requests of metadata updates.
//
// If the current context is not a file protocol, it will also fetch the metadata
// for all the hubs sitting in index.html.
//
// When a metadata update comes in, we check if they're an owner and if so we apply.
export class DOMAndOwnerHubMetadataSource extends EventTarget {
  constructor() {
    super();

    this.patchedMetadata = new Map();
  }

  async getHubMetas(hubIds) {
    const currentHubId = await getHubIdFromHistory();
    const currentSpaceId = await getSpaceIdFromHistory();

    const hubs = [];

    for (const hubId of hubIds) {
      let hub = null;

      if (hubId === currentHubId) {
        hub = {
          hub_id: currentHubId,
          space_id: currentSpaceId,
          name: document.title,
          url: document.origin + document.location.pathname,
          spawn_point: {
            position: getVectorFromMeta("environment:spawn_point:position"),
            rotation: getQuaternionFromMeta("environment:spawn_point:rotation"),
            radius: getFloatFromMeta("environment:spawn_point:radius", 10)
          },
          world: {
            seed: getIntFromMeta("environment:terrain:seed"),
            type: getIntFromMeta("environment:terrain:type", 3),
            bark_color: getColorFromMeta("environment:colors:bark", {
              r: 0.1450980392156863,
              g: 0.07058823529411765,
              b: 0
            }),
            edge_color: getColorFromMeta("environment:colors:edge", {
              r: 0.5764705882352941,
              g: 0.3411764705882353,
              b: 0.20784313725490197
            }),
            grass_color: getColorFromMeta("environment:colors:grass", {
              r: 0,
              g: 0.8509803921568627,
              b: 0.050980392156862744
            }),
            ground_color: getColorFromMeta("environment:colors:ground", {
              r: 0,
              g: 0.266666666,
              b: 0.0196078431372549
            }),
            leaves_color: getColorFromMeta("environment:colors:leaves", {
              r: 0,
              g: 0.39215686274509803,
              b: 0.07058823529411765
            }),
            rock_color: getColorFromMeta("environment:colors:rock", {
              r: 1,
              g: 1,
              b: 1
            }),
            sky_color: getColorFromMeta("environment:colors:sky", {
              r: 0.29411764705882354,
              g: 0.4392156862745098,
              b: 0.6549019607843137
            }),
            water_color: getColorFromMeta("environment:colors:water", {
              r: 0,
              g: 0.26666666666666666,
              b: 0.6352941176470588
            })
          }
        };
      } else {
        if (document.location.protocol === "http:" || document.location.protocol === "https:") {
          // TODO SHARED fetch others
        }
      }

      if (hub !== null) {
        if (this.patchedMetadata.has(hubId)) {
          hub = { ...this.patchedMetadata.get(hubId), hub };
        }

        hubs.push(hub);
      }
    }

    return hubs;
  }
}

// Class which is used to track realtime updates to metadata for hubs and spaces.
// Used for filling into the tree controls.
class AtomMetadata {
  constructor(atomType) {
    this._metadata = new Map();
    this._metadataSubscribers = new Map();
    this._counts = new Map();
    this._atomType = atomType;
    this._source = null;
    this._defaultNames = new Map();

    const messages = getMessages();

    switch (this._atomType) {
      case ATOM_TYPES.HUB:
        this._refreshMessage = "hub_meta_refresh";
        this._idColumn = "hub_id";
        this._sourceGetMethod = "getHubMetas";
        this._defaultNames.set("world", messages["hub.unnamed-world-title"]);
        this._defaultNames.set("channel", messages["hub.unnamed-channel-title"]);
        break;
      case ATOM_TYPES.SPACE:
        this._refreshMessage = "space_meta_refresh";
        this._idColumn = "space_id";
        this._sourceGetMethod = "getSpaceMetas";
        this._defaultNames.set("space", messages["space.unnamed-title"]);
        break;
      case ATOM_TYPES.VOX:
        this._refreshMessage = "vox_meta_refresh";
        this._idColumn = "vox_id";
        this._sourceGetMethod = "getVoxMetas";
        this._defaultNames.set("vox", messages["vox.unnamed-title"]);
        break;
    }
  }

  bind(source) {
    const inFlightMetadataIds = [];

    if (this._source) {
      this._unsubscribeFromSource(this._refreshMessage, this._handleSourceRefreshEvent);

      // On a source change, we need to do two things to ensure metadata will
      // now fetch properly:
      //
      // - Remove any entries that had 'null' as value, since those may now
      //   be accessible
      //
      // - Re-fetch any in-flight metadata (the fetch routing will abort if the
      //   channel changes)
      const previouslyInaccessibleMetadataIds = new Set();
      for (const [id, value] of this._metadata.entries()) {
        if (value === null) {
          previouslyInaccessibleMetadataIds.add(id);
        } else if (value === pendingMetadataValue) {
          inFlightMetadataIds.push(id);
        }
      }

      for (const id of previouslyInaccessibleMetadataIds) {
        this._metadata.delete(id);
      }
    }

    this._source = source;
    this._subscribeToSource(this._refreshMessage, this._handleSourceRefreshEvent);

    this.ensureMetadataForIds(inFlightMetadataIds, true);
  }

  defaultNameForType(type = null) {
    if (this._atomType === ATOM_TYPES.SPACE) {
      return this._defaultNames.get("space");
    } else if (this._atomType === ATOM_TYPES.VOX) {
      return this._defaultNames.get("vox");
    } else {
      return this._defaultNames.get(type);
    }
  }

  // Subscribes to metadata changes for the given atom id.
  //
  // If multiple metadatas as updated at once, the handler will only be fired once.
  subscribeToMetadata = (id, handler) => {
    const subs = this._metadataSubscribers;

    if (!subs.has(handler)) {
      subs.set(handler, new Set());
    }

    subs.get(handler).add(id);
  };

  unsubscribeFromMetadata = handler => {
    const subs = this._metadataSubscribers;
    subs.delete(handler);
  };

  // Performs a local optimistic update + fires events
  localUpdate = (id, metadata) => {
    if (!this.hasMetadata(id)) return;
    const existing = this.getMetadata(id);

    let newMetadata = null;

    // For now can only locally update name
    for (const field of ["name"]) {
      if (metadata[field] === undefined) continue;
      newMetadata = { ...(newMetadata || existing), [field]: metadata[field] };
    }

    if (newMetadata === null) return;

    this._setDisplayNameOnMetadata(newMetadata);
    this._metadata.set(id, newMetadata);
    this._fireHandlerForSubscribersForUpdatedIds([id]);
  };

  setCounts(id, counts) {
    this._counts.set(id, counts);
    this._fireHandlerForSubscribersForUpdatedIds([id]);
  }

  getCounts(id) {
    return this._counts.get(id) || NO_COUNTS;
  }

  hasCounts(id) {
    return this._counts.has(id);
  }

  can(permission /*, atomId*/) {
    if (!VALID_PERMISSIONS[this._atomType].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    // TODO SHARED permissions
    return true;

    //if (!this.hasMetadata(atomId)) {
    //  return false; // This used to throw an error, should it still?
    //}

    //return !!this.getMetadata(atomId).permissions[permission];
  }

  ensureMetadataForIds(ids, force = false) {
    const idsToFetch = new Set();
    const source = this._source;
    const alreadyPendingIds = new Set();

    for (const id of ids) {
      // Only fetch things not in the map, which will skip attempts to re-fetch pending ids.
      if (!this._metadata.has(id) || force) {
        idsToFetch.add(id);
        this._metadata.set(id, pendingMetadataValue);
      } else if (this._metadata.get(id) === pendingMetadataValue) {
        alreadyPendingIds.add(id);
      }
    }

    const promises = [];

    // Some are in-flight already, wait for them.
    for (const id of alreadyPendingIds) {
      promises.push(
        new Promise(res => {
          const handler = () => {
            res();
            this.unsubscribeFromMetadata(handler);
          };

          this.subscribeToMetadata(id, handler);
        })
      );
    }

    // Others are pending, create a promise to fetch them.
    if (idsToFetch.size > 0) {
      // Push a promise that waits on fetching the pending ids
      promises.push(
        new Promise(res => {
          source[this._sourceGetMethod](ids).then(atoms => {
            for (const metadata of atoms) {
              this._setDisplayNameOnMetadata(metadata);
              this._metadata.set(metadata[this._idColumn], metadata);
            }

            for (const id of ids) {
              // Mark nulls for invalid/inaccessible hub ids. TODO Need to deal with permission changes.
              if (!this.hasMetadata(id)) {
                this._metadata.set(id, null);
              }
            }

            this._fireHandlerForSubscribersForUpdatedIds(ids);
            res();
          });
        })
      );
    }

    return Promise.all(promises);
  }

  hasMetadata(id) {
    const metadata = this._metadata.get(id);
    return metadata && metadata !== pendingMetadataValue;
  }

  hasOrIsPendingMetadata(id) {
    const metadata = this._metadata.get(id);
    return !!metadata;
  }

  getMetadata(id) {
    const metadata = this._metadata.get(id);
    return metadata && metadata !== pendingMetadataValue ? metadata : null;
  }

  get atomType() {
    return this._atomType;
  }

  async getOrFetchMetadata(id) {
    if (this.hasMetadata(id)) {
      return this.getMetadata(id);
    } else {
      await this.ensureMetadataForIds([id]);
      return this.getMetadata(id);
    }
  }

  _fireHandlerForSubscribersForUpdatedIds = updatedIds => {
    for (const [handler, ids] of this._metadataSubscribers) {
      if (hasIntersection(updatedIds, ids)) {
        handler(updatedIds, this);
      }
    }
  };

  _handleSourceRefreshEvent = payload => {
    // Depending on if this was EventTarget event or channel message, metas are packed differently.
    const metas = payload.detail ? payload.detail.metas : payload.metas;

    const ids = [];

    for (let i = 0; i < metas.length; i++) {
      const metadata = metas[i];
      const id = metadata[this._idColumn];

      const existing = this._metadata.get(id);

      if (!existing || !fastDeepEqual(existing, metadata)) {
        ids.push(id);
        this._setDisplayNameOnMetadata(metadata);
        this._metadata.set(id, metadata);
      }
    }

    if (ids.length > 0) {
      this._fireHandlerForSubscribersForUpdatedIds(ids);
    }
  };

  _setDisplayNameOnMetadata = metadata => {
    if (metadata.name === undefined && metadata.type === undefined) return;
    metadata.displayName = metadata.name || this.defaultNameForType(metadata.type);
  };

  _subscribeToSource(event, handler) {
    const source = this._source;
    source.addEventListener(event, handler);
  }

  _unsubscribeFromSource(event, handler) {
    const source = this._source;
    source.removeEventListener(event, handler);
  }
}

function useNameUpdateFromMetadata(atomId, metadata, setDisplayName, setRawName) {
  useEffect(
    () => {
      if (!metadata) return () => {};

      const updateName = () => {
        let rawName = null;
        let displayName = null;

        if (atomId && metadata.hasMetadata(atomId)) {
          const { name: atomRawName, displayName: atomDisplayName } = metadata.getMetadata(atomId);
          rawName = atomRawName;
          displayName = atomDisplayName;
        }

        if (setDisplayName) {
          setDisplayName(displayName || "");
        }

        if (setRawName) {
          setRawName(rawName);
        }
      };

      updateName();

      if (atomId) {
        metadata.ensureMetadataForIds([atomId]);
        metadata.subscribeToMetadata(atomId, updateName);
      }

      return () => metadata.unsubscribeFromMetadata(updateName);
    },
    [atomId, metadata, setDisplayName, setRawName]
  );
}

function useNotificationCountUpdatesFromMetadata(atomId, metadata, setNotificationCount, setNotificationType) {
  useEffect(
    () => {
      if (!metadata) return () => {};

      const updateCounts = () => {
        let count = null;
        let type = null;

        if (atomId) {
          const { notification_count: c, notification_type: t } = metadata.getCounts(atomId);
          count = c;
          type = t;
        }

        if (count !== undefined && count !== null && setNotificationCount) {
          setNotificationCount(count);
        }

        if (type !== undefined && type !== null && setNotificationType) {
          setNotificationType(type);
        }
      };

      updateCounts();

      if (atomId) {
        metadata.ensureMetadataForIds([atomId]);
        metadata.subscribeToMetadata(atomId, updateCounts);
      }

      return () => metadata.unsubscribeFromMetadata(updateCounts);
    },
    [atomId, metadata, setNotificationCount, setNotificationType]
  );
}

export { AtomMetadata as default, useNameUpdateFromMetadata, useNotificationCountUpdatesFromMetadata, ATOM_TYPES };
