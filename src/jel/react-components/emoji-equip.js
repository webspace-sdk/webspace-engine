import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { imageUrlForEmoji } from "../../hubs/utils/media-url-utils";

const EmojiEquipElement = styled.div`
  padding: 0;
  margin: 0;
  position: relative;
  display: flex;
  width: 100%;
  height: 200px;
`;

const EmojiEquipOuter = styled.div`
  padding: 0;
  margin: 0;
  position: absolute;
  top: -80px;
  left: 0px;
  width: 100%;
  height: 100%;
  display: flex;
`;

const EmojiEquipInner = styled.div`
  position: relative;
  padding: 0;
  margin: 0;
  width: 100%;
  height: 300px;
  display: flex;
  z-index: 10;

  & svg {
    color: var(--secondary-panel-item-background-color);
  }

  &.slot-0-hover svg.slot-0 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-1-hover svg.slot-1 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-2-hover svg.slot-2 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-3-hover svg.slot-3 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-4-hover svg.slot-4 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-5-hover svg.slot-5 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-6-hover svg.slot-6 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-7-hover svg.slot-7 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-8-hover svg.slot-8 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-9-hover svg.slot-9 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-0-active svg.slot-0 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-1-active svg.slot-1 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-2-active svg.slot-2 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-3-active svg.slot-3 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-4-active svg.slot-4 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-5-active svg.slot-5 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-6-active svg.slot-6 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-7-active svg.slot-7 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-8-active svg.slot-8 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-9-active svg.slot-9 {
    color: var(--panel-item-active-background-color);
  }
`;

const SlotButton = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  position: absolute;
  background-color: transparent;
  border: none;
  width: 48px;
  height: 48px;
  z-index: 100;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;

  img {
    width: 24px;
    height: 24px;
  }
`;

const SelectedButton = styled.div`
  position: absolute;
  width: 40px;
  height: 40px;
  z-index: 100;
  top: 162px;
  left: calc(50% - 20px);
`;

const SLOT_BUTTON_OFFSETS = [
  ["calc(50% + 9px - 12px)", "calc(50% - 46px - 12px)"],
  ["calc(50% + 42px - 12px)", "calc(50% - 20px - 12px)"],
  ["calc(50% + 56px - 12px)", "calc(50% + 17px - 12px)"],
  ["calc(50% + 42px - 12px)", "calc(50% + 56px - 12px)"],
  ["calc(50% + 9px - 12px)", "calc(50% + 82px - 12px)"],
  ["calc(50% - 31px - 12px)", "calc(50% + 82px - 12px)"],
  ["calc(50% - 66px - 12px)", "calc(50% + 56px - 12px)"],
  ["calc(50% - 80px - 12px)", "calc(50% + 17px - 12px)"],
  ["calc(50% - 66px - 12px)", "calc(50% - 20px - 12px)"],
  ["calc(50% - 31px - 12px)", "calc(50% - 46px - 12px)"]
];

const SLOT_SLICE_TRANSFORMS = [
  "rotate(-90) translate(-20)",
  "rotate(-54) translate(-12.22, 3.97)",
  "rotate(-18) translate(-3.59, 2.6)",
  "rotate(18) translate(2.60, -3.58)",
  "rotate(54) translate(3.97, -12.22)",
  "rotate(90) translate(0, -20)",
  "rotate(126) translate(-7.79, -23.98)",
  "rotate(162) translate(-16.41, -22.61)",
  "rotate(198) translate(-22.61, -16.43)",
  "rotate(234) translate(-23.96, -7.79)"
];

export default function EmojiEquip({ emoji }) {
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [hoverSlot, setHoverSlot] = useState(null);
  const [isClicking, setIsClicking] = useState(false);
  const storeState = window.APP.store.state.equips;

  const emojiMap = [
    storeState.launcher,
    storeState.launcherSlot1,
    storeState.launcherSlot2,
    storeState.launcherSlot3,
    storeState.launcherSlot4,
    storeState.launcherSlot5,
    storeState.launcherSlot6,
    storeState.launcherSlot7,
    storeState.launcherSlot8,
    storeState.launcherSlot9,
    storeState.launcherSlot10
  ].map(emoji => {
    return { emoji, imageUrl: imageUrlForEmoji(emoji, 64) };
  });

  return (
    <EmojiEquipElement>
      <EmojiEquipOuter>
        <EmojiEquipInner className={hoverSlot !== null ? `slot-${hoverSlot}-${isClicking ? "active" : "hover"}` : ""}>
          {SLOT_BUTTON_OFFSETS.map(([left, top], idx) => (
            <SlotButton
              style={{ left, top }}
              key={`slot-${idx}`}
              onMouseOver={() => setHoverSlot(idx)}
              onMouseOut={() => setHoverSlot(null)}
              onMouseDown={() => setIsClicking(true)}
              onMouseUp={() => setIsClicking(false)}
            >
              <img src={emojiMap[idx + 1].imageUrl} />
            </SlotButton>
          ))}
          <SelectedButton>
            <img src={emojiMap[0].imageUrl} />
          </SelectedButton>

          {SLOT_SLICE_TRANSFORMS.map((transform, idx) => (
            <svg
              key={idx}
              className={`slot-${idx}`}
              style={{ position: "absolute", left: "calc(-10%)" }}
              height="120%"
              width="120%"
              viewBox="0 0 20 20"
            >
              <circle
                r="5"
                cx="10"
                cy="10"
                fill="transparent"
                stroke={selectedSlot === idx ? "var(--panel-item-active-background-color)" : "currentColor"}
                strokeWidth="4"
                strokeDasharray="calc(10 * 31.42 / 100) 31.42"
                transform={transform}
              />
            </svg>
          ))}
        </EmojiEquipInner>
      </EmojiEquipOuter>
    </EmojiEquipElement>
  );
}

EmojiEquip.propTypes = {};
