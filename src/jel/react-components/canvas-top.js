import React, { useRef, useState, useCallback, forwardRef, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import HubTrail from "./hub-trail";
import styled from "styled-components";
import mutedIcon from "../../assets/jel/images/icons/mic-muted.svgi";
import unmutedIcon from "../../assets/jel/images/icons/mic-unmuted.svgi";
import { BigIconButton } from "./icon-button";
import { cancelEventIfFocusedWithin } from "../utils/dom-utils";
import dotsIcon from "../../assets/jel/images/icons/dots-horizontal-overlay-shadow.svgi";
import addIcon from "../../assets/jel/images/icons/add-shadow.svgi";
import notificationsIcon from "../../assets/jel/images/icons/notifications-shadow.svgi";
import securityIcon from "../../assets/jel/images/icons/security-shadow.svgi";
import sunIcon from "../../assets/jel/images/icons/sun-shadow.svgi";
import EqippedBrushIcon from "./equipped-brush-icon";
import EqippedColorIcon from "./equipped-color-icon";
import EquippedEmojiIcon from "./equipped-emoji-icon";
import { useSceneMuteState } from "../utils/shared-effects";
import { getMessages } from "../../hubs/utils/i18n";
import Tooltip from "./tooltip";
import { useInstallPWA } from "../../hubs/react-components/input/useInstallPWA";

const Top = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-start;

  body.paused #jel-interface.hub-type-world & {
    opacity: 0.4;
  }
`;

const HubCornerButtonElement = styled.button`
  color: var(--canvas-overlay-text-color);
  width: content-width;
  margin: 0px 12px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  padding: 6px 10px;
  border: 0;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  font-weight: var(--canvas-overlay-item-text-weight);
  text-align: left;
  max-width: fit-content;
  text-shadow: 0px 0px 4px;

  &:hover {
    background-color: var(--canvas-overlay-item-hover-background-color);
  }

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }

  .panels-expanded & {
    display: none;
  }
`;

const HubCornerButtons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  width: 50%;
  padding: 12px 0;

  &.opaque {
    background-color: var(--channel-header-background-color);
  }
`;

const HubCornerButton = styled.button`
  position: relative;
  color: var(--canvas-overlay-text-color);
  width: content-width;
  margin: 0 12px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  padding: 6px 10px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  font-weight: var(--canvas-overlay-item-text-weight);
  text-align: left;
  max-width: fit-content;
  text-shadow: 0px 0px 4px var(--menu-shadow-color);

  &:hover {
    background-color: var(--canvas-overlay-item-hover-background-color);
  }

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }

  .panels-expanded & {
    display: none;
  }
`;

const HubCornerButtonIcon = styled.div`
  width: 22px;
  height: 22px;
`;

const HubContextButton = forwardRef((props, ref) => {
  return (
    <HubCornerButtonElement {...props} ref={ref}>
      <HubCornerButtonIcon dangerouslySetInnerHTML={{ __html: dotsIcon }} />
    </HubCornerButtonElement>
  );
});

HubContextButton.displayName = "HubContextButton";

const HubCreateButton = forwardRef((props, ref) => {
  const messages = getMessages();

  return (
    <Tooltip content={messages["create.tip"]} placement="top" key="create" delay={500}>
      <HubCornerButtonElement {...props} ref={ref}>
        <HubCornerButtonIcon dangerouslySetInnerHTML={{ __html: addIcon }} />
      </HubCornerButtonElement>
    </Tooltip>
  );
});

HubCreateButton.displayName = "HubCreateButton";

const EnvironmentSettingsButton = forwardRef((props, ref) => {
  const messages = getMessages();

  return (
    <Tooltip content={messages["environment-settings.tip"]} placement="top" key="environment-settings" delay={500}>
      <HubCornerButtonElement {...props} ref={ref}>
        <HubCornerButtonIcon dangerouslySetInnerHTML={{ __html: sunIcon }} />
      </HubCornerButtonElement>
    </Tooltip>
  );
});

EnvironmentSettingsButton.displayName = "EnvironmentSettingsButton";

const HubPermissionsButton = forwardRef((props, ref) => {
  const messages = getMessages();

  return (
    <Tooltip content={messages["hub-permissions.tip"]} placement="top" key="hub-permissions" delay={500}>
      <HubCornerButtonElement {...props} ref={ref}>
        <HubCornerButtonIcon dangerouslySetInnerHTML={{ __html: securityIcon }} />
      </HubCornerButtonElement>
    </Tooltip>
  );
});

HubPermissionsButton.displayName = "HubPermissionsButton";

const HubNotificationButton = forwardRef((props, ref) => {
  const messages = getMessages();

  return (
    <Tooltip content={messages["hub-notifications.tip"]} placement="top" key="hub-notifications" delay={500}>
      <HubCornerButtonElement {...props} ref={ref}>
        <HubCornerButtonIcon dangerouslySetInnerHTML={{ __html: notificationsIcon }} />
      </HubCornerButtonElement>
    </Tooltip>
  );
});

HubNotificationButton.displayName = "HubNotificationButton";

const DeviceStatuses = styled.div`
  flex-direction: row;
  margin: 11px 12px 0 0;
  display: none;

  .panels-expanded & {
    display: flex;
  }
`;
function CanvasTop(props) {
  const {
    scene,
    history,
    hubCan,
    hub,
    hubRenamePopupElement,
    showHubRenamePopup,
    environmentSettingsPopupElement,
    showEnvironmentSettingsPopup,
    hubPermissionsPopupElement,
    showHubPermissionsPopup,
    hubNotificationPopupElement,
    showHubNotificationPopup,
    worldTree,
    channelTree,
    showCreateSelectPopup,
    createSelectPopupElement,
    hubContextMenuElement,
    showHubContextMenuPopup
  } = props;

  const { launcherSystem, builderSystem, cameraSystem } = SYSTEMS;
  const { store, hubChannel, spaceChannel } = window.APP;
  const [canSpawnAndMoveMedia, setCanSpawnAndMoveMedia] = useState(
    hubCan && hub && hubCan("spawn_and_move_media", hub.hub_id)
  );
  const [isInspecting, setIsInspecting] = useState(cameraSystem.isInspecting());
  const [unmuted, setUnmuted] = useState(false);
  const [triggerMode, setTriggerMode] = useState(launcherSystem.enabled ? "launcher" : "builder");

  const hubMetadata = worldTree && worldTree.atomMetadata;
  const treeForCurrentHub = hub && hub.type === "world" ? worldTree : channelTree;
  const hubTrailHubIds =
    (treeForCurrentHub && treeForCurrentHub.getAtomTrailForAtomId(hub.hub_id)) || (hub && [hub.hub_id]) || [];
  const onTrailHubNameChanged = useCallback((hubId, name) => spaceChannel.updateHub(hubId, { name }), [spaceChannel]);

  const isWorld = hub && hub.type === "world";
  const [pwaAvailable, installPWA] = useInstallPWA();
  const environmentSettingsButtonRef = useRef();
  const hubNotificationButtonRef = useRef();
  const hubPermissionsButtonRef = useRef();
  const hubCreateButtonRef = useRef();
  const hubContextButtonRef = useRef();

  useSceneMuteState(scene, setUnmuted);

  useEffect(
    () => {
      const handler = () => {
        setTriggerMode(builderSystem.enabled ? "builder" : "launcher");
      };

      builderSystem.addEventListener("enabledchanged", handler);
      () => {
        builderSystem.removeEventListener("enabledchanged", handler);
      };
    },
    [builderSystem, launcherSystem]
  );

  useEffect(
    () => {
      const handler = () => setIsInspecting(SYSTEMS.cameraSystem.isInspecting());
      cameraSystem.addEventListener("mode_changed", handler);
      () => cameraSystem.removeEventListener("mode_changed", handler);
    },
    [cameraSystem]
  );

  useEffect(
    () => {
      const handler = () => setCanSpawnAndMoveMedia(hubCan && hub && hubCan("spawn_and_move_media", hub.hub_id));
      setCanSpawnAndMoveMedia(hubCan && hub && hubCan("spawn_and_move_media", hub.hub_id));
      hubChannel && hubChannel.addEventListener("permissions_updated", handler);
      return () => hubChannel && hubChannel.removeEventListener("permissions_updated", handler);
    },
    [hub, hubCan, hubChannel]
  );

  return (
    <Top>
      {!isInspecting && (
        <HubTrail
          tree={treeForCurrentHub}
          history={history}
          hub={hub}
          hubMetadata={hubMetadata}
          hubCan={hubCan}
          hubIds={hubTrailHubIds}
          renamePopupElement={hubRenamePopupElement}
          showRenamePopup={showHubRenamePopup}
          onHubNameChanged={onTrailHubNameChanged}
        />
      )}
      {!isInspecting && (
        <HubCornerButtons className={hub && hub.type === "world" ? "" : "opaque"}>
          {pwaAvailable && (
            <HubCornerButton onClick={installPWA}>
              <FormattedMessage id="install.desktop" />
            </HubCornerButton>
          )}
          {isWorld && (
            <EnvironmentSettingsButton
              ref={environmentSettingsButtonRef}
              onMouseDown={e => cancelEventIfFocusedWithin(e, environmentSettingsPopupElement)}
              onClick={() => showEnvironmentSettingsPopup(environmentSettingsButtonRef)}
            />
          )}
          {isWorld &&
            hubCan &&
            hubCan("update_hub_roles", hub && hub.hub_id) && (
              <HubPermissionsButton
                ref={hubPermissionsButtonRef}
                onMouseDown={e => cancelEventIfFocusedWithin(e, hubPermissionsPopupElement)}
                onClick={() => showHubPermissionsPopup(hubPermissionsButtonRef)}
              />
            )}
          {isWorld && (
            <HubNotificationButton
              ref={hubNotificationButtonRef}
              onMouseDown={e => cancelEventIfFocusedWithin(e, hubNotificationPopupElement)}
              onClick={() => showHubNotificationPopup(hubNotificationButtonRef)}
            />
          )}
          {isWorld &&
            canSpawnAndMoveMedia && (
              <HubCreateButton
                ref={hubCreateButtonRef}
                onMouseDown={e => cancelEventIfFocusedWithin(e, createSelectPopupElement)}
                onClick={() => {
                  store.handleActivityFlag("createMenu");
                  showCreateSelectPopup(hubCreateButtonRef, "bottom-end");
                }}
              />
            )}
          <HubContextButton
            ref={hubContextButtonRef}
            onMouseDown={e => cancelEventIfFocusedWithin(e, hubContextMenuElement)}
            onClick={() => {
              showHubContextMenuPopup(hub.hub_id, hubContextButtonRef, "bottom-end", [0, 8], {
                hideRename: true,
                showExport: isWorld,
                showReset: !!hub.template.name
              });
            }}
          />
          {isWorld && (
            <DeviceStatuses>
              <BigIconButton tabIndex={-1} iconSrc={unmuted ? unmutedIcon : mutedIcon} />
              {triggerMode === "builder" && <EqippedBrushIcon />}
              {triggerMode === "builder" ? <EqippedColorIcon /> : <EquippedEmojiIcon />}
            </DeviceStatuses>
          )}
        </HubCornerButtons>
      )}
    </Top>
  );
}
CanvasTop.propTypes = {
  history: PropTypes.object,
  hub: PropTypes.object,
  hubCan: PropTypes.func,
  scene: PropTypes.object,
  hubRenamePopupElement: PropTypes.object,
  showHubRenamePopup: PropTypes.func,
  environmentSettingsPopupElement: PropTypes.object,
  showEnvironmentSettingsPopup: PropTypes.func,
  hubPermissionsPopupElement: PropTypes.object,
  showHubPermissionsPopup: PropTypes.func,
  hubNotificationPopupElement: PropTypes.object,
  showHubNotificationPopup: PropTypes.func,
  createSelectPopupElement: PropTypes.object,
  showCreateSelectPopup: PropTypes.func,
  hubContextMenuElement: PropTypes.object,
  showHubContextMenuPopup: PropTypes.func,
  worldTree: PropTypes.object,
  channelTree: PropTypes.object
};

export default CanvasTop;
