import styled from "styled-components";
import { FormattedMessage } from "react-intl";
import React, { forwardRef } from "react";

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
  user-select: none;
`;

const KeyTipItem = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  margin: 6px 0;
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
  backdrop-filter: blur(8px);
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-tertiary-text-size);
  text-transform: uppercase;
  font: var(--key-label-font);
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
  backdrop-filter: blur(2px);
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
  backdrop-filter: blur(2px);
  font: var(--key-label-font);
`;

const TipLabel = styled.div`
  width: 60px;
  font-weight: var(--canvas-overlay-item-secodary-text-weight);
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-text-size);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  margin-left: 16px;
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

const objectCommonTips = [
  ["move", "G"],
  ["rotate", "_r"],
  ["scale", "_v"],
  ["focus", "_f"],
  ["clone", "c"],
  ["bake", "b"],
  ["remove", "x,x"]
];

const TIP_DATA = {
  closed: [["help", "?"]],
  idle_panels: [
    ["move", "w a s d"],
    ["run", "H"],
    ["look", "I"],
    ["create", "L+V|/"],
    ["chat", "S"],
    ["widen", "H+S"],
    ["hide", "?"]
  ],
  idle_full_muted: [
    ["move", "w a s d"],
    ["run", "H"],
    ["unmute", "L+m"],
    ["create", "L+V|/"],
    ["chat", "S"],
    ["narrow", "Z|H+S"],
    ["hide", "?"]
  ],
  idle_full_unmuted: [
    ["move", "w a s d"],
    ["run", "H"],
    ["mute", "L+m"],
    ["create", "L+V|/"],
    ["chat", "S"],
    ["narrow", "Z|H+S"],
    ["hide", "?"]
  ],
  pointer_exited_muted: [["layers", "H+q\\e"], ["unmute", "L+m"], ["hide", "?"]],
  pointer_exited_unmuted: [["layers", "v\\b"], ["mute", "L+m"], ["hide", "?"]],
  holding_interactable: [["pull", "R"], ["scale", "H+R"]],
  hover_interactable: objectCommonTips,
  video_playing: [["pause", "T"], ["seek", "q\\e"], ["volume", "R,t\\g"], ...objectCommonTips],
  video_paused: [["play", "T"], ["seek", "q\\e"], ["volume", "R,t\\g"], ...objectCommonTips],
  pdf: [["next", "T"], ["page", "q\\e"], ...objectCommonTips],
  text: [["edit", "T"], ...objectCommonTips.filter(t => t[0] !== "bake" && t[0] !== "clone")], // TODO bake text, clone text
  rotate: [["rotate", "G"]],
  scale: [["scale", "G"]],
  focus: [["orbit", "G"], ["zoom", "R"]]
};

const KEY_TIP_TYPES = Object.keys(TIP_DATA);

const itemForData = ([label, keys]) => {
  const tipLabel = (
    <TipLabel key={label}>
      <FormattedMessage id={`key-tips.${label}`} />
    </TipLabel>
  );

  // Hacky, if key is _ then the next key is labelled "hold"
  let hold = false;

  const keyLabels = keys.split("").map(key => {
    if (key === "_") {
      hold = true;
      return null;
    }

    const els = [];

    if (hold) {
      els.push(
        <NamedKey key={key}>
          <FormattedMessage id="key-tips.hold" />&nbsp;&nbsp;<span className="caps">{key}</span>
        </NamedKey>
      );
    } else {
      if (key === "S") {
        els.push(
          <WideNamedKey key={key}>
            <FormattedMessage id="key-tips.space" />
          </WideNamedKey>
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
            <FormattedMessage id="key-tips.drag" />
          </NamedKey>
        );
      } else if (key === "I") {
        els.push(
          <NamedKey key={key}>
            <FormattedMessage id="key-tips.rightdrag" />
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
      } else if (key === "\\") {
        els.push(<KeySeparator key={key}>/</KeySeparator>);
      } else {
        els.push(<LetterKey key={key}>{key}</LetterKey>);
      }
    }

    hold = false;

    return els;
  });

  // Allow clicking on help item
  const style = label === "help" || label === "hide" ? { pointerEvents: "auto" } : null;
  const component = label === "help" || label === "hide" ? KeyTipButton : KeyTipItem;

  return React.createElement(component, { key: label, style: style }, [keyLabels, tipLabel]);
};

const genTips = tips => {
  return (
    <KeyTipsElement key={tips} className={tips}>
      {TIP_DATA[tips].map(itemForData)}
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
  return (
    <KeyTipChooser {...props} ref={ref}>
      {[...Object.keys(TIP_DATA)].map(genTips)}
    </KeyTipChooser>
  );
});

KeyTips.displayName = "KeyTips";
KeyTips.propTypes = {};

export { KeyTips as default, KEY_TIP_TYPES };
