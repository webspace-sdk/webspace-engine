import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import PropTypes from "prop-types";
import ColorPicker, { rgbToPickerValue } from "./color-picker";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.body.shadowRoot.getElementById("jel-popup-root")));

const PickerWrap = styled.div`
  width: 128px;
  height: 128px;
`;

const AvatarEditorPopup = ({
  setPopperElement,
  styles,
  scene,
  spaceChannel,
  attributes,
  onColorChangeComplete,
  children
}) => {
  const [pickerColorValue, setPickerColorValue] = useState({ r: 0, g: 0, b: 0 });
  useEffect(
    () => {
      if (!scene || !spaceChannel || !NAF.connection.presence) return;

      const handler = () => {
        const sessionId = NAF.clientId;
        const creatorPresenceState = NAF.connection.getPresenceStateForClientId(sessionId);

        if (creatorPresenceState?.profile?.persona) {
          const color = creatorPresenceState.profile.persona.avatar.primary_color;
          setPickerColorValue(rgbToPickerValue(color));
        }
      };

      scene.addEventListener("presence-synced", handler);
      return () => scene.removeEventListener("presence-synced", handler);
    },

    [scene, spaceChannel, pickerColorValue, setPickerColorValue]
  );

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu style={{ padding: "12px", borderRadius: "12px" }} className="slide-up-when-popped">
        <PickerWrap>
          <ColorPicker
            color={pickerColorValue}
            onChangeComplete={onColorChangeComplete}
            onChange={useCallback(({ rgb }) => setPickerColorValue(rgb), [])}
          />
        </PickerWrap>
      </PopupPanelMenu>
      {children}
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
};

AvatarEditorPopup.propTypes = {
  scene: PropTypes.object,
  spaceChannel: PropTypes.object,
  onColorChangeComplete: PropTypes.func
};

export { AvatarEditorPopup as default };
