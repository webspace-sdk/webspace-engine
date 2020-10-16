import React, { useState } from "react";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { FormattedMessage } from "react-intl";
import { usePopper } from "react-popper";
import PropTypes from "prop-types";
import styled from "styled-components";
import Tree from "rc-tree";
import PanelSectionHeader from "./panel-section-header";
import ActionButton from "./action-button";
import addIcon from "../assets/images/icons/add.svgi";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { homeHubForSpaceId, spaceForSpaceId } from "../utils/membership-utils";
import { addNewHubToTree } from "../utils/tree-utils";
import SpaceTree from "./space-tree";
import HubTree from "./hub-tree";
import HubTrashTree from "./hub-trash-tree";
import PanelItemButton, { PanelItemButtonSection } from "./panel-item-button";
import trashIcon from "../assets/images/icons/trash.svgi";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import ReactDOM from "react-dom";
import sharedStyles from "../assets/stylesheets/shared.scss";
import PopupPanel from "./popup-panel";
import HubNodeTitle from "./hub-node-title";

const JelWrap = styled.div`
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

const Nav = styled.div`
  pointer-events: auto;
  width: var(--nav-width);
  display: flex;
  flex-direction: column;
  box-shadow: 0px 0px 4px;
`;

const Presence = styled.div`
  pointer-events: auto;
  width: var(--presence-width);
  box-shadow: 0px 0px 4px;
  display: flex;
  flex-direction: row;
`;

const PresenceContent = styled.div`
  flex: 1 1 auto;
`;

const NavHead = styled.div`
  flex: 0 0 auto;
  margin-bottom: 32px;
`;

const SpaceBanner = styled.div`
  font-size: var(--panel-banner-text-size);
  font-weight: var(--panel-banner-text-weight);
  color: var(--panel-banner-text-color);
  margin: 18px 0px 0px 16px;
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
  max-width: 512px;
  min-width: 256px;
  min-height: 96px;
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
  background-color: var(--secondary-panel-background-color);
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

function JelSidePanels({
  treeManager,
  history,
  hub,
  hubCan = () => false,
  spaceCan = () => false,
  memberships,
  spaceId
}) {
  const [trashMenuReferenceElement, setTrashMenuReferenceElement] = useState(null);
  const [trashMenuElement, setTrashMenuElement] = useState(null);

  const trashButtonRef = React.createRef();

  const { styles: trashMenuStyles, attributes: trashMenuAttributes, update: updateTrashPopper } = usePopper(
    trashMenuReferenceElement,
    trashMenuElement,
    {
      placement: "right-start"
    }
  );

  const homeHub = homeHubForSpaceId(spaceId, memberships);
  const hubMetadata = treeManager && treeManager.sharedNav && treeManager.sharedNav.atomMetadata;

  // For now private tree is just home hub
  const privateSelectedKeys = hub && homeHub && hub.hub_id === homeHub.hub_id ? [hub.hub_id] : [];

  const privateTreeData = homeHub
    ? [
        {
          key: homeHub.hub_id,
          title: <HubNodeTitle hubId={homeHub.hub_id} showDots={false} showAdd={false} hubMetadata={hubMetadata} />,
          atomId: homeHub.hub_id,
          isLeaf: true
        }
      ]
    : [];

  const space = spaceForSpaceId(spaceId, memberships);
  const spaceChannel = window.APP.spaceChannel;

  return (
    <WrappedIntlProvider>
      <JelWrap>
        <Nav>
          <NavHead>
            <SpaceBanner>{space && space.name}</SpaceBanner>
          </NavHead>
          <NavSpill>
            <PanelSectionHeader>
              <FormattedMessage id="nav.private-worlds" />
            </PanelSectionHeader>
            <Tree
              prefixCls="hub-tree"
              treeData={privateTreeData}
              selectable={true}
              selectedKeys={privateSelectedKeys}
              onSelect={(selectedKeys, { node: { atomId } }) =>
                navigateToHubUrl(history, hubMetadata.getMetadata(atomId).url)
              }
            />
            <PanelSectionHeader>
              <FormattedMessage id="nav.shared-worlds" />
            </PanelSectionHeader>

            <HubTree
              treeManager={treeManager}
              hub={hub}
              history={history}
              spaceCan={spaceCan}
              hubCan={hubCan}
              memberships={memberships}
              onHubNameChanged={(hubId, name) => spaceChannel.updateHub(hubId, { name })}
            />
          </NavSpill>
          <NavFoot>
            <PanelItemButtonSection>
              <PanelItemButton
                iconSrc={trashIcon}
                ref={trashButtonRef}
                onClick={() => {
                  setTrashMenuReferenceElement(trashButtonRef.current);
                  treeManager.rebuildSharedTrashTree();

                  if (updateTrashPopper) {
                    updateTrashPopper();
                  }

                  trashMenuElement.focus();
                }}
              >
                <FormattedMessage id="nav.trash" />
              </PanelItemButton>
            </PanelItemButtonSection>
            {spaceCan("create_hub") && (
              <ActionButton
                iconSrc={addIcon}
                onClick={() => addNewHubToTree(history, treeManager, spaceId)}
                style={{ width: "80%" }}
              >
                <FormattedMessage id="nav.create-world" />
              </ActionButton>
            )}
          </NavFoot>
        </Nav>
        <Presence>
          <PresenceContent>Presence</PresenceContent>
          <SpaceTreeSpill>
            <SpaceTree treeManager={treeManager} space={space} history={history} memberships={memberships} />
          </SpaceTreeSpill>
        </Presence>
      </JelWrap>
      <TrashMenu setPopperElement={setTrashMenuElement} styles={trashMenuStyles} attributes={trashMenuAttributes}>
        <HubTrashTree
          treeManager={treeManager}
          tree={treeManager && treeManager.trashNav}
          hub={hub}
          hubMetadata={hubMetadata}
          history={history}
          hubCan={hubCan}
          onRestore={(hubId, hubIdsToRestore) => {
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
          }}
          onRemove={hubIdToRemove => {
            // Focus trash menu so it stays open.
            trashMenuElement.focus();

            if (hub.hub_id === hubIdToRemove) {
              const homeHub = homeHubForSpaceId(hub.space_id, memberships);
              navigateToHubUrl(history, homeHub.url);
            }

            spaceChannel.removeHubs([hubIdToRemove]);
          }}
        />
      </TrashMenu>
    </WrappedIntlProvider>
  );
}

JelSidePanels.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  orgPresences: PropTypes.object,
  hubPresences: PropTypes.object,
  sessionId: PropTypes.string,
  spaceId: PropTypes.string,
  memberships: PropTypes.array
};

export default JelSidePanels;
