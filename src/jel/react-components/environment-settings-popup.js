import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import Tooltip from "./tooltip";
import { getMessages } from "../../hubs/utils/i18n";
import { useSingleton } from "@tippyjs/react";
import { FormattedMessage } from "react-intl";
import { Label, InputWrap, PanelWrap } from "./form-components";
import styled from "styled-components";
import ColorPicker from "./color-picker";
import { objRgbToCssRgb } from "../utils/dom-utils";
import { almostEqual } from "../../hubs/utils/three-utils";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

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
`;

const Swatches = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const PickerWrap = styled.div`
  width: 128px;
  height: 128px;
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

const EnvironmentSettingsPopup = ({
  setPopperElement,
  styles,
  attributes,
  children,
  onColorsChanged,
  onColorChangeComplete,
  hub,
  hubMetadata
}) => {
  const [tipSource, tipTarget] = useSingleton();
  const [selectedColor, setSelectedColor] = useState(null);
  const [groundColor, setGroundColor] = useState(null);
  const groundSwatchRef = useRef();
  const colorPickerWrapRef = useRef();
  const panelRef = useRef();

  useEffect(
    () => {
      if (!hubMetadata || !hub) return () => {};

      const updateColorState = () => {
        const world = hubMetadata.getMetadata(hub.hub_id).world;

        [["ground", groundColor, setGroundColor]].forEach(([name, value, setter]) => {
          const r = world[`${name}_color_r`];
          const g = world[`${name}_color_g`];
          const b = world[`${name}_color_b`];

          if (!value || (!almostEqual(r, value.r) || !almostEqual(g, value.g) || !almostEqual(b, value.b))) {
            setter({ r, g, b });
          }
        });
      };

      if (groundColor === null) {
        // Initializer
        updateColorState();
      }

      hubMetadata.subscribeToMetadata(hub.hub_id, updateColorState);
      return () => hubMetadata.unsubscribeFromMetadata(updateColorState);
    },
    [hub, hubMetadata, groundColor, setGroundColor]
  );

  const showPickerAtRef = useCallback(
    ref => {
      const swatch = ref.current;
      const panel = panelRef.current;
      const pickerWrap = colorPickerWrapRef.current;

      const swatchRect = swatch.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const newTop = swatchRect.top - panelRect.top;
      const newLeft = swatchRect.left - panelRect.left;
      pickerWrap.setAttribute("style", `top: ${newTop + 42}px; left: ${newLeft - 48}px;`);
      pickerWrap.focus();
    },
    [colorPickerWrapRef, panelRef]
  );

  const onColorChange = useCallback(
    ({ rgb: { r, g, b } }) => {
      const newColor = { r: r / 255.0, g: g / 255.0, b: b / 255.0 };
      let currentGroundColor = groundColor;

      switch (selectedColor) {
        case "ground":
          setGroundColor(newColor);
          currentGroundColor = newColor;
          break;
      }

      if (onColorsChanged) {
        onColorsChanged(currentGroundColor);
      }
    },
    [selectedColor, groundColor, setGroundColor, onColorsChanged]
  );

  const messages = getMessages();
  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <Tooltip singleton={tipSource} />
      <PickerWrap ref={colorPickerWrapRef} tabIndex={-1}>
        <ColorPicker onChange={onColorChange} onChangeComplete={onColorChangeComplete} />
      </PickerWrap>
      <PopupPanelMenu
        ref={panelRef}
        style={{ padding: "32px 0px", borderRadius: "12px" }}
        className={sharedStyles.slideUpWhenPopped}
      >
        <PanelWrap>
          <PanelSectionHeader style={{ marginLeft: 0 }}>
            <FormattedMessage id="environment-settings-popup.environment" />
          </PanelSectionHeader>
          <InputWrap>
            <Label htmlFor="colors">
              <FormattedMessage id="environment-settings-popup.colors" />
            </Label>
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
                  onClick={useCallback(
                    () => {
                      showPickerAtRef(groundSwatchRef);
                      setSelectedColor("ground");
                    },
                    [showPickerAtRef]
                  )}
                />
              </Tooltip>
            </Swatches>
          </InputWrap>
          <InputWrap>
            <Label htmlFor="terrain">
              <FormattedMessage id="environment-settings-popup.terrain" />
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
  hub: PropTypes.object,
  hubMetadata: PropTypes.object
};

export { EnvironmentSettingsPopup as default };
