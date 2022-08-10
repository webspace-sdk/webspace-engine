import React, { useState, forwardRef } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import styled from "styled-components";
import PopupPanelMenu from "./popup-panel-menu";
import SmallActionButton from "./small-action-button";
import Spinner from "./spinner";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../../hubs/utils/i18n";
import { PanelWrap, Info, Tip, Label, TextInputWrap, InputWrap, Input, Checkbox } from "./form-components";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = UI_ROOT.getElementById("jel-popup-root")));

const Footer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const BridgeStartPopup = forwardRef(
  ({ setPopperElement, styles, attributes, onConnect, onCancel, children, connecting, failed, allowInvite }, ref) => {
    const messages = getMessages();
    const [meetingId, setMeetingId] = useState("");
    const [password, setPassword] = useState("");
    const [shareInvite, setShareInvite] = useState(true);
    const [useHD, setUseHD] = useState(false);

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
            <Info>
              <FormattedMessage id="bridge-start.title" />
            </Info>
            <Tip>
              <FormattedMessage id="bridge-start.subtitle" />
            </Tip>
            <form
              autoComplete="off"
              onSubmit={async e => {
                if (connecting) return;

                e.preventDefault();
                e.stopPropagation();

                onConnect(
                  meetingId.replaceAll(" ", "").replaceAll("-", ""),
                  password,
                  useHD,
                  allowInvite && shareInvite
                );
              }}
            >
              <TextInputWrap>
                <Input
                  value={meetingId}
                  name="meetingId"
                  type="text"
                  autocomplete="off"
                  disabled={connecting}
                  required
                  ref={ref}
                  pattern={"[0-9 -]+"}
                  title={messages["bridge-start.meeting_id-validation-warning"]}
                  placeholder={messages["bridge-start.meeting_id-placeholder"]}
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    const meetingId = e.target.value;
                    setMeetingId(meetingId);
                  }}
                />
              </TextInputWrap>
              <TextInputWrap>
                <Input
                  type="password"
                  name="password"
                  autocomplete="off"
                  value={password}
                  disabled={connecting}
                  placeholder={messages["bridge-start.password-placeholder"]}
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    const password = e.target.value;
                    setPassword(password);
                  }}
                />
              </TextInputWrap>
              {allowInvite && (
                <InputWrap>
                  <Checkbox
                    type="checkbox"
                    id="share_invite"
                    name="share_invite"
                    disabled={connecting}
                    checked={shareInvite}
                    onChange={e => {
                      const shareInvite = e.target.checked;
                      setShareInvite(shareInvite);
                    }}
                  />
                  <Label htmlFor="share_invite" style={{ cursor: "pointer" }}>
                    <FormattedMessage id="bridge-start.share-invite" />
                  </Label>
                </InputWrap>
              )}
              <InputWrap>
                <Checkbox
                  type="checkbox"
                  id="use_hd"
                  name="use_hd"
                  disabled={connecting}
                  checked={useHD}
                  onChange={e => {
                    const useHD = e.target.checked;
                    setUseHD(useHD);
                  }}
                />
                <Label htmlFor="use_hd" style={{ cursor: "pointer" }}>
                  <FormattedMessage id="bridge-start.use-hd" />
                </Label>
              </InputWrap>
              <Footer>
                {!connecting && (
                  <SmallActionButton type="submit">
                    <FormattedMessage id="bridge-start.connect" />
                  </SmallActionButton>
                )}
                {connecting && (
                  <SmallActionButton onClick={() => onCancel()}>
                    <FormattedMessage id="bridge-start.cancel" />
                  </SmallActionButton>
                )}

                {connecting && <Spinner style={{ marginLeft: "8px" }} />}

                {connecting && (
                  <Tip>
                    <FormattedMessage id={"bridge-start.status-connecting"} />&nbsp;
                  </Tip>
                )}

                {failed && (
                  <Tip>
                    <FormattedMessage id={"bridge-start.status-failed"} />&nbsp;
                  </Tip>
                )}
              </Footer>
            </form>
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
  }
);

BridgeStartPopup.displayName = "BridgeStartPopup";

BridgeStartPopup.propTypes = {
  onConnect: PropTypes.func,
  onCancel: PropTypes.func,
  connecting: PropTypes.bool,
  failed: PropTypes.bool,
  setPopperElement: PropTypes.func,
  styles: PropTypes.object,
  allowInvite: PropTypes.bool,
  attributes: PropTypes.object,
  children: PropTypes.node
};

export { BridgeStartPopup as default };
