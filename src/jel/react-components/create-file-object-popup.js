import React, { useState, forwardRef } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { waitForShadowDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../../hubs/utils/i18n";
import { PanelWrap, Tip, TextInputWrap, Input, Info } from "./form-components";
import SmallActionButton from "./small-action-button";

import LoadingSpinner from "./loading-spinner";

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("jel-popup-root")));

const CreateFileObjectPopup = forwardRef(
  ({ setPopperElement, styles, attributes, onCreate, objectType, fileExtension, filePath }, ref) => {
    const messages = getMessages();
    const [name, setName] = useState("");
    const [filename, setFilename] = useState("");
    const [exists, setExists] = useState(false);
    const [creating, setCreating] = useState(false);

    const popupInput = (
      <div
        tabIndex={-1} // Ensures can be focused
        className="show-when-popped"
        ref={setPopperElement}
        style={styles.popper}
        {...attributes.popper}
      >
        <PopupPanelMenu style={{ padding: "12px", borderRadius: "12px" }} className="slide-up-when-popped">
          <PanelWrap>
            <Info>
              <FormattedMessage id={`create-${objectType}-popup.info`} />
            </Info>
            <Tip>
              <FormattedMessage id={`create-${objectType}-popup.tip`} />&nbsp;
            </Tip>
            <form
              autoComplete="off"
              onSubmit={async e => {
                e.preventDefault();
                e.stopPropagation();
                const { atomAccessManager } = window.APP;
                if (!filename) return;

                setCreating(true);
                const exists = await atomAccessManager.fileExists((filePath ? `${filePath}/` : "") + filename);
                setExists(exists);

                if (exists) {
                  setCreating(false);
                  ref.current.focus();
                  return;
                }

                await onCreate(name, filename, filePath);

                setName("");
                setFilename("");
                setExists(false);
                setCreating(false);
                ref.current.blur();
              }}
            >
              <TextInputWrap>
                <Input
                  ref={ref}
                  type="text"
                  name="name"
                  value={name}
                  required
                  placeholder={messages[`create-${objectType}-popup.name-placeholder`]}
                  min="3"
                  max="64"
                  title={messages[`create-${objectType}-popup.name-validation-warning`]}
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    if (creating) {
                      e.preventDefault();
                      return;
                    }

                    const name = e.target.value;
                    setExists(false);
                    setName(name);
                    setFilename(
                      name
                        .replace(/ +/g, "-")
                        .replace(/[^a-z0-9-]/gi, "")
                        .toLowerCase() +
                        "." +
                        fileExtension
                    );
                  }}
                />
              </TextInputWrap>
              {exists &&
                !creating && (
                  <Tip style={{ lineHeight: "24px" }}>
                    <FormattedMessage id={`create-${objectType}-popup.exists`} />&nbsp;
                  </Tip>
                )}
              {!exists &&
                !creating && (
                  <Tip style={{ lineHeight: "24px" }}>
                    {name && filename ? (
                      <span>
                        <FormattedMessage id={`create-${objectType}-popup.dest-prefix`} />&nbsp;{filename}
                      </span>
                    ) : (
                      <span>
                        <FormattedMessage id={`create-${objectType}-popup.dest-empty`} />
                      </span>
                    )}
                  </Tip>
                )}
              {creating && (
                <Tip style={{ lineHeight: "24px" }}>
                  <LoadingSpinner style={{ marginRight: "8px" }} />
                  <span>
                    <FormattedMessage id={`create-${objectType}-popup.waiting-for-deploy`} />
                  </span>
                </Tip>
              )}
              <SmallActionButton disabled={!filename || !!exists || creating} type="submit">
                <FormattedMessage id={`create-${objectType}-popup.create-object`} />
              </SmallActionButton>
            </form>
          </PanelWrap>
        </PopupPanelMenu>
      </div>
    );

    if (popupRoot) {
      return ReactDOM.createPortal(popupInput, popupRoot);
    } else {
      return popupInput;
    }
  }
);

CreateFileObjectPopup.displayName = "CreateFileObjectPopup";

CreateFileObjectPopup.propTypes = {
  styles: PropTypes.object,
  attributes: PropTypes.object,
  setPopperElement: PropTypes.func,
  onCreate: PropTypes.func,
  objectType: PropTypes.string,
  fileExtension: PropTypes.string,
  filePath: PropTypes.string
};

export { CreateFileObjectPopup as default };
