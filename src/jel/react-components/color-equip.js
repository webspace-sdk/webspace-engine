import React, { useRef, useState, useEffect, useCallback } from "react";
//import PropTypes from "prop-types";
import Tooltip from "./tooltip";
import { useSingleton } from "@tippyjs/react";
import styled from "styled-components";
import { getMessages } from "../../hubs/utils/i18n";
import ColorPicker from "./color-picker";
import SegmentControl from "./segment-control";
import { showTargetAboveElement } from "../utils/popup-utils";
import { rgbToStoredColor, storedColorToRgb } from "../../hubs/storage/store";
import restoreIcon from "../../assets/jel/images/icons/restore.svgi";
import { DEFAULT_COLORS } from "../../hubs/storage/store";

const NUM_SLOTS = 10;
const PAGE_ITEMS = [
  { id: "color-equip.page-0", text: "" },
  { id: "color-equip.page-1", text: "" },
  { id: "color-equip.page-2", text: "" },
  { id: "color-equip.page-3", text: "" },
  { id: "color-equip.page-4", text: "" },
  { id: "color-equip.page-5", text: "" },
  { id: "color-equip.page-6", text: "" },
  { id: "color-equip.page-7", text: "" },
  { id: "color-equip.page-8", text: "" },
  { id: "color-equip.page-9", text: "" }
];

const PickerWrap = styled.div`
  width: 128px;
  height: 128px;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 11;
  border: 3px solid var(--secondary-panel-background-color);
  box-shadow: 0px 12px 28px var(--menu-shadow-color);
  border-radius: 9px;

  opacity: 0;
  pointer-events: none;

  transition: opacity 0.15s linear;

  & :local(.slide-down-when-popped) {
    transform: translateY(-4px) scale(0.95, 0.95);
    transition: transform 0.15s linear;
  }

  & :local(.slide-up-when-popped) {
    transform: translateY(4px) scale(0.95, 0.95);
    transition: transform 0.15s linear;
  }

  &:focus-within {
    opacity: 1;
    pointer-events: auto;

    transition: opacity 0.15s linear;

    & :local(.slide-down-when-popped),
    :local(.slide-up-when-popped) {
      transform: translateY(0px) scale(1, 1);
      transition: transform 0.15s cubic-bezier(0.76, -0.005, 0.515, 2.25);
    }
  }
`;

const ColorEquipElement = styled.div`
  padding: 0;
  margin: 0;
  position: relative;
  display: flex;
  width: 100%;
  height: 280px;
  margin-bottom: 12px;
`;

const PagerWrap = styled.div`
  padding: 0;
  margin: 0;
  position: absolute;
  top: 200px;
  left: calc((100% - 220px) / 2);
  width: 100%;
  height: 100%;
  display: flex;
  z-index: 11;
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
    opacity: 0.9;
  }

  &.slot-0-hover svg.slot-0 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-1-hover svg.slot-1 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-2-hover svg.slot-2 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-3-hover svg.slot-3 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-4-hover svg.slot-4 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-5-hover svg.slot-5 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-6-hover svg.slot-6 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-7-hover svg.slot-7 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-8-hover svg.slot-8 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-9-hover svg.slot-9 {
    transform: scale(1.03, 1.03);
    box-shadow: 4px;
  }

  &.slot-0-selected svg.slot-0 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
  }

  &.slot-1-selected svg.slot-1 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
  }

  &.slot-2-selected svg.slot-2 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
  }

  &.slot-3-selected svg.slot-3 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
  }

  &.slot-4-selected svg.slot-4 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
  }

  &.slot-5-selected svg.slot-5 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
  }

  &.slot-6-selected svg.slot-6 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
  }

  &.slot-7-selected svg.slot-7 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
  }

  &.slot-8-selected svg.slot-8 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
  }

  &.slot-9-selected svg.slot-9 {
    opacity: 1;
    transform: scale(1.05, 1.05);
    box-shadow: 4px;
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
  width: 56px;
  height: 56px;
  box-sizing: content-box;
  z-index: 100;
  top: 148px;
  left: calc(50% - 32px);

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
  border: 4px solid transparent;
  border-radius: 32px;

  &:active {
    transition-duration: 0s;
    transform: translateY(1px);
  }

  &[data-selected-slot] {
    -webkit-animation: select-animation 0.3s 1 ease-in-out;
    animation: select-animation 0.3s 1 ease-in-out;
  }

  &:hover {
    opacity: 0.9;
  }
`;

const RestoreButton = styled.button`
  position: absolute;
  bottom: 14px;
  right: 18px;
  width: 24px;
  height: 24px;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  border: 0;
  z-index: 12;
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

const buildColorsFromStore = page => {
  const storeState = window.APP.store.state.equips;
  const colors = [];

  for (let i = 0; i < 10; i++) {
    colors.push(storedColorToRgb(storeState[`colorSlot${page * 10 + i + 1}`]));
  }

  return colors;
};

const ColorEquip = () => {
  const store = window.APP.store;
  const messages = getMessages();
  const [selectedPage, setSelectedPage] = useState(0);

  const baseIndex = selectedPage * 10;

  const [hoverSlot, setHoverSlot] = useState(null);
  const [isClicking, setIsClicking] = useState(false);
  const colors = buildColorsFromStore(selectedPage);
  const [selectedSlot, setSelectedSlot] = useState(
    colors.indexOf(colors.find(color => rgbToStoredColor(color) === store.state.equips.color))
  );
  const [tipSource, tipTarget] = useSingleton();
  const colorPickerWrapRef = useRef();
  const innerRef = useRef();
  const selectedButtonRef = useRef();

  const selectedColor = storedColorToRgb(store.state.equips.color || 0);
  const [pickerColorValue, setPickerColorValue] = useState(selectedColor);
  const { builderSystem } = SYSTEMS;

  const onRestoreClick = useCallback(
    () => {
      const newValues = {
        color: DEFAULT_COLORS[selectedPage * 10]
      };

      for (let i = 0; i < 10; i++) {
        const idx = selectedPage * 10 + i;
        const color = DEFAULT_COLORS[idx];
        newValues[`colorSlot${idx + 1}`] = color;
      }

      store.update({ equips: newValues });
    },
    [selectedPage, store]
  );

  useEffect(
    () => {
      if (!builderSystem) return;

      const handler = ({ detail: rgb }) => {
        const newColor = rgbToStoredColor(rgb);

        // When picker runs, check to see if color is already in here, if so, just switch to it.
        for (let i = 0; i < NUM_SLOTS; i++) {
          if (store.state.equips[`colorSlot${baseIndex + i + 1}`] === newColor) {
            store.update({ equips: { color: rgbToStoredColor(rgb) } });

            return;
          }
        }

        store.update({
          equips: { color: rgbToStoredColor(rgb), [`colorSlot${baseIndex + selectedSlot + 1}`]: rgbToStoredColor(rgb) }
        });
      };

      builderSystem.addEventListener("picked_color", handler);
      return () => builderSystem.removeEventListener("picked_color", handler);
    },
    [builderSystem, store, selectedSlot, baseIndex]
  );

  // Animate center color when slot changes.
  useEffect(
    () => {
      if (!selectedButtonRef || !selectedButtonRef.current) return;
      const el = selectedButtonRef.current;
      if (el.getAttribute("data-selected-slot") !== `${selectedSlot}`) {
        el.removeAttribute("data-selected-slot");
        el.offsetWidth; // Restart animation hack.
        el.setAttribute("data-selected-slot", `${selectedSlot}`);
      }
    },
    [selectedButtonRef, selectedSlot]
  );

  // When state store changes or page changes, update ring.
  useEffect(
    () => {
      const handler = () => {
        if (!store || !store.state) return;
        const colors = buildColorsFromStore(selectedPage);
        const hasMatchingSlotSelected = rgbToStoredColor(colors) === store.state.equips.color;

        if (!hasMatchingSlotSelected) {
          // Update selected slot to reflect current color.
          const selectedSlot = colors.indexOf(
            colors.find(color => rgbToStoredColor(color) === store.state.equips.color)
          );
          setSelectedSlot(selectedSlot);
        }

        setPickerColorValue(storedColorToRgb(store.state.equips.color));
      };
      store.addEventListener("statechanged-equips", handler);
      return () => store.removeEventListener("statechanged-equips", handler);
    },
    [store, selectedPage, selectedSlot, setSelectedSlot]
  );

  const onColorChange = useCallback(({ rgb }) => setPickerColorValue(rgb), [setPickerColorValue]);

  const onColorChangeComplete = useCallback(
    ({ rgb }) => {
      store.update({
        equips: { color: rgbToStoredColor(rgb), [`colorSlot${baseIndex + selectedSlot + 1}`]: rgbToStoredColor(rgb) }
      });
    },
    [store, selectedSlot, baseIndex]
  );

  const onSelectedColorClicked = useCallback(
    () => {
      if (!selectedButtonRef) return;
      const inner = innerRef.current;
      const pickerWrap = colorPickerWrapRef.current;
      showTargetAboveElement(selectedButtonRef.current, inner, pickerWrap, 120, 34);
    },
    [colorPickerWrapRef, innerRef, selectedButtonRef]
  );

  const onPageChanged = useCallback(
    (_, idx) => {
      setSelectedPage(idx);
      setSelectedSlot(0);

      const colors = buildColorsFromStore(idx);
      store.update({ equips: { color: rgbToStoredColor(colors[0]) } });
    },
    [setSelectedPage, store]
  );

  return (
    <ColorEquipElement ref={innerRef}>
      <Tooltip delay={750} singleton={tipSource} />
      <ColorEquipOuter>
        <Tooltip content={messages[`color-equip.restore-tip`]} delay={750} placement="left" key={"restore"}>
          <RestoreButton dangerouslySetInnerHTML={{ __html: restoreIcon }} onClick={onRestoreClick} />
        </Tooltip>
        <ColorEquipInner
          className={`${
            hoverSlot !== null ? `slot-${hoverSlot}-${isClicking ? "active" : "hover"}` : ""
          } slot-${selectedSlot}-selected`}
        >
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
                  onClick={() => {
                    store.update({ equips: { color: rgbToStoredColor(colors[idx]) } });
                    setSelectedSlot(idx);
                  }}
                />
              </Tooltip>
            ))}
          <Tooltip content={messages[`color-equip.select-slot`]} placement="left" key={`slot-choose-tip`} delay={0}>
            <SelectedButton
              ref={selectedButtonRef}
              style={{
                backgroundColor: `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`,
                borderColor: `rgba(${Math.max(0, selectedColor.r - 64)}, ${Math.max(
                  0,
                  selectedColor.g - 64
                )}, ${Math.max(0, selectedColor.b - 64)})`
              }}
              onClick={onSelectedColorClicked}
            />
          </Tooltip>

          {colors.length > 0 &&
            SLOT_SLICE_TRANSFORMS.map((transform, idx) => (
              <svg
                key={idx}
                className={`slot-${idx}`}
                style={{
                  position: "absolute",
                  left: "calc(-10%)",
                  zIndex: "6",
                  color: `rgba(${colors[idx].r}, ${colors[idx].g}, ${colors[idx].b}`
                }}
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
      <PagerWrap>
        <SegmentControl
          rows={2}
          cols={5}
          selectedIndices={[selectedPage]}
          items={PAGE_ITEMS}
          onChange={onPageChanged}
        />
      </PagerWrap>
      <PickerWrap ref={colorPickerWrapRef} tabIndex={-1}>
        <ColorPicker color={pickerColorValue} onChange={onColorChange} onChangeComplete={onColorChangeComplete} />
      </PickerWrap>
    </ColorEquipElement>
  );
};

ColorEquip.displayName = "ColorEquip";

ColorEquip.propTypes = {};

export { ColorEquip as default };
