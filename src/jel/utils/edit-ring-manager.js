import { getNetworkId } from "./ownership-utils";
import { getCurrentPresence } from "./presence-utils";

const SYNC_STATES = {
  UNSYNCED: 0, // Not synced at all
  PENDING: 1, // Doc requested, but not synced
  SYNCED: 2 // Actively synced
};

const MAX_COMPONENTS = 128;

// Notes on syncing:
//
// We can't just use the doc that we construct from the DOM or asset folder since if people are editing
// then the DOM-constructed or fetched doc and the dynamically updated doc will be incompatible.
//
// So the docs in this system start out as 'candidate' docs, and then when the first person
// enters presence as an editor their ydoc is the defaco genesis doc.
//
// Basic algorithm:
//   - In presence, keep a list of network ids of docs that you are actively part of the gossip ring for.
//
//   - If you start editing a doc, check if anyone else is in the ring in presence for it.
//     - If not, your doc is the one everyone will start from. Register yourself into presence
//       and proceed as normal. Others will now start sending requests for you to sync up.
//
//     - If so, request the doc from anyone in the ring. Once you get it, register yourself in presence,
//       replace your doc (clobbering any local changes made since then, sadly) and re-render.
//
// You should always be listening for messages to get the doc, and if a op message comes in you need to
// either queue it if you haven't joined the ring yet, or apply it if you have. When you have an op to
// contribute broadcast it to the ring.
//
// There is an additional edge case: if there are already people editing in presence, but you start
// editing before presence has sync, then you will think you were the first person to edit and not pull.
// What we want though is for you to discard your changes. (We can't merge, because of the cold load problem.)
//
// To deal with this, we tie break based on client id. We keep track of if the ydoc is 'known good', meaning
// we either sent it to someone else or received it (so odds are it's part of the sync ring.)
//
// If not, then we defer to higher client ids we see for the first time.
//
// For syncing there are two kinds of docs, voxes, or ydocs for text editing.
export default class EditRingManager {
  constructor() {
    this.maxIndex = -1;
    this.components = Array(MAX_COMPONENTS).fill(null);
    this.networkIdToComponent = new Map();
    this.networkIdToSyncState = new Map();
    this.networkIdToSyncHandler = new Map();
    this.seenClientIdsInPresence = new Set();

    // We have a "known-good" doc if we:
    // - Received the doc from someone else
    // - Sent the doc to at least one other person
    //
    // Otherwise, if we see someone else syncing it and we are too, then we defer to them if they have a higher client id.
    this.hasKnownGoodDocNetworkIds = new Set();
  }

  init(scene) {
    scene.addEventListener("presence-synced", this.sendInitialDocRequestsForPresence.bind(this));

    // Presence can contain unconnected clients, so we need to run the pass over presence whenver a new client connects as well.
    document.body.addEventListener("clientConnected", this.sendInitialDocRequestsForPresence.bind(this));
  }

  registerRingEditableComponent(component, syncHandler) {
    const networkId = getNetworkId(component.el);
    if (!networkId) return;

    this.networkIdToComponent.set(networkId, component);
    this.networkIdToSyncState.set(networkId, SYNC_STATES.UNSYNCED);
    this.networkIdToSyncHandler.set(networkId, syncHandler);

    for (let i = 0; i <= this.maxIndex; i++) {
      if (this.components[i] === null) {
        this.components[i] = component;
        this.maxIndex = Math.max(this.maxIndex, i);
        return;
      }
    }

    this.components[++this.maxIndex] = component;
    this.sendInitialDocRequestsForPresence();
  }

  unregisterRingEditableComponent(component) {
    const index = this.components.indexOf(component);
    if (index === -1) return;

    const networkId = getNetworkId(component.el);
    this.networkIdToComponent.delete(networkId);
    this.networkIdToSyncState.delete(networkId);
    this.networkIdToSyncHandler.delete(networkId);

    this.components[index] = null;

    for (let i = 0; i < this.components.length; i++) {
      if (this.components[i] === null) continue;
      this.maxIndex = Math.max(this.maxIndex, i);
    }
  }

  sendDeltaSync(component, delta) {
    const index = this.components.indexOf(component);
    if (index === -1) return;
    const networkId = getNetworkId(component.el);

    const syncState = this.getSyncState(networkId);

    if (syncState === SYNC_STATES.UNSYNCED && this.isSyncRingEmpty(networkId)) {
      // We're the first person to edit this media text, so we need to join the ring ourselves.
      this.joinSyncRing(networkId);
    } else if (syncState === SYNC_STATES.SYNCING) {
      // Broadcast the delta
      window.APP.hubChannel.broadcastMessage({ type: "delta", delta, network_id: networkId }, "edit_ring_message");
    }
  }

  sendInitialDocRequestsForPresence() {
    const requestedNetworkIds = new Set();

    // Search for any new components that need to be synced - ones that have ring members
    for (const state of NAF.connection.presence.states.values()) {
      const clientId = state.client_id;
      if (!clientId || NAF.clientId === clientId) continue;
      if (!state.sync_ring_memberships) continue;

      // Presence can contain clients we're not connected to
      if (!NAF.connection.hasActiveDataChannel(clientId)) continue;

      for (const { doc_type, network_id: networkId } of state.sync_ring_memberships) {
        if (!this.networkIdToComponent.has(networkId)) continue;
        if (requestedNetworkIds.has(networkId)) continue;

        const syncState = this.getSyncState(networkId);
        if (syncState === SYNC_STATES.PENDING) continue;

        // Deal with the edge case of two clients editing and *then* connecting. (See end of comment at top of file.)
        let shouldRequestFull = false;

        if (syncState === SYNC_STATES.UNSYNCED) {
          shouldRequestFull = true;
        } else if (
          syncState === SYNC_STATES.SYNCING &&
          !this.seenClientIdsInPresence.has(clientId) &&
          !this.hasKnownGoodDocNetworkIds.has(networkId)
        ) {
          // If we're syncing, did not receive the ydoc we're syncing, and another client with a higher client id than us is syncing,
          // we are going to defer to them (see comment at top of file.)
          shouldRequestFull = clientId > NAF.clientId;
        }

        if (shouldRequestFull) {
          window.APP.hubChannel.sendMessage(
            { type: "request_full_doc", network_id: networkId, doc_type },
            "edit_ring_message",
            clientId
          );

          this.networkIdToSyncState.set(networkId, SYNC_STATES.PENDING);
          requestedNetworkIds.add(networkId);
        }
      }

      this.seenClientIdsInPresence.add(clientId);
    }
  }

  getSyncState(networkId) {
    return this.networkIdToSyncState.has(networkId) ? this.networkIdToSyncState.get(networkId) : SYNC_STATES.UNSYNCED;
  }

  handleEditRingMessage(payload, fromClientId) {
    const { type, network_id } = payload;
    const component = this.networkIdToComponent.get(network_id);
    if (!component) return;

    const syncHandler = this.networkIdToSyncHandler.get(network_id);
    if (!syncHandler) return;

    if (type === "request_full_doc") {
      this.hasKnownGoodDocNetworkIds.add(network_id);

      const content = syncHandler.getFullSync(network_id);

      if (content) {
        window.APP.hubChannel.sendMessage(
          { type: "receive_full_doc", network_id, content },
          "edit_ring_message",
          fromClientId
        );
      }
    } else if (type === "receive_full_doc") {
      if (this.getSyncState(network_id) === SYNC_STATES.PENDING) {
        this.hasKnownGoodDocNetworkIds.add(network_id);
        syncHandler.applyFullSync(network_id, payload.content);
        this.joinSyncRing(network_id);
      }
    } else if (type === "delta") {
      if (fromClientId === NAF.clientId) return;
      if (this.getSyncState(network_id) === SYNC_STATES.SYNCING) {
        syncHandler.applyDeltaSync(network_id, payload.delta);
      }
    }
  }

  getSyncRingMembers(networkId) {
    const members = new Set();

    for (const state of NAF.connection.presence.states.values()) {
      const clientId = state.client_id;
      if (!clientId) continue;

      const syncRingMemberships = state.sync_ring_memberships;

      if (syncRingMemberships) {
        if (syncRingMemberships.find(m => m.network_id === networkId)) {
          members.add(clientId);
        }
      }
    }

    return members;
  }

  joinSyncRing(networkId) {
    const currentPresence = getCurrentPresence();

    const syncRingMemberships = currentPresence.sync_ring_memberships || [];

    if (!syncRingMemberships.find(m => m.network_id === networkId)) {
      syncRingMemberships.push({ network_id: networkId });
    }

    NAF.connection.presence.setLocalStateField("sync_ring_memberships", syncRingMemberships);
    this.networkIdToSyncState.set(networkId, SYNC_STATES.SYNCING);
  }

  isSyncing(networkId) {
    return this.networkIdToSyncState.get(networkId) === SYNC_STATES.SYNCING;
  }

  isSyncRingEmpty(networkId) {
    return this.getSyncRingMembers(networkId).size === 0;
  }
}
