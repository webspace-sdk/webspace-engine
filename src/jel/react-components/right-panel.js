import React, { useCallback, useState, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import styled from "styled-components";
import PanelSectionHeader from "./panel-section-header";
import SegmentControl from "./segment-control";
import BuilderControls from "./builder-controls";
import launcherOnIcon from "../../assets/jel/images/icons/launcher-on.svgi";
import launcherOffIcon from "../../assets/jel/images/icons/launcher-off.svgi";
import builderOnIcon from "../../assets/jel/images/icons/builder-on.svgi";
import builderOffIcon from "../../assets/jel/images/icons/builder-off.svgi";
import PresenceList from "./presence-list";
import EmojiEquip from "./emoji-equip";
import { getMessages } from "../../hubs/utils/i18n";
import { SOUND_TELEPORT_END } from "../../hubs/systems/sound-effects-system";

const Right = styled.div`
  pointer-events: auto;
  width: var(--presence-width);
  display: flex;
  flex-direction: row;
  box-shadow: 0px 0px 4px;
`;

const Presence = styled.div`
  pointer-events: auto;
  width: calc(var(--presence-width));
  display: flex;
  flex-direction: column;
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
  min-height: 72px;
  height: 72px;
  flex-grow: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  background-color: var(--secondary-panel-background-color);
  color: var(--secondary-panel-text-color);
  align-self: flex-end;
  z-index: 10;
`;

function RightPanel({ hub, hubCan, sessionId, scene, centerPopupRef }) {
  const { builderSystem, launcherSystem, cameraSystem } = SYSTEMS;

  const [triggerMode, setTriggerMode] = useState(launcherSystem.enabled ? "launcher" : "builder");
  const [isInEditorView, setIsInEditorView] = useState(cameraSystem.isInspecting() && cameraSystem.allowCursor);

  useEffect(
    () => {
      const handler = () => {
        setTriggerMode(builderSystem.enabled ? "builder" : "launcher");
      };

      builderSystem.addEventListener("enabledchanged", handler);
      return () => builderSystem.removeEventListener("enabledchanged", handler);
    },
    [builderSystem, launcherSystem]
  );

  useEffect(
    () => {
      const handler = () => {
        setIsInEditorView(cameraSystem.isInspecting() && cameraSystem.allowCursor);
      };

      cameraSystem.addEventListener("mode_changed", handler);
      return () => cameraSystem.removeEventListener("mode_changed", handler);
    },
    [cameraSystem]
  );

  const onTriggerModeChange = useCallback(
    (id, idx) => {
      if ((idx === 0 && !launcherSystem.enabled) || (idx === 1 && !builderSystem.enabled)) {
        launcherSystem.toggle();
        builderSystem.toggle();
      }

      DOM_ROOT.activeElement?.blur(); // Focuses canvas
    },
    [builderSystem, launcherSystem]
  );

  const messages = getMessages();

  return (
    <Right>
      <Presence>
        <PresenceContent
          style={isInEditorView ? { display: "none" } : {}}
          className={triggerMode === "launcher" ? "launch" : "build"}
        >
          <PresenceList
            scene={scene}
            sessionId={sessionId}
            onGoToUserClicked={sessionId => {
              SYSTEMS.characterController.teleportToUser(sessionId);
              SYSTEMS.soundEffectsSystem.playSoundOneShot(SOUND_TELEPORT_END);
            }}
          />
        </PresenceContent>
        {triggerMode === "launcher" && (
          <BlasterContent>
            <PanelSectionHeader style={{ height: "16px" }}>
              <FormattedMessage id="blaster.header" />
            </PanelSectionHeader>
            <EmojiEquip centerPopupRef={centerPopupRef} scene={scene} />
          </BlasterContent>
        )}
        {triggerMode === "builder" && (
          <BuilderContent style={isInEditorView ? { marginTop: "8px" } : {}}>
            <BuilderControls />
          </BuilderContent>
        )}
        {!isInEditorView &&
          hub &&
          false &&
          hubCan("spawn_and_move_media", hub.hub_id) && (
            <TriggerModePanel>
              <SegmentControl
                rows={1}
                cols={2}
                items={[
                  {
                    id: "trigger-mode.blast",
                    text: messages["toggle.launcher"],
                    iconSrc: launcherOnIcon,
                    offIconSrc: launcherOffIcon
                  },
                  {
                    id: "trigger-mode.build",
                    text: messages["toggle.builder"],
                    iconSrc: builderOnIcon,
                    offIconSrc: builderOffIcon
                  }
                ]}
                hideTips={true}
                selectedIndices={triggerMode === "launcher" ? [0] : [1]}
                onChange={onTriggerModeChange}
              />
            </TriggerModePanel>
          )}
      </Presence>
    </Right>
  );
}

RightPanel.propTypes = {
  history: PropTypes.object,
  hub: PropTypes.object,
  hubCan: PropTypes.func,
  scene: PropTypes.object,
  hubMetadata: PropTypes.object,
  sessionId: PropTypes.string,
  centerPopupRef: PropTypes.object,
  spaceId: PropTypes.string,
  treeManager: PropTypes.object,
  memberships: PropTypes.array
};

export default RightPanel;
