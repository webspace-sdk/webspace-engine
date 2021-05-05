import React, { useState, useCallback, useRef, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { usePopper } from "react-popper";
import PropTypes from "prop-types";
import styled from "styled-components";
import PanelSectionHeader from "./panel-section-header";
import ActionButton from "./action-button";
import TinyOutlineIconButton from "./tiny-outline-icon-button";
import SelfPanel from "./self-panel";
import SegmentControl from "./segment-control";
import BuilderControls from "./builder-controls";
import addIcon from "../../assets/jel/images/icons/add.svgi";
import notificationsIcon from "../../assets/jel/images/icons/notifications.svgi";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { homeHubForSpaceId, spaceForSpaceId } from "../utils/membership-utils";
import { addNewHubToTree } from "../utils/tree-utils";
import { cancelEventIfFocusedWithin, toggleFocus } from "../utils/dom-utils";
import SpaceTree from "./space-tree";
import HubTree from "./hub-tree";
import InvitePanel from "./invite-panel";
import HubTrashTree from "./hub-trash-tree";
import PresenceList from "./presence-list";
import Tooltip from "./tooltip";
import PanelItemButton, { PanelItemButtonSection } from "./panel-item-button";
import EmojiEquip from "./emoji-equip";
import inviteIcon from "../../assets/jel/images/icons/invite.svgi";
import trashIcon from "../../assets/jel/images/icons/trash.svgi";
import { getMessages } from "../../hubs/utils/i18n";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import ReactDOM from "react-dom";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import PopupPanel from "./popup-panel";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";
import { SOUND_TELEPORT_END } from "../../hubs/systems/sound-effects-system";

const Wrap = styled.div`
  color: var(--panel-text-color);
  background-color: var(--panel-background-color);
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  z-index: 2;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
  user-select: none;

  #jel-interface:focus-within & {
    pointer-events: auto;
  }
`;

const Left = styled.div`
  pointer-events: auto;
  width: var(--nav-width);
  display: flex;
  flex-direction: row;
  box-shadow: 0px 0px 4px;
`;

const Nav = styled.div`
  pointer-events: auto;
  width: calc(var(--nav-width) - 88px);
  display: flex;
  flex-direction: column;
`;

const Right = styled.div`
  pointer-events: auto;
  width: var(--presence-width);
  box-shadow: 0px 0px 4px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
`;

const PresenceContent = styled.div`
  flex: 1 1 auto;
  width: 100%;
  padding: 16px 0;

  &.build {
    height: calc(100% - 740px);
  }

  &.launch {
    height: calc(100% - 330px);
  }
`;

const BlasterContent = styled.div`
  flex: 1 1 auto;
  width: 100%;
  height: 240px;
  min-height: 240px;
  padding: 8px 0;
  z-index: 0;
  background-color: var(--panel-background-color);
`;

const BuilderContent = styled.div`
  flex: 1 1 auto;
  width: 100%;
  height: 650px;
  min-height: 650px;
  padding: 8px 0;
  z-index: 0;
  background-color: var(--panel-background-color);
`;

const TriggerModePanel = styled.div`
  flex: 1 1 auto;
  width: 100%;
  min-height: 60px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  background-color: var(--secondary-panel-background-color);
  color: var(--secondary-panel-text-color);
  align-self: flex-end;
  z-index: 10;
`;

const NavHead = styled.div`
  flex: 0 0 auto;
  margin-bottom: 16px;
`;

const NavTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
`;

const SpaceBanner = styled.div`
  flex-grow: 1;
  font-size: var(--panel-banner-text-size);
  font-weight: var(--panel-banner-text-weight);
  color: var(--panel-banner-text-color);
  margin: 18px 0px 18px 16px;
`;

const SpaceNameButton = styled.button`
  flex-grow: 1;
  font-size: var(--panel-banner-text-size);
  font-weight: var(--panel-banner-text-weight);
  color: var(--panel-banner-text-color);
  margin: 12px 0px 12px 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  cursor: pointer;
  padding: 6px 10px;
  border: 0;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  text-align: left;
  max-width: fit-content;
  line-height: calc(var(--panel-banner-text-size) + 2px);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  pointer-events: auto;

  &:hover {
    background-color: var(--panel-item-hover-background-color);
  }

  &:active {
    background-color: var(--panel-item-active-background-color);
  }
`;

const NavTopButton = styled.button`
  flex: 0 0 42px;
  color: var(--panel-banner-text-color);
  margin: 12px 16px;
  overflow: hidden;
  border-radius: 4px;
  padding: 6px 10px;
  border: 0;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  max-width: fit-content;
  pointer-events: auto;

  &:hover {
    background-color: var(--panel-item-hover-background-color);
  }

  &:active {
    background-color: var(--panel-item-active-background-color);
  }
`;

const NavTopButtonIcon = styled.div`
  width: 22px;
  height: 22px;
`;

const NavFoot = styled.div`
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin-top: 16px;
`;

const NavSpill = styled.div`
  overflow-x: hidden;
  overflow-y: auto;

  scrollbar-color: transparent transparent;
  scrollbar-width: thin;

  flex-grow: 100;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    visibility: hidden;
  }

  &::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border: 2px solid transparent;
    border-radius: 4px;
    background-color: transparent;
    transition: background-color 0.25s;
    min-height: 40px;
  }

  &::-webkit-scrollbar-corner {
    background-color: transparent;
  }

  &::-webkit-scrollbar-track {
    border-color: transparent;
    background-color: transparent;
    border: 2px solid transparent;
    visibility: hidden;
  }

  &:hover {
    scrollbar-color: var(--scroll-thumb-color) transparent;

    &::-webkit-scrollbar-thumb {
      background-color: var(--scroll-thumb-color);
      transition: background-color 0.25s;
    }
  }
`;

const TrashSpill = styled.div`
  overflow-x: hidden;
  overflow-y: auto;

  scrollbar-color: transparent transparent;
  scrollbar-width: thin;

  max-height: 256px;
  width: 400px;
  padding: 8px 16px;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    visibility: hidden;
  }

  &::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border: 2px solid transparent;
    border-radius: 4px;
    background-color: transparent;
    transition: background-color 0.25s;
    min-height: 40px;
  }

  &::-webkit-scrollbar-corner {
    background-color: transparent;
  }

  &::-webkit-scrollbar-track {
    border-color: transparent;
    background-color: transparent;
    border: 2px solid transparent;
    visibility: hidden;
  }

  &:hover {
    scrollbar-color: var(--scroll-thumb-color) transparent;

    &::-webkit-scrollbar-thumb {
      background-color: var(--scroll-thumb-color);
      transition: background-color 0.25s;
    }
  }
`;

const SpaceTreeSpill = styled.div`
  overflow-x: hidden;
  overflow-y: scroll;

  scrollbar-color: transparent transparent;
  scrollbar-width: thin;
  background-color: var(--tertiary-panel-background-color);
  width: fit-content;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    visibility: hidden;
  }

  &::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border: 2px solid transparent;
    border-radius: 4px;
    background-color: transparent;
    transition: background-color 0.25s;
    min-height: 40px;
  }

  &::-webkit-scrollbar-corner {
    background-color: transparent;
  }

  &::-webkit-scrollbar-track {
    border-color: transparent;
    background-color: transparent;
    border: 2px solid transparent;
    visibility: hidden;
  }

  &:hover {
    scrollbar-color: var(--secondary-scroll-thumb-color) transparent;

    &::-webkit-scrollbar-thumb {
      background-color: var(--secondary-scroll-thumb-color);
      transition: background-color 0.25s;
    }
  }
`;

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

function TrashMenu({ styles, attributes, setPopperElement, children }) {
  if (!popupRoot) return null;
  const popupMenu = (
    <PopupPanel
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PanelSectionHeader>
        <FormattedMessage id="nav.trash" />
      </PanelSectionHeader>
      <TrashSpill>{children}</TrashSpill>
    </PopupPanel>
  );

  return ReactDOM.createPortal(popupMenu, popupRoot);
}

function Invite({ styles, attributes, setPopperElement, children }) {
  if (!popupRoot) return null;
  const popupMenu = (
    <PopupPanel
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PanelSectionHeader>
        <FormattedMessage id="nav.invite" />
      </PanelSectionHeader>
      {children}
    </PopupPanel>
  );

  return ReactDOM.createPortal(popupMenu, popupRoot);
}

function JelSidePanels({
  treeManager,
  history,
  hub,
  hubCan = () => false,
  spaceCan = () => false,
  spaceMetadata,
  hubMetadata,
  memberships,
  showHubContextMenuPopup,
  setHubRenameReferenceElement,
  showSpaceRenamePopup,
  spaceRenamePopupElement,
  spaceId,
  sessionId,
  scene,
  showEmojiPopup,
  showSpaceNotificationPopup,
  showInviteTip,
  setHasShownInvite
}) {
  const store = window.APP.store;
  const metadata = spaceMetadata && spaceMetadata.getMetadata(spaceId);
  const { builderSystem, launcherSystem } = SYSTEMS;
  const [trashMenuReferenceElement, setTrashMenuReferenceElement] = useState(null);
  const [trashMenuElement, setTrashMenuElement] = useState(null);
  const [inviteReferenceElement, setInviteReferenceElement] = useState(null);
  const [inviteElement, setInviteElement] = useState(null);
  const [spaceName, setSpaceName] = useState((metadata && metadata.name) || "");
  const [isCreating, setIsCreating] = useState(false);
  const [triggerMode, setTriggerMode] = useState(launcherSystem.enabled ? "launcher" : "builder");
  const invitePanelFieldElement = useRef();
  const spaceBannerRef = useRef();
  const emojiEquipRef = useRef();
  const showSpaceNotificationsButtonRef = useRef();

  useEffect(
    () => {
      const handler = () => {
        setTriggerMode(builderSystem.enabled ? "builder" : "launcher");
      };

      builderSystem.addEventListener("activechanged", handler);
      launcherSystem.addEventListener("activechanged", handler);
      () => {
        builderSystem.removeEventListener("activechanged", handler);
        launcherSystem.removeEventListener("activechanged", handler);
      };
    },
    [builderSystem, launcherSystem]
  );

  const onTriggerModeChange = useCallback(
    (id, idx) => {
      if ((idx === 0 && !launcherSystem.enabled) || (idx === 1 && !builderSystem.enabled)) {
        launcherSystem.toggle();
        builderSystem.toggle();
      }

      document.activeElement.blur(); // Focuses canvas
    },
    [builderSystem, launcherSystem]
  );

  const { spaceChannel } = window.APP;

  const { styles: trashMenuStyles, attributes: trashMenuAttributes, update: updateTrashPopper } = usePopper(
    trashMenuReferenceElement,
    trashMenuElement,
    {
      placement: "right"
    }
  );

  const { styles: inviteStyles, attributes: inviteAttributes, update: updateInvitePopper } = usePopper(
    inviteReferenceElement,
    inviteElement,
    {
      placement: "right-end"
    }
  );

  useNameUpdateFromMetadata(spaceId, spaceMetadata, setSpaceName);
  const onSelectedEmojiClicked = useCallback(
    () => {
      showEmojiPopup(emojiEquipRef, "top-end", [0, 12], { equip: true });
    },
    [showEmojiPopup]
  );

  const space = spaceForSpaceId(spaceId, memberships);
  const hubId = hub && hub.hub_id;
  const messages = getMessages();
  const isWorld = hub && hub.type === "world";

  return (
    <Wrap id="jel-side-panels-wrap">
      <Left>
        <SpaceTreeSpill>
          <SpaceTree treeManager={treeManager} space={space} history={history} memberships={memberships} />
        </SpaceTreeSpill>
        <Nav>
          <NavHead>
            <NavTop>
              {spaceCan("update_space_meta") && (
                <SpaceNameButton
                  ref={spaceBannerRef}
                  onMouseDown={e => cancelEventIfFocusedWithin(e, spaceRenamePopupElement)}
                  onClick={() => showSpaceRenamePopup(spaceId, spaceBannerRef)}
                >
                  {spaceName}
                </SpaceNameButton>
              )}
              {!spaceCan("update_space_meta") && <SpaceBanner>{spaceName}</SpaceBanner>}
              <NavTopButton
                ref={showSpaceNotificationsButtonRef}
                onClick={() => showSpaceNotificationPopup(showSpaceNotificationsButtonRef)}
              >
                <NavTopButtonIcon dangerouslySetInnerHTML={{ __html: notificationsIcon }} />
              </NavTopButton>
            </NavTop>
            {spaceCan("create_invite") && (
              <PanelItemButtonSection>
                <Tooltip
                  visible={showInviteTip}
                  disabled={!showInviteTip}
                  content={messages["invite.tip"]}
                  placement="right"
                  className="hide-when-expanded"
                  key="invite"
                >
                  <PanelItemButton
                    iconSrc={inviteIcon}
                    ref={setInviteReferenceElement}
                    onMouseDown={e => cancelEventIfFocusedWithin(e, inviteElement)}
                    onClick={() => {
                      if (updateInvitePopper) {
                        updateInvitePopper();
                      }
                      setHasShownInvite(true);
                      store.handleActivityFlag("showInvite");
                      toggleFocus(invitePanelFieldElement.current);
                    }}
                  >
                    <FormattedMessage id="nav.invite" />
                  </PanelItemButton>
                </Tooltip>
              </PanelItemButtonSection>
            )}
          </NavHead>
          <NavSpill>
            <PanelSectionHeader>
              <FormattedMessage id="nav.channels" />
              {spaceCan("create_channel_hub") && (
                <TinyOutlineIconButton
                  disabled={isCreating}
                  style={{ marginLeft: "10px" }}
                  className="show-on-hover"
                  iconSrc={addIcon}
                  onClick={async () => {
                    store.handleActivityFlag("createChannel");
                    setIsCreating(true);
                    const hub = await addNewHubToTree(treeManager, spaceId, "channel");
                    setIsCreating(false);
                    navigateToHubUrl(history, hub.url);
                  }}
                />
              )}
            </PanelSectionHeader>
            <HubTree
              treeManager={treeManager}
              type="channel"
              hub={hub}
              history={history}
              spaceCan={spaceCan}
              hubCan={hubCan}
              showHubContextMenuPopup={showHubContextMenuPopup}
              setHubRenameReferenceElement={setHubRenameReferenceElement}
            />
            <PanelSectionHeader>
              <FormattedMessage id="nav.space-worlds" />
              {spaceCan("create_world_hub") && (
                <TinyOutlineIconButton
                  disabled={isCreating}
                  style={{ marginLeft: "10px" }}
                  className="show-on-hover"
                  iconSrc={addIcon}
                  onClick={async () => {
                    store.handleActivityFlag("createWorld");
                    setIsCreating(true);
                    const hub = await addNewHubToTree(treeManager, spaceId, "world");
                    setIsCreating(false);
                    navigateToHubUrl(history, hub.url);
                  }}
                />
              )}
            </PanelSectionHeader>
            <HubTree
              treeManager={treeManager}
              type="world"
              hub={hub}
              history={history}
              spaceCan={spaceCan}
              hubCan={hubCan}
              showHubContextMenuPopup={showHubContextMenuPopup}
              setHubRenameReferenceElement={setHubRenameReferenceElement}
            />
          </NavSpill>
          <NavFoot>
            <PanelItemButtonSection>
              <PanelItemButton
                iconSrc={trashIcon}
                ref={setTrashMenuReferenceElement}
                onMouseDown={e => cancelEventIfFocusedWithin(e, trashMenuElement)}
                onClick={() => {
                  if (!treeManager) return;

                  treeManager.rebuildSharedTrashTree();

                  if (updateTrashPopper) {
                    updateTrashPopper();
                  }

                  toggleFocus(trashMenuElement);
                }}
              >
                <FormattedMessage id="nav.trash" />
              </PanelItemButton>
            </PanelItemButtonSection>
            {spaceCan("create_world_hub") && (
              <ActionButton
                disabled={isCreating}
                iconSrc={addIcon}
                onClick={async () => {
                  store.handleActivityFlag("createWorld");
                  setIsCreating(true);
                  const hub = await addNewHubToTree(treeManager, spaceId, "world");
                  setIsCreating(false);
                  navigateToHubUrl(history, hub.url);
                }}
                style={{ width: "60%" }}
              >
                <FormattedMessage id="nav.create-world" />
              </ActionButton>
            )}
            <SelfPanel
              spaceId={spaceId}
              spaceChannel={spaceChannel}
              memberships={memberships}
              scene={scene}
              showDeviceControls={isWorld}
              sessionId={sessionId}
              onAvatarColorChangeComplete={({ rgb: { r, g, b } }) => {
                spaceChannel.sendAvatarColorUpdate(r / 255.0, g / 255.0, b / 255.0);
                window.APP.matrix.updateAvatarColor(r / 255.0, g / 255.0, b / 255.0);
              }}
              onSignOutClicked={async () => {
                await window.APP.spaceChannel.signOut(store.state.credentials.deviceId);
                await window.APP.matrix.logout();
                store.clearCredentials();
                document.location = "/";
              }}
            />
          </NavFoot>
        </Nav>
      </Left>
      <Right>
        <PresenceContent className={triggerMode === "launcher" ? "launch" : "build"}>
          <PresenceList
            hubMetadata={hubMetadata}
            hubCan={hubCan}
            scene={scene}
            isWorld={isWorld}
            sessionId={sessionId}
            onGoToUserClicked={sessionId => {
              SYSTEMS.characterController.teleportToUser(sessionId);
              SYSTEMS.soundEffectsSystem.playSoundOneShot(SOUND_TELEPORT_END);
            }}
            onGoToHubClicked={hubId => {
              const metadata = hubMetadata.getMetadata(hubId);

              if (metadata) {
                navigateToHubUrl(history, metadata.url);
              }
            }}
          />
        </PresenceContent>
        {isWorld &&
          triggerMode === "launcher" && (
            <BlasterContent>
              <PanelSectionHeader style={{ height: "16px" }}>
                <FormattedMessage id="blaster.header" />
              </PanelSectionHeader>
              <EmojiEquip ref={emojiEquipRef} onSelectedEmojiClicked={onSelectedEmojiClicked} />
            </BlasterContent>
          )}
        {isWorld &&
          triggerMode === "builder" && (
            <BuilderContent>
              <BuilderControls />
            </BuilderContent>
          )}
        {isWorld && (
          <TriggerModePanel>
            <SegmentControl
              rows={1}
              cols={2}
              items={[{ id: "trigger-mode.blast", text: "Blast" }, { id: "trigger-mode.build", text: "Build" }]}
              hideTips={true}
              selectedIndices={triggerMode === "launcher" ? [0] : [1]}
              onChange={onTriggerModeChange}
            />
          </TriggerModePanel>
        )}
      </Right>
      <Invite setPopperElement={setInviteElement} styles={inviteStyles} attributes={inviteAttributes}>
        <InvitePanel
          spaceId={spaceId}
          ref={invitePanelFieldElement}
          fetchInviteUrl={async () => await spaceChannel.createInvite()}
        />
      </Invite>
      <TrashMenu setPopperElement={setTrashMenuElement} styles={trashMenuStyles} attributes={trashMenuAttributes}>
        <HubTrashTree
          treeManager={treeManager}
          tree={treeManager && treeManager.trashNav}
          hub={hub}
          hubMetadata={hubMetadata}
          history={history}
          hubCan={hubCan}
          onRestore={useCallback(
            (hubId, hubIdsToRestore) => {
              const navigateToRestoredHub = () => {
                // Navigate to restored node.
                const metadata = hubMetadata.getMetadata(hubId);

                if (metadata) {
                  navigateToHubUrl(history, metadata.url);
                }

                hubMetadata.unsubscribeFromMetadata(navigateToRestoredHub);
              };

              hubMetadata.subscribeToMetadata(hubId, navigateToRestoredHub);
              spaceChannel.restoreHubs(hubIdsToRestore);

              // Blur so tree hides. This is important because we will re-load
              // the trash tree next time user clicks.
              document.activeElement.blur();
            },
            [history, hubMetadata, spaceChannel]
          )}
          onRemove={useCallback(
            hubIdToRemove => {
              // Focus trash menu so it stays open.
              trashMenuElement.focus();

              if (hubId === hubIdToRemove) {
                const homeHub = homeHubForSpaceId(spaceId, memberships);
                navigateToHubUrl(history, homeHub.url);
              }

              spaceChannel.removeHubs([hubIdToRemove]);
            },
            [history, hubId, spaceId, spaceChannel, memberships, trashMenuElement]
          )}
        />
      </TrashMenu>
    </Wrap>
  );
}

JelSidePanels.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  roomForHubCan: PropTypes.func,
  scene: PropTypes.object,
  spaceMetadata: PropTypes.object,
  hubMetadata: PropTypes.object,
  showInviteTip: PropTypes.bool,
  setHasShownInvite: PropTypes.func,
  sessionId: PropTypes.string,
  spaceId: PropTypes.string,
  memberships: PropTypes.array,
  hubSettings: PropTypes.array,
  showHubContextMenuPopup: PropTypes.func,
  setHubRenameReferenceElement: PropTypes.func,
  showSpaceRenamePopup: PropTypes.func,
  spaceRenamePopupElement: PropTypes.object,
  showEmojiPopup: PropTypes.func,
  showSpaceNotificationPopup: PropTypes.func,
  showConfirmModalPopup: PropTypes.func
};

export default JelSidePanels;
