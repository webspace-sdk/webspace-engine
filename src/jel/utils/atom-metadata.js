import { hasIntersection } from "./set-utils";
import fastDeepEqual from "fast-deep-equal";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { getMessages } from "../../hubs/utils/i18n";
import { useEffect } from "react";

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
    "go_home"
  ],
  [ATOM_TYPES.VOX]: ["view_vox", "edit_vox"]
};

// This value is placed in the metadata lookup table while a fetch is
// in-flight, to debounce the function that enqueues fetching.
const pendingMetadataValue = Symbol("pending");

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

  can(permission, atomId) {
    if (!VALID_PERMISSIONS[this._atomType].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    if (!this.hasMetadata(atomId)) {
      return false; // This used to throw an error, should it still?
    }

    return !!this.getMetadata(atomId).permissions[permission];
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
      const phxChannel = source.channel;

      // Push a promise that waits on fetching the pending ids
      promises.push(
        new Promise(res => {
          source[this._sourceGetMethod](ids).then(atoms => {
            // Edge case: if phoenix channel is re-bound, discard, the rebind will
            // re-fetch the pending items.
            if (phxChannel && phxChannel !== source.channel) {
              res();
            }

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

    if (source.channel) {
      // Phoenix channel source
      source.channel.on(event, handler);
    } else {
      // Matrix (or other EventTarget) source
      source.addEventListener(event, handler);
    }
  }

  _unsubscribeFromSource(event, handler) {
    const source = this._source;

    if (source.channel) {
      // Phoenix channel source
      source.channel.off(event, handler);
    } else {
      // Matrix (or other EventTarget) source
      source.removeEventListener(event, handler);
    }
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
