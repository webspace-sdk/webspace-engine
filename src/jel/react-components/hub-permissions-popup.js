import React, { useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { waitForShadowDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import { FormattedMessage } from "react-intl";
import { PanelWrap, checkboxControlFor } from "./form-components";

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("jel-popup-root")));

const HubPermissionsPopup = ({ setPopperElement, styles, attributes, hubMetadata, hubId, children }) => {
  const [allowEditing, setAllowEditing] = useState(false);

  useEffect(
    () => {
      if (!hubMetadata || !hubId) return () => {};

      const updatePermissions = () => {
        // TODO SHARED
        const spaceRole = "member";
        setAllowEditing(spaceRole === "editor");
      };

      updatePermissions();

      hubMetadata.subscribeToMetadata(hubId, updatePermissions);
      return () => hubMetadata.unsubscribeFromMetadata(updatePermissions);
    },
    [setAllowEditing, hubId, hubMetadata]
  );

  const allowEditingOnChange = useCallback(
    (/*value*/) => {
      // TODO SHARED
      // const allowEditing = value;
      // const newSpaceRole = allowEditing ? "editor" : "viewer";
      // //window.APP.hubChannel.updateSpaceMemberRole(newSpaceRole);
      // setAllowEditing(allowEditing);
    },
    [
      /*setAllowEditing*/
    ]
  );

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu style={{ padding: "32px 0px", borderRadius: "12px" }} className="slide-up-when-popped">
        <PanelWrap>
          <PanelSectionHeader style={{ marginLeft: 0 }}>
            <FormattedMessage id="hub-permissions-popup.permissions" />
          </PanelSectionHeader>
          {checkboxControlFor(
            "allow_editing",
            "hub-permissions-popup.allow_editing",
            allowEditing,
            setAllowEditing,
            allowEditingOnChange
          )}
        </PanelWrap>
      </PopupPanelMenu>
      {children}
    </div>
  );

  if (popupRoot) {
    return ReactDOM.createPortal(popupInput, popupRoot);
  } else {
    return popupInput;
  }
};

HubPermissionsPopup.propTypes = {
  hubId: PropTypes.string,
  hubMetadata: PropTypes.object
};

export { HubPermissionsPopup as default };
