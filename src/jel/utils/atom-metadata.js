import { hasIntersection } from "./set-utils";
import fastDeepEqual from "fast-deep-equal";
import { getMessages } from "../../hubs/utils/i18n";

export const ATOM_TYPES = {
  HUB: 0,
  SPACE: 1
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
  [ATOM_TYPES.SPACE]: []
};

// Class which is used to track realtime updates to metadata for hubs and spaces.
// Used for filling into the tree controls.
export class AtomMetadata {
  constructor(atomType) {
    this._metadata = new Map();
    this._metadataSubscribers = new Map();
    this._atomType = atomType;

    switch (this._atomType) {
      case ATOM_TYPES.HUB:
        this._refreshMessage = "hub_meta_refresh";
        this._idColumn = "hub_id";
        this._channelGetMethod = "getHubMetas";
        this._defaultName = getMessages()["hub.unnamed-title"];
        break;
      case ATOM_TYPES.SPACE:
        this._refreshMessage = "space_meta_refresh";
        this._idColumn = "space_id";
        this._channelGetMethod = "getSpaceMetas";
        this._defaultName = getMessages()["space.unnamed-title"];
        break;
    }
  }

  bind(channel) {
    if (this._channel) {
      this._channel.channel.off(this._refreshMessage, this.handleChannelRefreshMessage);
    }

    this._channel = channel;
    this._channel.channel.on(this._refreshMessage, this.handleChannelRefreshMessage);
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

  _fireHandlerForSubscribersForUpdatedIds = updatedIds => {
    for (const [handler, ids] of this._metadataSubscribers) {
      if (hasIntersection(updatedIds, ids)) {
        handler(updatedIds);
      }
    }
  };

  can(permission, atomId) {
    if (!VALID_PERMISSIONS[this._atomType].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    if (!this.hasMetadata(atomId)) {
      throw new Error(`Tried to fetch permissions for ${atomId} type ${this._atomType} but not loaded.`);
    }

    return !!this.getMetadata(atomId).permissions[permission];
  }

  ensureMetadataForIds(ids, force = false) {
    return new Promise(async res => {
      const idsToFetch = new Set();

      for (const id of ids) {
        if (!this._metadata.has(id) || force) {
          idsToFetch.add(id);
        }
      }

      if (idsToFetch.size === 0) {
        res();
      } else {
        const atoms = await this._channel[this._channelGetMethod](idsToFetch);
        for (const metadata of atoms) {
          this._metadata.set(metadata[this._idColumn], metadata);
        }

        for (const id of ids) {
          // Mark nulls for invalid/inaccessible hub ids.
          if (!this._metadata.has(id)) {
            this._metadata.set(id, null);
          }
        }

        this._fireHandlerForSubscribersForUpdatedIds(ids);
        res();
      }
    });
  }

  hasMetadata(id) {
    return !!this._metadata.get(id);
  }

  getMetadata(id) {
    const metadata = this._metadata.get(id);
    return metadata || null;
  }

  getDefaultName() {
    return this._defaultName;
  }

  handleChannelRefreshMessage = ({ metas }) => {
    const ids = [];

    for (let i = 0; i < metas.length; i++) {
      const metadata = metas[i];
      const id = metadata[this._idColumn];

      const existing = this._metadata.get(id);

      if (!existing || !fastDeepEqual(existing, metadata)) {
        ids.push(id);
        this._metadata.set(id, metadata);
      }
    }

    if (ids.length > 0) {
      this._fireHandlerForSubscribersForUpdatedIds(ids);
    }
  };

  async getOrFetchMetadata(id) {
    if (this._metadata.has(id)) {
      return this.getMetadata(id);
    } else {
      await this.ensureMetadataForIds([id]);
      return this.getMetadata(id);
    }
  }
}
