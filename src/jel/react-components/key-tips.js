import styled from "styled-components";
import { FormattedMessage } from "react-intl";
import React, { forwardRef, useState, useEffect } from "react";
import { imageUrlForEmoji } from "../../hubs/utils/media-url-utils";
import { objRgbToCssRgb } from "../utils/dom-utils";
import { storedColorToRgb } from "../../hubs/storage/store";

const KeyTipsElement = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  height: fit-content;
  border-radius: 6px;
  padding: 12px 24px;
  margin: 6px 0;
  user-select: none;
  pointer-events: none;
`;

const KeyTipItem = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  margin: 0;
  border-radius: 8px;
  padding: 6px 10px;

  &.highlight {
    margin: 8px 0;
    box-shadow: 0px 0px 6px var(--canvas-overlay-highlight-color);
  }
`;

const KeyTipButton = styled.button`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  margin: 6px 0;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background: transparent;
  border: 0;
  text-align: left;
`;

const LetterKey = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  border-radius: 5px;
  background-color: rgba(32, 32, 32, 0.2);
  box-shadow: inset 0px 1px 4px rgba(32, 32, 32, 0.6);
  backdrop-filter: none;
  color: var(--canvas-overlay-text-color);
  text-transform: uppercase;
  font: var(--key-label-font);
`;

const BigLetterKey = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  border-radius: 5px;
  background-color: rgba(32, 32, 32, 0.2);
  box-shadow: inset 0px 1px 4px rgba(32, 32, 32, 0.6);
  backdrop-filter: none;
  color: var(--canvas-overlay-text-color);
  text-transform: uppercase;
  font: var(--big-key-label-font);
`;

const NamedKey = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: fit-content;
  height: 28px;
  border-radius: 5px;
  padding: 0 14px;
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-tertiary-text-size);
  background-color: rgba(32, 32, 32, 0.2);
  box-shadow: inset 0px 1px 3px rgba(32, 32, 32, 0.6);
  backdrop-filter: none;
  font: var(--key-label-font);
  white-space: nowrap;

  .caps {
    text-transform: uppercase;
  }
`;

const WideNamedKey = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: fit-content;
  height: 18px;
  height: 28px;
  border-radius: 5px;
  padding: 0 24px;
  color: var(--canvas-overlay-text-color);
  background-color: rgba(32, 32, 32, 0.2);
  box-shadow: inset 0px 1px 3px rgba(32, 32, 32, 0.6);
  backdrop-filter: none;

  font: var(--key-label-font);
  white-space: nowrap;
`;

const TipLabel = styled.div`
  width: 60px;
  display: flex;
  font-weight: var(--canvas-overlay-item-secodary-text-weight);
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-text-size);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  margin-left: 16px;
  white-space: nowrap;

  & .equipped-emoji,
  & .equipped-color {
    display: inline-block;
    min-width: 16px;
    min-height: 16px;
    width: 16px;
    height: 16px;
    margin-right: 6px;
    border-radius: 4px;
    margin-right: 6px;
  }
`;

const KeyWideSeparator = styled.div`
  margin: 0px 12px;
  font-weight: var(--canvas-overlay-item-text-weight);
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-tertiary-text-size);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
`;

const KeySeparator = styled.div`
  margin: 0px 6px;
  font-weight: var(--canvas-overlay-item-text-weight);
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-tertiary-text-size);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
`;

const KeySmallSeparator = styled.div`
  margin: 0px 4px;
  font-weight: var(--canvas-overlay-item-text-weight);
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-tertiary-text-size);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
`;

const ColorSwatch = styled.div``;

const objectCommonTips = [
  ["move", "T;I"],
  ["lock", "l"],
  ["clone", "L+I;c"],
  ["bake", "b"],
  ["open", "o"],
  ["rotate", "_r"],
  ["scale", "_v"],
  ["focus", "f"],
  ["reset", "g"],
  ["remove", "x x"]
];

// SHIELD YOUR EYES. This stuff is super ugly and not DRY, but some of the
// ugliness is to avoid excessive react redraws by having pre-built DOM
// elements for all the necessary combinations of keys to show.
const lockedObjectCommonTips = [["unlock", "l"], ["clone", "L+I;c"], ["bake", "b"], ["open", "o"], ["focus", "f"]];

// Vox label for clone is 'instance', to clarify it vs bake (which makes a fork.)
const voxCommonTips = [
  ...objectCommonTips
    .map(t => (t[0] === "clone" ? ["instance", t[1]] : t))
    .map(t => (t[0] === "bake" ? ["duplicate", t[1]] : t))
];

const lockedVoxCommonTips = [
  ...lockedObjectCommonTips
    .map(t => (t[0] === "clone" ? ["instance", t[1]] : t))
    .map(t => (t[0] === "bake" ? ["duplicate", t[1]] : t))
];

const idleTips = [
  ["move", "w a s d"],
  ["fly", "q e"],
  ["look", "H;G", "narrowMouseLook"],
  ["run", "H"],
  ["jump", "S"],
  ["shoot", "_S|D"],
  ["mute", "L+m", "toggleMuteKey"],
  ["create", "/", "createMenu"],
  ["paste", "L+v"],
  ["undo", "L+z,y"],
  ["chat", "E", "chat"],
  ["unlock", "l"],
  ["ui", "~|@"],
  ["look_lock", "L+S"],
  ["hide", "?"]
];

const replaceTip = (tips, type, newType, newValue) =>
  tips.map(([k, v, flag]) => {
    if (flag) {
      return [k === type ? newType : k, k === type ? newValue : v, flag];
    } else {
      return [k === type ? newType : k, k === type ? newValue : v, flag];
    }
  });

const dropTip = (tips, type) => tips.filter(x => x[0] !== type);

const TIP_DATA = {
  closed: [["help", "?"]],
  idle_panels: dropTip(dropTip(idleTips, "mute"), "fly"),
  idle_key_mouselook_panels: dropTip(
    dropTip(dropTip(dropTip(replaceTip(idleTips, "shoot", "shoot", "_S|K"), "look"), "run"), "mute"),
    "fly"
  ),
  idle_full_muted: dropTip(
    dropTip(
      replaceTip(
        replaceTip(replaceTip(idleTips, "shoot", "shoot", "_S|K"), "mute", "unmute", "L+m"),
        "look_lock",
        "look_unlock",
        "L+S"
      ),
      "look"
    ),
    "fly"
  ),
  idle_full_unmuted: dropTip(dropTip(replaceTip(idleTips, "shoot", "shoot", "_S|K"), "look"), "fly"),
  idle_panels_fly: dropTip(idleTips, "mute"),
  idle_key_mouselook_panels_fly: dropTip(
    dropTip(dropTip(replaceTip(idleTips, "shoot", "shoot", "_S|K"), "look"), "run"),
    "mute"
  ),
  idle_full_muted_fly: dropTip(
    replaceTip(replaceTip(idleTips, "shoot", "shoot", "_S|K"), "mute", "unmute", "L+m"),
    "look"
  ),
  idle_full_unmuted_fly: dropTip(replaceTip(idleTips, "shoot", "shoot", "_S|K"), "look"),
  pointer_exited_muted: [["unmute", "L+m", "toggleMuteKey"], ["mode", "L+b"], ["hide", "?"]],
  pointer_exited_unmuted: [["mute", "L+m", "toggleMuteKey"], ["mode", "L+b"], ["hide", "?"]],
  hover_locked_bakable_interactable: [...lockedObjectCommonTips],
  hover_locked_interactable: dropTip(lockedObjectCommonTips, "bake"),
  locked_video_playing: [["seek", "q\\e"], ["volume", "R;t\\g"], ...lockedObjectCommonTips],
  locked_video_paused: [["seek", "q\\e"], ["volume", "R;t\\g"], ...lockedObjectCommonTips],
  locked_pdf: [["next", "L+S"], ["page", "q\\e"], ...lockedObjectCommonTips],
  holding_interactable: [["pull", "R"], ["stack", "_S"], ["movexz", "_q"], ["movey", "_e"]],
  hover_interactable: objectCommonTips.filter(x => x[0] !== "bake" && x[0] !== "ground"),
  hover_bakable_interactable: dropTip(objectCommonTips, "reset"),
  hover_resetable_interactable: dropTip(objectCommonTips, "bake"),
  hover_bakable_resetable_interactable: objectCommonTips,
  video_playing: [["seek", "q\\e"], ["volume", "R;t\\g"], ...objectCommonTips],
  video_paused: [["seek", "q\\e"], ["volume", "R;t\\g"], ...objectCommonTips],
  locked_vox: [...lockedVoxCommonTips],
  vox: [["edit", "~|@"], ...voxCommonTips],
  vox_pick: [["edit", "~|@"], ["pick", "_S|D"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_fill: [["edit", "~|@"], ["fill", "_S|D"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_attach: [["edit", "~|@"], ["attach", "_S|D"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_remove: [["edit", "~|@"], ["erase", "_S|D"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_paint: [["edit", "~|@"], ["paint", "_S|D"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_pick_full: [["edit", "~|@"], ["pick", "_S|K"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_fill_full: [["edit", "~|@"], ["fill", "_S|K"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_attach_full: [["edit", "~|@"], ["attach", "_S|K"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_remove_full: [["edit", "~|@"], ["erase", "_S|K"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_paint_full: [["edit", "~|@"], ["paint", "_S|K"], ...voxCommonTips, ["undo-edit", "P+z,y"]],
  vox_pick_edit: [
    ["orbit", "I"],
    ["pan", "_S|O"],
    ["zoom", "R"],
    ["exit", "~|@|Z"],
    ["pick", "K"],
    ["undo-edit", "P+z"]
  ],
  vox_fill_edit: [
    ["orbit", "I"],
    ["pan", "_S|O"],
    ["zoom", "R"],
    ["exit", "~|@|Z"],
    ["fill", "K"],
    ["undo-edit", "P+z"]
  ],
  vox_attach_edit: [
    ["orbit", "I"],
    ["pan", "_S|O"],
    ["zoom", "R"],
    ["exit", "~|@|Z"],
    ["attach", "K"],
    ["undo-edit", "P+z"]
  ],
  vox_remove_edit: [
    ["orbit", "I"],
    ["pan", "_S|O"],
    ["zoom", "R"],
    ["exit", "~|@|Z"],
    ["erase", "K"],
    ["undo-edit", "P+z"]
  ],
  vox_paint_edit: [
    ["orbit", "I"],
    ["pan", "_S|O"],
    ["zoom", "R"],
    ["exit", "~|@|Z"],
    ["paint", "K"],
    ["undo-edit", "P+z"]
  ],
  pdf: [["page", "q\\e"], ...objectCommonTips],
  text: [
    ["edit", "~|@", "mediaTextEdit"],
    ["color", "q\\e"],
    ["font", "t\\g"],
    ...objectCommonTips.filter(t => t[0] !== "open")
  ],
  rotate: [["yawpitch", "G"], ["roll", "L+G"], ["nosnap", "_H"]],
  scale: [["scale", "G,R"]],
  slide: [["movexz", "G"], ["movey", "R"], ["nosnap", "_H"]],
  stack: [["stack", "G"], ["spin", "q\\e"], ["flip", "t\\g"], ["nosnap", "_H"]],
  lift: [["movey", "G"], ["nosnap", "_H"]],
  focus: [["orbit", "I"], ["zoom", "R"], ["exit", "f|Z"]],
  focus_edit: [["orbit", "I"], ["pan", "_S|O"], ["zoom", "R"], ["exit", "~|@|Z"]],
  text_editor: [
    ["close", "~|@", "mediaTextEditClose"],
    ["bold", "L+b"],
    ["italic", "L+i"],
    ["underline", "L+u"],
    ["list", "-,S"]
  ]
};

const KEY_TIP_TYPES = Object.keys(TIP_DATA);
let equippedEmojiUrl;

const itemForData = ([label, keys, flag], triggerMode) => {
  let tipLabel;

  if (label === "jump" || label === "shoot") {
    if (triggerMode === "builder") {
      if (label === "jump") {
        // No analog in builder mode
        return null;
      }

      const { store } = window.APP;
      const { r, g, b } = storedColorToRgb(store.state.equips.color);
      const cssRgb = objRgbToCssRgb({ r: r / 255.0, g: g / 255.0, b: b / 255.0 });
      tipLabel = (
        <TipLabel key={label}>
          <ColorSwatch className="equipped-color" style={{ backgroundColor: cssRgb }} />
          <FormattedMessage id={`key-tips.build`} />
        </TipLabel>
      );
    } else {
      const emoji = window.APP.store.state.equips.launcher;
      equippedEmojiUrl = imageUrlForEmoji(emoji, 64);

      tipLabel = (
        <TipLabel key={label}>
          <img className="equipped-emoji" src={equippedEmojiUrl} crossOrigin="anonymous" />
          <FormattedMessage id={`key-tips.${label}`} />
        </TipLabel>
      );
    }
  } else if (label === "attach" || label === "paint") {
    const { store } = window.APP;
    const { r, g, b } = storedColorToRgb(store.state.equips.color);
    const cssRgb = objRgbToCssRgb({ r: r / 255.0, g: g / 255.0, b: b / 255.0 });

    tipLabel = (
      <TipLabel key={label}>
        <ColorSwatch className="equipped-color" style={{ backgroundColor: cssRgb }} />
        <FormattedMessage id={`key-tips.${label}`} />
      </TipLabel>
    );
  } else {
    tipLabel = (
      <TipLabel key={label}>
        <FormattedMessage id={`key-tips.${label}`} />
      </TipLabel>
    );
  }

  // Hacky, if key is _ then the next key is labelled "hold". If it's __ then it's a label before
  // everything. Type 0 is no hold, type 1 is hold shown inside of key div, type 2 is non-button label.
  let holdType = 0;

  const keyLabels = keys.split("").map(key => {
    if (key === "_") {
      holdType++;
      return;
    }

    const els = [];

    if (holdType) {
      if (key === "S") {
        if (holdType === 1) {
          els.push(
            <NamedKey key={key}>
              <FormattedMessage id="key-tips.hold" />&nbsp;&nbsp;<FormattedMessage id="key-tips.space" />
            </NamedKey>
          );
        } else {
          els.push(
            <KeyWideSeparator key="hold">
              <FormattedMessage id="key-tips.hold" />
            </KeyWideSeparator>
          );
          els.push(
            <NamedKey key={key}>
              <FormattedMessage id="key-tips.space" />
            </NamedKey>
          );
        }
      } else if (key === "H") {
        if (holdType === 1) {
          els.push(
            <NamedKey key={key}>
              <FormattedMessage id="key-tips.hold" />&nbsp;&nbsp;<FormattedMessage id="key-tips.shift" />
            </NamedKey>
          );
        } else {
          els.push(
            <KeyWideSeparator key="hold">
              <FormattedMessage id="key-tips.hold" />
            </KeyWideSeparator>
          );
          els.push(
            <NamedKey key={key}>
              <FormattedMessage id="key-tips.shift" />
            </NamedKey>
          );
        }
      } else if (key === "L") {
        if (holdType === 1) {
          els.push(
            <NamedKey key={key}>
              <FormattedMessage id="key-tips.hold" />&nbsp;&nbsp;<FormattedMessage id="key-tips.control" />
            </NamedKey>
          );
        } else {
          els.push(
            <KeyWideSeparator key="hold">
              <FormattedMessage id="key-tips.hold" />
            </KeyWideSeparator>
          );
          els.push(
            <NamedKey key={key}>
              <FormattedMessage id="key-tips.control" />
            </NamedKey>
          );
        }
      } else if (key === "P") {
        if (holdType === 1) {
          els.push(
            <NamedKey key={key}>
              <FormattedMessage id="key-tips.hold" />&nbsp;&nbsp;<FormattedMessage id="key-tips.alt" />
            </NamedKey>
          );
        } else {
          els.push(
            <KeyWideSeparator key="hold">
              <FormattedMessage id="key-tips.hold" />
            </KeyWideSeparator>
          );
          els.push(
            <NamedKey key={key}>
              <FormattedMessage id="key-tips.alt" />
            </NamedKey>
          );
        }
      } else {
        if (holdType === 1) {
          els.push(
            <NamedKey key={key}>
              <FormattedMessage id="key-tips.hold" />&nbsp;&nbsp;<span className="caps">{key}</span>
            </NamedKey>
          );
        } else {
          els.push(
            <KeySeparator key="hold">
              <FormattedMessage id="key-tips.hold" />
            </KeySeparator>
          );
          els.push(
            <NamedKey key={key}>
              <span className="caps">{key}</span>
            </NamedKey>
          );
        }
      }
    } else {
      if (key === "S") {
        els.push(
          <WideNamedKey key={key}>
            <FormattedMessage id="key-tips.space" />
          </WideNamedKey>
        );
      } else if (key === "E") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.enter" />
          </NamedKey>
        );
      } else if (key === "H") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.shift" />
          </NamedKey>
        );
      } else if (key === "R") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.scroll" />
          </NamedKey>
        );
      } else if (key === "T") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.tab" />
          </NamedKey>
        );
      } else if (key === "G") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.leftDrag" />
          </NamedKey>
        );
      } else if (key === "I") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.rightDrag" />
          </NamedKey>
        );
      } else if (key === "O") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.middleDrag" />
          </NamedKey>
        );
      } else if (key === "K") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.left" />
          </NamedKey>
        );
      } else if (key === "D") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.middle" />
          </NamedKey>
        );
      } else if (key === "Z") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.escape" />
          </NamedKey>
        );
      } else if (key === "L") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.control" />
          </NamedKey>
        );
      } else if (key === "P") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.alt" />
          </NamedKey>
        );
      } else if (key === " ") {
        els.push(<KeySeparator key={key} />);
      } else if (key === "|") {
        els.push(
          <KeyWideSeparator key={key}>
            <FormattedMessage id="key-tips.or" />
          </KeyWideSeparator>
        );
      } else if (key === "+") {
        els.push(<KeySmallSeparator key={key}>{key}</KeySmallSeparator>);
      } else if (key === ",") {
        els.push(<KeySeparator key={key}>{key}</KeySeparator>);
      } else if (key === ";") {
        els.push(<KeySeparator key={key}>or</KeySeparator>);
      } else if (key === "^") {
        els.push(<KeySeparator key={key}>-</KeySeparator>);
      } else if (key === "\\") {
        els.push(<KeySeparator key={key}>/</KeySeparator>);
      } else if (key === " ") {
        els.push(<KeySeparator key={key}>&nbsp;</KeySeparator>);
      } else if (key === "~" || key === "*" || key === "-") {
        // Some characters are hard to see
        els.push(<BigLetterKey key={key}>{key}</BigLetterKey>);
      } else {
        els.push(<LetterKey key={key}>{key}</LetterKey>);
      }
    }

    holdType = 0;

    return els;
  });

  // Allow clicking on help item
  const style = label === "help" || label === "hide" ? { pointerEvents: "auto" } : null;
  const component = label === "help" || label === "hide" ? KeyTipButton : KeyTipItem;

  let className = "";

  if (flag && !window.APP.store.state.activity[flag]) {
    if (flag === "chat") {
      // Special case: highlight chat when others are co-present
      const hubChannel = window.APP.hubChannel;

      const hasOtherOccupants =
        hubChannel.presence && hubChannel.presence.state && Object.entries(hubChannel.presence.state).length > 1;
      className = hasOtherOccupants ? "highlight" : "";
    } else {
      className = "highlight";
    }
  }

  return React.createElement(component, { key: label, style: style, className }, [keyLabels, tipLabel]);
};

const genTips = (tips, triggerMode) => {
  return (
    <KeyTipsElement key={tips} className={tips}>
      {TIP_DATA[tips].map(tip => itemForData(tip, triggerMode))}
    </KeyTipsElement>
  );
};

const KeyTipChooser = styled.div`
  & > div {
    opacity: 0;
    transition: opacity 75ms linear;
  }

  ${KEY_TIP_TYPES.map(
    type =>
      `&[data-show-tips="${type}"] .${type} {
      transition-duration: 25ms;
      opacity: 1;
    }`
  )};
`;

const KeyTips = forwardRef((props, ref) => {
  const { builderSystem, launcherSystem } = SYSTEMS;
  const [flagVersion, setFlagVersion] = useState(0);
  const [triggerMode, setTriggerMode] = useState(launcherSystem.enabled ? "launcher" : "builder");
  const store = window.APP.store;

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

  useEffect(
    () => {
      const handler = () => setFlagVersion(flagVersion + 1);
      store.addEventListener("activityflagged", handler);
      return () => store.removeEventListener("activityflagged", handler);
    },
    [store, flagVersion]
  );

  useEffect(
    () => {
      const handler = () => setFlagVersion(flagVersion + 1);
      store.addEventListener("activityflagged", handler);
      return () => store.removeEventListener("activityflagged", handler);
    },
    [store, flagVersion]
  );

  // When state store changes, update emoji + color swatches.
  useEffect(
    () => {
      const handler = () => {
        const { store } = window.APP;
        const { r, g, b } = storedColorToRgb(store.state.equips.color);
        const cssRgb = objRgbToCssRgb({ r: r / 255.0, g: g / 255.0, b: b / 255.0 });
        const emojiEls = document.querySelectorAll("#key-tips .equipped-emoji");
        const colorEls = document.querySelectorAll("#key-tips .equipped-color");
        const emoji = store.state.equips.launcher;
        equippedEmojiUrl = imageUrlForEmoji(emoji, 64);

        for (let i = 0; i < emojiEls.length; i++) {
          emojiEls[i].setAttribute("src", equippedEmojiUrl);
        }

        for (let i = 0; i < colorEls.length; i++) {
          colorEls[i].setAttribute("style", `background-color: ${cssRgb}`);
        }
      };
      store.addEventListener("statechanged-equips", handler);
      return () => store.removeEventListener("statechanged-equips", handler);
    },
    [store]
  );

  return (
    <KeyTipChooser {...props} ref={ref}>
      {[...Object.keys(TIP_DATA)].map(tip => genTips(tip, triggerMode))}
    </KeyTipChooser>
  );
});

KeyTips.displayName = "KeyTips";
KeyTips.propTypes = {};

export { KeyTips as default, KEY_TIP_TYPES };
