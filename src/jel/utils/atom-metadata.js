import { hasIntersection } from "./set-utils";
import fastDeepEqual from "fast-deep-equal";
import { getMessages } from "../../hubs/utils/i18n";
import { useEffect } from "react";

const ATOM_TYPES = {
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
class AtomMetadata {
  constructor(atomType) {
    this._metadata = new Map();
    this._metadataSubscribers = new Map();
    this._atomType = atomType;

    const messages = getMessages();

    switch (this._atomType) {
      case ATOM_TYPES.HUB:
        this._refreshMessage = "hub_meta_refresh";
        this._idColumn = "hub_id";
        this._channelGetMethod = "getHubMetas";
        this._defaultName = messages["hub.unnamed-title"];
        this._defaultHomeName = messages["hub.unnamed-home-title"];
        break;
      case ATOM_TYPES.SPACE:
        this._refreshMessage = "space_meta_refresh";
        this._idColumn = "space_id";
        this._channelGetMethod = "getSpaceMetas";
        this._defaultName = messages["space.unnamed-title"];
        this._defaultHomeName = messages["space.unnamed-home-title"];
        break;
    }
  }

  bind(channel) {
    if (this._channel) {
      this._channel.channel.off(this._refreshMessage, this._handleChannelRefreshMessage);
    }

    this._channel = channel;
    this._channel.channel.on(this._refreshMessage, this._handleChannelRefreshMessage);
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
  optimisticUpdate = (id, metadata) => {
    if (!this.hasMetadata(id)) return;
    const existing = this.getMetadata(id);

    // TODO generalize this
    if (this._atomType === ATOM_TYPES.HUB) {
      if (metadata.name) {
        const newMetadata = { ...existing, name: metadata.name };
        this._setDisplayNameOnMetadata(newMetadata);
        this._metadata.set(id, newMetadata);
        this._fireHandlerForSubscribersForUpdatedIds([id]);
      }
    }
  };

  can(permission, atomId) {
    if (!VALID_PERMISSIONS[this._atomType].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    if (!this.hasMetadata(atomId)) {
      return false; // This used to throw an error, should it still?
    }

    return !!this.getMetadata(atomId).permissions[permission];
  }

  async ensureMetadataForIds(ids, force = false) {
    const idsToFetch = new Set();

    for (const id of ids) {
      if (!this._metadata.has(id) || force) {
        idsToFetch.add(id);
      }
    }

    if (idsToFetch.size !== 0) {
      const atoms = await this._channel[this._channelGetMethod](idsToFetch);
      for (const metadata of atoms) {
        this._setDisplayNameOnMetadata(metadata);
        this._metadata.set(metadata[this._idColumn], metadata);
      }

      for (const id of ids) {
        // Mark nulls for invalid/inaccessible hub ids.
        if (!this._metadata.has(id)) {
          this._metadata.set(id, null);
        }
      }

      this._fireHandlerForSubscribersForUpdatedIds(ids);
    }
  }

  hasMetadata(id) {
    return !!this._metadata.get(id);
  }

  getMetadata(id) {
    const metadata = this._metadata.get(id);
    return metadata || null;
  }

  async getOrFetchMetadata(id) {
    if (this._metadata.has(id)) {
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

  _handleChannelRefreshMessage = ({ metas }) => {
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
    metadata.displayName = metadata.name || (metadata.is_home ? this._defaultHomeName : this._defaultName);
  };
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
      metadata.ensureMetadataForIds([atomId]);
      metadata.subscribeToMetadata(atomId, updateName);
      return () => metadata.unsubscribeFromMetadata(updateName);
    },
    [atomId, metadata, setDisplayName, setRawName]
  );
}

export { AtomMetadata as default, useNameUpdateFromMetadata, ATOM_TYPES };
