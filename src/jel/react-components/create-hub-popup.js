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

const CreateHubPopup = forwardRef(({ setPopperElement, styles, attributes, onCreate }, ref) => {
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
            <FormattedMessage id="create-hub-popup.info" />
          </Info>
          <Tip>
            <FormattedMessage id="create-hub-popup.tip" />&nbsp;
          </Tip>
          <form
            autoComplete="off"
            onSubmit={async e => {
              e.preventDefault();
              e.stopPropagation();
              const { atomAccessManager } = window.APP;
              if (!filename) return;

              setCreating(true);
              const exists = await atomAccessManager.fileExists(filename);
              setExists(exists);

              if (exists) {
                setCreating(false);
                ref.current.focus();
                return;
              }

              await onCreate(name, filename);
            }}
          >
            <TextInputWrap>
              <Input
                ref={ref}
                type="text"
                name="name"
                value={name}
                required
                placeholder={messages["create-hub-popup.name-placeholder"]}
                min="3"
                max="64"
                title={messages["create-hub-popup.name-validation-warning"]}
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
                      .toLowerCase() + ".html"
                  );
                }}
              />
            </TextInputWrap>
            {exists &&
              !creating && (
                <Tip style={{ lineHeight: "24px" }}>
                  <FormattedMessage id="create-hub-popup.exists" />&nbsp;
                </Tip>
              )}
            {!exists &&
              !creating && (
                <Tip style={{ lineHeight: "24px" }}>
                  {name && filename ? (
                    <span>
                      <FormattedMessage id="create-hub-popup.dest-prefix" />&nbsp;{filename}
                    </span>
                  ) : (
                    <span>
                      <FormattedMessage id="create-hub-popup.dest-empty" />
                    </span>
                  )}
                </Tip>
              )}
            {creating && (
              <Tip style={{ lineHeight: "24px" }}>
                <LoadingSpinner style={{ marginRight: "8px" }} />
                <span>
                  <FormattedMessage id="create-hub-popup.waiting-for-deploy" />
                </span>
              </Tip>
            )}
            <SmallActionButton disabled={!filename || !!exists || creating} type="submit">
              <FormattedMessage id="create-hub-popup.create-world" />
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
});

CreateHubPopup.displayName = "CreateHubPopup";

CreateHubPopup.propTypes = {
  styles: PropTypes.object,
  attributes: PropTypes.object,
  setPopperElement: PropTypes.func,
  onCreate: PropTypes.func
};

export { CreateHubPopup as default };
