import React, { useRef, useState, useCallback, forwardRef, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import cancelIcon from "../../assets/jel/images/icons/cancel.svgi";
import { FieldEditButton } from "./form-components";
import PropTypes from "prop-types";
import HubTrail from "./hub-trail";
import WorldImporter from "../utils/world-importer";
import WorldExporter from "../utils/world-exporter";
import styled from "styled-components";
import mutedIcon from "../../assets/jel/images/icons/mic-muted.svgi";
import unmutedIcon from "../../assets/jel/images/icons/mic-unmuted.svgi";
import rotateIcon from "../../assets/jel/images/icons/rotate.svgi";
import { BigIconButton } from "./icon-button";
import { isAtomInSubtree, findChildrenAtomsInTreeData, useTreeData } from "../utils/tree-utils";
import { useAtomBoundPopupPopper, usePopupPopper } from "../utils/popup-utils";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { cancelEventIfFocusedWithin } from "../utils/dom-utils";
import { WORLD_COLOR_TYPES } from "../../hubs/constants";
import { getPresetAsColorTuples } from "../utils/world-color-presets";
import JelSidePanels from "./jel-side-panels";
import ChatLog from "./chat-log";
import Snackbar from "./snackbar";
import dotsIcon from "../../assets/jel/images/icons/dots-horizontal-overlay-shadow.svgi";
import addIcon from "../../assets/jel/images/icons/add-shadow.svgi";
import notificationsIcon from "../../assets/jel/images/icons/notifications-shadow.svgi";
import securityIcon from "../../assets/jel/images/icons/security-shadow.svgi";
import sunIcon from "../../assets/jel/images/icons/sun-shadow.svgi";
import RenamePopup from "./rename-popup";
import CreateEmbedPopup from "./create-embed-popup";
import HubContextMenu from "./hub-context-menu";
import CreateSelectPopup from "./create-select-popup";
import ChatInputPopup from "./chat-input-popup";
import EmojiPopup from "./emoji-popup";
import EquippedEmojiIcon from "./equipped-emoji-icon";
import SpaceNotificationsPopup from "./space-notifications-popup";
import HubPermissionsPopup from "./hub-permissions-popup";
import HubNotificationsPopup from "./hub-notifications-popup";
import EnvironmentSettingsPopup from "./environment-settings-popup";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { useSceneMuteState } from "../utils/shared-effects";
import { getMessages } from "../../hubs/utils/i18n";
import Tooltip from "./tooltip";
import KeyTips from "./key-tips";
import LoadingPanel from "./loading-panel";
import { CREATE_SELECT_WIDTH, CREATE_SELECT_LIST_HEIGHT } from "./create-select";
import qsTruthy from "../../hubs/utils/qs_truthy";
import { useInstallPWA } from "../../hubs/react-components/input/useInstallPWA";

const skipSidePanels = qsTruthy("skip_panels");

const Wrap = styled.div`
  pointer-events: none;
  height: 100%;
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

const DeviceStatuses = styled.div`
  flex-direction: row;
  margin: 11px 12px 0 0;
  display: none;

  .panels-expanded & {
    display: flex;
  }
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
    spaceId
  } = props;
  const worldTree = treeManager && treeManager.worldNav;
  const channelTree = treeManager && treeManager.channelNav;
  const spaceTree = treeManager && treeManager.privateSpace;
  const treeForCurrentHub = hub && hub.type === "world" ? worldTree : channelTree;
  const { store, hubChannel, spaceChannel, dynaChannel, matrix } = window.APP;
  const spaceMetadata = spaceTree && spaceTree.atomMetadata;
  const hubMetadata = worldTree && worldTree.atomMetadata;

  const hubTrailHubIds =
    (treeForCurrentHub && treeForCurrentHub.getAtomTrailForAtomId(hub.hub_id)) || (hub && [hub.hub_id]) || [];
  const [unmuted, setUnmuted] = useState(false);
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

  const [canSpawnAndMoveMedia, setCanSpawnAndMoveMedia] = useState(
    hubCan && hub && hubCan("spawn_and_move_media", hub.hub_id)
  );

  const [hasShownInvite, setHasShownInvite] = useState(!!store.state.activity.showInvite);
  const showInviteTip = !!store.state.context.isSpaceCreator && !hasShownInvite;

  const hubRenameFocusRef = useRef();
  const spaceRenameFocusRef = useRef();
  const hubContextButtonRef = useRef();
  const hubCreateButtonRef = useRef();
  const createSelectFocusRef = useRef();
  const createSelectPopupRef = useRef();
  const chatInputFocusRef = useRef();
  const centerPopupRef = useRef();
  const modalPopupRef = useRef();
  const createEmbedFocusRef = useRef();
  const emojiPopupFocusRef = useRef();
  const hubPermissionsButtonRef = useRef();
  const environmentSettingsButtonRef = useRef();
  const hubNotificationButtonRef = useRef();

  const {
    styles: hubRenamePopupStyles,
    attributes: hubRenamePopupAttributes,
    setPopup: setHubRenamePopupElement,
    setRef: setHubRenameReferenceElement,
    atomId: hubRenameHubId,
    show: showHubRenamePopup,
    popupElement: hubRenamePopupElement,
    update: updateHubRenamePopup
  } = useAtomBoundPopupPopper(hubRenameFocusRef, "bottom-start", [0, 8]);

  const {
    styles: spaceRenamePopupStyles,
    attributes: spaceRenamePopupAttributes,
    setPopup: setSpaceRenamePopupElement,
    atomId: spaceRenameSpaceId,
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
        if (updateHubRenamePopup) updateHubRenamePopup();
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
      updateHubRenamePopup,
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

  // Handle permissions changed
  useEffect(
    () => {
      const handler = () => setCanSpawnAndMoveMedia(hubCan && hub && hubCan("spawn_and_move_media", hub.hub_id));
      setCanSpawnAndMoveMedia(hubCan && hub && hubCan("spawn_and_move_media", hub.hub_id));
      hubChannel && hubChannel.addEventListener("permissions_updated", handler);
      return () => hubChannel && hubChannel.removeEventListener("permissions_updated", handler);
    },
    [hub, hubCan, hubChannel]
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

  const [pwaAvailable, installPWA] = useInstallPWA();

  const isHomeHub = hub && hub.is_home;

  const onCreateActionSelected = useCallback(a => scene.emit("create_action_exec", a), [scene]);

  const onTrailHubNameChanged = useCallback((hubId, name) => spaceChannel.updateHub(hubId, { name }), [spaceChannel]);

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

  return (
    <WrappedIntlProvider>
      <div>
        <LoadingPanel
          isLoading={isMatrixLoading || isInitializingSpace || !hasFetchedInitialHubMetadata}
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
          <Top>
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
                  <EquippedEmojiIcon />
                </DeviceStatuses>
              )}
            </HubCornerButtons>
          </Top>
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
        {!skipSidePanels && (
          <JelSidePanels
            {...props}
            spaceMetadata={spaceMetadata}
            hubMetadata={hubMetadata}
            showHubRenamePopup={showHubRenamePopup}
            setHubRenameReferenceElement={setHubRenameReferenceElement}
            showHubContextMenuPopup={showHubContextMenuPopup}
            showSpaceRenamePopup={showSpaceRenamePopup}
            spaceRenamePopupElement={spaceRenamePopupElement}
            showEmojiPopup={showEmojiPopup}
            showSpaceNotificationPopup={showSpaceNotificationPopup}
            showInviteTip={showInviteTip}
            setHasShownInvite={setHasShownInvite}
          />
        )}
      </div>
      <RenamePopup
        setPopperElement={setHubRenamePopupElement}
        styles={hubRenamePopupStyles}
        attributes={hubRenamePopupAttributes}
        atomId={hubRenameHubId}
        atomMetadata={hubMetadata}
        ref={hubRenameFocusRef}
        onNameChanged={useCallback(name => spaceChannel.updateHub(hubRenameHubId, { name }), [
          spaceChannel,
          hubRenameHubId
        ])}
      />
      <RenamePopup
        setPopperElement={setSpaceRenamePopupElement}
        styles={spaceRenamePopupStyles}
        attributes={spaceRenamePopupAttributes}
        atomId={spaceRenameSpaceId}
        atomMetadata={spaceMetadata}
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
        styles={hubContextMenuStyles}
        attributes={hubContextMenuAttributes}
        hubId={hubContextMenuHubId}
        spaceCan={spaceCan}
        hubCan={hubCan}
        roomForHubCan={roomForHubCan}
        onRenameClick={useCallback(hubId => showHubRenamePopup(hubId, null), [showHubRenamePopup])}
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
  unavailableReason: PropTypes.string
};

export default JelUI;
