import React, { useState, useEffect, forwardRef } from "react";
import PropTypes from "prop-types";
import Tooltip from "./tooltip";
import { useSingleton } from "@tippyjs/react";
import styled from "styled-components";
import { getMessages } from "../../hubs/utils/i18n";

const ColorEquipElement = styled.div`
  padding: 0;
  margin: 0;
  position: relative;
  display: flex;
  width: 100%;
  height: 200px;
  margin-bottom: 12px;
`;

const ColorEquipOuter = styled.div`
  padding: 0;
  margin: 0;
  position: absolute;
  top: -80px;
  left: calc((100% - 220px) / 2);
  width: 100%;
  height: 100%;
  display: flex;
`;

const ColorEquipInner = styled.div`
  position: relative;
  padding: 0;
  margin: 0;
  width: 100%;
  width: 220px;
  height: 300px;
  display: flex;
  z-index: 10;

  & svg {
    color: var(--secondary-panel-item-background-color);
    opacity: 0.8;
  }

  &.slot-0-hover svg.slot-0 {
    opacity: 1;
  }

  &.slot-1-hover svg.slot-1 {
    opacity: 1;
  }

  &.slot-2-hover svg.slot-2 {
    opacity: 1;
  }

  &.slot-3-hover svg.slot-3 {
    opacity: 1;
  }

  &.slot-4-hover svg.slot-4 {
    opacity: 1;
  }

  &.slot-5-hover svg.slot-5 {
    opacity: 1;
  }

  &.slot-6-hover svg.slot-6 {
    opacity: 1;
  }

  &.slot-7-hover svg.slot-7 {
    opacity: 1;
  }

  &.slot-8-hover svg.slot-8 {
    opacity: 1;
  }

  &.slot-9-hover svg.slot-9 {
    opacity: 1;
  }

  &.slot-0-active svg.slot-0 {
    opacity: 0.9;
  }

  &.slot-1-active svg.slot-1 {
    opacity: 0.9;
  }

  &.slot-2-active svg.slot-2 {
    opacity: 0.9;
  }

  &.slot-3-active svg.slot-3 {
    opacity: 0.9;
  }

  &.slot-4-active svg.slot-4 {
    opacity: 0.9;
  }

  &.slot-5-active svg.slot-5 {
    opacity: 0.9;
  }

  &.slot-6-active svg.slot-6 {
    opacity: 0.9;
  }

  &.slot-7-active svg.slot-7 {
    opacity: 0.9;
  }

  &.slot-8-active svg.slot-8 {
    opacity: 0.9;
  }

  &.slot-9-active svg.slot-9 {
    opacity: 0.9;
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

  &:hover {
    transform: translateY(-1px);
  }
`;

const SelectedButton = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  position: absolute;
  width: 40px;
  height: 40px;
  box-sizing: content-box;
  z-index: 100;
  top: 152px;
  left: calc(50% - 28px);

  @keyframes select-animation {
    0%,
    100% {
      transform: scale(1, 1);
    }
    50% {
      transform: scale(1.15, 1.15);
    }
  }
  transition: transform 0.15s linear;
  border: 8px solid transparent;
  border-radius: 32px;

  &:active {
    transition-duration: 0s;
    transform: translateY(1px);
  }

  &[data-selected-slot] {
    -webkit-animation: select-animation 0.3s 1 ease-in-out;
    animation: select-animation 0.3s 1 ease-in-out;
  }
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

const buildColorsFromStore = store => {
  const storeState = store.state.equips;
  return [
    storeState.colorSlot1,
    storeState.colorSlot2,
    storeState.colorSlot3,
    storeState.colorSlot4,
    storeState.colorSlot5,
    storeState.colorSlot6,
    storeState.colorSlot7,
    storeState.colorSlot8,
    storeState.colorSlot9,
    storeState.colorSlot10
  ];
};

const ColorEquip = forwardRef(({ onSelectedColorClicked }, ref) => {
  const store = window.APP.store;
  const messages = getMessages();

  const [hoverSlot, setHoverSlot] = useState(null);
  const [isClicking, setIsClicking] = useState(false);
  const [colors, setColors] = useState(buildColorsFromStore(store));
  const [selectedSlot, setSelectedSlot] = useState(
    colors.indexOf(colors.find(({ color }) => color === store.state.equips.color))
  );
  const [tipSource, tipTarget] = useSingleton();

  const selectedColor = store.state.equips.color;

  // Animate center color when slot changes.
  useEffect(
    () => {
      if (!ref || !ref.current) return;
      const el = ref.current;
      if (el.getAttribute("data-selected-slot") !== `${selectedSlot}`) {
        el.removeAttribute("data-selected-slot");
        el.offsetWidth; // Restart animation hack.
        el.setAttribute("data-selected-slot", `${selectedSlot}`);
      }
    },
    [ref, selectedSlot]
  );

  // When state store changes, update ring.
  useEffect(
    () => {
      const handler = () => {
        const colors = buildColorsFromStore(store);
        setColors(colors);
        const selectedSlot = colors.indexOf(colors.find(({ color }) => color === store.state.equips.color));
        setSelectedSlot(selectedSlot);
      };
      store.addEventListener("statechanged-equips", handler);
      return () => store.removeEventListener("statechanged-equips", handler);
    },
    [store, setColors, setSelectedSlot]
  );

  return (
    <ColorEquipElement>
      <Tooltip delay={750} singleton={tipSource} />

      <ColorEquipOuter>
        <ColorEquipInner className={hoverSlot !== null ? `slot-${hoverSlot}-${isClicking ? "active" : "hover"}` : ""}>
          {colors.length > 0 &&
            SLOT_BUTTON_OFFSETS.map(([left, top], idx) => (
              <Tooltip
                content={messages[`color-equip.slot-${idx}-tip`].replaceAll("COLOR", colors[idx])}
                placement="left"
                key={`slot-${idx}-tip`}
                singleton={tipTarget}
              >
                <SlotButton
                  style={{ left, top }}
                  key={`slot-${idx}`}
                  onMouseOver={() => setHoverSlot(idx)}
                  onMouseOut={() => setHoverSlot(null)}
                  onMouseDown={() => setIsClicking(true)}
                  onMouseUp={() => setIsClicking(false)}
                  onClick={() => store.update({ equips: { color: colors[idx] } })}
                />
              </Tooltip>
            ))}
          <Tooltip
            content={messages[`color-equip.select-slot`]}
            placement="left"
            key={`slot-choose-tip`}
            singleton={tipTarget}
          >
            <SelectedButton
              ref={ref}
              style={{ backgroundColor: selectedColor }}
              onClick={() => onSelectedColorClicked()}
            />
          </Tooltip>

          {colors.length > 0 &&
            SLOT_SLICE_TRANSFORMS.map((transform, idx) => (
              <svg
                key={idx}
                className={`slot-${idx}`}
                style={{ position: "absolute", left: "calc(-10%)", zIndex: "6", color: colors[idx] }}
                height="120%"
                width="120%"
                viewBox="0 0 20 20"
              >
                <circle
                  r="5"
                  cx="10"
                  cy="10"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="3.14 31.42"
                  transform={transform}
                />
              </svg>
            ))}
        </ColorEquipInner>
      </ColorEquipOuter>
    </ColorEquipElement>
  );
});

ColorEquip.displayName = "ColorEquip";

ColorEquip.propTypes = {
  onSelectedColorClicked: PropTypes.func
};

export { ColorEquip as default };
