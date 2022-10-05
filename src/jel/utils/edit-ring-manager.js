import { getCurrentPresence } from "./presence-utils";

const SYNC_STATES = {
  UNSYNCED: 0, // Not synced at all
  PENDING: 1, // Doc requested, but not synced
  SYNCED: 2 // Actively synced
};

// Notes on syncing:
//
// We can't just use the doc that we construct from the DOM or asset folder since if people are editing
// then the DOM-constructed or fetched doc and the dynamically updated doc will be incompatible.
//
// So the docs in this system start out as 'candidate' docs, and then when the first person
// enters presence as an editor their ydoc is the defaco genesis doc.
//
// Basic algorithm:
//   - In presence, keep a list of document ids of docs that you are actively part of the gossip ring for.
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
    this.docIdToSyncState = new Map();
    this.docIdToSyncHandler = new Map();
    this.seenClientIdsInPresence = new Set();

    // We have a "known-good" doc if we:
    // - Received the doc from someone else
    // - Sent the doc to at least one other person
    //
    // Otherwise, if we see someone else syncing it and we are too, then we defer to them if they have a higher client id.
    this.hasKnownGoodDocIds = new Set();
  }

  init(scene) {
    scene.addEventListener("presence-synced", this.sendInitialDocRequestsForPresence.bind(this));

    // Presence can contain unconnected clients, so we need to run the pass over presence whenver a new client connects as well.
    document.body.addEventListener("clientConnected", this.sendInitialDocRequestsForPresence.bind(this));
  }

  registerRingEditableDocument(docId, syncHandler) {
    if (this.docIdToSyncState.has(docId)) return;

    this.docIdToSyncState.set(docId, SYNC_STATES.UNSYNCED);
    this.docIdToSyncHandler.set(docId, syncHandler);
    this.sendInitialDocRequestsForPresence();
  }

  unregisterRingEditableDocument(docId) {
    this.docIdToSyncState.delete(docId);
    this.docIdToSyncHandler.delete(docId);
  }

  sendDeltaSync(docId, delta) {
    const syncState = this.getSyncState(docId);

    if (syncState === SYNC_STATES.UNSYNCED && this.isSyncRingEmpty(docId)) {
      // We're the first person to edit this media text, so we need to join the ring ourselves.
      this.joinSyncRing(docId);
    } else if (syncState === SYNC_STATES.SYNCING) {
      // Broadcast the delta
      window.APP.hubChannel.broadcastMessage({ type: "delta", delta, doc_id: docId }, "edit_ring_message");
    }
  }

  sendInitialDocRequestsForPresence() {
    const requestedDocIds = new Set();

    // Search for any new components that need to be synced - ones that have ring members
    for (const state of NAF.connection.presence.states.values()) {
      const clientId = state.client_id;
      if (!clientId || NAF.clientId === clientId) continue;
      if (!state.sync_ring_memberships) continue;

      // Presence can contain clients we're not connected to
      if (!NAF.connection.hasActiveDataChannel(clientId)) continue;

      for (const { doc_type, doc_id: docId } of state.sync_ring_memberships) {
        if (!this.docIdToSyncHandler.has(docId)) continue;
        if (requestedDocIds.has(docId)) continue;

        const syncState = this.getSyncState(docId);
        if (syncState === SYNC_STATES.PENDING) continue;

        // Deal with the edge case of two clients editing and *then* connecting. (See end of comment at top of file.)
        let shouldRequestFull = false;

        if (syncState === SYNC_STATES.UNSYNCED) {
          shouldRequestFull = true;
        } else if (
          syncState === SYNC_STATES.SYNCING &&
          !this.seenClientIdsInPresence.has(clientId) &&
          !this.hasKnownGoodDocIds.has(docId)
        ) {
          // If we're syncing, did not receive the ydoc we're syncing, and another client with a higher client id than us is syncing,
          // we are going to defer to them (see comment at top of file.)
          shouldRequestFull = clientId > NAF.clientId;
        }

        if (shouldRequestFull) {
          window.APP.hubChannel.sendMessage(
            { type: "request_full_doc", doc_id: docId, doc_type },
            "edit_ring_message",
            clientId
          );

          this.docIdToSyncState.set(docId, SYNC_STATES.PENDING);
          requestedDocIds.add(docId);
        }
      }

      this.seenClientIdsInPresence.add(clientId);
    }
  }

  getSyncState(docId) {
    return this.docIdToSyncState.has(docId) ? this.docIdToSyncState.get(docId) : SYNC_STATES.UNSYNCED;
  }

  handleEditRingMessage(payload, fromClientId) {
    const { type, doc_id } = payload;

    const syncHandler = this.docIdToSyncHandler.get(doc_id);
    if (!syncHandler) return;

    if (type === "request_full_doc") {
      this.hasKnownGoodDocIds.add(doc_id);

      const content = syncHandler.getFullSync(doc_id);

      if (content) {
        window.APP.hubChannel.sendMessage(
          { type: "receive_full_doc", doc_id, content },
          "edit_ring_message",
          fromClientId
        );
      }
    } else if (type === "receive_full_doc") {
      if (this.getSyncState(doc_id) === SYNC_STATES.PENDING) {
        this.hasKnownGoodDocIds.add(doc_id);
        syncHandler.applyFullSync(doc_id, payload.content);
        this.joinSyncRing(doc_id);
      }
    } else if (type === "delta") {
      if (fromClientId === NAF.clientId) return;
      if (this.getSyncState(doc_id) === SYNC_STATES.SYNCING) {
        syncHandler.applyDeltaSync(doc_id, payload.delta);
      }
    }
  }

  getSyncRingMembers(docId) {
    const members = new Set();

    for (const state of NAF.connection.presence.states.values()) {
      const clientId = state.client_id;
      if (!clientId) continue;

      const syncRingMemberships = state.sync_ring_memberships;

      if (syncRingMemberships) {
        if (syncRingMemberships.find(m => m.doc_id === docId)) {
          members.add(clientId);
        }
      }
    }

    return members;
  }

  joinSyncRing(docId) {
    const currentPresence = getCurrentPresence();

    const syncRingMemberships = currentPresence.sync_ring_memberships || [];

    if (!syncRingMemberships.find(m => m.doc_id === docId)) {
      syncRingMemberships.push({ doc_id: docId });
    }

    NAF.connection.presence.setLocalStateField("sync_ring_memberships", syncRingMemberships);
    this.docIdToSyncState.set(docId, SYNC_STATES.SYNCING);
  }

  leaveSyncRing(docId) {
    const currentPresence = getCurrentPresence();

    const syncRingMemberships = currentPresence.sync_ring_memberships || [];
    // remove the membership with the doc id
    const newSyncRingMemberships = syncRingMemberships.filter(m => m.doc_id !== docId);

    NAF.connection.presence.setLocalStateField("sync_ring_memberships", newSyncRingMemberships);
    this.docIdToSyncState.delete(docId);
  }

  isSyncing(docId) {
    return this.docIdToSyncState.get(docId) === SYNC_STATES.SYNCING;
  }

  isSyncRingEmpty(docId) {
    return this.getSyncRingMembers(docId).size === 0;
  }
}
