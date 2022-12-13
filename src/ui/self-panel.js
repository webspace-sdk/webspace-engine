import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import verticalDotsIcon from "../assets/jel/images/icons/dots-vertical.svgi";
import mutedIcon from "../assets/jel/images/icons/mic-muted.svgi";
import unmutedIcon from "../assets/jel/images/icons/mic-unmuted.svgi";
import AvatarSwatch from "./avatar-swatch";
import { PopupPanelMenuArrow } from "./popup-panel-menu";
import DeviceSelectorPopup from "./device-selector-popup";
import ProfileEditorPopup from "./profile-editor-popup";
import AvatarEditorPopup from "./avatar-editor-popup";
import { BigIconButton } from "./icon-button";
import Tooltip from "./tooltip";
import { cancelEventIfFocusedWithin, toggleFocus } from "../utils/dom-utils";
import { useClientPresenceState, useSceneMuteState } from "../utils/shared-effects";
import { usePopper } from "react-popper";
import { useSingleton } from "@tippyjs/react";
import { getMessages } from "../utils/i18n";
import { SOUND_TOGGLE_MIC } from "../systems/sound-effects-system";

const SelfPanelElement = styled.div`
  width: 100%;
  height: 72px;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 5;
  width: var(--nav-width);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  color: var(--secondary-panel-text-color);
  align-self: flex-end;
  margin-top: 18px;
  background-color: var(--secondary-panel-background-color);

  .panels-collapsed & {
    background-color: var(--canvas-overlay-neutral-item-background-color);
    text-shadow: 0px 0px 4px var(--menu-shadow-color);
    border-radius: 0 12px 0 0;
  }
`;

const SelfName = styled.div`
  display: flex;
  flex: 1 1;
  justify-content: space-around;
  flex-direction: column;
  align-items: flex-start;
  margin: 12px 8px;
  min-width: 0;
  cursor: pointer;
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
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
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

const fillMicDevices = async setMicDevices => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  setMicDevices(
    devices.filter(d => d.kind === "audioinput").map(({ deviceId, label }) => ({
      deviceId,
      label
    }))
  );
};

const useMicDevices = (unmuted, setMicDevices) => {
  useEffect(
    () => {
      const { mediaDevices } = navigator;
      if (!mediaDevices) return;

      const fill = () => fillMicDevices(setMicDevices);

      fill();

      mediaDevices.addEventListener("devicechange", fill);
      return () => mediaDevices.removeEventListener("devicechange", fill);
    },
    [unmuted, setMicDevices]
  );
};

const SelfPanel = ({ scene, sessionId, onAvatarColorChangeComplete }) => {
  const [tipSource, tipTarget] = useSingleton();
  const [deviceSelectorReferenceElement, setDeviceSelectorReferenceElement] = useState(null);
  const [deviceSelectorElement, setDeviceSelectorElement] = useState(null);
  const [deviceSelectorArrowElement, setDeviceSelectorArrowElement] = useState(null);
  const [avatarEditorReferenceElement, setAvatarEditorReferenceElement] = useState(null);
  const [profileEditorReferenceElement, setProfileEditorReferenceElement] = useState(null);
  const [avatarEditorElement, setAvatarEditorElement] = useState(null);
  const [profileEditorElement, setProfileEditorElement] = useState(null);
  const [avatarEditorArrowElement, setAvatarEditorArrowElement] = useState(null);
  const [profileEditorArrowElement, setProfileEditorArrowElement] = useState(null);
  const [micDevices, setMicDevices] = useState([]);
  const [unmuted, setUnmuted] = useState(false);
  const [presenceState, setPresenceState] = useState({});

  useClientPresenceState(sessionId, scene, presenceState, setPresenceState);

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

  const showMicDevicesOnFirstUnmute = useCallback(
    unmuted => {
      if (unmuted && !window.APP.store.state.activity.unmute) {
        toggleFocus(deviceSelectorElement);
      }
    },
    [deviceSelectorElement]
  );

  useMicDevices(unmuted, setMicDevices);
  useSceneMuteState(scene, setUnmuted, showMicDevicesOnFirstUnmute);

  const {
    styles: avatarEditorStyles,
    attributes: avatarEditorAttributes,
    update: updateAvatarEditorPopper
  } = usePopper(avatarEditorReferenceElement, avatarEditorElement, {
    placement: "top-start",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [0, 4]
        }
      },
      {
        name: "arrow",
        options: { element: avatarEditorArrowElement }
      }
    ]
  });

  const {
    styles: profileEditorStyles,
    attributes: profileEditorAttributes,
    update: updateProfileEditorPopper
  } = usePopper(profileEditorReferenceElement, profileEditorElement, {
    placement: "top-start",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [-44, 18]
        }
      },
      {
        name: "arrow",
        options: { element: profileEditorArrowElement }
      }
    ]
  });

  const { profile } = presenceState || {};

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
    <SelfPanelElement id="self-panel">
      <Tooltip singleton={tipSource} />
      <AvatarSwatch
        ref={setAvatarEditorReferenceElement}
        id="self-avatar-swatch"
        onMouseDown={e => cancelEventIfFocusedWithin(e, avatarEditorElement)}
        onClick={() => {
          updateAvatarEditorPopper();
          toggleFocus(avatarEditorElement);
          window.APP.store.handleActivityFlag("avatarEdit");
        }}
      />
      <SelfName
        ref={setProfileEditorReferenceElement}
        onClick={() => {
          updateProfileEditorPopper();
          toggleFocus(profileEditorElement);
        }}
      >
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
          content={messages[unmuted ? "self.mute-tip" : "self.unmute-tip"]}
          placement="top"
          key="select"
          singleton={tipTarget}
        >
          <BigIconButton
            style={{ margin: 0 }}
            iconSrc={unmuted ? unmutedIcon : mutedIcon}
            onClick={() => {
              scene.emit("action_mute");
              SYSTEMS.soundEffectsSystem.playSoundOneShot(SOUND_TOGGLE_MIC);
            }}
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
          className="popper-arrow"
        />
      </DeviceSelectorPopup>
      <AvatarEditorPopup
        scene={scene}
        setPopperElement={setAvatarEditorElement}
        styles={avatarEditorStyles}
        attributes={avatarEditorAttributes}
        onColorChangeComplete={onAvatarColorChangeComplete}
      >
        <PopupPanelMenuArrow
          ref={setAvatarEditorArrowElement}
          style={avatarEditorStyles.arrow}
          className="popper-arrow"
        />
      </AvatarEditorPopup>
      <ProfileEditorPopup
        setPopperElement={setProfileEditorElement}
        styles={profileEditorStyles}
        attributes={profileEditorAttributes}
        scene={scene}
        sessionId={sessionId}
        onNameEditSaved={name => {
          const { store } = window.APP;
          store.update({ profile: { displayName: name } });
        }}
      >
        <PopupPanelMenuArrow
          ref={setProfileEditorArrowElement}
          style={profileEditorStyles.arrow}
          className="popper-arrow"
        />
      </ProfileEditorPopup>
    </SelfPanelElement>
  );
};

SelfPanel.propTypes = {
  scene: PropTypes.object,
  sessionId: PropTypes.string,
  onAvatarColorChangeComplete: PropTypes.func
};

export { SelfPanel as default };
