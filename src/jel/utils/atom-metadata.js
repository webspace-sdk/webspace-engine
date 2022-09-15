import { hasIntersection } from "./set-utils";
import fastDeepEqual from "fast-deep-equal";
import { getMessages } from "../../hubs/utils/i18n";
import { useEffect } from "react";
import { EventTarget } from "event-target-shim";
import { getHubIdFromHistory } from "./jel-url-utils";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { META_TAG_PREFIX, getHubMetaFromDOM } from "./dom-utils";
import { getSpaceIdFromUrl, getHubIdFromUrl, getSpaceIdFromHistory } from "./jel-url-utils";

const ATOM_TYPES = {
  HUB: 0,
  SPACE: 1,
  VOX: 2
};

const VALID_PERMISSIONS = {
  [ATOM_TYPES.HUB]: [
    "update_hub_meta",
    "update_hub_roles",
    "join_hub",
    "close_hub",
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
    "view_nav",
    "edit_nav",
    "update_space_meta",
    "create_invite",
    "go_home",
    "publish_world_template"
  ],
  [ATOM_TYPES.VOX]: ["view_vox", "edit_vox"]
};

// This value is placed in the metadata lookup table while a fetch is
// in-flight, to debounce the function that enqueues fetching.
const pendingMetadataValue = Symbol("pending");

// This source will fetch the metadata for the current hub id from the DOM,
// and then observe meta tag changes for updates.
//
// If the current context is not a file protocol, it will also fetch the metadata
// for all the hubs sitting in index.html.
//
// When a metadata update comes in, we check if they're an owner and if so we apply.
export class LocalDOMHubMetadataSource extends EventTarget {
  constructor(navTree) {
    super();

    this.navTree = navTree;

    // Use a timeout here since there may be multiple mutations happening in the same call stack, and we only
    // want to fire the refresh event once.
    let domHubMetaRefreshTimeout = null;

    this.mutationObserver = new MutationObserver(async mutationList => {
      for (const mutation of mutationList) {
        const modifiedMetatag =
          mutation.target.tagName === "META" && mutation.target.getAttribute("name")?.startsWith(META_TAG_PREFIX);
        const modifiedTitle =
          mutation.target.tagName === "TITLE" ||
          (mutation.removedNodes.length > 0 && mutation.removedNodes[0].tagName === "TITLE");

        if (modifiedMetatag || modifiedTitle) {
          if (domHubMetaRefreshTimeout) {
            clearTimeout(domHubMetaRefreshTimeout);
          }

          domHubMetaRefreshTimeout = setTimeout(async () => {
            this.dispatchEvent(new CustomEvent("hub_meta_refresh", { detail: { metas: [await getHubMetaFromDOM()] } }));
          }, 0);

          break;
        }
      }
    });

    waitForDOMContentLoaded().then(() => {
      this.mutationObserver.observe(document.head, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: false
      });
    });

    this.navTree.addEventListener("treedata_updated", async () => {
      const currentHubId = await getHubIdFromHistory();
      const metas = [];
      for (const hubId of this.navTree.atomIdToDocEl.keys()) {
        if (hubId === currentHubId) continue;

        metas.push({ ...{ hub_id: hubId }, ...this.navTree.getAtomMetadataFromDOM(hubId) });
      }

      if (metas.length > 0) {
        this.dispatchEvent(new CustomEvent("hub_meta_refresh", { detail: { metas } }));
      }
    });
  }

  async getHubMetas(hubIds) {
    const currentHubId = await getHubIdFromHistory();

    const hubs = [];

    for (const hubId of hubIds) {
      let hub = null;

      if (hubId === currentHubId) {
        hub = await getHubMetaFromDOM();
      } else {
        hub = { ...{ hub_id: hubId }, ...this.navTree.getAtomMetadataFromDOM(hubId) };
      }

      if (hub !== null) {
        hubs.push(hub);
      }
    }

    return hubs;
  }
}

// This source will fetch the metadata for the current space from the DOM stored on;
// the tree sync for the index.html file.
export class IndexDOMSpaceMetadataSource extends EventTarget {
  constructor(navTree) {
    super();

    this.navTree = navTree;

    navTree.addEventListener("treedata_updated", async () => {
      this.dispatchEvent(
        new CustomEvent("space_meta_refresh", { detail: { metas: [await this.getSpaceMetaFromIndexDOM()] } })
      );
    });
  }

  async getSpaceMetaFromIndexDOM() {
    const { navTree } = this;
    if (!navTree.doc || !navTree.docUrl) return {};

    const spaceName = navTree.doc.title || null;
    const indexUrl = navTree.docUrl;
    const spaceUrl = navTree.docUrl.replace(/\/index\.html$/, "");
    const spaceId = await getSpaceIdFromUrl(indexUrl);

    return { space_id: spaceId, name: spaceName, url: spaceUrl };
  }

  async getSpaceMetas(spaceIds) {
    const currentSpaceId = await getSpaceIdFromHistory();

    const spaces = [];

    for (const spaceId of spaceIds) {
      let space = null;

      if (spaceId === currentSpaceId) {
        space = await this.getSpaceMetaFromIndexDOM();
      } else {
        /* Eventually this should fetch from some webspaces.network registry */
      }

      if (space !== null) {
        spaces.push(space);
      }
    }

    return spaces;
  }

  async flushLocalUpdates() {
    await this.navTree.writeTree();
  }
}

// Class which is used to track realtime updates to metadata for hubs and spaces.
// Used for filling into the tree controls.
class AtomMetadata {
  constructor(atomType) {
    this._metadata = new Map();
    this._metadataSubscribers = new Map();
    this._atomType = atomType;
    this._source = null;
    this._defaultNames = new Map();

    const messages = getMessages();

    switch (this._atomType) {
      case ATOM_TYPES.HUB:
        this._refreshMessage = "hub_meta_refresh";
        this._idColumn = "hub_id";
        this._sourceGetMethod = "getHubMetas";
        this._defaultNames.set("hub", messages["hub.unnamed-world-title"]);
        this._atomIdToUrl = getHubIdFromUrl;
        break;
      case ATOM_TYPES.SPACE:
        this._refreshMessage = "space_meta_refresh";
        this._idColumn = "space_id";
        this._sourceGetMethod = "getSpaceMetas";
        this._defaultNames.set("space", messages["space.unnamed-title"]);
        this._atomIdToUrl = getSpaceIdFromUrl;
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
      // - Re-fetch any in-flight metadata
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

  defaultNameForType() {
    if (this._atomType === ATOM_TYPES.SPACE) {
      return this._defaultNames.get("space");
    } else if (this._atomType === ATOM_TYPES.VOX) {
      return this._defaultNames.get("vox");
    } else {
      return this._defaultNames.get("hub");
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
  //
  // This is used to set the name + url of items fetched from trees, to avoid having to go to the origin HTML file.
  localUpdate = (id, metadata) => {
    if (!this.hasMetadata(id)) {
      this._metadata.set(id, {});
    }

    const existing = this.getMetadata(id);

    let newMetadata = null;

    // For now can only locally update name + rul
    for (const field of ["name", "url"]) {
      if (metadata[field] === undefined) continue;
      newMetadata = { ...(newMetadata || existing), [field]: metadata[field] };
    }

    if (newMetadata === null) return;

    this._setDisplayNameOnMetadata(newMetadata);
    this._metadata.set(id, newMetadata);
    this._fireHandlerForSubscribersForUpdatedIds([id]);
  };

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
      if (source === null) console.trace();
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

  async getAtomIdFromUrl(url) {
    return await this._atomIdToUrl(url);
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

  flushLocalUpdates() {
    if (this._source.flushLocalUpdates) {
      this._source.flushLocalUpdates();
    }
  }

  _setDisplayNameOnMetadata = metadata => {
    if (metadata.name === undefined) return;
    metadata.displayName = metadata.name || this.defaultNameForType();
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

export { AtomMetadata as default, useNameUpdateFromMetadata, ATOM_TYPES };
