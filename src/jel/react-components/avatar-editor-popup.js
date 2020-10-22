import React from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import PropTypes from "prop-types";
import sharedStyles from "../assets/stylesheets/shared.scss";
import ColorPicker from "./color-picker";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const PickerWrap = styled.div`
  width: 128px;
  height: 128px;
`;

const AvatarEditorPopup = ({
  setPopperElement,
  styles,
  attributes,
  onColorChange,
  onColorChangeComplete,
  children
}) => {
  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu style={{ padding: "12px", borderRadius: "12px" }} className={sharedStyles.slideUpWhenPopped}>
        <PickerWrap>
          <ColorPicker onChangeComplete={onColorChangeComplete} onChange={onColorChange} />
        </PickerWrap>
      </PopupPanelMenu>
      {children}
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
};

AvatarEditorPopup.propTypes = {
  onColorChange: PropTypes.func,
  onColorChangeComplete: PropTypes.func
};

export { AvatarEditorPopup as default };
