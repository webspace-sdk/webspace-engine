import React from "react";
import ReactDOM from "react-dom";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import PopupMenu, { PopupMenuItem } from "./popup-menu";
import cubeIcon from "../assets/images/icons/cube.svgi";
import restoreIcon from "../assets/images/icons/restore.svgi";
import { FormattedMessage } from "react-intl";
import qsTruthy from "../utils/qs_truthy";
import { getHubIdFromHistory } from "../utils/url-utils";

const showPublishObjects = qsTruthy("show_publish");

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("popup-root")));

function HubContextMenu({
  scene,
  styles,
  attributes,
  setPopperElement,
  hubId,
  spaceCan,
  hubCan,
  worldTree,
  hideRename,
  hideSetSpawnPoint,
  showRemoveFromNav,
  showReset,
  isCurrentWorld,
  showAtomRenamePopup
}) {
  if (!popupRoot || !spaceCan || !hubCan) return null;

  const { hubChannel, hubMetadata } = window.APP;
  const items = [];

  if (spaceCan("edit_nav") && showRemoveFromNav) {
    items.push(
      <PopupMenuItem
        key={`remove-from-nav-${hubId}`}
        onClick={e => {
          const hubNodeId = worldTree.getNodeIdForAtomId(hubId);
          worldTree.remove(hubNodeId);
          DOM_ROOT.activeElement?.blur();
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FormattedMessage id="hub-context.remove-from-nav" />
      </PopupMenuItem>
    );
  }

  if (hubId && hubCan("update_hub_meta", hubId) && !hideRename) {
    items.push(
      <PopupMenuItem
        key={`rename-${hubId}`}
        onClick={e => {
          showAtomRenamePopup(hubId, hubMetadata, null);
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FormattedMessage id="hub-context.rename" />
      </PopupMenuItem>
    );
  }

  if (hubId && hubCan("update_hub_meta", hubId) && !hideSetSpawnPoint) {
    for (const [kind, radius] of [["point", 0], ["region", 10]]) {
      items.push(
        <PopupMenuItem
          key={`set-spawn-${kind}-${hubId}`}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            const position = new THREE.Vector3();
            const rotation = new THREE.Quaternion();
            const avatarRig = DOM_ROOT.getElementById("avatar-rig");
            const avatarPov = DOM_ROOT.getElementById("avatar-pov-node");

            avatarRig.object3D.getWorldPosition(position);
            avatarPov.object3D.getWorldQuaternion(rotation);

            hubChannel.updateHubMeta(hubId, {
              world: {
                spawn_point: {
                  position: { x: position.x, y: position.y, z: position.z },
                  rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
                  radius
                }
              }
            });
          }}
        >
          <FormattedMessage id={`hub-context.set-spawn-${kind}`} />
        </PopupMenuItem>
      );
    }
  }

  if (hubId && isCurrentWorld && showPublishObjects && hubCan("spawn_and_move_media", hubId)) {
    items.push(
      <PopupMenuItem
        key={`publish-${hubId}`}
        onClick={async e => {
          const hubId = await getHubIdFromHistory();

          e.preventDefault();
          e.stopPropagation();

          const hubNodeId = worldTree.getNodeIdForAtomId(hubId);
          const parentNodeId = worldTree.getParentNodeId(hubNodeId);

          if (!parentNodeId) {
            console.log("No parent world, can't publish");
            return;
          }

          const parentHubId = worldTree.getAtomIdForNodeId(parentNodeId);

          const currentHubMeta = await hubMetadata.getOrFetchMetadata(hubId);
          const parentHubMeta = await hubMetadata.getOrFetchMetadata(parentHubId);

          const collection = parentHubMeta.displayName;
          const category = currentHubMeta.displayName;

          SYSTEMS.voxSystem.publishAllInCurrentWorld(collection, category);
        }}
        iconSrc={cubeIcon}
      >
        <FormattedMessage id="hub-context.publish-objects" />
      </PopupMenuItem>
    );
  }

  if (hubId && isCurrentWorld && showPublishObjects && spaceCan("publish_world_template")) {
    items.push(
      <PopupMenuItem
        key={`publish-world-template-${hubId}`}
        onClick={async e => {
          e.preventDefault();
          e.stopPropagation();

          const { hubMetadata } = window.APP;
          const hubId = await getHubIdFromHistory();

          const hubNodeId = worldTree.getNodeIdForAtomId(hubId);
          const parentNodeId = worldTree.getParentNodeId(hubNodeId);

          if (!parentNodeId) {
            console.log("No parent world, can't publish");
            return;
          }

          const parentHubId = worldTree.getAtomIdForNodeId(parentNodeId);
          const parentHubMeta = await hubMetadata.getOrFetchMetadata(parentHubId);
          const collection = parentHubMeta.displayName;

          scene.emit("action_publish_template", { collection });
          scene.canvas.focus();
        }}
        iconSrc={cubeIcon}
      >
        <FormattedMessage id="hub-context.publish-template" />
      </PopupMenuItem>
    );
  }

  if (hubId && showReset && hubCan("spawn_and_move_media", hubId)) {
    items.push(
      <PopupMenuItem
        key={`reset-${hubId}`}
        onClick={e => {
          scene.emit("action_reset_objects");
          e.preventDefault();
          e.stopPropagation();
        }}
        iconSrc={restoreIcon}
      >
        <FormattedMessage id="hub-context.reset-objects" />
      </PopupMenuItem>
    );
  }

  const popupMenu = (
    <div
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupMenu className="slide-up-when-popped">
        {items.length > 0 ? (
          items
        ) : (
          <PopupMenuItem key={`no-actions-${hubId}`}>
            <div>
              <FormattedMessage id="hub-context.empty" />
            </div>
          </PopupMenuItem>
        )}
      </PopupMenu>
    </div>
  );

  return ReactDOM.createPortal(popupMenu, popupRoot);
}

export default HubContextMenu;
