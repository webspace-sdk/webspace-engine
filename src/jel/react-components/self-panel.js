import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import verticalDotsIcon from "../assets/images/icons/dots-vertical.svgi";
import mutedIcon from "../assets/images/icons/mic-muted.svgi";
import unmutedIcon from "../assets/images/icons/mic-unmuted.svgi";
import AvatarSwatch from "./avatar-swatch";
import { PopupPanelMenuArrow } from "./popup-panel-menu";
import DeviceSelectorPopup from "./device-selector-popup";
import { BigIconButton } from "./icon-button";
import Tooltip from "./tooltip";
import { cancelEventIfFocusedWithin, toggleFocus } from "../utils/dom-utils";
import sharedStyles from "../assets/stylesheets/shared.scss";
import { usePopper } from "react-popper";
import { useSingleton } from "@tippyjs/react";
import { getMessages } from "../../hubs/utils/i18n";

const SelfPanelElement = styled.div`
  width: 100%;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  background-color: var(--secondary-panel-background-color);
  color: var(--secondary-panel-text-color);
  align-self: flex-end;
  margin-top: 18px;
`;

const SelfName = styled.div`
  display: flex;
  flex: 1 1;
  justify-content: space-around;
  flex-direction: column;
  align-items: flex-start;
  margin: 12px 8px;
  min-width: 0;
`;

const DisplayName = styled.div`
  width: 100%;
  flex: 0 0 100%;
  color: var(--panel-small-banner-text-color);
  font-weight: var(--panel-small-banner-text-weight);
  font-size: var(--panel-small-banner-text-size);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
`;

const IdentityName = styled.div`
  width: 100%;
  color: var(--panel-small-banner-text-secondary-color);
  font-weight: var(--panel-small-banner-text-secondary-weight);
  font-size: var(--panel-small-banner-text-secondary-size);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DeviceControls = styled.div`
  display: flex;
  margin-right: 18px;
  flex: 0 0 fit-content;
`;

const useSceneMuteState = (scene, setMuted) => {
  useEffect(
    () => {
      const onAframeStateChanged = e => {
        if (e.detail === "muted") {
          setMuted(scene.is("muted"));
        }
      };

      scene.addEventListener("stateadded", onAframeStateChanged);
      scene.addEventListener("stateremoved", onAframeStateChanged);

      return () => {
        scene.removeEventListener("stateadded", onAframeStateChanged);
        scene.removeEventListener("stateremoved", onAframeStateChanged);
      };
    },
    [scene, setMuted]
  );
};

const fillMicDevices = async setMicDevices => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  setMicDevices(
    devices.filter(d => d.kind === "audioinput").map(({ deviceId, label }) => ({
      deviceId,
      label
    }))
  );
};

const useMicDevices = (muted, setMicDevices) => {
  useEffect(
    () => {
      const { mediaDevices } = navigator;
      if (!mediaDevices) return;

      const fill = () => fillMicDevices(setMicDevices);

      if (!muted) {
        fill();
      }

      mediaDevices.addEventListener("devicechange", fill);
      return () => mediaDevices.removeEventListener("devicechange", fill);
    },
    [muted, setMicDevices]
  );
};

const SelfPanel = ({ scene, spacePresences, sessionId }) => {
  const [tipSource, tipTarget] = useSingleton();
  const [deviceSelectorReferenceElement, setDeviceSelectorReferenceElement] = useState(null);
  const [deviceSelectorElement, setDeviceSelectorElement] = useState(null);
  const [deviceSelectorArrowElement, setDeviceSelectorArrowElement] = useState(null);
  const [micDevices, setMicDevices] = useState([]);
  const [muted, setMuted] = useState(false);

  useMicDevices(muted, setMicDevices);
  useSceneMuteState(scene, setMuted);

  const {
    styles: deviceSelectorStyles,
    attributes: deviceSelectorAttributes,
    update: updateDeviceSelectorPopper
  } = usePopper(deviceSelectorReferenceElement, deviceSelectorElement, {
    placement: "top",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [0, 28]
        }
      },
      {
        name: "arrow",
        options: { element: deviceSelectorArrowElement }
      }
    ]
  });

  const spacePresence = spacePresences && spacePresences[sessionId];
  const meta = spacePresence && spacePresence.metas[spacePresence.metas.length - 1];
  const { profile } = meta || {};
  const messages = getMessages();
  const displayName = profile && profile.displayName;
  let identityName = profile && profile.identityName;

  if (identityName) {
    // Strip redunant name off of identity name
    const displayNameSlug = displayName.replace(/ /g, "");
    if (identityName.startsWith(`${displayNameSlug}#`)) {
      identityName = identityName.substring(displayNameSlug.length);
    }
  }

  return (
    <SelfPanelElement>
      <Tooltip singleton={tipSource} />
      <AvatarSwatch id="self-avatar-swatch" />
      <SelfName>
        {displayName && <DisplayName>{displayName}</DisplayName>}
        {identityName && <IdentityName>{identityName}</IdentityName>}
      </SelfName>
      <DeviceControls>
        <Tooltip content={messages["self.select-tip"]} placement="top" key="mute" singleton={tipTarget}>
          <BigIconButton
            style={{ margin: 0 }}
            iconSrc={verticalDotsIcon}
            onMouseDown={e => cancelEventIfFocusedWithin(e, deviceSelectorElement)}
            onClick={() => {
              updateDeviceSelectorPopper();
              toggleFocus(deviceSelectorElement);
            }}
            ref={setDeviceSelectorReferenceElement}
          />
        </Tooltip>
        <Tooltip
          content={messages[muted ? "self.unmute-tip" : "self.mute-tip"]}
          placement="top"
          key="select"
          singleton={tipTarget}
        >
          <BigIconButton
            style={{ margin: 0 }}
            iconSrc={muted ? mutedIcon : unmutedIcon}
            onClick={() => scene.emit("action_mute")}
          />
        </Tooltip>
      </DeviceControls>
      <DeviceSelectorPopup
        scene={scene}
        setPopperElement={setDeviceSelectorElement}
        styles={deviceSelectorStyles}
        attributes={deviceSelectorAttributes}
        micDevices={micDevices}
      >
        <PopupPanelMenuArrow
          ref={setDeviceSelectorArrowElement}
          style={deviceSelectorStyles.arrow}
          className={sharedStyles.popperArrow}
        />
      </DeviceSelectorPopup>
    </SelfPanelElement>
  );
};

SelfPanel.propTypes = {
  scene: PropTypes.object,
  spacePresences: PropTypes.object,
  sessionId: PropTypes.string
};

export { SelfPanel as default };
