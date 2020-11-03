import React, { useState, useCallback, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { usePopper } from "react-popper";
import PropTypes from "prop-types";
import styled from "styled-components";
import Tree from "rc-tree";
import PanelSectionHeader from "./panel-section-header";
import ActionButton from "./action-button";
import SelfPanel from "./self-panel";
import addIcon from "../assets/images/icons/add.svgi";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { homeHubForSpaceId, spaceForSpaceId } from "../utils/membership-utils";
import { addNewHubToTree } from "../utils/tree-utils";
import { cancelEventIfFocusedWithin, toggleFocus } from "../utils/dom-utils";
import SpaceTree from "./space-tree";
import HubTree from "./hub-tree";
import InvitePanel from "./invite-panel";
import HubTrashTree from "./hub-trash-tree";
import PresenceList from "./presence-list";
import PanelItemButton, { PanelItemButtonSection } from "./panel-item-button";
import inviteIcon from "../assets/images/icons/invite.svgi";
import trashIcon from "../assets/images/icons/trash.svgi";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import ReactDOM from "react-dom";
import sharedStyles from "../assets/stylesheets/shared.scss";
import PopupPanel from "./popup-panel";
import HubNodeTitle from "./hub-node-title";

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

const Presence = styled.div`
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
  height: 100%;
  padding: 16px 0;
`;

const NavHead = styled.div`
  flex: 0 0 auto;
  margin-bottom: 16px;
`;

const SpaceBanner = styled.div`
  font-size: var(--panel-banner-text-size);
  font-weight: var(--panel-banner-text-weight);
  color: var(--panel-banner-text-color);
  margin: 18px 0px 18px 16px;
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
  memberships,
  showHubContextMenuPopup,
  setHubRenameReferenceElement,
  spaceId,
  spacePresences,
  sessionId,
  scene
}) {
  const [trashMenuReferenceElement, setTrashMenuReferenceElement] = useState(null);
  const [trashMenuElement, setTrashMenuElement] = useState(null);
  const [inviteReferenceElement, setInviteReferenceElement] = useState(null);
  const [inviteElement, setInviteElement] = useState(null);

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

  const homeHub = homeHubForSpaceId(spaceId, memberships);
  const hubMetadata = treeManager && treeManager.sharedNav && treeManager.sharedNav.atomMetadata;
  const privateTreeData = useMemo(
    () =>
      homeHub
        ? [
            {
              key: homeHub.hub_id,
              title: <HubNodeTitle hubId={homeHub.hub_id} showDots={false} showAdd={false} hubMetadata={hubMetadata} />,
              atomId: homeHub.hub_id,
              isLeaf: true
            }
          ]
        : [],
    [homeHub, hubMetadata]
  );

  // For now private tree is just home hub
  const privateSelectedKeys = useMemo(() => (hub && homeHub && hub.hub_id === homeHub.hub_id ? [hub.hub_id] : []), [
    hub,
    homeHub
  ]);

  const space = spaceForSpaceId(spaceId, memberships);
  const spaceChannel = window.APP.spaceChannel;
  const onHubNameChanged = useCallback((hubId, name) => spaceChannel.updateHub(hubId, { name }), [spaceChannel]);
  const hubId = hub && hub.hub_id;

  return (
    <Wrap>
      <Left>
        <SpaceTreeSpill>
          <SpaceTree treeManager={treeManager} space={space} history={history} memberships={memberships} />
        </SpaceTreeSpill>
        <Nav>
          <NavHead>
            <SpaceBanner>{space && space.name}</SpaceBanner>
            {spaceCan("create_invite") && (
              <PanelItemButtonSection>
                <PanelItemButton
                  iconSrc={inviteIcon}
                  ref={setInviteReferenceElement}
                  onMouseDown={e => cancelEventIfFocusedWithin(e, inviteElement)}
                  onClick={() => {
                    if (updateInvitePopper) {
                      updateInvitePopper();
                    }
                    toggleFocus(inviteElement);
                  }}
                >
                  <FormattedMessage id="nav.invite" />
                </PanelItemButton>
              </PanelItemButtonSection>
            )}
          </NavHead>
          <NavSpill>
            <PanelSectionHeader>
              <FormattedMessage id="nav.space-worlds" />
            </PanelSectionHeader>
            <HubTree
              treeManager={treeManager}
              hub={hub}
              history={history}
              spaceCan={spaceCan}
              hubCan={hubCan}
              showHubContextMenuPopup={showHubContextMenuPopup}
              setHubRenameReferenceElement={setHubRenameReferenceElement}
              onHubNameChanged={onHubNameChanged}
            />
            <PanelSectionHeader>
              <FormattedMessage id="nav.private-worlds" />
            </PanelSectionHeader>
            <Tree
              prefixCls="hub-tree"
              treeData={privateTreeData}
              selectable={true}
              selectedKeys={privateSelectedKeys}
              onSelect={useCallback(
                (selectedKeys, { node: { atomId } }) => navigateToHubUrl(history, hubMetadata.getMetadata(atomId).url),
                [history, hubMetadata]
              )}
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
            {spaceCan("create_hub") && (
              <ActionButton
                iconSrc={addIcon}
                onClick={() => addNewHubToTree(history, treeManager, spaceId)}
                style={{ width: "60%" }}
              >
                <FormattedMessage id="nav.create-world" />
              </ActionButton>
            )}
            <SelfPanel
              spaceId={spaceId}
              spacePresences={spacePresences}
              spaceChannel={spaceChannel}
              memberships={memberships}
              scene={scene}
              sessionId={sessionId}
              onAvatarColorChangeComplete={({ rgb: { r, g, b } }) => {
                spaceChannel.sendAvatarColorUpdate(r / 255.0, g / 255.0, b / 255.0);
              }}
              onSignOutClicked={() => {
                window.APP.store.clearCredentials();
                document.location = "/";
              }}
            />
          </NavFoot>
        </Nav>
      </Left>
      <Presence>
        <PresenceContent>
          <PresenceList
            spacePresences={spacePresences || {}}
            hubMetadata={hubMetadata}
            hubCan={hubCan}
            sessionId={sessionId}
            onGoToClicked={hubId => {
              const metadata = hubMetadata.getMetadata(hubId);

              if (metadata) {
                navigateToHubUrl(history, metadata.url);
              }
            }}
          />
        </PresenceContent>
      </Presence>
      <Invite setPopperElement={setInviteElement} styles={inviteStyles} attributes={inviteAttributes}>
        <InvitePanel fetchInviteUrl={async () => await spaceChannel.createInvite()} />
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
  scene: PropTypes.object,
  spacePresences: PropTypes.object,
  sessionId: PropTypes.string,
  spaceId: PropTypes.string,
  memberships: PropTypes.array,
  showHubContextMenuPopup: PropTypes.func,
  setHubRenameReferenceElement: PropTypes.func
};

export default JelSidePanels;
