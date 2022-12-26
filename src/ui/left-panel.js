import React, { useEffect, useState, useRef } from "react";
import { FormattedMessage } from "react-intl";
import { usePopupPopper, useAtomBoundPopupPopper } from "../utils/popup-utils";
import { usePopper } from "react-popper";
import PropTypes from "prop-types";
import styled from "styled-components";
import PanelSectionHeader from "./panel-section-header";
import ActionButton from "./action-button";
import addIcon from "../assets/images/icons/add.svgi";
import HubContextMenu from "./hub-context-menu";
import RenamePopup from "./rename-popup";
import CreateFileObjectPopup from "./create-file-object-popup";
import { createNewWebspaceDocument, cancelEventIfFocusedWithin, toggleFocus } from "../utils/dom-utils";
import HubTree from "./hub-tree";
import InvitePanel from "./invite-panel";
import Tooltip from "./tooltip";
import PanelItemButton, { PanelItemButtonSection } from "./panel-item-button";
import IconButton from "./icon-button";
import inviteIcon from "../assets/images/icons/invite.svgi";
import cancelIcon from "../assets/images/icons/cancel.svgi";
import { getMessages } from "../utils/i18n";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import ReactDOM from "react-dom";
import PopupPanel from "./popup-panel";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";
import { navigateToHubUrl } from "../utils/url-utils";

const Left = styled.div`
  pointer-events: auto;
  width: var(--nav-width);
  display: flex;
  flex-direction: row;
  box-shadow: 0px 0px 4px;
`;

const Nav = styled.div`
  pointer-events: auto;
  width: calc(var(--nav-width));
  display: flex;
  flex-direction: column;
`;

const NavHead = styled.div`
  flex: 0 0 auto;
  margin-bottom: 16px;
`;

const NavTop = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
`;

const SpaceBanner = styled.div`
  flex-grow: 1;
  font-size: var(--panel-banner-text-size);
  font-weight: var(--panel-banner-text-weight);
  color: var(--panel-banner-text-color);
  margin: 18px 0px 18px 8px;
`;

const SpaceNameButton = styled.button`
  flex-grow: 1;
  font-size: var(--panel-banner-text-size);
  font-weight: var(--panel-banner-text-weight);
  color: var(--panel-banner-text-color);
  margin: 12px 0px 12px 8px;
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

// const NavTopButton = styled.button`
//   flex: 0 0 42px;
//   color: var(--panel-banner-text-color);
//   margin: 12px 16px;
//   overflow: hidden;
//   border-radius: 4px;
//   padding: 6px 10px;
//   border: 0;
//   appearance: none;
//   -moz-appearance: none;
//   -webkit-appearance: none;
//   outline-style: none;
//   background-color: transparent;
//   max-width: fit-content;
//   pointer-events: auto;
//
//   &:hover {
//     background-color: var(--panel-item-hover-background-color);
//   }
//
//   &:active {
//     background-color: var(--panel-item-active-background-color);
//   }
// `;

// const NavTopButtonIcon = styled.div`
//   width: 22px;
//   height: 22px;
// `;

const NavFoot = styled.div`
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin-top: 16px;
  margin-bottom: 86px;
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

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("popup-root")));

function Invite({ styles, attributes, setPopperElement, children }) {
  if (!popupRoot) return null;
  const popupMenu = (
    <PopupPanel
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
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

function LeftPanel({
  treeManager,
  hub,
  hubCan = () => false,
  spaceCan = () => false,
  spaceMetadata,
  hubMetadata,
  spaceId,
  scene,
  showInviteTip,
  setHasShownInvite,
  worldTree
}) {
  const { store } = window.APP;
  const [inviteReferenceElement, setInviteReferenceElement] = useState(null);
  const [inviteElement, setInviteElement] = useState(null);
  const [spaceName, setSpaceName] = useState("");
  const [isCreating /*, setIsCreating*/] = useState(false);
  const invitePanelFieldElement = useRef();
  const spaceBannerRef = useRef();
  const createHubButtonRef = useRef();
  const createHubFocusRef = useRef();

  useEffect(
    () => {
      if (!spaceMetadata) return () => {};

      const updateSpaceName = () => {
        const metadata = spaceMetadata && spaceMetadata.getMetadata(spaceId);

        if (metadata) {
          setSpaceName(metadata && metadata.name);
        }
      };

      updateSpaceName();

      spaceMetadata.subscribeToMetadata(spaceId, updateSpaceName);
      return () => spaceMetadata.unsubscribeFromMetadata(updateSpaceName);
    },
    [spaceMetadata, spaceId]
  );

  const { styles: inviteStyles, attributes: inviteAttributes, update: updateInvitePopper } = usePopper(
    inviteReferenceElement,
    inviteElement,
    {
      placement: "right-end"
    }
  );

  const {
    styles: createHubStyles,
    attributes: createHubAttributes,
    show: showCreateHubPopup,
    setPopup: setCreateHubPopupElement,
    popupElement: createHubPopupElement
  } = usePopupPopper(createHubFocusRef, "top-end", [0, 8]);

  const spaceRenameFocusRef = useRef();

  const {
    styles: hubContextMenuStyles,
    attributes: hubContextMenuAttributes,
    atomId: hubContextMenuHubId,
    show: showHubContextMenuPopup,
    setPopup: setHubContextMenuElement,
    popupOpenOptions: hubContextMenuOpenOptions
  } = useAtomBoundPopupPopper();

  const atomRenameFocusRef = useRef();
  const {
    styles: atomRenamePopupStyles,
    attributes: atomRenamePopupAttributes,
    setPopup: setAtomRenamePopupElement,
    show: showAtomRenamePopup,
    atomId: atomRenameAtomId,
    atomMetadata: atomRenameMetadata,
    setRef: setAtomRenameReferenceElement
  } = useAtomBoundPopupPopper(atomRenameFocusRef, "bottom-start", [0, 8]);

  const {
    styles: spaceRenamePopupStyles,
    attributes: spaceRenamePopupAttributes,
    setPopup: setSpaceRenamePopupElement,
    atomId: spaceRenameSpaceId,
    atomMetadata: spaceRenameMetadata,
    show: showSpaceRenamePopup,
    popupElement: spaceRenamePopupElement
  } = useAtomBoundPopupPopper(spaceRenameFocusRef, "bottom-start", [0, 16]);

  useNameUpdateFromMetadata(spaceId, spaceMetadata, setSpaceName);

  const hubId = hub && hub.hub_id;
  const messages = getMessages();

  return (
    <Left>
      <Nav>
        <NavHead>
          <NavTop>
            <IconButton
              disableHover={true}
              style={{ margin: "12px 0 12px 12px", opacity: 0.33 }}
              iconSrc={cancelIcon}
              onClick={() => SYSTEMS.uiAnimationSystem.toggleSidePanels()}
            />
            {spaceCan("update_space_meta") && (
              <SpaceNameButton
                ref={spaceBannerRef}
                onMouseDown={e => cancelEventIfFocusedWithin(e, spaceRenamePopupElement)}
                onClick={() => showSpaceRenamePopup(spaceId, spaceMetadata, spaceBannerRef)}
              >
                {spaceName}
              </SpaceNameButton>
            )}
            {!spaceCan("update_space_meta") && <SpaceBanner>{spaceName}</SpaceBanner>}
          </NavTop>
          {spaceCan("create_invite") &&
            document.location.protocol !== "file:" && (
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
            <FormattedMessage id="nav.space-worlds" />
          </PanelSectionHeader>
          <HubTree
            treeManager={treeManager}
            hub={hub}
            spaceCan={spaceCan}
            hubCan={hubCan}
            showHubContextMenuPopup={showHubContextMenuPopup}
            setAtomRenameReferenceElement={setAtomRenameReferenceElement}
          />
        </NavSpill>
        <NavFoot>
          {spaceCan("create_world_hub") && (
            <ActionButton
              disabled={isCreating}
              iconSrc={addIcon}
              ref={createHubButtonRef}
              onClick={() => showCreateHubPopup(createHubButtonRef)}
              style={{ width: "60%" }}
            >
              <FormattedMessage id="nav.new" />
            </ActionButton>
          )}
        </NavFoot>
      </Nav>
      <Invite setPopperElement={setInviteElement} styles={inviteStyles} attributes={inviteAttributes}>
        <InvitePanel
          spaceId={spaceId}
          inviteLinkType={"invite"}
          ref={invitePanelFieldElement}
          fetchInviteUrl={async () => {
            const metadata = hubMetadata.getMetadata(hubId);
            return metadata && metadata.url;
          }}
        />
      </Invite>
      <HubContextMenu
        setPopperElement={setHubContextMenuElement}
        hideRename={!!hubContextMenuOpenOptions.hideRename}
        showRemoveFromNav={!!hubContextMenuOpenOptions.showRemoveFromNav}
        hideSetSpawnPoint={!!hubContextMenuOpenOptions.hideSetSpawnPoint}
        showReset={!!hubContextMenuOpenOptions.showReset}
        isCurrentWorld={!!hubContextMenuOpenOptions.isCurrentWorld}
        showAtomRenamePopup={showAtomRenamePopup}
        worldTree={worldTree}
        styles={hubContextMenuStyles}
        attributes={hubContextMenuAttributes}
        hubId={hubContextMenuHubId}
        spaceCan={spaceCan}
        hubCan={hubCan}
        scene={scene}
      />
      <RenamePopup
        setPopperElement={setAtomRenamePopupElement}
        styles={atomRenamePopupStyles}
        attributes={atomRenamePopupAttributes}
        atomId={atomRenameAtomId}
        atomMetadata={atomRenameMetadata}
        ref={atomRenameFocusRef}
      />
      <RenamePopup
        setPopperElement={setSpaceRenamePopupElement}
        styles={spaceRenamePopupStyles}
        attributes={spaceRenamePopupAttributes}
        atomId={spaceRenameSpaceId}
        atomMetadata={spaceRenameMetadata}
        ref={spaceRenameFocusRef}
      />
      <CreateFileObjectPopup
        ref={createHubFocusRef}
        objectType="hub"
        popperElement={createHubPopupElement}
        setPopperElement={setCreateHubPopupElement}
        styles={createHubStyles}
        fileExtension="html"
        filePath=""
        attributes={createHubAttributes}
        onCreate={async (name, filename, filePath, subobjectType) => {
          const projectionType = subobjectType === "page" ? "flat" : "spatial";
          const doc = createNewWebspaceDocument(name, projectionType);
          await window.APP.atomAccessManager.writeDocument(doc, filename);
          const url = new URL(window.location.href);
          const pathParts = url.pathname.split("/");
          pathParts[pathParts.length - 1] = filename;
          url.pathname = pathParts.join("/");

          if (document.location.protocol !== "file:") {
            // Wait until 404 stops before navigating.
            let res;
            do {
              res = await fetch(url.toString());
              await new Promise(resolve => setTimeout(resolve, 1000));
            } while (res.status === 404);
          }

          navigateToHubUrl(url.toString());
        }}
      />
    </Left>
  );
}

LeftPanel.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  scene: PropTypes.object,
  spaceMetadata: PropTypes.object,
  hubMetadata: PropTypes.object,
  subscriptions: PropTypes.object,
  showInviteTip: PropTypes.bool,
  setHasShownInvite: PropTypes.func,
  sessionId: PropTypes.string,
  spaceId: PropTypes.string,
  memberships: PropTypes.array,
  showHubContextMenuPopup: PropTypes.func,
  setAtomRenameReferenceElement: PropTypes.func,
  worldTreeData: PropTypes.array,
  worldTree: PropTypes.object
};

export default LeftPanel;
