import React, { useRef, useState, useCallback, forwardRef, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import HubTrail from "./hub-trail";
import WorldImporter from "../utils/world-importer";
import WorldExporter from "../utils/world-exporter";
import styled from "styled-components";
import mutedIcon from "../../assets/jel/images/icons/mic-muted.svgi";
import unmutedIcon from "../../assets/jel/images/icons/mic-unmuted.svgi";
import { BigIconButton } from "./icon-button";
import { isAtomInSubtree, findChildrenAtomsInTreeData, useTreeData } from "../utils/tree-utils";
import { useAtomBoundPopupPopper, usePopupPopper } from "../utils/popup-utils";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { cancelEventIfFocusedWithin } from "../utils/dom-utils";
import JelSidePanels from "./jel-side-panels";
import { PopupPanelMenuArrow } from "./popup-panel-menu";
import ChatLog from "./chat-log";
import dotsIcon from "../../assets/jel/images/icons/dots-horizontal-overlay-shadow.svgi";
import addIcon from "../../assets/jel/images/icons/add-shadow.svgi";
import RenamePopup from "./rename-popup";
import CreateEmbedPopup from "./create-embed-popup";
import HubContextMenu from "./hub-context-menu";
import CreateSelectPopup from "./create-select-popup";
import ChatInputPopup from "./chat-input-popup";
import EmojiPopup from "./emoji-popup";
import EquippedEmojiIcon from "./equipped-emoji-icon";
import SpaceNotificationsPopup from "./space-notifications-popup";
import HubNotificationsPopup from "./hub-notifications-popup";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { useSceneMuteState } from "../utils/shared-effects";
import { getMessages } from "../../hubs/utils/i18n";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
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

  body.paused & {
    pointer-events: auto;
    background-color: rgba(0, 0, 0, 0.6);
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
`;

const Top = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-start;

  body.paused & {
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
  margin: 14px 12px 0 0;
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
`;

const HubCornerButton = styled.button`
  position: relative;
  color: var(--canvas-overlay-text-color);
  width: content-width;
  margin: 11px 12px 0 0;
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
    <Tooltip content={messages["create.tip"]} placement="top" key="mute" delay={500}>
      <HubCornerButtonElement {...props} ref={ref}>
        <HubCornerButtonIcon dangerouslySetInnerHTML={{ __html: addIcon }} />
      </HubCornerButtonElement>
    </Tooltip>
  );
});

HubCreateButton.displayName = "HubCreateButton";

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
    hubCan,
    hub,
    memberships,
    hubSettings,
    unavailableReason,
    subscriptions,
    spaceId
  } = props;
  const tree = treeManager && treeManager.sharedNav;
  const spaceTree = treeManager && treeManager.privateSpace;
  const { store, hubChannel, spaceChannel, dynaChannel } = window.APP;
  const spaceMetadata = spaceTree && spaceTree.atomMetadata;
  const hubMetadata = tree && tree.atomMetadata;
  const hubTrailHubIds = (tree && hub && tree.getAtomTrailForAtomId(hub.hub_id)) || (hub && [hub.hub_id]) || [];
  const [unmuted, setUnmuted] = useState(false);
  const [treeData, setTreeData] = useState([]);
  const [treeDataVersion, setTreeDataVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [createEmbedType, setCreateEmbedType] = useState("image");
  const [spaceNotificationsPopupArrowElement, setSpaceNotificationsPopupArrowElement] = useState(null);
  const [hubNotificationsPopupArrowElement, setHubNotificationsPopupArrowElement] = useState(null);

  const hubRenameFocusRef = useRef();
  const spaceRenameFocusRef = useRef();
  const hubContextButtonRef = useRef();
  const hubCreateButtonRef = useRef();
  const createSelectFocusRef = useRef();
  const createSelectPopupRef = useRef();
  const chatInputFocusRef = useRef();
  const centerPopupRef = useRef();
  const createEmbedFocusRef = useRef();
  const emojiPopupFocusRef = useRef();
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
  } = usePopupPopper(
    null,
    "bottom",
    [0, 8],
    [{ name: "arrow", options: { element: spaceNotificationsPopupArrowElement } }]
  );

  const {
    styles: hubNotificationPopupStyles,
    attributes: hubNotificationPopupAttributes,
    show: showHubNotificationPopup,
    setPopup: setHubNotificationPopupElement,
    popupElement: hubNotificationPopupElement,
    update: updateHubNotificationPopup
  } = usePopupPopper(
    null,
    "bottom",
    [0, 8],
    [{ name: "arrow", options: { element: hubNotificationsPopupArrowElement } }]
  );

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
      updateHubNotificationPopup
    ]
  );

  useSceneMuteState(scene, setUnmuted);

  // Consume tree updates so redraws if user manipulates tree
  useTreeData(tree, treeDataVersion, setTreeData, setTreeDataVersion);

  useEffect(() => {
    const handler = () => setIsLoading(false);

    scene && scene.addEventListener("terrain_chunk_loading_complete", handler);
    () => scene && scene.removeEventListener("terrain_chunk_loading_complete", handler);
  });

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

  const [pwaAvailable, installPWA] = useInstallPWA();

  const isHomeHub = hub && hub.is_home;

  const onCreateActionSelected = useCallback(a => scene.emit("create_action_exec", a), [scene]);

  const onTrailHubNameChanged = useCallback((hubId, name) => spaceChannel.updateHub(hubId, { name }), [spaceChannel]);

  return (
    <WrappedIntlProvider>
      <div>
        <LoadingPanel isLoading={isLoading} unavailableReason={unavailableReason} />
        <Wrap id="jel-ui-wrap">
          <FadeEdges />
          <CreateSelectPopupRef ref={createSelectPopupRef} />
          <CenterPopupRef ref={centerPopupRef} />
          <Top>
            {hubMetadata && (
              <HubTrail
                tree={tree}
                history={history}
                hubMetadata={hubMetadata}
                hubCan={hubCan}
                hubIds={hubTrailHubIds}
                renamePopupElement={hubRenamePopupElement}
                showRenamePopup={showHubRenamePopup}
                onHubNameChanged={onTrailHubNameChanged}
                descriptionType={hub && hub.is_home ? "home" : null}
              />
            )}
            <HubCornerButtons>
              {pwaAvailable && (
                <HubCornerButton onClick={installPWA}>
                  <FormattedMessage id="install.desktop" />
                </HubCornerButton>
              )}
              <HubCreateButton
                ref={hubNotificationButtonRef}
                onMouseDown={e => cancelEventIfFocusedWithin(e, hubNotificationPopupElement)}
                onClick={() => showHubNotificationPopup(hubNotificationButtonRef)}
              />
              <HubCreateButton
                ref={hubCreateButtonRef}
                onMouseDown={e => cancelEventIfFocusedWithin(e, createSelectPopupElement)}
                onClick={() => {
                  store.handleActivityFlag("createMenu");
                  showCreateSelectPopup(hubCreateButtonRef, "bottom-end");
                }}
              />
              <HubContextButton
                ref={hubContextButtonRef}
                onMouseDown={e => cancelEventIfFocusedWithin(e, hubContextMenuElement)}
                onClick={() => {
                  showHubContextMenuPopup(hub.hub_id, hubContextButtonRef, "bottom-end", [0, 8], {
                    hideRename: true,
                    showExport: true,
                    showReset: !!hub.template.name
                  });
                }}
              />
              <DeviceStatuses>
                <BigIconButton tabIndex={-1} iconSrc={unmuted ? unmutedIcon : mutedIcon} />
                <EquippedEmojiIcon />
              </DeviceStatuses>
            </HubCornerButtons>
          </Top>
          <KeyTipsWrap onClick={() => store.update({ settings: { hideKeyTips: !store.state.settings.hideKeyTips } })}>
            <KeyTips id="key-tips" />
          </KeyTipsWrap>
          <BottomLeftPanels>
            <PausedInfoLabel>
              <FormattedMessage id="paused.info" />
            </PausedInfoLabel>
            {isHomeHub && (
              <UnpausedInfoLabel>
                <FormattedMessage id="home-hub.info" />
              </UnpausedInfoLabel>
            )}

            {!isHomeHub && <ChatLog hub={hub} scene={scene} store={store} />}
          </BottomLeftPanels>
        </Wrap>
        {!skipSidePanels && (
          <JelSidePanels
            {...props}
            spaceMetadata={spaceMetadata}
            showHubRenamePopup={showHubRenamePopup}
            setHubRenameReferenceElement={setHubRenameReferenceElement}
            showHubContextMenuPopup={showHubContextMenuPopup}
            showSpaceRenamePopup={showSpaceRenamePopup}
            spaceRenamePopupElement={spaceRenamePopupElement}
            showEmojiPopup={showEmojiPopup}
            showSpaceNotificationPopup={showSpaceNotificationPopup}
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
        onEmojiSelected={({ unicode }) => {
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
        }}
      />
      <SpaceNotificationsPopup
        setPopperElement={setSpaceNotificationPopupElement}
        styles={spaceNotificationPopupStyles}
        attributes={spaceNotificationPopupAttributes}
        subscriptions={subscriptions}
        spaceId={spaceId}
        memberships={memberships}
      >
        <PopupPanelMenuArrow
          ref={setSpaceNotificationsPopupArrowElement}
          style={spaceNotificationPopupStyles.arrow}
          className={sharedStyles.popperArrow}
        />
      </SpaceNotificationsPopup>
      <HubNotificationsPopup
        setPopperElement={setHubNotificationPopupElement}
        styles={hubNotificationPopupStyles}
        attributes={hubNotificationPopupAttributes}
        subscriptions={subscriptions}
        hub={hub}
        hubSettings={hubSettings}
      >
        <PopupPanelMenuArrow
          ref={setHubNotificationsPopupArrowElement}
          style={hubNotificationPopupStyles.arrow}
          className={sharedStyles.popperArrow}
        />
      </HubNotificationsPopup>
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
            if (!tree.getNodeIdForAtomId(hubId)) return;

            // If this hub or any of its parents were deleted, go home.
            if (isAtomInSubtree(tree, hubId, hub.hub_id)) {
              const homeHub = homeHubForSpaceId(hub.space_id, memberships);
              navigateToHubUrl(history, homeHub.url);
            }

            // All trashable children are trashed too.
            const trashableChildrenHubIds = findChildrenAtomsInTreeData(treeData, hubId).filter(hubId =>
              hubCan("trash_hub", hubId)
            );

            spaceChannel.trashHubs([...trashableChildrenHubIds, hubId]);
          },
          [tree, hub, history, hubCan, memberships, spaceChannel, treeData]
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
  scene: PropTypes.object,
  subscriptions: PropTypes.object,
  selectedMediaLayer: PropTypes.number,
  spaceId: PropTypes.string,
  memberships: PropTypes.array,
  hubSettings: PropTypes.array,
  unavailableReason: PropTypes.string
};

export default JelUI;
