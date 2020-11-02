import React from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import PropTypes from "prop-types";
import sharedStyles from "../assets/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import SmallActionButton from "./small-action-button";
import { FormattedMessage } from "react-intl";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const PanelWrap = styled.div`
  width: fit-content;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProfileEditorPopup = ({ setPopperElement, styles, attributes, onSignOutClicked, children }) => {
  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu style={{ padding: "12px", borderRadius: "12px" }} className={sharedStyles.slideUpWhenPopped}>
        <PanelWrap>
          <SmallActionButton onClick={onSignOutClicked}>
            <FormattedMessage id="profile-editor.sign-out" />
          </SmallActionButton>
        </PanelWrap>
      </PopupPanelMenu>
      {children}
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
};

ProfileEditorPopup.propTypes = {
  onSignoutClicked: PropTypes.func
};

export { ProfileEditorPopup as default };
