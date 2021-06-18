import React, { useRef, useState, useCallback, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import cancelIcon from "../../assets/jel/images/icons/cancel.svgi";
import { FieldEditButton } from "./form-components";
import PropTypes from "prop-types";
import WorldImporter from "../utils/world-importer";
import WorldExporter from "../utils/world-exporter";
import styled from "styled-components";
import mutedIcon from "../../assets/jel/images/icons/mic-muted.svgi";
import unmutedIcon from "../../assets/jel/images/icons/mic-unmuted.svgi";
import rotateIcon from "../../assets/jel/images/icons/rotate.svgi";
import { isAtomInSubtree, findChildrenAtomsInTreeData, useTreeData } from "../utils/tree-utils";
import { useAtomBoundPopupPopper, usePopupPopper } from "../utils/popup-utils";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { WORLD_COLOR_TYPES } from "../../hubs/constants";
import { getPresetAsColorTuples } from "../utils/world-color-presets";
import { ATOM_TYPES } from "../utils/atom-metadata";
import JelSidePanels from "./jel-side-panels";
import ChatLog from "./chat-log";
import Snackbar from "./snackbar";
import RenamePopup from "./rename-popup";
import CreateEmbedPopup from "./create-embed-popup";
import HubContextMenu from "./hub-context-menu";
import CreateSelectPopup from "./create-select-popup";
import ChatInputPopup from "./chat-input-popup";
import EmojiPopup from "./emoji-popup";
import SpaceNotificationsPopup from "./space-notifications-popup";
import HubPermissionsPopup from "./hub-permissions-popup";
import HubNotificationsPopup from "./hub-notifications-popup";
import EnvironmentSettingsPopup from "./environment-settings-popup";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { useSceneMuteState } from "../utils/shared-effects";
import KeyTips from "./key-tips";
import LoadingPanel from "./loading-panel";
import { CREATE_SELECT_WIDTH, CREATE_SELECT_LIST_HEIGHT } from "./create-select";
import qsTruthy from "../../hubs/utils/qs_truthy";
import CanvasTop from "./canvas-top";
import AssetPanel from "./asset-panel";

const skipSidePanels = qsTruthy("skip_panels");
const skipNeon = qsTruthy("skip_neon");

const Root = styled.div`
  & #jel-ui-wrap {
    height: 100%;
  }

  &.show-asset-panel #jel-ui-wrap {
    height: calc(100% - 128px);
  }

  body.paused &.show-asset-panel #jel-ui-wrap {
    height: 100%;
  }

  body.panels-expanded &.show-asset-panel #jel-ui-wrap {
    height: 100%;
  }

  & #asset-panel {
    display: none;
  }

  &.show-asset-panel #asset-panel {
    display: flex;
  }

  body.panels-expanded &.show-asset-panel #asset-panel {
    display: none;
  }
`;

const Wrap = styled.div`
  pointer-events: none;
  top: 0;
  position: fixed;
  z-index: 4;
  display: flex;
  flex-direction: column;

  #jel-interface:focus-within & {
    pointer-events: auto;
  }

  body.paused #jel-interface.hub-type-world & {
    pointer-events: auto;
    background-color: rgba(0, 0, 0, 0.6);
  }

  body.paused #jel-interface.hub-type-channel & {
    pointer-events: none;
    background-color: transparent;
  }
`;

const AssetPanelWrap = styled.div`
  color: var(--panel-text-color);
  background-color: var(--secondary-panel-background-color);
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  pointer-events: auto;
  height: 192px;
  left: var(--nav-width);
  width: calc(100% - var(--nav-width) - var(--presence-width));
  bottom: 0;
  position: fixed;
  z-index: 4;
  flex-direction: column;

  #jel-interface:focus-within & {
    pointer-events: auto;
  }

  body.paused #jel-interface.hub-type-world & {
    display: none;
  }

  body.paused #jel-interface.hub-type-channel & {
    display: none;
  }
`;

const NotifyBanner = styled.div`
  width: 100%;
  height: 42px;
  background-color: var(--notify-banner-background-color);
  color: var(--notify-banner-text-color);
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  z-index: 6;
  pointer-events: auto;
  user-select: none;

  .panels-expanded & {
    display: none;
  }
`;

const NotifyBannerButton = styled.button`
  position: relative;
  color: var(--canvas-overlay-text-color);
  width: content-width;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  padding: 4px 8px;
  margin: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.4);
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

const NotifyBannerClose = styled.button`
  display: flex;
  color: var(--notify-banner-close-color);
  border: 0;
  justify-content: center;
  align-items: center;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  margin-right: 12px;

  &:hover {
    text-decoration: underline;
  }
`;

const FadeEdges = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  background: linear-gradient(180deg, rgba(64, 64, 64, 0.4) 0%, rgba(32, 32, 32, 0) 128px, rgba(32, 32, 32, 0) 100%);

  body.low-detail & {
    background: none;
  }

  pointer-events: none;
  z-index: 0;
`;

// Note the hack left: here is because the popper position update
// ends up being behind if we try to change the placement of the popper
// for the create select dropdown, which is necessary to support the top
// corner button variant. So we keep it bottom-end, and offset the ref here
// for when we want it centered.
const CreateSelectPopupRef = styled.div`
  position: absolute;
  top: calc(100% - ${Math.floor(CREATE_SELECT_LIST_HEIGHT) + 100}px);
  left: calc(50% + ${Math.floor(CREATE_SELECT_WIDTH / 2)}px);
  width: 1px;
  height: 1px;
  pointer-events: none;
`;

const ModalPopupRef = styled.div`
  position: absolute;
  top: 30%;
  left: 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
`;

const CenterPopupRef = styled.div`
  position: absolute;
  top: 70%;
  left: 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
`;

const PausedInfoLabel = styled.div`
  position: absolute;
  bottom: 0px;
  left: 0px;
  display: none;
  color: var(--canvas-overlay-text-color);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  line-height: calc(var(--canvas-overlay-text-size) + 2px);
  font-weight: var(--canvas-overlay-item-text-weight);
  font-size: var(--canvas-overlay-text-size);
  margin: 11px 0 0 8px;
  padding: 6px 10px;

  body.paused & {
    display: block;
  }
`;

const UnpausedInfoLabel = styled.div`
  position: absolute;
  bottom: 0px;
  left: 0px;
  display: block;
  color: var(--canvas-overlay-text-color);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  line-height: calc(var(--canvas-overlay-tertiary-text-size) + 2px);
  font-weight: var(--canvas-overlay-item-tertiary-weight);
  font-size: var(--canvas-overlay-tertiary-text-size);
  margin: 11px 0 0 8px;
  padding: 6px 10px;
  white-space: pre;

  body.paused & {
    display: none;
  }
`;

const ExternalCameraCanvas = styled.canvas`
  width: 300px;
  height: 168px;
  margin-left: 14px;
  pointer-events: auto;

  display: none;

  .external-camera-on & {
    display: block;
  }

  body.paused .external-camera-on & {
    display: none;
  }
`;

const ExternalCameraRotateButton = styled.button`
  pointer-events: auto;
  position: absolute;
  bottom: 8px;
  left: 16px;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  border: 0;
  color: var(--action-button-text-color);
  width: 40px;
  height: 36px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0px 2px;
  display: flex;
  justify-content: center;
  align-items: center;

  background-color: var(--canvas-overlay-item-hover-background-color);

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }

  body.paused & {
    display: none;
  }
`;

const ExternalCameraRotateButtonIcon = styled.div`
  width: 30px;
  height: 30px;
`;

const KeyTipsWrap = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;

  body.paused & {
    opacity: 0.4;
  }
`;

const BottomLeftPanels = styled.div`
  position: absolute;
  bottom: 14px;
  left: 0;
  width: 50%;
`;

function JelUI(props) {
  const {
    scene,
    treeManager,
    history,
    spaceCan,
    roomForHubCan,
    hubCan,
    hub,
    memberships,
    hubSettings,
    unavailableReason,
    subscriptions,
    spaceId,
    publishedVoxTree
  } = props;
  const worldTree = treeManager && treeManager.worldNav;
  const channelTree = treeManager && treeManager.channelNav;
  const spaceTree = treeManager && treeManager.privateSpace;
  const { store, hubChannel, spaceChannel, dynaChannel, accountChannel, matrix } = window.APP;
  const { launcherSystem, builderSystem } = SYSTEMS;
  const spaceMetadata = spaceTree && spaceTree.atomMetadata;
  const hubMetadata = worldTree && worldTree.atomMetadata;

  const [unmuted, setUnmuted] = useState(false);
  const [triggerMode, setTriggerMode] = useState(launcherSystem.enabled ? "launcher" : "builder");
  const [worldTreeData, setWorldTreeData] = useState([]);
  const [worldTreeDataVersion, setWorldTreeDataVersion] = useState(0);
  const [channelTreeData, setChannelTreeData] = useState([]);
  const [channelTreeDataVersion, setChannelTreeDataVersion] = useState(0);
  const [isMatrixLoading, setIsMatrixLoading] = useState(!matrix || !matrix.isInitialSyncFinished);
  const [hasFetchedInitialHubMetadata, setHasFetchedInitialHubMetadata] = useState(false);
  const [isInitializingSpace, setIsInitializingSpace] = useState(store.state.context.isFirstVisitToSpace);
  const [createEmbedType, setCreateEmbedType] = useState("image");
  const [showingExternalCamera, setShowingExternalCamera] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(
    subscriptions &&
      !subscriptions.subscribed &&
      store &&
      (!store.state.settings.hideNotificationBannerUntilSeconds ||
        Math.floor(new Date() / 1000.0) > store.state.settings.hideNotificationBannerUntilSeconds)
  );
  const [showNotificationBannerWarning, setShowNotificationBannerWarning] = useState(false);

  const [hasShownInvite, setHasShownInvite] = useState(!!store.state.activity.showInvite);
  const showInviteTip = !!store.state.context.isSpaceCreator && !hasShownInvite;

  const atomRenameFocusRef = useRef();
  const spaceRenameFocusRef = useRef();
  const createSelectFocusRef = useRef();
  const createSelectPopupRef = useRef();
  const chatInputFocusRef = useRef();
  const centerPopupRef = useRef();
  const modalPopupRef = useRef();
  const createEmbedFocusRef = useRef();
  const emojiPopupFocusRef = useRef();
  const environmentSettingsButtonRef = useRef();

  const {
    styles: atomRenamePopupStyles,
    attributes: atomRenamePopupAttributes,
    setPopup: setAtomRenamePopupElement,
    setRef: setAtomRenameReferenceElement,
    atomId: atomRenameAtomId,
    atomMetadata: atomRenameMetadata,
    show: showAtomRenamePopup,
    popupElement: atomRenamePopupElement,
    update: updateAtomRenamePopup
  } = useAtomBoundPopupPopper(atomRenameFocusRef, "bottom-start", [0, 8]);

  const {
    styles: spaceRenamePopupStyles,
    attributes: spaceRenamePopupAttributes,
    setPopup: setSpaceRenamePopupElement,
    atomId: spaceRenameSpaceId,
    atomMetadata: spaceRenameMetadata,
    show: showSpaceRenamePopup,
    popupElement: spaceRenamePopupElement,
    update: updateSpaceRenamePopup
  } = useAtomBoundPopupPopper(spaceRenameFocusRef, "bottom-start", [0, 16]);

  const {
    styles: hubContextMenuStyles,
    attributes: hubContextMenuAttributes,
    atomId: hubContextMenuHubId,
    show: showHubContextMenuPopup,
    setPopup: setHubContextMenuElement,
    popupOpenOptions: hubContextMenuOpenOptions,
    popupElement: hubContextMenuElement,
    update: updateHubContextMenu
  } = useAtomBoundPopupPopper();

  const {
    styles: createSelectPopupStyles,
    attributes: createSelectPopupAttributes,
    show: showCreateSelectPopup,
    setPopup: setCreateSelectPopupElement,
    popupElement: createSelectPopupElement,
    update: updateCreateSelectPopup
  } = usePopupPopper(".create-select-selection-search-input", "bottom-end", [0, 8]);

  const {
    styles: chatInputPopupStyles,
    attributes: chatInputPopupAttributes,
    show: showChatInputPopup,
    setPopup: setChatInputPopupElement,
    update: updateChatInputPopup
  } = usePopupPopper(chatInputFocusRef, "top", [0, 8]);

  const {
    styles: emojiPopupStyles,
    attributes: emojiPopupAttributes,
    show: showEmojiPopup,
    setPopup: setEmojiPopupElement,
    update: updateEmojiPopup,
    popupOpenOptions: emojiPopupOpenOptions
  } = usePopupPopper(emojiPopupFocusRef, "bottom", [0, 8]);

  const {
    styles: createEmbedPopupStyles,
    attributes: createEmbedPopupAttributes,
    show: showCreateEmbedPopup,
    setPopup: setCreateEmbedPopupElement,
    update: updateCreateEmbedPopup
  } = usePopupPopper(createEmbedFocusRef, "bottom", [0, 8]);

  const {
    styles: spaceNotificationPopupStyles,
    attributes: spaceNotificationPopupAttributes,
    show: showSpaceNotificationPopup,
    setPopup: setSpaceNotificationPopupElement,
    update: updateSpaceNotificationPopup
  } = usePopupPopper(null, "bottom", [0, 8]);

  const {
    styles: hubNotificationPopupStyles,
    attributes: hubNotificationPopupAttributes,
    show: showHubNotificationPopup,
    setPopup: setHubNotificationPopupElement,
    popupElement: hubNotificationPopupElement,
    update: updateHubNotificationPopup
  } = usePopupPopper(null, "bottom-end", [0, 8]);

  const {
    styles: environmentSettingsPopupStyles,
    attributes: environmentSettingsPopupAttributes,
    show: showEnvironmentSettingsPopup,
    setPopup: setEnvironmentSettingsPopupElement,
    popupElement: environmentSettingsPopupElement,
    update: updateEnvironmentSettingsPopup
  } = usePopupPopper(null, "bottom-end", [0, 8]);

  const {
    styles: hubPermissionsPopupStyles,
    attributes: hubPermissionsPopupAttributes,
    show: showHubPermissionsPopup,
    setPopup: setHubPermissionsPopupElement,
    popupElement: hubPermissionsPopupElement,
    update: updateHubPermissionsPopup
  } = usePopupPopper(null, "bottom-end", [0, 8]);

  // When panels are re-sized we need to re-layout popups
  useEffect(
    () => {
      const handleResizeComplete = () => {
        if (updateSpaceRenamePopup) updateSpaceRenamePopup();
        if (updateAtomRenamePopup) updateAtomRenamePopup();
        if (updateHubContextMenu) updateHubContextMenu();
        if (updateCreateSelectPopup) updateCreateSelectPopup();
        if (updateCreateEmbedPopup) updateCreateEmbedPopup();
        if (updateChatInputPopup) updateChatInputPopup();
        if (updateEmojiPopup) updateEmojiPopup();
        if (updateSpaceNotificationPopup) updateSpaceNotificationPopup();
        if (updateHubNotificationPopup) updateHubNotificationPopup();
        if (updateEnvironmentSettingsPopup) updateEnvironmentSettingsPopup();
        if (updateHubPermissionsPopup) updateHubPermissionsPopup();
      };

      scene && scene.addEventListener("animated_resize_complete", handleResizeComplete);
      () => scene && scene.removeEventListener("animated_resize_complete", handleResizeComplete);
    },
    [
      scene,
      updateAtomRenamePopup,
      updateSpaceRenamePopup,
      updateHubContextMenu,
      updateCreateSelectPopup,
      updateCreateEmbedPopup,
      updateChatInputPopup,
      updateEmojiPopup,
      updateSpaceNotificationPopup,
      updateHubNotificationPopup,
      updateHubPermissionsPopup,
      updateEnvironmentSettingsPopup
    ]
  );

  useEffect(
    () => {
      const handler = () => {
        setTriggerMode(builderSystem.enabled ? "builder" : "launcher");
      };

      builderSystem.addEventListener("enabledchanged", handler);

      return () => {
        builderSystem.removeEventListener("enabledchanged", handler);
      };
    },
    [builderSystem, launcherSystem]
  );

  useEffect(
    () => {
      if (hasFetchedInitialHubMetadata) return;
      if (!hub || !hubMetadata) return;

      const hubId = hub.hub_id;

      if (hubMetadata.hasMetadata(hubId)) {
        setHasFetchedInitialHubMetadata(true);
      } else {
        const handler = () => setHasFetchedInitialHubMetadata(true);

        hubMetadata.subscribeToMetadata(hub.hub_id, handler);
        return () => hubMetadata.unsubscribeFromMetadata(hub.hub_id);
      }
    },
    [hubMetadata, hub, hasFetchedInitialHubMetadata, setHasFetchedInitialHubMetadata]
  );

  useSceneMuteState(scene, setUnmuted);

  // Consume tree updates so redraws if user manipulates tree
  useTreeData(worldTree, worldTreeDataVersion, setWorldTreeData, setWorldTreeDataVersion);
  useTreeData(channelTree, channelTreeDataVersion, setChannelTreeData, setChannelTreeDataVersion);

  useEffect(
    () => {
      const handler = () => setIsMatrixLoading(false);
      matrix && matrix.addEventListener("initial_sync_finished", handler);
      () => matrix && matrix.removeEventListener("initial_sync_finished", handler);
    },
    [matrix]
  );

  useEffect(
    () => {
      if (!isInitializingSpace) return;

      const handler = () => {
        // Slight delay so room will switch before loader
        setTimeout(() => {
          setIsInitializingSpace(store.state.context.isFirstVisitToSpace);
        }, 2000);
      };
      store.addEventListener("statechanged-context", handler);
      return () => store.removeEventListener("statechanged-context", handler);
    },
    [store, setIsInitializingSpace, isInitializingSpace]
  );

  // Handle create hotkey (typically /)
  useEffect(
    () => {
      const handleCreateHotkey = () => showCreateSelectPopup(createSelectPopupRef);
      scene && scene.addEventListener("action_create", handleCreateHotkey);
      return () => scene && scene.removeEventListener("action_create", handleCreateHotkey);
    },
    [scene, createSelectPopupRef, showCreateSelectPopup]
  );

  // Handle chat message hotkey (typically space)
  // Show chat message entry and chat log.
  useEffect(
    () => {
      const handleChatHotkey = () => showChatInputPopup(centerPopupRef);
      scene && scene.addEventListener("action_chat_entry", handleChatHotkey);
      return () => scene && scene.removeEventListener("action_chat_entry", handleChatHotkey);
    },
    [scene, centerPopupRef, showChatInputPopup]
  );

  // Handle embed popup trigger
  useEffect(
    () => {
      const handleCreateEmbed = e => {
        setCreateEmbedType(e.detail);
        showCreateEmbedPopup(centerPopupRef);
      };

      scene && scene.addEventListener("action_show_create_embed", handleCreateEmbed);
      return () => scene && scene.removeEventListener("action_show_create_embed", handleCreateEmbed);
    },
    [scene, centerPopupRef, showCreateEmbedPopup]
  );

  // Handle emoji popup trigger
  useEffect(
    () => {
      const handleCreateVoxmoji = () => showEmojiPopup(centerPopupRef, "bottom", [0, 8], { equip: false });

      scene && scene.addEventListener("action_show_emoji_picker", handleCreateVoxmoji);
      return () => scene && scene.removeEventListener("action_show_emoji_picker", handleCreateVoxmoji);
    },
    [scene, centerPopupRef, showEmojiPopup]
  );

  // Handle external camera toggle
  useEffect(
    () => {
      const handleOn = () => setShowingExternalCamera(true);
      const handleOff = () => setShowingExternalCamera(false);

      scene && scene.addEventListener("external_camera_added", handleOn);
      scene && scene.addEventListener("external_camera_removed", handleOff);

      return () => {
        scene && scene.removeEventListener("external_camera_added", handleOn);
        scene && scene.removeEventListener("external_camera_removed", handleOff);
      };
    },
    [scene]
  );

  const isHomeHub = hub && hub.is_home;

  const onCreateActionSelected = useCallback(a => scene.emit("create_action_exec", a), [scene]);

  const onTurnOnNotificationClicked = useCallback(() => subscriptions.subscribe(), [subscriptions]);

  const temporarilyUpdateEnvironmentColors = useCallback((...colors) => {
    SYSTEMS.terrainSystem.updateWorldColors(...colors);
    SYSTEMS.atmosphereSystem.updateWaterColor(colors[7]);
    SYSTEMS.atmosphereSystem.updateSkyColor(colors[6]);
  }, []);

  const updateWorldType = useCallback(
    worldType => {
      spaceChannel.updateHub(hub.hub_id, { world_type: worldType });
    },
    [hub, spaceChannel]
  );

  const saveCurrentEnvironmentColors = useCallback(
    () => {
      const colors = SYSTEMS.terrainSystem.worldColors;
      const hubWorldColors = {};

      WORLD_COLOR_TYPES.forEach((type, idx) => {
        hubWorldColors[`world_${type}_color_r`] = (colors[idx] && colors[idx].r) || 0;
        hubWorldColors[`world_${type}_color_g`] = (colors[idx] && colors[idx].g) || 0;
        hubWorldColors[`world_${type}_color_b`] = (colors[idx] && colors[idx].b) || 0;
      });

      spaceChannel.updateHub(hub.hub_id, hubWorldColors);
    },
    [hub, spaceChannel]
  );

  const onEnvironmentPresetColorsHovered = useCallback(
    i => {
      const colors = getPresetAsColorTuples(i);
      temporarilyUpdateEnvironmentColors(...colors);
    },
    [temporarilyUpdateEnvironmentColors]
  );

  const onEnvironmentPresetColorsLeft = useCallback(
    () => {
      SYSTEMS.terrainSystem.updateWorldForHub(hub);
      SYSTEMS.atmosphereSystem.updateAtmosphereForHub(hub);
    },
    [hub]
  );

  const onEnvironmentPresetColorsClicked = useCallback(
    i => {
      const colors = getPresetAsColorTuples(i);
      temporarilyUpdateEnvironmentColors(...colors);
      saveCurrentEnvironmentColors();
    },
    [saveCurrentEnvironmentColors, temporarilyUpdateEnvironmentColors]
  );

  // Handle subscriptions changed

  useEffect(
    () => {
      const handler = () => {
        if (subscriptions.subscribed) {
          setShowNotificationBanner(false);
        }
      };

      subscriptions.addEventListener("subscriptions_updated", handler);
      return () => subscriptions.removeEventListener("subscriptions_updated", handler);
    },
    [subscriptions, setShowNotificationBanner]
  );

  const onNotifyBannerLater = useCallback(
    // Delay notifications banner by a day
    () => {
      store.update({
        settings: { hideNotificationBannerUntilSeconds: Math.floor(new Date() / 1000.0 + 24 * 60 * 60) }
      });
      setShowNotificationBanner(false);
    },
    [store]
  );

  const onNotifyBannerNever = useCallback(
    () => {
      store.update({
        settings: { hideNotificationBannerUntilSeconds: Math.floor(new Date() / 1000.0 + 10000 * 60 * 60) }
      });
      setShowNotificationBanner(false);
    },
    [store]
  );

  const onNotifyBannerClose = useCallback(() => setShowNotificationBannerWarning(true), []);

  const onClickExternalCameraRotate = useCallback(() => SYSTEMS.externalCameraSystem.toggleCamera(), []);

  const isWorld = hub && hub.type === "world";
  const waitingForMatrix = isMatrixLoading && !skipNeon;

  return (
    <WrappedIntlProvider>
      <Root className={triggerMode === "builder" ? "show-asset-panel" : ""}>
        <LoadingPanel
          isLoading={waitingForMatrix || isInitializingSpace || !hasFetchedInitialHubMetadata}
          unavailableReason={unavailableReason}
        />
        <Snackbar />
        <Wrap id="jel-ui-wrap">
          {showNotificationBanner &&
            !showInviteTip &&
            !showNotificationBannerWarning && (
              <NotifyBanner>
                <FieldEditButton
                  style={{ position: "absolute", left: "2px", top: "6px" }}
                  onClick={onNotifyBannerClose}
                  iconSrc={cancelIcon}
                />
                <div>
                  <FormattedMessage id="notification-banner.info" />
                </div>
                <NotifyBannerButton onClick={onTurnOnNotificationClicked}>
                  <FormattedMessage id="notification-banner.notify-on" />
                </NotifyBannerButton>
              </NotifyBanner>
            )}
          {showNotificationBanner &&
            showNotificationBannerWarning && (
              <NotifyBanner>
                <div>
                  <FormattedMessage id="notification-banner.info-warning" />
                </div>
                <NotifyBannerButton onClick={onTurnOnNotificationClicked}>
                  <FormattedMessage id="notification-banner.notify-on" />
                </NotifyBannerButton>
                <NotifyBannerClose onClick={onNotifyBannerLater}>
                  <FormattedMessage id="notification-banner.close-later" />
                </NotifyBannerClose>
                <NotifyBannerClose onClick={onNotifyBannerNever}>
                  <FormattedMessage id="notification-banner.close-never" />
                </NotifyBannerClose>
              </NotifyBanner>
            )}
          {isWorld && <FadeEdges />}
          <CreateSelectPopupRef ref={createSelectPopupRef} />
          <ModalPopupRef ref={modalPopupRef} />
          <CenterPopupRef ref={centerPopupRef} />
          <CanvasTop
            {...props}
            worldTree={worldTree}
            channelTree={channelTree}
            atomRenamePopupElement={atomRenamePopupElement}
            showAtomRenamePopup={showAtomRenamePopup}
            environmentSettingsButtonRef={environmentSettingsButtonRef}
            environmentSettingsPopupElement={environmentSettingsPopupElement}
            showEnvironmentSettingsPopup={showEnvironmentSettingsPopup}
            hubPermissionsPopupElement={hubPermissionsPopupElement}
            showHubPermissionsPopup={showHubPermissionsPopup}
            hubNotificationPopupElement={hubNotificationPopupElement}
            showHubNotificationPopup={showHubNotificationPopup}
            createSelectPopupElement={createSelectPopupElement}
            showCreateSelectPopup={showCreateSelectPopup}
            hubContextMenuElement={hubContextMenuElement}
            showHubContextMenuPopup={showHubContextMenuPopup}
          />
          <KeyTipsWrap
            style={{ visibility: isWorld ? "visible" : "hidden" }}
            onClick={() => store.update({ settings: { hideKeyTips: !store.state.settings.hideKeyTips } })}
          >
            <KeyTips id="key-tips" />
          </KeyTipsWrap>
          {isWorld && (
            <BottomLeftPanels className={`${showingExternalCamera ? "external-camera-on" : ""}`}>
              <ExternalCameraCanvas id="external-camera-canvas" />
              {showingExternalCamera && (
                <ExternalCameraRotateButton
                  tabIndex={-1}
                  iconSrc={unmuted ? unmutedIcon : mutedIcon}
                  onClick={onClickExternalCameraRotate}
                >
                  <ExternalCameraRotateButtonIcon dangerouslySetInnerHTML={{ __html: rotateIcon }} />
                </ExternalCameraRotateButton>
              )}
              <PausedInfoLabel>
                <FormattedMessage id="paused.info" />
              </PausedInfoLabel>
              {isHomeHub &&
                !showingExternalCamera && (
                  <UnpausedInfoLabel>
                    <FormattedMessage id="home-hub.info" />
                  </UnpausedInfoLabel>
                )}

              {!isHomeHub && (
                <ChatLog leftOffset={showingExternalCamera ? 300 : 0} hub={hub} scene={scene} store={store} />
              )}
            </BottomLeftPanels>
          )}
        </Wrap>
        <AssetPanelWrap id="asset-panel">
          <AssetPanel voxTree={publishedVoxTree} />
        </AssetPanelWrap>
        {!skipSidePanels && (
          <JelSidePanels
            {...props}
            spaceMetadata={spaceMetadata}
            hubMetadata={hubMetadata}
            showAtomRenamePopup={showAtomRenamePopup}
            setAtomRenameReferenceElement={setAtomRenameReferenceElement}
            showHubContextMenuPopup={showHubContextMenuPopup}
            showSpaceRenamePopup={showSpaceRenamePopup}
            spaceRenamePopupElement={spaceRenamePopupElement}
            showEmojiPopup={showEmojiPopup}
            showSpaceNotificationPopup={showSpaceNotificationPopup}
            showInviteTip={showInviteTip}
            setHasShownInvite={setHasShownInvite}
          />
        )}
      </Root>
      <RenamePopup
        setPopperElement={setAtomRenamePopupElement}
        styles={atomRenamePopupStyles}
        attributes={atomRenamePopupAttributes}
        atomId={atomRenameAtomId}
        atomMetadata={atomRenameMetadata}
        ref={atomRenameFocusRef}
        onNameChanged={useCallback(
          name => {
            const { atomType } = atomRenameMetadata;

            if (atomType === ATOM_TYPES.HUB) {
              spaceChannel.updateHub(atomRenameAtomId, { name });
            } else if (atomType === ATOM_TYPES.VOX) {
              accountChannel.updateVox(atomRenameAtomId, { name });
            }
          },
          [spaceChannel, accountChannel, atomRenameAtomId, atomRenameMetadata]
        )}
      />
      <RenamePopup
        setPopperElement={setSpaceRenamePopupElement}
        styles={spaceRenamePopupStyles}
        attributes={spaceRenamePopupAttributes}
        atomId={spaceRenameSpaceId}
        atomMetadata={spaceRenameMetadata}
        ref={spaceRenameFocusRef}
        onNameChanged={useCallback(name => dynaChannel.updateSpace(spaceRenameSpaceId, { name }), [
          dynaChannel,
          spaceRenameSpaceId
        ])}
      />
      <ChatInputPopup
        setPopperElement={setChatInputPopupElement}
        styles={chatInputPopupStyles}
        attributes={chatInputPopupAttributes}
        ref={chatInputFocusRef}
        onMessageEntered={useCallback(message => hubChannel.sendMessage(message), [hubChannel])}
        onEntryComplete={useCallback(() => scene.emit("chat_entry_complete"), [scene])}
      />
      <EmojiPopup
        setPopperElement={setEmojiPopupElement}
        styles={emojiPopupStyles}
        attributes={emojiPopupAttributes}
        ref={emojiPopupFocusRef}
        onEmojiSelected={useCallback(
          ({ unicode }) => {
            const parsed = unicode.split("-").map(str => parseInt(str, 16));
            const emoji = String.fromCodePoint(...parsed);

            if (emojiPopupOpenOptions.equip) {
              let currentSlot = -1;

              for (let i = 0; i < 10; i++) {
                if (store.state.equips.launcher === store.state.equips[`launcherSlot${i + 1}`]) {
                  currentSlot = i;
                  break;
                }
              }

              if (currentSlot !== -1) {
                store.update({ equips: { [`launcherSlot${currentSlot + 1}`]: emoji } });
              }

              store.update({ equips: { launcher: emoji } });
            } else {
              scene.emit("add_media_emoji", emoji);
            }
          },
          [scene, store, emojiPopupOpenOptions.equip]
        )}
      />
      <SpaceNotificationsPopup
        matrix={matrix}
        setPopperElement={setSpaceNotificationPopupElement}
        styles={spaceNotificationPopupStyles}
        attributes={spaceNotificationPopupAttributes}
        subscriptions={subscriptions}
        spaceId={spaceId}
        memberships={memberships}
      />
      <HubPermissionsPopup
        setPopperElement={setHubPermissionsPopupElement}
        styles={hubPermissionsPopupStyles}
        attributes={hubPermissionsPopupAttributes}
        hubMetadata={hubMetadata}
        hub={hub}
      />
      <HubNotificationsPopup
        setPopperElement={setHubNotificationPopupElement}
        styles={hubNotificationPopupStyles}
        attributes={hubNotificationPopupAttributes}
        subscriptions={subscriptions}
        hub={hub}
        hubSettings={hubSettings}
      />
      <EnvironmentSettingsPopup
        setPopperElement={setEnvironmentSettingsPopupElement}
        styles={environmentSettingsPopupStyles}
        attributes={environmentSettingsPopupAttributes}
        hub={hub}
        hubMetadata={hubMetadata}
        hubCan={hubCan}
        onColorsChanged={temporarilyUpdateEnvironmentColors}
        onColorChangeComplete={saveCurrentEnvironmentColors}
        onTypeChanged={updateWorldType}
        onPresetColorsHovered={onEnvironmentPresetColorsHovered}
        onPresetColorsLeft={onEnvironmentPresetColorsLeft}
        onPresetColorsClicked={onEnvironmentPresetColorsClicked}
      />
      <CreateEmbedPopup
        setPopperElement={setCreateEmbedPopupElement}
        styles={createEmbedPopupStyles}
        attributes={createEmbedPopupAttributes}
        embedType={createEmbedType}
        ref={createEmbedFocusRef}
        onURLEntered={useCallback(url => scene.emit("add_media", url), [scene])}
      />
      <HubContextMenu
        setPopperElement={setHubContextMenuElement}
        hideRename={!!hubContextMenuOpenOptions.hideRename}
        showExport={!!hubContextMenuOpenOptions.showExport}
        showReset={!!hubContextMenuOpenOptions.showReset}
        worldTree={worldTree}
        styles={hubContextMenuStyles}
        attributes={hubContextMenuAttributes}
        hubId={hubContextMenuHubId}
        spaceCan={spaceCan}
        hubCan={hubCan}
        roomForHubCan={roomForHubCan}
        onRenameClick={useCallback(hubId => showAtomRenamePopup(hubId, hubMetadata, null), [
          showAtomRenamePopup,
          hubMetadata
        ])}
        onImportClick={useCallback(
          () => {
            document.querySelector("#import-upload-input").click();
            scene.canvas.focus();
          },
          [scene]
        )}
        onExportClick={useCallback(
          () => {
            new WorldExporter().downloadCurrentWorldHtml();
            scene.canvas.focus();
          },
          [scene]
        )}
        onResetClick={useCallback(() => scene.emit("action_reset_objects"), [scene])}
        onTrashClick={useCallback(
          hubId => {
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
          },
          [worldTree, hub, history, hubCan, memberships, spaceChannel, worldTreeData, channelTree, channelTreeData]
        )}
      />
      <CreateSelectPopup
        popperElement={createSelectPopupElement}
        setPopperElement={setCreateSelectPopupElement}
        styles={createSelectPopupStyles}
        attributes={createSelectPopupAttributes}
        ref={createSelectFocusRef}
        onActionSelected={onCreateActionSelected}
      />
      <input
        id="import-upload-input"
        type="file"
        accept="text/html"
        style={{ display: "none" }}
        onChange={async e => {
          const files = [...e.target.files];
          e.target.value = null;

          for (const file of files) {
            new WorldImporter().importHtmlToCurrentWorld(await file.text());
          }
        }}
      />
      <input
        id="file-upload-input"
        type="file"
        style={{ display: "none" }}
        accept={"*"}
        multiple
        onChange={e => {
          for (const file of e.target.files) {
            scene.emit("add_media", file);
          }
          e.target.value = null;
        }}
      />
    </WrappedIntlProvider>
  );
}

JelUI.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  roomForHubCan: PropTypes.func,
  scene: PropTypes.object,
  subscriptions: PropTypes.object,
  selectedMediaLayer: PropTypes.number,
  spaceId: PropTypes.string,
  memberships: PropTypes.array,
  hubSettings: PropTypes.array,
  unavailableReason: PropTypes.string,
  publishedVoxTree: PropTypes.object
};

export default JelUI;
