import React, { useCallback, useState, useEffect, useRef } from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import EmojiPopup from "./emoji-popup";
import styled from "styled-components";
import PanelSectionHeader from "./panel-section-header";
import SegmentControl from "./segment-control";
import BuilderControls from "./builder-controls";
import launcherOnIcon from "../../assets/jel/images/icons/launcher-on.svgi";
import launcherOffIcon from "../../assets/jel/images/icons/launcher-off.svgi";
import builderOnIcon from "../../assets/jel/images/icons/builder-on.svgi";
import builderOffIcon from "../../assets/jel/images/icons/builder-off.svgi";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { usePopupPopper } from "../utils/popup-utils";
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
  min-height: 64px;
  height: 64px;
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

function RightPanel({ history, hub, hubCan, hubMetadata, sessionId, scene, centerPopupRef }) {
  const { builderSystem, launcherSystem, cameraSystem } = SYSTEMS;
  const { store } = window.APP;

  const emojiEquipRef = useRef();
  const emojiPopupFocusRef = useRef();

  const [triggerMode, setTriggerMode] = useState(launcherSystem.enabled ? "launcher" : "builder");
  const [isInEditorView, setIsInEditorView] = useState(cameraSystem.isInspecting() && cameraSystem.allowCursor);

  const {
    styles: emojiPopupStyles,
    attributes: emojiPopupAttributes,
    show: showEmojiPopup,
    setPopup: setEmojiPopupElement,
    popupOpenOptions: emojiPopupOpenOptions
  } = usePopupPopper(emojiPopupFocusRef, "bottom", [0, 8]);

  // Handle emoji popup trigger
  useEffect(
    () => {
      const handleCreateVoxmoji = () => showEmojiPopup(centerPopupRef, "bottom", [0, 8], { equip: false });

      scene && scene.addEventListener("action_show_emoji_picker", handleCreateVoxmoji);
      return () => scene && scene.removeEventListener("action_show_emoji_picker", handleCreateVoxmoji);
    },
    [scene, centerPopupRef, showEmojiPopup]
  );

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
      <PresenceContent
        style={isInEditorView ? { display: "none" } : {}}
        className={triggerMode === "launcher" ? "launch" : "build"}
      >
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
          <BuilderContent style={isInEditorView ? { marginTop: "8px" } : {}}>
            <BuilderControls />
          </BuilderContent>
        )}
      {isWorld &&
        !isInEditorView &&
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
      <EmojiPopup
        setPopperElement={setEmojiPopupElement}
        styles={emojiPopupStyles}
        attributes={emojiPopupAttributes}
        ref={emojiPopupFocusRef}
        onEmojiSelected={useCallback(
          ({ unicode }) => {
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
          },
          [scene, store, emojiPopupOpenOptions.equip]
        )}
      />
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
  centerPopupRef: PropTypes.object
};

export default RightPanel;
