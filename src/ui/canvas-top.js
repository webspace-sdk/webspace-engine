import React, { useRef, useState, useCallback, forwardRef, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import RenamePopup from "./rename-popup";
import AtomTrail from "./atom-trail";
import styled from "styled-components";
import { cancelEventIfFocusedWithin, PROJECTION_TYPES } from "../utils/dom-utils";
import HubContextMenu from "./hub-context-menu";
import CreateSelectPopup from "./create-select-popup";
import dotsIcon from "../assets/images/icons/dots-horizontal-overlay-shadow.svgi";
import addIcon from "../assets/images/icons/add-shadow.svgi";
import securityIcon from "../assets/images/icons/security-shadow.svgi";
import sunIcon from "../assets/images/icons/sun-shadow.svgi";
import menuIcon from "../assets/images/icons/menu-shadow.svgi";
import backIcon from "../assets/images/icons/back-shadow.svgi";
import { useAtomBoundPopupPopper, usePopupPopper } from "../utils/popup-utils";
import { getMessages } from "../utils/i18n";
import Tooltip from "./tooltip";
import { useInstallPWA } from "./input/useInstallPWA";
import { ATOM_TYPES } from "../utils/atom-metadata";
import { WORLD_COLOR_TYPES } from "../constants";
import { ROLES } from "../utils/permissions-utils";
import { getPresetAsColorTuples } from "../utils/world-color-presets";
import HubPermissionsPopup from "./hub-permissions-popup";
import WritebackSetupPopup from "./writeback-setup-popup";
import EnvironmentSettingsPopup from "./environment-settings-popup";

const isMobile = AFRAME.utils.device.isMobile();

const Top = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-start;

  .paused #webspace-ui & {
    opacity: 0.4;
  }
`;

const CornerButtonElement = styled.button`
  ${props =>
    props.hideOnExpand
      ? `
    display: none;

    #webspace-ui.panels-collapsed & {
      display: flex;
    }
  `
      : ""} color: var(--canvas-overlay-text-color);
  text-shadow: 0px 0px 4px;

  #webspace-ui.projection-flat & {
    color: var(--page-overlay-text-color);
    text-shadow: none;
  }

  width: content-width;
  margin: 0px 12px 0 0;

  &.left {
    margin-right: 0;
    margin-left: 8px;
  }

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
  &:hover {
    background-color: var(--canvas-overlay-item-hover-background-color);
  }

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }
`;

const BackButtonWrap = styled.div`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 0;
  display: flex;
  min-height: 64px;
`;

const CornerButtons = styled.div`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  width: 50%;
  padding: 12px 0;
  display: flex;
  min-height: 64px;
`;

const CornerButton = styled.button`
  position: relative;
  color: var(--canvas-overlay-text-color);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);

  #webspace-ui.projection-flat & {
    color: var(--page-overlay-text-color);
    text-shadow: none;
  }

  width: content-width;
  display: flex;
  margin: 0 12px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  padding: 6px 12px 6px 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  font-weight: var(--canvas-overlay-item-text-weight);
  text-align: left;
  max-width: fit-content;
  line-height: 22px;

  &:hover {
    background-color: var(--canvas-overlay-item-hover-background-color);
  }

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }

  & div {
    margin-right: 8px;
  }
`;

const CornerButtonIcon = styled.div`
  width: 22px;
  height: 22px;
`;

const BackButton = forwardRef((props, ref) => {
  const inspecting = SYSTEMS.cameraSystem.isInspecting();
  const icon = inspecting ? backIcon : menuIcon;

  return (
    <CornerButtonElement {...props} hideOnExpand={!inspecting} ref={ref} className="left">
      <CornerButtonIcon dangerouslySetInnerHTML={{ __html: icon }} />
    </CornerButtonElement>
  );
});

BackButton.displayName = "BackButton";

const HubContextButton = forwardRef((props, ref) => {
  return (
    <CornerButtonElement {...props} ref={ref}>
      <CornerButtonIcon dangerouslySetInnerHTML={{ __html: dotsIcon }} />
    </CornerButtonElement>
  );
});

HubContextButton.displayName = "HubContextButton";

const HubCreateButton = forwardRef((props, ref) => {
  const messages = getMessages();

  return (
    <Tooltip content={messages["create.tip"]} placement="top" key="create" delay={500}>
      <CornerButtonElement {...props} ref={ref}>
        <CornerButtonIcon dangerouslySetInnerHTML={{ __html: addIcon }} />
      </CornerButtonElement>
    </Tooltip>
  );
});

HubCreateButton.displayName = "HubCreateButton";

const EnvironmentSettingsButton = forwardRef((props, ref) => {
  const messages = getMessages();

  return (
    <Tooltip content={messages["environment-settings.tip"]} placement="top" key="environment-settings" delay={500}>
      <CornerButtonElement {...props} ref={ref}>
        <CornerButtonIcon dangerouslySetInnerHTML={{ __html: sunIcon }} />
      </CornerButtonElement>
    </Tooltip>
  );
});

EnvironmentSettingsButton.displayName = "EnvironmentSettingsButton";

const HubPermissionsButton = forwardRef((props, ref) => {
  const messages = getMessages();

  return (
    <Tooltip content={messages["hub-permissions.tip"]} placement="top" key="hub-permissions" delay={500}>
      <CornerButtonElement {...props} ref={ref}>
        <CornerButtonIcon dangerouslySetInnerHTML={{ __html: securityIcon }} />
      </CornerButtonElement>
    </Tooltip>
  );
});

HubPermissionsButton.displayName = "HubPermissionsButton";

const CameraProjectionButton = forwardRef(() => {
  const { cameraSystem } = SYSTEMS;
  const messages = getMessages();
  const [isOrtho, setIsOrtho] = useState(cameraSystem.isRenderingOrthographic());

  useEffect(() => {
    const handler = () => {
      setIsOrtho(SYSTEMS.cameraSystem.isRenderingOrthographic());
    };

    cameraSystem.addEventListener("settings_changed", handler);
    return () => cameraSystem.removeEventListener("settings_changed", handler);
  });

  return (
    <Tooltip content={messages["camera-projection.tip"]} placement="top" key="projection" delay={500}>
      <CornerButton
        onClick={useCallback(
          () => {
            cameraSystem.toggleOrthoCamera();
            DOM_ROOT.activeElement?.blur();
          },
          [cameraSystem]
        )}
      >
        <FormattedMessage id={isOrtho ? "camera-projection.ortho" : "camera-projection.pers"} />
      </CornerButton>
    </Tooltip>
  );
});

CameraProjectionButton.displayName = "CameraProjectionButton";

const ToggleWorldButton = forwardRef(() => {
  const { cameraSystem } = SYSTEMS;
  const messages = getMessages();
  const [showWorld, setShowWorld] = useState(cameraSystem.showWorld);

  useEffect(() => {
    const handler = () => {
      setShowWorld(SYSTEMS.cameraSystem.showWorld);
    };

    cameraSystem.addEventListener("settings_changed", handler);
    () => cameraSystem.removeEventListener("settings_changed", handler);
  });

  return (
    <Tooltip content={messages["toggle-world.tip"]} placement="top" key="projection" delay={500}>
      <CornerButton
        onClick={useCallback(
          () => {
            cameraSystem.toggleShowWorldWithCursor();
            DOM_ROOT.activeElement?.blur();
          },
          [cameraSystem]
        )}
      >
        <FormattedMessage id={showWorld ? "toggle-world.hide-world" : "toggle-world.show-world"} />
      </CornerButton>
    </Tooltip>
  );
});

ToggleWorldButton.displayName = "ToggleWorldButton";

const ToggleFloorButton = forwardRef(() => {
  const { cameraSystem } = SYSTEMS;
  const messages = getMessages();
  const [showFloor, setShowFloor] = useState(cameraSystem.showFloor);

  useEffect(() => {
    const handler = () => {
      setShowFloor(SYSTEMS.cameraSystem.showFloor);
    };

    cameraSystem.addEventListener("settings_changed", handler);
    () => cameraSystem.removeEventListener("settings_changed", handler);
  });

  return (
    <Tooltip content={messages["toggle-floor.tip"]} placement="top" key="projection" delay={500}>
      <CornerButton
        onClick={useCallback(
          () => {
            cameraSystem.toggleShowFloor();
            DOM_ROOT.activeElement?.blur();
          },
          [cameraSystem]
        )}
      >
        <FormattedMessage id={showFloor ? "toggle-floor.hide-floor" : "toggle-floor.show-floor"} />
      </CornerButton>
    </Tooltip>
  );
});

ToggleFloorButton.displayName = "ToggleFloorButton";

function CanvasTop(props) {
  const { hubCan, voxCan, worldTree, scene, spaceCan, createSelectPopupRef, projectionType } = props;
  const hubId = props.hub?.hub_id;
  const saveChangesToOrigin = props.hub?.save_changes_to_origin;
  const contentChangeRole = props.hub?.content_change_role;

  const { cameraSystem, terrainSystem, atmosphereSystem } = SYSTEMS;
  const { store, hubChannel, atomAccessManager } = window.APP;

  const {
    styles: hubContextMenuStyles,
    attributes: hubContextMenuAttributes,
    atomId: hubContextMenuHubId,
    show: showHubContextMenuPopup,
    setPopup: setHubContextMenuElement,
    popupOpenOptions: hubContextMenuOpenOptions,
    popupElement: hubContextMenuElement
  } = useAtomBoundPopupPopper();

  const atomRenameFocusRef = useRef();
  const createSelectFocusRef = useRef();

  const {
    styles: atomRenamePopupStyles,
    attributes: atomRenamePopupAttributes,
    setPopup: setAtomRenamePopupElement,
    atomId: atomRenameAtomId,
    atomMetadata: atomRenameMetadata,
    show: showAtomRenamePopup,
    popupElement: atomRenamePopupElement
  } = useAtomBoundPopupPopper(atomRenameFocusRef, "bottom-start", [0, 8]);

  const {
    styles: createSelectPopupStyles,
    attributes: createSelectPopupAttributes,
    show: showCreateSelectPopup,
    setPopup: setCreateSelectPopupElement,
    popupElement: createSelectPopupElement
  } = usePopupPopper(".create-select-selection-search-input", "bottom-end", [0, 8]);

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
    popupElement: hubPermissionsPopupElement
  } = usePopupPopper(null, "bottom-end", [0, 8]);

  const {
    styles: writebackSetupPopupStyles,
    attributes: writebackSetupPopupAttributes,
    show: showWritebackSetupPopup,
    setPopup: setWritebackSetupPopupElement,
    popupElement: writebackSetupPopupElement
  } = usePopupPopper(null, "bottom-end", [0, 8]);

  const updateWorldType = useCallback(
    worldType => {
      hubChannel.updateHubMeta(hubId, { world: { type: worldType } });
    },
    [hubId, hubChannel]
  );

  const temporarilyUpdateEnvironmentColors = useCallback(
    (...colors) => {
      terrainSystem.updateWorldColors(...colors);
      atmosphereSystem.updateWaterColor(colors[7]);
      atmosphereSystem.updateSkyColor(colors[6]);
    },
    [terrainSystem, atmosphereSystem]
  );

  const saveCurrentEnvironmentColors = useCallback(
    () => {
      const colors = terrainSystem.worldColors;
      const hubWorldColors = {};

      WORLD_COLOR_TYPES.forEach((type, idx) => {
        hubWorldColors[`${type}_color`] = {
          r: (colors[idx] && colors[idx].r) || 0,
          g: (colors[idx] && colors[idx].g) || 0,
          b: (colors[idx] && colors[idx].b) || 0
        };
      });

      hubChannel.updateHubMeta(hubId, { world: hubWorldColors });
    },
    [terrainSystem.worldColors, hubId, hubChannel]
  );

  const onEnvironmentPresetColorsHovered = useCallback(
    i => {
      const colors = getPresetAsColorTuples(i);
      temporarilyUpdateEnvironmentColors(...colors);
    },
    [temporarilyUpdateEnvironmentColors]
  );

  const onEnvironmentPresetColorsClicked = useCallback(
    i => {
      const colors = getPresetAsColorTuples(i);
      temporarilyUpdateEnvironmentColors(...colors);
      saveCurrentEnvironmentColors();
    },
    [saveCurrentEnvironmentColors, temporarilyUpdateEnvironmentColors]
  );

  const [canSpawnAndMoveMedia, setCanSpawnAndMoveMedia] = useState(
    hubCan && hubId && hubCan("spawn_and_move_media", hubId)
  );
  const [isInspecting, setIsInspecting] = useState(cameraSystem.isInspecting());
  const [documentIsDirty, setDocumentIsDirty] = useState(false);

  const atomId = isInspecting ? cameraSystem.getInspectedAtomId() : hubId;
  const atomType = isInspecting ? cameraSystem.getInspectedAtomType() : ATOM_TYPES.HUB;

  let atomTrailAtomIds = null;

  if (isInspecting && atomId) {
    atomTrailAtomIds = [atomId];
  } else if (!isInspecting) {
    atomTrailAtomIds = (worldTree && hubId && worldTree.getAtomTrailForAtomId(hubId)) || (hubId && [hubId]) || [];
  }

  const hubMetadata = worldTree && worldTree.atomMetadata;
  const metadata = atomType === ATOM_TYPES.VOX ? window.APP.voxMetadata : hubMetadata;
  const [isSaveConfigurable, setIsSaveConfigurable] = useState(!atomAccessManager.isWritebackOpen);
  const [pwaAvailable, installPWA] = useInstallPWA();
  const environmentSettingsButtonRef = useRef();
  const hubPermissionsButtonRef = useRef();
  const hubSaveButtonRef = useRef();
  const hubCreateButtonRef = useRef();
  const hubContextButtonRef = useRef();

  // Handle create hotkey (typically /)
  // fires action_create or action_open_writeback
  useEffect(
    () => {
      const handleCreateHotkey = () => showCreateSelectPopup(createSelectPopupRef);
      scene && scene.addEventListener("action_create", handleCreateHotkey);
      return () => scene && scene.removeEventListener("action_create", handleCreateHotkey);
    },
    [scene, createSelectPopupRef, showCreateSelectPopup]
  );

  useEffect(
    () => {
      const handleWritebackSetup = ({ detail }) => {
        if (atomAccessManager.writebackRequiresSetup) {
          showWritebackSetupPopup(detail?.showInCenter ? createSelectPopupRef : hubSaveButtonRef);
        } else {
          atomAccessManager.openWriteback();
        }
      };

      scene && scene.addEventListener("action_open_writeback", handleWritebackSetup);
      return () => scene && scene.removeEventListener("action_open_writeback", handleWritebackSetup);
    },
    [scene, hubSaveButtonRef, atomAccessManager, showWritebackSetupPopup, createSelectPopupRef]
  );

  useEffect(
    () => {
      const handler = () => {
        setDocumentIsDirty(atomAccessManager.documentIsDirty);
        setIsSaveConfigurable(!atomAccessManager.isWritebackOpen);
      };

      atomAccessManager && atomAccessManager.addEventListener("document-dirty-state-changed", handler);
      return () => atomAccessManager && atomAccessManager.removeEventListener("document-dirty-state-changed", handler);
    },
    [scene, hubSaveButtonRef, atomAccessManager, showWritebackSetupPopup, createSelectPopupRef]
  );

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
        setCanSpawnAndMoveMedia(hubCan && hubId && hubCan("spawn_and_move_media", hubId));
        setIsSaveConfigurable(!atomAccessManager.isWritebackOpen);

        if (updateEnvironmentSettingsPopup) {
          updateEnvironmentSettingsPopup(); // The size of this changes depending on permissions, reposition
        }
      };

      handler();

      atomAccessManager && atomAccessManager.addEventListener("permissions_updated", handler);
      return () => atomAccessManager && atomAccessManager.removeEventListener("permissions_updated", handler);
    },
    [hubId, hubCan, atomAccessManager, updateEnvironmentSettingsPopup]
  );

  let cornerButtons;

  const mayNeedToBecomeOwnerToSave = !canSpawnAndMoveMedia && contentChangeRole === ROLES.OWNER;

  const showSaveButton =
    saveChangesToOrigin &&
    isSaveConfigurable &&
    (mayNeedToBecomeOwnerToSave || documentIsDirty) &&
    !atomAccessManager.hasAnotherWriterInPresence();

  const showInstallButton = !showSaveButton && pwaAvailable;
  const isSpatial = projectionType === PROJECTION_TYPES.SPATIAL;

  if (!isInspecting && !isMobile) {
    cornerButtons = (
      <CornerButtons>
        {showInstallButton && (
          <CornerButton onClick={installPWA}>
            <FormattedMessage id="install.desktop" />
          </CornerButton>
        )}
        {showSaveButton && (
          <CornerButton
            ref={hubSaveButtonRef}
            onMouseDown={e => cancelEventIfFocusedWithin(e, writebackSetupPopupElement)}
            onClick={() => scene.emit("action_open_writeback")}
          >
            <FormattedMessage id="writeback.save-changes" />
          </CornerButton>
        )}
        {isSpatial && (
          <EnvironmentSettingsButton
            ref={environmentSettingsButtonRef}
            onMouseDown={e => cancelEventIfFocusedWithin(e, environmentSettingsPopupElement)}
            onClick={() => showEnvironmentSettingsPopup(environmentSettingsButtonRef)}
          />
        )}
        {hubCan &&
          hubCan("update_hub_roles", hubId) && (
            <HubPermissionsButton
              ref={hubPermissionsButtonRef}
              onMouseDown={e => cancelEventIfFocusedWithin(e, hubPermissionsPopupElement)}
              onClick={() => showHubPermissionsPopup(hubPermissionsButtonRef)}
            />
          )}
        {canSpawnAndMoveMedia &&
          isSpatial && (
            <HubCreateButton
              ref={hubCreateButtonRef}
              onMouseDown={e => cancelEventIfFocusedWithin(e, createSelectPopupElement)}
              onClick={() => {
                store.handleActivityFlag("createMenu");
                showCreateSelectPopup(hubCreateButtonRef, "bottom-end");
              }}
            />
          )}
        {isSpatial && (
          <HubContextButton
            ref={hubContextButtonRef}
            onMouseDown={e => cancelEventIfFocusedWithin(e, hubContextMenuElement)}
            onClick={() => {
              showHubContextMenuPopup(hubId, hubMetadata, hubContextButtonRef, "bottom-end", [0, 8], {
                hideRename: true,
                isCurrentWorld: hubId === atomAccessManager.currentHubId
              });
            }}
          />
        )}
      </CornerButtons>
    );
  } else {
    cornerButtons = (
      <CornerButtons>
        {cameraSystem.allowCursor && <CameraProjectionButton />}
        {cameraSystem.allowCursor && <ToggleWorldButton />}
        {cameraSystem.allowCursor && <ToggleFloorButton />}
      </CornerButtons>
    );
  }

  return (
    <Top id="top-panel">
      <BackButtonWrap>
        <BackButton
          onClick={useCallback(() => {
            if (SYSTEMS.cameraSystem.isInspecting()) {
              SYSTEMS.cameraSystem.uninspect();
            } else {
              SYSTEMS.uiAnimationSystem.toggleSidePanels();
            }
          }, [])}
        />
      </BackButtonWrap>
      {atomTrailAtomIds && (
        <AtomTrail
          atomIds={atomTrailAtomIds}
          metadata={metadata}
          can={isMobile ? () => false : atomType === ATOM_TYPES.VOX ? voxCan : hubCan}
          viewPermission={atomType === ATOM_TYPES.VOX ? "view_vox" : "join_hub"}
          editPermission={atomType === ATOM_TYPES.VOX ? "edit_vox" : "update_hub_meta"} // TODO bug need to check matrix room permissions
          renamePopupElement={atomRenamePopupElement}
          showRenamePopup={showAtomRenamePopup}
        />
      )}
      {cornerButtons}
      <HubContextMenu
        setPopperElement={setHubContextMenuElement}
        hideRename={!!hubContextMenuOpenOptions.hideRename}
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
      <CreateSelectPopup
        popperElement={createSelectPopupElement}
        setPopperElement={setCreateSelectPopupElement}
        styles={createSelectPopupStyles}
        attributes={createSelectPopupAttributes}
        ref={createSelectFocusRef}
        onActionSelected={useCallback(a => scene.emit("create_action_exec", a), [scene])}
      />
      <HubPermissionsPopup
        setPopperElement={setHubPermissionsPopupElement}
        styles={hubPermissionsPopupStyles}
        attributes={hubPermissionsPopupAttributes}
        hubMetadata={hubMetadata}
        hubId={hubId}
      />
      <WritebackSetupPopup
        setPopperElement={setWritebackSetupPopupElement}
        styles={writebackSetupPopupStyles}
        attributes={writebackSetupPopupAttributes}
      />
      <EnvironmentSettingsPopup
        setPopperElement={setEnvironmentSettingsPopupElement}
        styles={environmentSettingsPopupStyles}
        attributes={environmentSettingsPopupAttributes}
        hubId={hubId}
        hubMetadata={hubMetadata}
        hubCan={hubCan}
        onColorsChanged={temporarilyUpdateEnvironmentColors}
        onColorChangeComplete={saveCurrentEnvironmentColors}
        onTypeChanged={updateWorldType}
        onPresetColorsHovered={onEnvironmentPresetColorsHovered}
        onPresetColorsClicked={onEnvironmentPresetColorsClicked}
      />
    </Top>
  );
}
CanvasTop.propTypes = {
  history: PropTypes.object,
  hub: PropTypes.object,
  hubCan: PropTypes.func,
  voxCan: PropTypes.func,
  scene: PropTypes.object,
  worldTree: PropTypes.object,
  worldTreeData: PropTypes.array,
  spaceCan: PropTypes.func,
  memberships: PropTypes.array,
  hubSettings: PropTypes.array,
  subscriptions: PropTypes.object,
  createSelectPopupRef: PropTypes.object,
  projectionType: PropTypes.number
};

export default CanvasTop;
