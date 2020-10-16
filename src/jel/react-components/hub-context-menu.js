import React from "react";
import ReactDOM from "react-dom";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import sharedStyles from "../assets/stylesheets/shared.scss";
import PopupMenu, { PopupMenuItem } from "./popup-menu";
import trashIcon from "../assets/images/icons/trash.svgi";
import { FormattedMessage } from "react-intl";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

function HubContextMenu({
  styles,
  attributes,
  setPopperElement,
  hubId,
  spaceCan,
  hubCan,
  onRenameClick,
  onTrashClick
}) {
  if (!popupRoot) return null;

  const items = [];

  if (hubId && hubCan("update_hub_meta", hubId)) {
    items.push(
      <PopupMenuItem
        key={`rename-${hubId}`}
        onClick={e => {
          onRenameClick(hubId);
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FormattedMessage id="hub-context.rename" />
      </PopupMenuItem>
    );
  }

  if (spaceCan("edit_nav") && hubId && hubCan("trash_hub", hubId)) {
    items.push(
      <PopupMenuItem
        key={`trash-${hubId}`}
        onClick={e => {
          onTrashClick(hubId);
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
      <PopupMenu>
        {items.length > 0 ? (
          items
        ) : (
          <PopupMenuItem key={`no-actions-${hubId}`}>
            <div>No Actions</div>
          </PopupMenuItem>
        )}
      </PopupMenu>
    </div>
  );

  return ReactDOM.createPortal(popupMenu, popupRoot);
}

export default HubContextMenu;
