import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import Tooltip from "./tooltip";
import { getMessages } from "../utils/i18n";
import { useSingleton } from "@tippyjs/react";
import { FormattedMessage } from "react-intl";
import { Label, InputWrap, PanelWrap, Checkbox, Radio, RadioWrap } from "./form-components";
import styled from "styled-components";
import ColorPicker, { rgbToPickerValue } from "./color-picker";
import { objRgbToCssRgb } from "../utils/dom-utils";
import { WORLD_COLOR_PRESETS } from "../utils/world-color-presets";
import AtomMetadata, { ATOM_TYPES } from "../utils/atom-metadata";
import BigIconButton from "./icon-button";
import presetsIcon from "../assets/images/icons/presets.svgi";
import { showTargetBelowElement } from "../utils/popup-utils";
import { WORLD_TYPES } from "../systems/terrain-system";

function almostEqual(a, b, epsilon = 0.01) {
  return Math.abs(a - b) < epsilon;
}

const metadata = new AtomMetadata(ATOM_TYPES.HUB);
metadata._metadata.set("abc123", { roles: { space: "viewer" } });

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("popup-root")));

const Swatch = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 3px;
  border: 1px solid black;
  margin: 4px 6px;
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;

  &.preset {
    opacity: 0.8;
    transform: scale(1, 1);
    border: 2px solid var(--menu-cell-border-color);
    border-radius: 4px;

    transition: opacity 0.075s linear, transform 0.075s linear;
  }

  &.preset:hover {
    opacity: 1;
    transform: scale(1.1, 1.1);
  }
`;

const SwatchInner = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 2px solid black;
`;

const Swatches = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  margin-left: 6px;
`;

const Presets = styled.div`
  display: grid;
  grid-template-columns: 32px 32px 32px 32px;
  grid-template-rows: 32px 32px 32px 32px;
  grid-gap: 6px;
  background-color: var(--menu-cell-background-color);
  padding-bottom: 12px;
  padding-top: 2px;
`;

const popupCss = `
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
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

const PickerWrap = styled.div`
  width: 128px;
  height: 128px;
  ${popupCss};
`;

const PresetsWrap = styled.div`
  width: 164px;
  height: 164px;
  ${popupCss};
`;

const EnvironmentSettingsPopup = ({
  setPopperElement,
  styles,
  attributes,
  children,
  onColorsChanged,
  onColorChangeComplete,
  onTypeChanged,
  onPresetColorsHovered,
  onPresetColorsClicked,
  hubId,
  hubMetadata,
  hubCan
}) => {
  const { store } = window.APP;
  const [tipSource, tipTarget] = useSingleton();
  const [selectedColor, setSelectedColor] = useState(null);
  const [pickerColorValue, setPickerColorValue] = useState({ r: 0, g: 0, b: 0 });
  const [groundColor, setGroundColor] = useState(null);
  const groundSwatchRef = useRef();
  const [edgeColor, setEdgeColor] = useState(null);
  const edgeSwatchRef = useRef();
  const [leavesColor, setLeavesColor] = useState(null);
  const leavesSwatchRef = useRef();
  const [barkColor, setBarkColor] = useState(null);
  const barkSwatchRef = useRef();
  const [rockColor, setRockColor] = useState(null);
  const rockSwatchRef = useRef();
  const [grassColor, setGrassColor] = useState(null);
  const grassSwatchRef = useRef();
  const [skyColor, setSkyColor] = useState(null);
  const skySwatchRef = useRef();
  const [waterColor, setWaterColor] = useState(null);
  const [enableAmbience, setEnableAmbience] = useState(!store.state.preferences.disableAudioAmbience);
  const [worldType, setWorldType] = useState(null);
  const waterSwatchRef = useRef();
  const colorPickerWrapRef = useRef();
  const panelRef = useRef();
  const presetButtonRef = useRef();
  const presetPickerWrapRef = useRef();

  const updateFromWorldMetadata = useCallback(
    () => {
      if (!hubId || !hubMetadata) return;

      const { world } = hubMetadata.getMetadata(hubId);
      if (!world) return;

      const fieldList = [
        ["ground", groundColor, setGroundColor],
        ["edge", edgeColor, setEdgeColor],
        ["leaves", leavesColor, setLeavesColor],
        ["bark", barkColor, setBarkColor],
        ["rock", rockColor, setRockColor],
        ["grass", grassColor, setGrassColor],
        ["sky", skyColor, setSkyColor],
        ["water", waterColor, setWaterColor]
      ];

      fieldList.forEach(([name, value, setter]) => {
        const r = world[`${name}_color`].r || 0;
        const g = world[`${name}_color`].g || 0;
        const b = world[`${name}_color`].b || 0;

        if (!value || (!almostEqual(r, value.r) || !almostEqual(g, value.g) || !almostEqual(b, value.b))) {
          setter({ r, g, b });
        }
      });

      setWorldType(world.type);
    },
    [hubId, hubMetadata, groundColor, edgeColor, leavesColor, barkColor, rockColor, grassColor, skyColor, waterColor]
  );

  useEffect(
    () => {
      const handler = () => {
        setEnableAmbience(!store.state.preferences.disableAudioAmbience);
      };
      store.addEventListener("statechanged-preferences", handler);
      return () => store.removeEventListener("statechanged-preferences", handler);
    },
    [store, setEnableAmbience]
  );

  // Update from the world metadata every time the hub changes.
  useEffect(
    () => {
      if (!hubId || !hubMetadata) return;

      updateFromWorldMetadata();

      hubMetadata.subscribeToMetadata(hubId, updateFromWorldMetadata);
      return () => hubMetadata.unsubscribeFromMetadata(updateFromWorldMetadata);
    },
    [hubId, hubMetadata, updateFromWorldMetadata]
  );

  const showPresetPicker = useCallback(
    () => {
      const presetButton = presetButtonRef.current;
      const panel = panelRef.current;
      const presetPickerWrap = presetPickerWrapRef.current;
      showTargetBelowElement(presetButton, panel, presetPickerWrap, 42, 66);
    },
    [presetPickerWrapRef, presetButtonRef, panelRef]
  );

  const showPickerAtRef = useCallback(
    ref => {
      const swatch = ref.current;
      const panel = panelRef.current;
      const pickerWrap = colorPickerWrapRef.current;
      showTargetBelowElement(swatch, panel, pickerWrap, 42, 48);
    },
    [colorPickerWrapRef, panelRef]
  );

  const onColorChange = useCallback(
    ({ rgb }) => {
      const { r, g, b } = rgb;
      const newColor = { r: r / 255.0, g: g / 255.0, b: b / 255.0 };
      let currentGroundColor = groundColor;
      let currentEdgeColor = edgeColor;
      let currentLeavesColor = leavesColor;
      let currentBarkColor = barkColor;
      let currentRockColor = rockColor;
      let currentGrassColor = grassColor;
      let currentSkyColor = skyColor;
      let currentWaterColor = waterColor;

      switch (selectedColor) {
        case "ground":
          setGroundColor(newColor);
          currentGroundColor = newColor;
          break;
        case "edge":
          setEdgeColor(newColor);
          currentEdgeColor = newColor;
          break;
        case "leaves":
          setLeavesColor(newColor);
          currentLeavesColor = newColor;
          break;
        case "bark":
          setBarkColor(newColor);
          currentBarkColor = newColor;
          break;
        case "rock":
          setRockColor(newColor);
          currentRockColor = newColor;
          break;
        case "grass":
          setGrassColor(newColor);
          currentGrassColor = newColor;
          break;
        case "sky":
          setSkyColor(newColor);
          currentSkyColor = newColor;
          break;
        case "water":
          setWaterColor(newColor);
          currentWaterColor = newColor;
          break;
      }

      setPickerColorValue(rgb);

      if (onColorsChanged) {
        onColorsChanged(
          currentGroundColor,
          currentEdgeColor,
          currentLeavesColor,
          currentBarkColor,
          currentRockColor,
          currentGrassColor,
          currentSkyColor,
          currentWaterColor
        );
      }
    },
    [
      selectedColor,
      groundColor,
      edgeColor,
      leavesColor,
      barkColor,
      rockColor,
      grassColor,
      skyColor,
      waterColor,
      onColorsChanged
    ]
  );

  const messages = getMessages();

  const showAllSettings = hubCan && hubCan("update_hub_meta", hubId);
  const groundSwatchClick = useCallback(
    () => {
      setPickerColorValue(rgbToPickerValue(groundColor));
      setSelectedColor("ground");
      showPickerAtRef(groundSwatchRef);
    },
    [showPickerAtRef, groundColor]
  );
  const grassSwatchClick = useCallback(
    () => {
      setPickerColorValue(rgbToPickerValue(grassColor));
      setSelectedColor("grass");
      showPickerAtRef(grassSwatchRef);
    },
    [showPickerAtRef, grassColor]
  );
  const skySwatchClick = useCallback(
    () => {
      setPickerColorValue(rgbToPickerValue(skyColor));
      setSelectedColor("sky");
      showPickerAtRef(skySwatchRef);
    },
    [showPickerAtRef, skyColor]
  );

  const waterSwatchClick = useCallback(
    () => {
      setPickerColorValue(rgbToPickerValue(waterColor));
      setSelectedColor("water");
      showPickerAtRef(waterSwatchRef);
    },
    [showPickerAtRef, waterColor]
  );

  const edgeSwatchClick = useCallback(
    () => {
      setPickerColorValue(rgbToPickerValue(edgeColor));
      setSelectedColor("edge");
      showPickerAtRef(edgeSwatchRef);
    },
    [showPickerAtRef, edgeColor]
  );

  const leavesSwatchClick = useCallback(
    () => {
      setPickerColorValue(rgbToPickerValue(leavesColor));
      setSelectedColor("leaves");
      showPickerAtRef(leavesSwatchRef);
    },
    [showPickerAtRef, leavesColor]
  );

  const barkSwatchClick = useCallback(
    () => {
      setPickerColorValue(rgbToPickerValue(barkColor));
      setSelectedColor("bark");
      showPickerAtRef(barkSwatchRef);
    },
    [showPickerAtRef, barkColor]
  );

  const rockSwatchClick = useCallback(
    () => {
      setPickerColorValue(rgbToPickerValue(rockColor));
      setSelectedColor("rock");
      showPickerAtRef(rockSwatchRef);
    },
    [showPickerAtRef, rockColor]
  );

  const flatRadioChange = useCallback(
    e => {
      if (e.target.checked) {
        onTypeChanged(WORLD_TYPES.FLAT);
      }
    },
    [onTypeChanged]
  );

  const plainsRadioChange = useCallback(
    e => {
      if (e.target.checked) {
        onTypeChanged(WORLD_TYPES.PLAINS);
      }
    },
    [onTypeChanged]
  );

  const hillsRadioChange = useCallback(
    e => {
      if (e.target.checked) {
        onTypeChanged(WORLD_TYPES.HILLS);
      }
    },
    [onTypeChanged]
  );

  const islandsRadioChange = useCallback(
    e => {
      if (e.target.checked) {
        onTypeChanged(WORLD_TYPES.ISLANDS);
      }
    },
    [onTypeChanged]
  );

  const presetsClick = useCallback(() => showPresetPicker(), [showPresetPicker]);
  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <Tooltip singleton={tipSource} />
      <PickerWrap ref={colorPickerWrapRef} tabIndex={-1}>
        <ColorPicker color={pickerColorValue} onChange={onColorChange} onChangeComplete={onColorChangeComplete} />
      </PickerWrap>
      <PresetsWrap ref={presetPickerWrapRef} tabIndex={-1}>
        <Presets>
          {WORLD_COLOR_PRESETS.map(({ ground_color: presetGroundColor, leaves_color: presetLeavesColor }, i) => {
            const innerBorderColor = {
              r: Math.max(0.0, presetLeavesColor.r - 0.4),
              g: Math.max(0.0, presetLeavesColor.g - 0.4),
              b: Math.max(0.0, presetLeavesColor.b - 0.4)
            };
            return (
              <Swatch
                onMouseOver={() => onPresetColorsHovered(i)}
                onMouseOut={() => {
                  const hub = hubMetadata.getMetadata(hubId);
                  SYSTEMS.terrainSystem.updateWorldForHub(hub);
                  SYSTEMS.atmosphereSystem.updateAtmosphereForHub(hub);
                }}
                onClick={() => {
                  onPresetColorsClicked(i);
                  presetPickerWrapRef.current.parentElement.focus();
                }}
                className="preset"
                key={`preset_${i}`}
                style={{
                  backgroundColor: objRgbToCssRgb(presetGroundColor)
                }}
              >
                <SwatchInner
                  style={{
                    borderColor: objRgbToCssRgb(innerBorderColor),
                    backgroundColor: objRgbToCssRgb(presetLeavesColor)
                  }}
                />
              </Swatch>
            );
          })}
        </Presets>
      </PresetsWrap>
      <PopupPanelMenu
        ref={panelRef}
        style={{ padding: "32px 0px", borderRadius: "12px" }}
        className="slide-up-when-popped"
      >
        <PanelWrap>
          <PanelSectionHeader style={{ marginLeft: 0 }}>
            <FormattedMessage id="environment-settings-popup.environment" />
          </PanelSectionHeader>
          {showAllSettings && (
            <InputWrap style={{ minHeight: "48px", marginBottom: "2px" }}>
              <Swatches>
                <Tooltip
                  content={messages[`environment-settings-popup.swatch-ground`]}
                  delay={0}
                  placement="top"
                  key="sw-ground"
                  singleton={tipTarget}
                >
                  <Swatch
                    ref={groundSwatchRef}
                    style={{ backgroundColor: groundColor && objRgbToCssRgb(groundColor) }}
                    onClick={groundSwatchClick}
                  />
                </Tooltip>
                <Tooltip
                  content={messages[`environment-settings-popup.swatch-grass`]}
                  delay={0}
                  placement="top"
                  key="sw-grass"
                  singleton={tipTarget}
                >
                  <Swatch
                    ref={grassSwatchRef}
                    style={{ backgroundColor: grassColor && objRgbToCssRgb(grassColor) }}
                    onClick={grassSwatchClick}
                  />
                </Tooltip>
                <Tooltip
                  content={messages[`environment-settings-popup.swatch-sky`]}
                  delay={0}
                  placement="top"
                  key="sw-sky"
                  singleton={tipTarget}
                >
                  <Swatch
                    ref={skySwatchRef}
                    style={{ backgroundColor: skyColor && objRgbToCssRgb(skyColor) }}
                    onClick={skySwatchClick}
                  />
                </Tooltip>
                <Tooltip
                  content={messages[`environment-settings-popup.swatch-water`]}
                  delay={0}
                  placement="top"
                  key="sw-water"
                  singleton={tipTarget}
                >
                  <Swatch
                    ref={waterSwatchRef}
                    style={{ backgroundColor: waterColor && objRgbToCssRgb(waterColor) }}
                    onClick={waterSwatchClick}
                  />
                </Tooltip>
                <Tooltip
                  content={messages[`environment-settings-popup.swatch-edge`]}
                  delay={0}
                  placement="top"
                  key="sw-edge"
                  singleton={tipTarget}
                >
                  <Swatch
                    ref={edgeSwatchRef}
                    style={{ backgroundColor: edgeColor && objRgbToCssRgb(edgeColor) }}
                    onClick={edgeSwatchClick}
                  />
                </Tooltip>
                <Tooltip
                  content={messages[`environment-settings-popup.swatch-leaves`]}
                  delay={0}
                  placement="top"
                  key="sw-leaves"
                  singleton={tipTarget}
                >
                  <Swatch
                    ref={leavesSwatchRef}
                    style={{ backgroundColor: leavesColor && objRgbToCssRgb(leavesColor) }}
                    onClick={leavesSwatchClick}
                  />
                </Tooltip>
                <Tooltip
                  content={messages[`environment-settings-popup.swatch-bark`]}
                  delay={0}
                  placement="top"
                  key="sw-bark"
                  singleton={tipTarget}
                >
                  <Swatch
                    ref={barkSwatchRef}
                    style={{ backgroundColor: barkColor && objRgbToCssRgb(barkColor) }}
                    onClick={barkSwatchClick}
                  />
                </Tooltip>
                <Tooltip
                  content={messages[`environment-settings-popup.swatch-rock`]}
                  delay={0}
                  placement="top"
                  key="sw-rock"
                  singleton={tipTarget}
                >
                  <Swatch
                    ref={rockSwatchRef}
                    style={{ backgroundColor: rockColor && objRgbToCssRgb(rockColor) }}
                    onClick={rockSwatchClick}
                  />
                </Tooltip>
                <Tooltip
                  content={messages[`environment-settings-popup.presets`]}
                  delay={0}
                  placement="top"
                  key="sw-presets"
                  singleton={tipTarget}
                >
                  <BigIconButton
                    style={{ width: "32px", height: "32px", marginLeft: "6px" }}
                    includeBorder={true}
                    iconSrc={presetsIcon}
                    ref={presetButtonRef}
                    onClick={presetsClick}
                  />
                </Tooltip>
              </Swatches>
            </InputWrap>
          )}
          {showAllSettings && (
            <InputWrap style={{ minHeight: "48px", marginLeft: "24px" }}>
              <RadioWrap>
                <Radio
                  type="radio"
                  id={"world_type_flat"}
                  name={"world_type"}
                  checked={worldType === WORLD_TYPES.FLAT}
                  value={WORLD_TYPES.FLAT}
                  onChange={flatRadioChange}
                />
                <Label htmlFor="world_type_flat" style={{ cursor: "pointer" }}>
                  <FormattedMessage id="environment-settings-popup.world-type-flat" />
                </Label>
              </RadioWrap>
              <RadioWrap>
                <Radio
                  type="radio"
                  id={"world_type_plains"}
                  name={"world_type"}
                  checked={worldType === WORLD_TYPES.PLAINS}
                  value={WORLD_TYPES.PLAINS}
                  onChange={plainsRadioChange}
                />
                <Label htmlFor="world_type_plains" style={{ cursor: "pointer" }}>
                  <FormattedMessage id="environment-settings-popup.world-type-plains" />
                </Label>
              </RadioWrap>
              <RadioWrap>
                <Radio
                  type="radio"
                  id={"world_type_hills"}
                  name={"world_type"}
                  checked={worldType === WORLD_TYPES.HILLS}
                  value={WORLD_TYPES.PLAINS}
                  onChange={hillsRadioChange}
                />
                <Label htmlFor="world_type_hills" style={{ cursor: "pointer" }}>
                  <FormattedMessage id="environment-settings-popup.world-type-hills" />
                </Label>
              </RadioWrap>
              <RadioWrap>
                <Radio
                  type="radio"
                  id={"world_type_islands"}
                  name={"world_type"}
                  checked={worldType === WORLD_TYPES.ISLANDS}
                  value={WORLD_TYPES.ISLANDS}
                  onChange={islandsRadioChange}
                />
                <Label htmlFor="world_type_islands" style={{ cursor: "pointer" }}>
                  <FormattedMessage id="environment-settings-popup.world-type-islands" />
                </Label>
              </RadioWrap>
            </InputWrap>
          )}
          <InputWrap style={{ minHeight: "48px", marginLeft: "24px" }}>
            <Checkbox
              checked={enableAmbience}
              type="checkbox"
              id="enable_ambience"
              name="enable_ambience"
              onChange={e => {
                const enabled = e.target.checked;
                store.update({ preferences: { disableAudioAmbience: !enabled } });
              }}
            />
            <Label htmlFor="enable_ambience" style={{ cursor: "pointer" }}>
              <FormattedMessage id="environment-settings-popup.sound" />
            </Label>
          </InputWrap>
        </PanelWrap>
      </PopupPanelMenu>
      {children}
    </div>
  );
  if (popupRoot) {
    return ReactDOM.createPortal(popupInput, popupRoot);
  } else {
    return popupInput;
  }
};

EnvironmentSettingsPopup.propTypes = {
  onColorsChanged: PropTypes.func,
  onColorChangeComplete: PropTypes.func,
  onTypeChanged: PropTypes.func,
  onPresetColorsHovered: PropTypes.func,
  onPresetColorsLeft: PropTypes.func,
  onPresetColorsClicked: PropTypes.func,
  hubId: PropTypes.string,
  hubMetadata: PropTypes.object,
  hubCan: PropTypes.func
};

export { EnvironmentSettingsPopup as default };
