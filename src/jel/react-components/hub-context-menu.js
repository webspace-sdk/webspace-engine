import React from "react";
import ReactDOM from "react-dom";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import PopupMenu, { PopupMenuItem } from "./popup-menu";
import trashIcon from "../../assets/jel/images/icons/trash.svgi";
import WorldExporter from "../utils/world-exporter";
import restoreIcon from "../../assets/jel/images/icons/restore.svgi";
import cubeIcon from "../../assets/jel/images/icons/cube.svgi";
import { FormattedMessage } from "react-intl";
import qsTruthy from "../../hubs/utils/qs_truthy";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { isAtomInSubtree, findChildrenAtomsInTreeData } from "../utils/tree-utils";
import { homeHubForSpaceId } from "../utils/membership-utils";

const showPublishObjects = qsTruthy("show_publish");

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.body.shadowRoot.getElementById("jel-popup-root")));

function HubContextMenu({
  scene,
  styles,
  attributes,
  setPopperElement,
  hubId,
  spaceCan,
  hubCan,
  worldTree,
  roomForHubCan,
  hideRename,
  showReset,
  showExport,
  isCurrentWorld,
  showAtomRenamePopup,
  channelTree,
  hub,
  memberships,
  worldTreeData,
  channelTreeData,
  history
}) {
  if (!popupRoot || !spaceCan || !hubCan) return null;

  const { spaceChannel, hubMetadata } = window.APP;
  const items = [];

  if (hubId && hubCan("update_hub_meta", hubId) && roomForHubCan("state:m.room.name", hubId) && !hideRename) {
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

  if (hubId && showExport) {
    if (hubCan("spawn_and_move_media", hubId)) {
      items.push(
        <PopupMenuItem
          key={`import-${hubId}`}
          onClick={e => {
            document.body.shadowRoot.querySelector("#import-upload-input").click();
            scene.canvas.focus();
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <FormattedMessage id="hub-context.import" />
        </PopupMenuItem>
      );
    }

    items.push(
      <PopupMenuItem
        key={`export-${hubId}`}
        onClick={e => {
          new WorldExporter().downloadCurrentWorldHtml();
          scene.canvas.focus();
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FormattedMessage id="hub-context.export" />
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
  if (hubId && isCurrentWorld && showPublishObjects && hubCan("spawn_and_move_media", hubId)) {
    items.push(
      <PopupMenuItem
        key={`publish-${hubId}`}
        onClick={async e => {
          const { hubChannel, hubMetadata } = window.APP;
          const { hubId } = hubChannel;

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

          const { hubChannel, hubMetadata } = window.APP;
          const { hubId } = hubChannel;

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
  if (spaceCan("edit_nav") && hubId && hubCan("trash_hub", hubId)) {
    items.push(
      <PopupMenuItem
        key={`trash-${hubId}`}
        onClick={e => {
          if (!worldTree.getNodeIdForAtomId(hubId) && !channelTree.getNodeIdForAtomId(hubId)) return;

          // If this hub or any of its parents were deleted, go home.
          if (isAtomInSubtree(worldTree, hubId, hub.hub_id) || isAtomInSubtree(channelTree, hubId, hub.hub_id)) {
            const homeHub = homeHubForSpaceId(hub.space_id, memberships);
            navigateToHubUrl(history, homeHub.url);
          }

          // All trashable children are trashed too.
          const trashableChildrenHubIds = [
            ...findChildrenAtomsInTreeData(worldTreeData, hubId),
            ...findChildrenAtomsInTreeData(channelTreeData, hubId)
          ].filter(hubId => hubCan("trash_hub", hubId));

          spaceChannel.trashHubs([...trashableChildrenHubIds, hubId]);
          // Blur button so menu hides
          document.activeElement.blur();
          e.preventDefault();
          e.stopPropagation();
        }}
        iconSrc={trashIcon}
      >
        <FormattedMessage id="hub-context.move-to-trash" />
      </PopupMenuItem>
    );
  }

  const popupMenu = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupMenu className={sharedStyles.slideDownWhenPopped}>
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
