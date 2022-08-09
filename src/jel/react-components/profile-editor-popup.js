import React, { useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import editIcon from "../../assets/jel/images/icons/edit.svgi";
import checkIcon from "../../assets/jel/images/icons/check-big.svgi";
import cancelIcon from "../../assets/jel/images/icons/cancel.svgi";
import { useClientPresenceState } from "../utils/shared-effects";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../../hubs/utils/i18n";
import { SCHEMA } from "../../hubs/storage/store";
import {
  PanelWrap,
  EditableTextInputValue,
  EditableTextInputWrap,
  Tip,
  TextInputWrap,
  Input,
  FieldEditButton
} from "./form-components";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.body.shadowRoot.getElementById("jel-popup-root")));

const ProfileEditorPopup = ({ setPopperElement, styles, attributes, children, onNameEditSaved, scene, sessionId }) => {
  const messages = getMessages();
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [previousName, setPreviousName] = useState("");
  const [presenceState, setPresenceState] = useState({});
  const nameEditFieldRef = useRef();
  const nameEditButtonRef = useRef();

  const handlePresenceStateChange = useCallback(
    presenceState => {
      const displayName = presenceState && presenceState.profile && presenceState.profile.displayName;
      setName(displayName);
      setPresenceState(presenceState);
    },
    [setPresenceState, setName]
  );

  useClientPresenceState(sessionId, scene, presenceState, handlePresenceStateChange);

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
          <Tip>
            <FormattedMessage id="profile-editor.your-display-name" />
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

ProfileEditorPopup.propTypes = {
  onNameEditSaved: PropTypes.func,
  scene: PropTypes.object,
  sessionId: PropTypes.string
};

export { ProfileEditorPopup as default };
