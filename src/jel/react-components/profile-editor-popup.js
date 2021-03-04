import React, { useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import SmallActionButton from "./small-action-button";
import editIcon from "../../assets/jel/images/icons/edit.svgi";
import checkIcon from "../../assets/jel/images/icons/check-big.svgi";
import cancelIcon from "../../assets/jel/images/icons/cancel.svgi";
import { useSpacePresenceMeta } from "../utils/shared-effects";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../../hubs/utils/i18n";
import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";
import { SCHEMA } from "../../hubs/storage/store";
import {
  PanelWrap,
  EditableTextInputValue,
  EditableTextInputWrap,
  Info,
  Tip,
  Label,
  TextInputWrap,
  InputWrap,
  Input,
  Checkbox,
  FieldEditButton
} from "./form-components";
import styled from "styled-components";

export const PROFILE_EDITOR_MODES = {
  UNVERIFIED: 0,
  VERIFYING: 1,
  VERIFIED: 2
};

const SignOutButton = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  border: 0;
  text-decoration: underline;
  font-weight: var(--dialog-tip-text-weight);
  line-height: 16px;
  margin-top: 4px;
`;

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const ProfileEditorPopup = ({
  setPopperElement,
  styles,
  attributes,
  onSignOutClicked,
  onSignUp,
  mode,
  children,
  isSpaceAdmin,
  onNameEditSaved,
  scene,
  sessionId
}) => {
  const messages = getMessages();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [exists, setExists] = useState(false);
  const [previousName, setPreviousName] = useState("");
  const [allowEmails, setAllowEmails] = useState(true);
  const [meta, setMeta] = useState({});
  const nameEditFieldRef = useRef();
  const nameEditButtonRef = useRef();

  const handleMetaChange = useCallback(
    meta => {
      const displayName = meta && meta.profile && meta.profile.displayName;
      if (displayName) {
        setName(displayName);
      }
      setMeta(meta);
    },
    [setMeta, setName]
  );

  useSpacePresenceMeta(sessionId, scene, meta, handleMetaChange);

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
            <Tip>
              <FormattedMessage id="profile-editor.signed-in-as" />
            </Tip>
            <EditableTextInputWrap>
              {!editingName && <EditableTextInputValue>{name}</EditableTextInputValue>}
              {editingName && (
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingName(!editingName);

                    if (editingName) {
                      onNameEditSaved(name);
                    }
                  }}
                >
                  <TextInputWrap>
                    <Input
                      type="text"
                      name="name"
                      autoFocus={true}
                      value={name}
                      pattern={SCHEMA.definitions.profile.properties.displayName.pattern}
                      ref={nameEditFieldRef}
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
                  </TextInputWrap>
                </form>
              )}
              <FieldEditButton
                iconSrc={editingName ? checkIcon : editIcon}
                ref={nameEditButtonRef}
                onClick={e => {
                  if (!editingName) {
                    e.preventDefault();
                    e.stopPropagation();
                    setPreviousName(name);
                  }

                  setEditingName(!editingName);
                  nameEditButtonRef.current.focus();
                  if (editingName) {
                    onNameEditSaved(name);
                  }
                }}
              />
              {editingName && (
                <FieldEditButton
                  iconSrc={cancelIcon}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingName(false);
                    setName(previousName);
                    nameEditButtonRef.current.focus();
                  }}
                />
              )}
            </EditableTextInputWrap>
            <Tip>
              <SignOutButton onClick={onSignOutClicked}>
                <FormattedMessage id="profile-editor.sign-out" />
              </SignOutButton>
            </Tip>
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
              <TextInputWrap>
                <Input
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
              </TextInputWrap>
              <TextInputWrap>
                <Input
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
              </TextInputWrap>
              <InputWrap>
                <Checkbox
                  type="checkbox"
                  id="allow_emails"
                  name="allow_emails"
                  checked={allowEmails}
                  onChange={e => {
                    const allowEmails = e.target.checked;
                    setAllowEmails(allowEmails);
                  }}
                />
                <Label htmlFor="allow_emails" style={{ cursor: "pointer" }}>
                  <FormattedMessage id="profile-editor.allow-emails" />
                </Label>
              </InputWrap>
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

  if (popupRoot) {
    return ReactDOM.createPortal(popupInput, popupRoot);
  } else {
    return popupInput;
  }
};

ProfileEditorPopup.propTypes = {
  onSignOutClicked: PropTypes.func,
  onSignUp: PropTypes.func,
  onNameEditSaved: PropTypes.func,
  scene: PropTypes.object,
  sessionId: PropTypes.string,
  mode: PropTypes.number,
  initialName: PropTypes.string,
  isSpaceAdmin: PropTypes.bool
};

export { ProfileEditorPopup as default };
