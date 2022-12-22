import React, { useRef, useState, useCallback, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import styled, { StyleSheetManager } from "styled-components";
import mutedIcon from "../assets/images/icons/mic-muted.svgi";
import unmutedIcon from "../assets/images/icons/mic-unmuted.svgi";
import rotateIcon from "../assets/images/icons/rotate.svgi";
import EqippedBrushIcon from "./equipped-brush-icon";
import EqippedColorIcon from "./equipped-color-icon";
import EquippedEmojiIcon from "./equipped-emoji-icon";
import { useTreeData } from "../utils/tree-utils";
import RootPopups from "./root-popups";
import SidePanels from "./side-panels";
import ChatLog from "./chat-log";
import { WrappedIntlProvider } from "./wrapped-intl-provider";
import { useSceneMuteState } from "../utils/shared-effects";
import KeyTips from "./key-tips";
import { isInEditableField } from "../utils/dom-utils";
import LoadingPanel from "./loading-panel";
import { CREATE_SELECT_WIDTH, CREATE_SELECT_LIST_HEIGHT } from "./create-select";
import qsTruthy from "../utils/qs_truthy";
import CanvasTop from "./canvas-top";
import AssetPanel from "./asset-panel";
import SelfPanel from "./self-panel";
import { ASSET_PANEL_HEIGHT_EXPANDED, ASSET_PANEL_HEIGHT_COLLAPSED } from "../systems/ui-animation-system";

const isMobile = AFRAME.utils.device.isMobile();

const skipSidePanels = qsTruthy("skip_panels");

const Root = styled.div`
  & #webspace-ui-wrap {
    height: calc(100% - ${ASSET_PANEL_HEIGHT_COLLAPSED}px);
  }

  & #asset-panel {
    display: flex;
    height: ${ASSET_PANEL_HEIGHT_COLLAPSED}px;
  }

  &.expand-asset-panel #webspace-ui-wrap {
    height: calc(100% - ${ASSET_PANEL_HEIGHT_EXPANDED}px);
  }

  .panels-collapsed & #webspace-ui-wrap,
  .paused & #webspace-ui-wrap {
    height: 100%;
  }

  &.expand-asset-panel #asset-panel {
    height: ${ASSET_PANEL_HEIGHT_EXPANDED}px;
  }

  .panels-collapsed & #asset-panel {
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

  #webspace-ui:focus-within & {
    pointer-events: auto;
  }

  .as-page & {
    pointer-events: auto;
  }

  .paused & {
    pointer-events: auto;
    background-color: rgba(0, 0, 0, 0.6);
  }
`;

const AssetPanelWrap = styled.div`
  color: var(--panel-text-color);
  background-color: var(--secondary-panel-background-color);
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  pointer-events: auto;
  left: var(--nav-width);
  width: calc(100% - var(--nav-width) - var(--presence-width));
  bottom: 0;
  position: fixed;
  z-index: 4;
  flex-direction: column;
  padding-top: 8px;

  #webspace-ui:focus-within & {
    pointer-events: auto;
  }

  .paused & {
    display: none;
  }
`;

const LeftExpandTrigger = styled.div`
  position: absolute;
  width: 16px;
  height: 100vh;
  border-radius: 0 6px 6px 0;
  left: -16px;
  top: 0;
  background-color: var(--panel-background-color);
  font-size: var(--panel-text-size);
  color: var(--panel-banner-text-color);
  font-weight: var(--panel-text-weight);
  z-index: 4;
  cursor: pointer;
  display: none;

  .panels-collapsed & {
    display: flex;
  }
`;

const RightExpandTrigger = styled.div`
  position: absolute;
  width: 16px;
  height: 100vh;
  border-radius: 6px 0 0 6px;
  right: -16px;
  top: 0;
  background-color: var(--panel-background-color);
  font-size: var(--panel-text-size);
  color: var(--panel-banner-text-color);
  font-weight: var(--panel-text-weight);
  z-index: 4;
  cursor: pointer;
  display: none;

  .panels-collapsed & {
    display: flex;
  }
`;

const BottomExpandTrigger = styled.div`
  position: absolute;
  width: 100vw;
  height: 16px;
  border-radius: 6px 6px 0 0;
  left: 0;
  bottom: -16px;
  background-color: var(--panel-background-color);
  font-size: var(--panel-text-size);
  color: var(--panel-banner-text-color);
  font-weight: var(--panel-text-weight);
  z-index: 4;
  cursor: pointer;
  display: none;
`;

const FadeEdges = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  background: linear-gradient(180deg, rgba(64, 64, 64, 0.4) 0%, rgba(32, 32, 32, 0) 128px, rgba(32, 32, 32, 0) 100%);

  pointer-events: none;
  z-index: 0;

  .low-detail {
    background: none;
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

const PausedInfoLabel = styled.div`
  position: absolute;
  bottom: 64px;
  white-space: pre;
  left: 0px;
  display: none;
  color: var(--canvas-overlay-text-color);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  line-height: calc(var(--canvas-overlay-text-size) + 4px);
  font-weight: var(--canvas-overlay-item-text-weight);
  font-size: var(--canvas-overlay-text-size);
  margin: 11px 0 0 8px;
  padding: 6px 10px;

  .paused & {
    display: block;
  }
`;

const ExternalCameraCanvas = styled.canvas`
  width: 300px;
  height: 168px;
  margin-left: 14px;
  pointer-events: auto;

  display: none;

  .paused .external-camera-on & {
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

  .paused & {
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

  .paused & {
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
  position: absolute;
  bottom: 17px;
  right: 200px;

  flex-direction: row;
  margin: 11px 0 0 12px;
  display: none;

  .panels-collapsed & {
    display: flex;
  }

  .paused & {
    display: none;
  }
`;

function UIRoot(props) {
  const { scene, treeManager, hub, unavailableReason, voxTree, sceneTree, sessionId, hide, isDoneLoading } = props;

  const { launcherSystem, cameraSystem, builderSystem, externalCameraSystem } = SYSTEMS;

  const worldTree = treeManager && treeManager.worldNav;
  const { spaceMetadata, store } = window.APP;
  const hubMetadata = worldTree && worldTree.atomMetadata;

  const [unmuted, setUnmuted] = useState(false);
  const [triggerMode, setTriggerMode] = useState(launcherSystem.enabled ? "launcher" : "builder");
  const [worldTreeData, setWorldTreeData] = useState([]);
  const [worldTreeDataVersion, setWorldTreeDataVersion] = useState(0);
  const [showingExternalCamera /*, setShowingExternalCamera*/] = useState(false);

  const [, /*hasShownInvite*/ setHasShownInvite] = useState(!!store.state.activity.showInvite);
  const [isInspecting, setIsInspecting] = useState(cameraSystem.isInspecting());
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);

  const showInviteTip = false;

  const createSelectPopupRef = useRef();
  const centerPopupRef = useRef();
  const modalPopupRef = useRef();
  const environmentSettingsButtonRef = useRef();

  useEffect(
    () => {
      const handler = () => setIsInspecting(SYSTEMS.cameraSystem.isInspecting());
      cameraSystem.addEventListener("mode_changed", handler);
      return () => cameraSystem.removeEventListener("mode_changed", handler);
    },
    [cameraSystem]
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
      const handler = () => setIsNavigatingAway(true);
      scene.addEventListener("navigating-away", handler);
    },
    [scene]
  );

  useSceneMuteState(scene, setUnmuted);

  // Consume tree updates so redraws if user manipulates tree
  useTreeData(worldTree, worldTreeDataVersion, setWorldTreeData, setWorldTreeDataVersion);

  const onClickExternalCameraRotate = useCallback(() => externalCameraSystem.toggleCamera(), [externalCameraSystem]);

  const onExpandTriggerClick = useCallback(() => {
    if (!isInEditableField()) {
      SYSTEMS.uiAnimationSystem.expandSidePanels();
    }
  }, []);

  if (hide) {
    return <div />;
  }

  return (
    <StyleSheetManager target={DOM_ROOT}>
      <WrappedIntlProvider>
        <Root /*className={"expand-asset-panel"}*/>
          <LoadingPanel
            isLoading={!isDoneLoading || !!unavailableReason || isNavigatingAway}
            unavailableReason={unavailableReason}
          />
          <Wrap id="webspace-ui-wrap">
            <FadeEdges />
            <CreateSelectPopupRef ref={createSelectPopupRef} />
            <ModalPopupRef ref={modalPopupRef} />
            <CenterPopupRef ref={centerPopupRef} />
            <CanvasTop
              {...props}
              worldTree={worldTree}
              worldTreeData={worldTreeData}
              environmentSettingsButtonRef={environmentSettingsButtonRef}
              createSelectPopupRef={createSelectPopupRef}
            />
            <KeyTipsWrap
              style={isMobile ? { display: "none" } : {}}
              onClick={() => store.update({ settings: { hideKeyTips: !store.state.settings.hideKeyTips } })}
            >
              <KeyTips id="key-tips" />
            </KeyTipsWrap>
            <DeviceStatuses id="device-statuses" style={isMobile ? { display: "none" } : {}}>
              {triggerMode === "builder" && <EqippedBrushIcon />}
              {triggerMode === "builder" ? <EqippedColorIcon /> : <EquippedEmojiIcon />}
            </DeviceStatuses>
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
              <ChatLog leftOffset={showingExternalCamera ? 300 : 0} hub={hub} scene={scene} store={store} />
            </BottomLeftPanels>
          </Wrap>
          {!isInspecting &&
            false && (
              <AssetPanelWrap id="asset-panel">
                <AssetPanel voxTree={voxTree} sceneTree={sceneTree} expanded={true} scene={scene} />
              </AssetPanelWrap>
            )}
          {!skipSidePanels && (
            <SidePanels
              {...props}
              spaceMetadata={spaceMetadata}
              hubMetadata={hubMetadata}
              worldTree={worldTree}
              worldTreeData={worldTreeData}
              centerPopupRef={centerPopupRef}
              showInviteTip={showInviteTip}
              setHasShownInvite={setHasShownInvite}
            />
          )}
        </Root>
        <RootPopups centerPopupRef={centerPopupRef} scene={scene} />
        {!isMobile && (
          <>
            <LeftExpandTrigger id="left-expand-trigger" onClick={onExpandTriggerClick} />
            <RightExpandTrigger id="right-expand-trigger" onClick={onExpandTriggerClick} />
            <BottomExpandTrigger id="bottom-expand-trigger" onClick={onExpandTriggerClick} />
          </>
        )}
        <SelfPanel
          scene={scene}
          sessionId={sessionId}
          onAvatarColorChangeComplete={({ rgb: { r, g, b } }) => {
            const { store } = window.APP;
            const { profile } = store.state;
            // Copy these to ensure presence changes
            const persona = { ...(profile.persona || {}) };
            const avatar = { ...(persona.avatar || {}) };
            persona.avatar = avatar;
            avatar.primary_color = { r: r / 255.0, g: g / 255.0, b: b / 255.0 };
            store.update({ profile: { persona } });
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
    </StyleSheetManager>
  );
}

UIRoot.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  scene: PropTypes.object,
  hubSettings: PropTypes.array,
  unavailableReason: PropTypes.string,
  voxTree: PropTypes.object,
  sceneTree: PropTypes.object,
  sessionId: PropTypes.string,
  hide: PropTypes.bool,
  isDoneLoading: PropTypes.bool
};

export default UIRoot;
