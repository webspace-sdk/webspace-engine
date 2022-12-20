import React, { useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import { FormattedMessage } from "react-intl";
import { ROLES } from "../utils/permissions-utils";
import { checkboxControlFor, Label, InputWrap, PanelWrap, RadioWrap, Radio } from "./form-components";

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("popup-root")));

const HubPermissionsPopup = ({ setPopperElement, styles, attributes, hubMetadata, hubId, children }) => {
  const { atomAccessManager } = window.APP;
  const [saveChangesToOrigin, setSaveChangesToOrigin] = useState(false);
  const [contentChangeRole, setContentChangeRole] = useState(ROLES.NONE);

  useEffect(
    () => {
      if (!hubMetadata || !hubId) return () => {};

      const updatePermissions = () => {
        if (!hubMetadata) return;
        const hub = hubMetadata.getMetadata(hubId);
        if (!hub) return;

        setSaveChangesToOrigin(hub.save_changes_to_origin);
        setContentChangeRole(hub.content_change_role);
      };

      updatePermissions();

      hubMetadata.subscribeToMetadata(hubId, updatePermissions);
      return () => hubMetadata.unsubscribeFromMetadata(updatePermissions);
    },
    [setSaveChangesToOrigin, setContentChangeRole, hubId, hubMetadata]
  );

  const saveChangesToOriginOnChange = useCallback(
    value => {
      window.APP.hubChannel.updateHubMeta(hubId, { save_changes_to_origin: value });
      setSaveChangesToOrigin(value);
    },
    [hubId, setSaveChangesToOrigin]
  );

  const contentChangeRoleOnChange = useCallback(
    value => {
      window.APP.hubChannel.updateHubMeta(hubId, { content_change_role: value });
      setContentChangeRole(value);
    },
    [hubId, setContentChangeRole]
  );

  const writebackOriginType = atomAccessManager.writebackOriginType;

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
          <Label style={{ cursor: "pointer" }}>
            <FormattedMessage id="hub-permissions-popup.content-change-role" />
          </Label>
          <InputWrap style={{ minHeight: "48px", marginLeft: "24px" }}>
            <RadioWrap>
              <Radio
                type="radio"
                id={"role_none"}
                name={"role_none"}
                checked={contentChangeRole === ROLES.NONE}
                value={ROLES.NONE}
                onChange={() => contentChangeRoleOnChange(ROLES.NONE)}
              />
              <Label htmlFor="role_none" style={{ cursor: "pointer" }}>
                <FormattedMessage id="hub-permissions-popup.content-change-role-none" />
              </Label>
            </RadioWrap>
            <RadioWrap>
              <Radio
                type="radio"
                id={"role_owner"}
                name={"role_owner"}
                checked={contentChangeRole === ROLES.OWNER}
                value={ROLES.OWNER}
                onChange={() => contentChangeRoleOnChange(ROLES.OWNER)}
              />
              <Label htmlFor="role_owner" style={{ cursor: "pointer" }}>
                <FormattedMessage id="hub-permissions-popup.content-change-role-owner" />
              </Label>
            </RadioWrap>
            <RadioWrap>
              <Radio
                type="radio"
                id={"role_member"}
                name={"role_member"}
                checked={contentChangeRole === ROLES.MEMBER}
                value={ROLES.MEMBER}
                onChange={() => contentChangeRoleOnChange(ROLES.MEMBER)}
              />
              <Label htmlFor="role_member" style={{ cursor: "pointer" }}>
                <FormattedMessage id="hub-permissions-popup.content-change-role-member" />
              </Label>
            </RadioWrap>
          </InputWrap>
          {checkboxControlFor(
            "save_changes_to_origin",
            `hub-permissions-popup.save-changes-to-origin-${writebackOriginType}`,
            saveChangesToOrigin,
            setSaveChangesToOrigin,
            saveChangesToOriginOnChange
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
