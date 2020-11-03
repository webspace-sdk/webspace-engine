import React, { useState } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import PropTypes from "prop-types";
import sharedStyles from "../assets/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import SmallActionButton from "./small-action-button";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../../hubs/utils/i18n";

export const PROFILE_EDITOR_MODES = {
  UNVERIFIED: 0,
  VERIFYING: 1,
  VERIFIED: 2
};

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const PanelWrap = styled.div`
  width: fit-content;
  height: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 32px;
`;

const Info = styled.div`
  color: var(--dialog-info-text-color);
  font-size: var(--dialog-info-text-size);
  font-weight: var(--dialog-info-text-weight);
  margin-top: 12px;
`;

const Tip = styled.div`
  color: var(--dialog-tip-text-color);
  font-size: var(--dialog-tip-text-size);
  font-weight: var(--dialog-tip-text-weight);
  margin-top: 6px;
  margin-bottom: 8px;
`;

const VerifyInputWrap = styled.div`
  flex: 1;
  padding: 2px 4px;
  margin: 0 8px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
  margin: 12px;
`;

const VerifyInput = styled.input`
  width: 100%;
  border: 0;
  color: var(--text-input-text-color);
  font-size: var(--text-input-text-size);
  font-weight: var(--text-input-text-weight);
  padding: 4px;

  &::placeholder {
    color: var(--text-input-placeholder-color);
  }

  width: 300px;
`;

const ProfileEditorPopup = ({ setPopperElement, styles, attributes, onSignOutClicked, mode, children }) => {
  const messages = getMessages();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu style={{ padding: "12px", borderRadius: "12px" }} className={sharedStyles.slideUpWhenPopped}>
        {mode === PROFILE_EDITOR_MODES.VERIFIED && (
          <PanelWrap>
            <SmallActionButton onClick={onSignOutClicked}>
              <FormattedMessage id="profile-editor.sign-out" />
            </SmallActionButton>
          </PanelWrap>
        )}
        {mode === PROFILE_EDITOR_MODES.VERIFYING && (
          <PanelWrap>
            <Info>
              <FormattedMessage id="profile-editor.verifying-info" />
            </Info>
            <Tip>
              <FormattedMessage id="profile-editor.verifying-tip" />
            </Tip>
          </PanelWrap>
        )}
        {mode === PROFILE_EDITOR_MODES.UNVERIFIED && (
          <PanelWrap>
            <Info>
              <FormattedMessage id="profile-editor.unverified-info" />
            </Info>
            <Tip>
              <FormattedMessage id="profile-editor.unverified-tip" />
            </Tip>
            <form>
              <VerifyInputWrap>
                <VerifyInput
                  type="email"
                  placeholder={messages["profile-editor.email-placeholder"]}
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    const email = e.target.value;
                    setEmail(email);
                  }}
                />
              </VerifyInputWrap>
              <VerifyInputWrap>
                <VerifyInput
                  type="text"
                  placeholder={messages["profile-editor.name-placeholder"]}
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    const name = e.target.value;
                    setName(name);
                  }}
                />
              </VerifyInputWrap>
            </form>
            <SmallActionButton>
              <FormattedMessage id="profile-editor.sign-up" />
            </SmallActionButton>
          </PanelWrap>
        )}
      </PopupPanelMenu>
      {children}
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
};

ProfileEditorPopup.propTypes = {
  onSignoutClicked: PropTypes.func,
  mode: PropTypes.number
};

export { ProfileEditorPopup as default };
