import { hasIntersection } from "./set-utils";

export default class OrgMetadata {
  constructor(orgChannel) {
    this._orgChannel = orgChannel;
    this._hubMetadata = new Map();
    this._hubMetadataSubscribers = new Map();
  }

  init() {
    this._orgChannel.channel.on("hub_meta_refresh", hubMetadata => {
      this._hubMetadata.set(hubMetadata.hub_id, hubMetadata);
      this._fireHandlerForSubscribersForUpdatedHubIds([hubMetadata.hub_id]);
    });
  }

  // Subscribes to metadata changes for the given hub id.
  //
  // If multiple hub metadatas as updated at once, the handler will only
  // be fired once.
  subscribeToHubMetadata = (hubId, handler) => {
    const subs = this._hubMetadataSubscribers;

    if (!subs.has(handler)) {
      subs.set(handler, new Set());
    }

    subs.get(handler).add(hubId);
  };

  unsubscribeFromHubMetadata = handler => {
    const subs = this._hubMetadataSubscribers;
    subs.delete(handler);
  };

  _fireHandlerForSubscribersForUpdatedHubIds = updatedHubIds => {
    for (const [handler, hubIds] of this._hubMetadataSubscribers) {
      if (hasIntersection(updatedHubIds, hubIds)) {
        handler();
      }
    }
  };

  ensureHubMetadataForHubIds(hubIds) {
    return new Promise(async res => {
      const hubIdsToFetch = new Set();

      for (const hubId of hubIds) {
        if (!this._hubMetadata.has(hubId)) {
          hubIdsToFetch.add(hubId);
        }
      }

      if (hubIdsToFetch.size === 0) {
        res();
      } else {
        const hubs = await this._orgChannel.getHubMetas(hubIdsToFetch);

        for (const hubMetadata of hubs) {
          this._hubMetadata.set(hubMetadata.hub_id, hubMetadata);
        }

        for (const hubId of hubIds) {
          // Mark nulls for invalid/inaccessible hub ids.
          if (!this._hubMetadata.has(hubId)) {
            this._hubMetadata.set(hubId, null);
          }
        }

        this._fireHandlerForSubscribersForUpdatedHubIds(hubIds);
        res();
      }
    });
  }

  hasHubMetaData(hubId) {
    return !!this._hubMetadata.get(hubId);
  }

  getHubMetadata(hubId) {
    const hubMetadata = this._hubMetadata.get(hubId);
    return hubMetadata || null;
  }

  async getOrFetchHubMetadata(hubId) {
    if (this._hubMetadata.has(hubId)) {
      return this.getHubMetadata(hubId);
    } else {
      await this.ensureHubMetadataForHubIds([hubId]);
      return this.getHubMetadata(hubId);
    }
  }
}
