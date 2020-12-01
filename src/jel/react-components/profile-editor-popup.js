import React, { useState } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import SmallActionButton from "./small-action-button";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../../hubs/utils/i18n";
import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";
import { SCHEMA } from "../../hubs/storage/store";

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
  align-items: flex-start;
  justify-content: center;
  padding: 0 32px;
`;

const Info = styled.div`
  color: var(--dialog-info-text-color);
  font-size: var(--dialog-info-text-size);
  font-weight: var(--dialog-info-text-weight);
  margin-top: 12px;
  margin-left: 12px;
`;

const Tip = styled.div`
  color: var(--dialog-tip-text-color);
  font-size: var(--dialog-tip-text-size);
  font-weight: var(--dialog-tip-text-weight);
  margin-top: 6px;
  margin-bottom: 8px;
  margin-left: 12px;
  white-space: pre;
  line-height: 16px;

  & a {
    text-decoration: underline;
  }
`;

const Label = styled.label`
  color: var(--dialog-label-text-color);
  font-size: var(--dialog-label-text-size);
  font-weight: var(--dialog-label-text-weight);
  margin-top: 6px;
  margin-bottom: 8px;
  margin-left: 12px;
  white-space: pre;
  line-height: 16px;

  & a {
    text-decoration: underline;
  }
`;

const VerifyTextInputWrap = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  padding: 2px 4px;
  margin: 0 8px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
  margin: 12px;
`;

const VerifyInputWrap = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  padding: 2px 4px;
  margin: 0 8px;
  border: 0;
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

const VerifyCheckbox = styled.input`
  color: var(--dialog-tip-text-color);
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
  height: 16px;
  width: 16px;
  border: 1px solid var(--panel-item-active-background-color);
  border-radius: 2px;
  vertical-align: -2px;
  color: var(--panel-item-active-text-color);
  cursor: pointer;
  position: relative;
  background-color: transparent;
  margin-bottom: 2px;

  &:checked {
    background-color: var(--panel-item-active-background-color);
  }

  & ::before {
    content: "✔";
    padding: 2px;
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    visibility: hidden;
  }

  &:checked ::before {
    visibility: visible;
  }
`;

const ProfileEditorPopup = ({
  setPopperElement,
  styles,
  attributes,
  onSignOutClicked,
  onSignUp,
  mode,
  children,
  isSpaceAdmin
}) => {
  const messages = getMessages();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [exists, setExists] = useState(false);
  const [allowEmails, setAllowEmails] = useState(true);

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
            <form
              onSubmit={async e => {
                e.preventDefault();
                e.stopPropagation();
                const existing = await fetchReticulumAuthenticated("/api/v1/accounts/search", "POST", { email });
                const exists = existing.data && existing.data.length > 0;
                setExists(exists);
                if (exists) return;
                onSignUp(email, name, allowEmails);
              }}
            >
              <VerifyTextInputWrap>
                <VerifyInput
                  value={email}
                  name="email"
                  type="email"
                  required
                  placeholder={messages["profile-editor.email-placeholder"]}
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    const email = e.target.value;
                    setEmail(email);
                  }}
                />
              </VerifyTextInputWrap>
              <VerifyTextInputWrap>
                <VerifyInput
                  type="text"
                  name="name"
                  value={name}
                  pattern={SCHEMA.definitions.profile.properties.displayName.pattern}
                  required
                  spellCheck="false"
                  placeholder={messages["profile-editor.name-placeholder"]}
                  title={messages["profile-editor.name-validation-warning"]}
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    const name = e.target.value;
                    setName(name);
                  }}
                />
              </VerifyTextInputWrap>
              <VerifyInputWrap>
                <VerifyCheckbox
                  type="checkbox"
                  id="allow_emails"
                  name="allow_emails"
                  checked={allowEmails}
                  onChange={e => {
                    const allowEmails = e.target.checked;
                    setAllowEmails(allowEmails);
                  }}
                />
                <Label for="allow_emails" style={{ cursor: "pointer" }}>
                  <FormattedMessage id="profile-editor.allow-emails" />
                </Label>
              </VerifyInputWrap>
              {exists && (
                <Tip>
                  <FormattedMessage id={isSpaceAdmin ? "profile-editor.exists-admin" : "profile-editor.exists"} />&nbsp;
                  <a
                    onClick={e => {
                      e.preventDefault();
                      onSignOutClicked();
                    }}
                    href="#"
                  >
                    <FormattedMessage id="profile-editor.sign-out" />
                  </a>
                </Tip>
              )}
              <SmallActionButton type="submit">
                <FormattedMessage id="profile-editor.sign-up" />
              </SmallActionButton>
              <Tip>
                {" "}
                By proceeding, you agree to the{" "}
                <a
                  rel="noopener noreferrer"
                  target="_blank"
                  href="https://github.com/jel-app/policies/blob/master/TERMS.md"
                >
                  terms of service
                </a>&nbsp;&amp;&nbsp;
                <a
                  rel="noopener noreferrer"
                  target="_blank"
                  href="https://github.com/jel-app/policies/blob/master/PRIVACY.md"
                >
                  privacy notice
                </a>
              </Tip>
            </form>
          </PanelWrap>
        )}
      </PopupPanelMenu>
      {children}
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
};

ProfileEditorPopup.propTypes = {
  onSignOutClicked: PropTypes.func,
  onSignUp: PropTypes.func,
  mode: PropTypes.number,
  isSpaceAdmin: PropTypes.bool
};

export { ProfileEditorPopup as default };
