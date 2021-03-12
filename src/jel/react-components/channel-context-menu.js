import React from "react";
import ReactDOM from "react-dom";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import PopupMenu, { PopupMenuItem } from "./popup-menu";
import trashIcon from "../../assets/jel/images/icons/trash.svgi";
import { FormattedMessage } from "react-intl";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

function ChannelContextMenu({
  styles,
  attributes,
  setPopperElement,
  roomId,
  spaceCan,
  roomCan,
  hideRename,
  onRenameClick,
  onDeleteClick
}) {
  if (!popupRoot || !spaceCan || !roomCan) return null;

  const items = [];

  if (roomId && roomCan("state:m.room.name", roomId) && !hideRename) {
    items.push(
      <PopupMenuItem
        key={`rename-${roomId}`}
        onClick={e => {
          onRenameClick(roomId);
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FormattedMessage id="channel-context.rename" />
      </PopupMenuItem>
    );
  }
  if (spaceCan("delete_channel")) {
    items.push(
      <PopupMenuItem
        key={`trash-${roomId}`}
        onClick={e => {
          onDeleteClick(roomId);
          // Blur button so menu hides
          document.activeElement.blur();
          e.preventDefault();
          e.stopPropagation();
        }}
        iconSrc={trashIcon}
      >
        <FormattedMessage id="channel-context.delete" />
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
          <PopupMenuItem key={`no-actions-${roomId}`}>
            <div>
              <FormattedMessage id="channel-context.empty" />
            </div>
          </PopupMenuItem>
        )}
      </PopupMenu>
    </div>
  );

  return ReactDOM.createPortal(popupMenu, popupRoot);
}

export default ChannelContextMenu;
