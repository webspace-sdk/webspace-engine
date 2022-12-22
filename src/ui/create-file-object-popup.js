import React, { useState, forwardRef, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import { handleTextFieldFocus, handleTextFieldBlur } from "../utils/focus-utils";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../utils/i18n";
import { PanelWrap, Tip, TextInputWrap, Label, Input, Info, InputWrap, Radio, RadioWrap } from "./form-components";
import SmallActionButton from "./small-action-button";

import LoadingSpinner from "./loading-spinner";

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("popup-root")));

const CreateFileObjectPopup = forwardRef(
  ({ setPopperElement, styles, attributes, onCreate, objectType, fileExtension, filePath }, ref) => {
    const messages = getMessages();
    const [name, setName] = useState("");
    const [filename, setFilename] = useState("");
    const [exists, setExists] = useState(false);
    const [creating, setCreating] = useState(false);
    const [objectSubtype, setObjectSubType] = useState(objectType === "hub" ? "world" : null);
    const translationSuffix = objectType === "hub" ? `-${objectSubtype}` : "";

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
              <FormattedMessage id={`create-${objectType}${translationSuffix}-popup.info`} />
            </Info>
            <Tip>
              <FormattedMessage id={`create-${objectType}${translationSuffix}-popup.tip`} />&nbsp;
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

                await onCreate(name, filename, filePath, objectSubtype);

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
                  placeholder={messages[`create-${objectType}${translationSuffix}-popup.name-placeholder`]}
                  min="3"
                  max="64"
                  title={messages[`create-${objectType}${translationSuffix}-popup.name-validation-warning`]}
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
              {objectType === "hub" && (
                <InputWrap style={{ minHeight: "48px", marginLeft: "24px" }}>
                  <RadioWrap>
                    <Radio
                      type="radio"
                      id={"object_subtype_world"}
                      name={"world"}
                      checked={objectSubtype === "world"}
                      value={"world"}
                      onChange={e => {
                        if (e.target.checked) {
                          setObjectSubType("world");
                        }
                      }}
                    />
                    <Label htmlFor="object_subtype_world" style={{ cursor: "pointer" }}>
                      <FormattedMessage id="create-hub-popup.subtype-world" />
                    </Label>
                  </RadioWrap>
                  <RadioWrap>
                    <Radio
                      type="radio"
                      id={"object_subtype_page"}
                      name={"page"}
                      checked={objectSubtype === "page"}
                      value={"page"}
                      onChange={e => {
                        if (e.target.checked) {
                          setObjectSubType("page");
                        }
                      }}
                    />
                    <Label htmlFor="object_subtype_page" style={{ cursor: "pointer" }}>
                      <FormattedMessage id="create-hub-popup.subtype-page" />
                    </Label>
                  </RadioWrap>
                </InputWrap>
              )}

              {exists &&
                !creating && (
                  <Tip style={{ lineHeight: "24px" }}>
                    <FormattedMessage id={`create-${objectType}${translationSuffix}-popup.exists`} />&nbsp;
                  </Tip>
                )}
              {!exists &&
                !creating && (
                  <Tip style={{ lineHeight: "24px" }}>
                    {name && filename ? (
                      <span>
                        <FormattedMessage id={`create-${objectType}${translationSuffix}-popup.dest-prefix`} />&nbsp;{
                          filename
                        }
                      </span>
                    ) : (
                      <span>
                        <FormattedMessage id={`create-${objectType}${translationSuffix}-popup.dest-empty`} />
                      </span>
                    )}
                  </Tip>
                )}
              {creating && (
                <Tip style={{ lineHeight: "24px" }}>
                  <LoadingSpinner style={{ marginRight: "8px" }} />
                  <span>
                    <FormattedMessage id={`create-${objectType}${translationSuffix}-popup.waiting-for-deploy`} />
                  </span>
                </Tip>
              )}
              <SmallActionButton disabled={!filename || !!exists || creating} type="submit">
                <FormattedMessage id={`create-${objectType}${translationSuffix}-popup.create-object`} />
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
