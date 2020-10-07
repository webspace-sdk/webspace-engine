import { hasIntersection } from "./set-utils";

export const ATOM_TYPES = {
  HUB: 0,
  SPACE: 1
};

// Class which is used to track realtime updates to metadata for hubs and spaces.
export class AtomMetadata {
  constructor(spaceChannel, atomType) {
    this._spaceChannel = spaceChannel;
    this._metadata = new Map();
    this._metadataSubscribers = new Map();
    this._atomType = atomType;

    switch (this._atomType) {
      case ATOM_TYPES.HUB:
        this._refreshMessage = "hub_meta_refresh";
        this._idColumn = "hub_id";
        this._channelGetMethod = "getHubMetas";
        break;
      case ATOM_TYPES.SPACE:
        this._refreshMessage = "space_meta_refresh";
        this._idColumn = "space_id";
        this._channelGetMethod = "getSpaceMetas";
        break;
    }
  }

  init() {
    this._spaceChannel.channel.on(this._refreshMessage, metadata => {
      const id = metadata[this._idColumn];
      this._atomMetadata.set(id, metadata);
      this._fireHandlerForSubscribersForUpdatedIds([id]);
    });
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
        handler();
      }
    }
  };

  ensureMetadataForIds(ids) {
    return new Promise(async res => {
      const idsToFetch = new Set();

      for (const id of ids) {
        if (!this._metadata.has(id)) {
          idsToFetch.add(id);
        }
      }

      if (idsToFetch.size === 0) {
        res();
      } else {
        const atoms = await this._spaceChannel[this._channelGetMethod](idsToFetch);

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

  async getOrFetchMetadata(id) {
    if (this._metadata.has(id)) {
      return this.getMetadata(id);
    } else {
      await this.ensureMetadataForIds([id]);
      return this.getMetadata(id);
    }
  }
}
