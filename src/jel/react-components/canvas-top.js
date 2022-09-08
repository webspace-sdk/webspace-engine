import React, { useRef, useState, useCallback, forwardRef, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import RenamePopup from "./rename-popup";
import AtomTrail from "./atom-trail";
import styled from "styled-components";
import { cancelEventIfFocusedWithin } from "../utils/dom-utils";
import HubContextMenu from "./hub-context-menu";
import CreateSelectPopup from "./create-select-popup";
import dotsIcon from "../../assets/jel/images/icons/dots-horizontal-overlay-shadow.svgi";
import addIcon from "../../assets/jel/images/icons/add-shadow.svgi";
import notificationsIcon from "../../assets/jel/images/icons/notifications-shadow.svgi";
import securityIcon from "../../assets/jel/images/icons/security-shadow.svgi";
import sunIcon from "../../assets/jel/images/icons/sun-shadow.svgi";
import editIcon from "../../assets/jel/images/icons/edit-shadow.svgi";
import { useAtomBoundPopupPopper, usePopupPopper } from "../utils/popup-utils";
import { getMessages } from "../../hubs/utils/i18n";
import Tooltip from "./tooltip";
import { useInstallPWA } from "../../hubs/react-components/input/useInstallPWA";
import { ATOM_TYPES } from "../utils/atom-metadata";
import { WORLD_COLOR_TYPES } from "../../hubs/constants";
import { getPresetAsColorTuples } from "../utils/world-color-presets";
import HubPermissionsPopup from "./hub-permissions-popup";
import WritebackSetupPopup from "./writeback-setup-popup";
import HubNotificationsPopup from "./hub-notifications-popup";
import EnvironmentSettingsPopup from "./environment-settings-popup";

const Top = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-start;

  .paused #jel-ui & {
    opacity: 0.4;
  }
`;

const CornerButtonElement = styled.button`
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
`;

const CornerButtons = styled.div`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  width: 50%;
  padding: 12px 0;
  display: flex;
`;

const CornerButton = styled.button`
  position: relative;
  color: var(--canvas-overlay-text-color);
  width: content-width;
  display: flex;
  margin: 0 12px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  padding: 6px 12px 6px 10px;
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

const HubNotificationButton = forwardRef((props, ref) => {
  const messages = getMessages();

  return (
    <Tooltip content={messages["hub-notifications.tip"]} placement="top" key="hub-notifications" delay={500}>
      <CornerButtonElement {...props} ref={ref}>
        <CornerButtonIcon dangerouslySetInnerHTML={{ __html: notificationsIcon }} />
      </CornerButtonElement>
    </Tooltip>
  );
});

HubNotificationButton.displayName = "HubNotificationButton";

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
  const {
    history,
    hubCan,
    hubSettings,
    voxCan,
    hub,
    worldTree,
    channelTree,
    scene,
    spaceCan,
    worldTreeData,
    channelTreeData,
    createSelectPopupRef,
    subscriptions
  } = props;

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
    styles: hubNotificationPopupStyles,
    attributes: hubNotificationPopupAttributes,
    show: showHubNotificationPopup,
    setPopup: setHubNotificationPopupElement,
    popupElement: hubNotificationPopupElement
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
      hubChannel.updateHubMeta(hub.hub_id, { world: { type: worldType } });
    },
    [hub, hubChannel]
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

      hubChannel.updateHubMeta(hub.hub_id, { world: hubWorldColors });
    },
    [terrainSystem.worldColors, hub, hubChannel]
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
      terrainSystem.updateWorldForHub(hub);
      atmosphereSystem.updateAtmosphereForHub(hub);
    },
    [hub, terrainSystem, atmosphereSystem]
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
    hubCan && hub && hubCan("spawn_and_move_media", hub.hub_id)
  );
  const [isInspecting, setIsInspecting] = useState(cameraSystem.isInspecting());

  const atomId = isInspecting ? cameraSystem.getInspectedAtomId() : hub && hub.hub_id;
  const atomType = isInspecting ? cameraSystem.getInspectedAtomType() : ATOM_TYPES.HUB;

  let atomTrailAtomIds = null;

  if (isInspecting && atomId) {
    atomTrailAtomIds = [atomId];
  } else if (!isInspecting) {
    atomTrailAtomIds = (worldTree && hub && worldTree.getAtomTrailForAtomId(hub.hub_id)) || (hub && [hub.hub_id]) || [];
  }

  const hubMetadata = worldTree && worldTree.atomMetadata;
  const metadata = atomType === ATOM_TYPES.VOX ? window.APP.voxMetadata : hubMetadata;
  const [editingAvailable, setIsEditingAvailable] = useState(atomAccessManager.isEditingAvailable);
  const [pwaAvailable, installPWA] = useInstallPWA();
  const environmentSettingsButtonRef = useRef();
  const hubNotificationButtonRef = useRef();
  const hubPermissionsButtonRef = useRef();
  const hubEditButtonRef = useRef();
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
          showWritebackSetupPopup(detail.showInCenter ? createSelectPopupRef : hubEditButtonRef);
        } else {
          atomAccessManager.openWriteback();
        }
      };

      scene && scene.addEventListener("action_open_writeback", handleWritebackSetup);
      return () => scene && scene.removeEventListener("action_open_writeback", handleWritebackSetup);
    },
    [scene, hubEditButtonRef, atomAccessManager, showWritebackSetupPopup, createSelectPopupRef]
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
        setCanSpawnAndMoveMedia(hubCan && hub && hubCan("spawn_and_move_media", hub.hub_id));
        setIsEditingAvailable(atomAccessManager.isEditingAvailable);

        if (updateEnvironmentSettingsPopup) {
          updateEnvironmentSettingsPopup(); // The size of this changes depending on permissions, reposition
        }
      };

      handler();

      atomAccessManager && atomAccessManager.addEventListener("permissions_updated", handler);
      return () => atomAccessManager && atomAccessManager.removeEventListener("permissions_updated", handler);
    },
    [hub, hubCan, atomAccessManager, updateEnvironmentSettingsPopup]
  );

  let cornerButtons;

  const showEditButton = editingAvailable && !canSpawnAndMoveMedia;
  const showInstallButton = !showEditButton && pwaAvailable;

  if (!isInspecting) {
    cornerButtons = (
      <CornerButtons>
        {showInstallButton && (
          <CornerButton onClick={installPWA}>
            <FormattedMessage id="install.desktop" />
          </CornerButton>
        )}
        {showEditButton && (
          <CornerButton
            ref={hubEditButtonRef}
            onMouseDown={e => cancelEventIfFocusedWithin(e, writebackSetupPopupElement)}
            onClick={() => scene.emit("action_open_writeback")}
          >
            <CornerButtonIcon dangerouslySetInnerHTML={{ __html: editIcon }} />
            <FormattedMessage id="writeback.edit-world" />
          </CornerButton>
        )}
        {
          <EnvironmentSettingsButton
            ref={environmentSettingsButtonRef}
            onMouseDown={e => cancelEventIfFocusedWithin(e, environmentSettingsPopupElement)}
            onClick={() => showEnvironmentSettingsPopup(environmentSettingsButtonRef)}
          />
        }
        {hubCan &&
          hubCan("update_hub_roles", hub && hub.hub_id) && (
            <HubPermissionsButton
              ref={hubPermissionsButtonRef}
              onMouseDown={e => cancelEventIfFocusedWithin(e, hubPermissionsPopupElement)}
              onClick={() => showHubPermissionsPopup(hubPermissionsButtonRef)}
            />
          )}
        {
          <HubNotificationButton
            ref={hubNotificationButtonRef}
            onMouseDown={e => cancelEventIfFocusedWithin(e, hubNotificationPopupElement)}
            onClick={() => showHubNotificationPopup(hubNotificationButtonRef)}
          />
        }
        {canSpawnAndMoveMedia && (
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
            showHubContextMenuPopup(hub.hub_id, hubMetadata, hubContextButtonRef, "bottom-end", [0, 8], {
              hideRename: true,
              isCurrentWorld: hub.hub_id === atomAccessManager.currentHubId,
              showReset: false // TODO SHARED, template
            });
          }}
        />
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
      {atomTrailAtomIds && (
        <AtomTrail
          atomIds={atomTrailAtomIds}
          history={history}
          metadata={metadata}
          can={atomType === ATOM_TYPES.VOX ? voxCan : hubCan}
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
        channelTree={channelTree}
        worldTreeData={worldTreeData}
        channelTreeData={channelTreeData}
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
        hub={hub}
      />
      <WritebackSetupPopup
        setPopperElement={setWritebackSetupPopupElement}
        styles={writebackSetupPopupStyles}
        attributes={writebackSetupPopupAttributes}
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
  channelTree: PropTypes.object,
  worldTreeData: PropTypes.array,
  channelTreeData: PropTypes.array,
  spaceCan: PropTypes.func,
  memberships: PropTypes.array,
  hubSettings: PropTypes.array,
  subscriptions: PropTypes.object,
  createSelectPopupRef: PropTypes.object
};

export default CanvasTop;
