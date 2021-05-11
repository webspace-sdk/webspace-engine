import React, { useCallback, useState, useEffect, useRef } from "react";
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
import { navigateToHubUrl } from "../utils/jel-url-utils";
import PresenceList from "./presence-list";
import EmojiEquip from "./emoji-equip";
import { getMessages } from "../../hubs/utils/i18n";
import { SOUND_TELEPORT_END } from "../../hubs/systems/sound-effects-system";

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

function RightPanel({ history, hub, hubCan, hubMetadata, sessionId, scene, showEmojiPopup }) {
  const { builderSystem, launcherSystem } = SYSTEMS;
  const emojiEquipRef = useRef();
  const [triggerMode, setTriggerMode] = useState(launcherSystem.enabled ? "launcher" : "builder");

  useEffect(
    () => {
      const handler = () => {
        setTriggerMode(builderSystem.enabled ? "builder" : "launcher");
      };

      builderSystem.addEventListener("enabledchanged", handler);
      () => {
        builderSystem.removeEventListener("enabledchanged", handler);
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

  const onSelectedEmojiClicked = useCallback(
    () => {
      showEmojiPopup(emojiEquipRef, "top-end", [0, 12], { equip: true });
    },
    [showEmojiPopup]
  );

  const messages = getMessages();
  const isWorld = hub && hub.type === "world";

  return (
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
      {isWorld &&
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
  showEmojiPopup: PropTypes.func
};

export default RightPanel;