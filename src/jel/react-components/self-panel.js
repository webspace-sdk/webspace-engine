import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import verticalDotsIcon from "../../assets/jel/images/icons/dots-vertical.svgi";
import mutedIcon from "../../assets/jel/images/icons/mic-muted.svgi";
import unmutedIcon from "../../assets/jel/images/icons/mic-unmuted.svgi";
import importantIcon from "../../assets/jel/images/icons/important.svgi";
import AvatarSwatch from "./avatar-swatch";
import { PopupPanelMenuArrow } from "./popup-panel-menu";
import DeviceSelectorPopup from "./device-selector-popup";
import ProfileEditorPopup, { PROFILE_EDITOR_MODES } from "./profile-editor-popup";
import AvatarEditorPopup from "./avatar-editor-popup";
import { isAdminOfSpaceId } from "../utils/membership-utils";
import { BigIconButton } from "./icon-button";
import Tooltip from "./tooltip";
import { cancelEventIfFocusedWithin, toggleFocus } from "../utils/dom-utils";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { usePopper } from "react-popper";
import { connectToReticulum } from "../../hubs/utils/phoenix-utils";
import { useSingleton } from "@tippyjs/react";
import { getMessages } from "../../hubs/utils/i18n";
import { useSceneMuteState } from "../utils/shared-effects";
import AuthChannel from "../../hubs/utils/auth-channel";
import mixpanel from "mixpanel-browser";

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

const ImportantIcon = styled.div`
  width: 16px;
  height: 16px;
  color: var(--important-icon-color);
  margin-right: 2px;
  margin-bottom: 1px;
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

const SelfPanel = ({
  scene,
  spaceId,
  spaceChannel,
  spacePresences,
  memberships,
  sessionId,
  onAvatarColorChange,
  onAvatarColorChangeComplete,
  onSignOutClicked
}) => {
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
  const [muted, setMuted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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

  const spacePresence = spacePresences && spacePresences[sessionId];
  const meta = spacePresence && spacePresence.metas[spacePresence.metas.length - 1];
  const { profile } = meta || {};

  const profileEditorMode =
    profile && profile.verified
      ? PROFILE_EDITOR_MODES.VERIFIED
      : isVerifying
        ? PROFILE_EDITOR_MODES.VERIFYING
        : PROFILE_EDITOR_MODES.UNVERIFIED;
  const isUnverified = profileEditorMode === PROFILE_EDITOR_MODES.UNVERIFIED;
  const isSpaceAdmin = isAdminOfSpaceId(spaceId, memberships);
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

  const selfName = (
    <SelfName
      ref={setProfileEditorReferenceElement}
      onClick={() => {
        updateProfileEditorPopper();
        toggleFocus(profileEditorElement);

        if (isUnverified) {
          mixpanel.track("Event Open Verify Panel");
        }
      }}
    >
      {displayName && (
        <DisplayName>
          {isUnverified && <ImportantIcon dangerouslySetInnerHTML={{ __html: importantIcon }} />}
          {displayName}
        </DisplayName>
      )}
      {identityName && <IdentityName>{identityName}</IdentityName>}
    </SelfName>
  );
  return (
    <SelfPanelElement>
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
      {isUnverified ? (
        <Tooltip content={messages["self.unverified-tip"]} placement="top" key="unverified" singleton={tipTarget}>
          {selfName}
        </Tooltip>
      ) : (
        selfName
      )}
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
      <AvatarEditorPopup
        setPopperElement={setAvatarEditorElement}
        styles={avatarEditorStyles}
        attributes={avatarEditorAttributes}
        onColorChange={onAvatarColorChange}
        onColorChangeComplete={onAvatarColorChangeComplete}
      >
        <PopupPanelMenuArrow
          ref={setAvatarEditorArrowElement}
          style={avatarEditorStyles.arrow}
          className={sharedStyles.popperArrow}
        />
      </AvatarEditorPopup>
      <ProfileEditorPopup
        setPopperElement={setProfileEditorElement}
        styles={profileEditorStyles}
        attributes={profileEditorAttributes}
        isSpaceAdmin={isSpaceAdmin}
        onSignOutClicked={onSignOutClicked}
        onSignUp={async (email, name) => {
          setIsVerifying(true);
          profileEditorElement.focus();
          mixpanel.track("Event Submit Verify Panel", {});
          const authChannel = new AuthChannel(window.APP.store);
          authChannel.setSocket(await connectToReticulum());
          await authChannel.startAuthentication(email, spaceChannel);
          mixpanel.track("Event Confirm Verify Panel", {});
          spaceChannel.updateIdentity({ name });
        }}
        mode={profileEditorMode}
      >
        <PopupPanelMenuArrow
          ref={setProfileEditorArrowElement}
          style={profileEditorStyles.arrow}
          className={sharedStyles.popperArrow}
        />
      </ProfileEditorPopup>
    </SelfPanelElement>
  );
};

SelfPanel.propTypes = {
  scene: PropTypes.object,
  spaceId: PropTypes.string,
  spacePresences: PropTypes.object,
  spaceChannel: PropTypes.object,
  sessionId: PropTypes.string,
  memberships: PropTypes.array,
  onAvatarColorChange: PropTypes.func,
  onAvatarColorChangeComplete: PropTypes.func,
  onSignOutClicked: PropTypes.func
};

export { SelfPanel as default };
