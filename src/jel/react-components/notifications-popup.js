import React, { useState } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../../hubs/utils/i18n";
import { PanelWrap, Info, Tip, Label, InputWrap, Checkbox } from "./form-components";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const checkboxControlFor = (name, value, setter, hubName) => {
  const messages = getMessages();
  const label = messages[`notifications-popup.${name}`].replaceAll("HUB_NAME", hubName);
  return (
    <InputWrap>
      <Checkbox
        type="checkbox"
        id={name}
        name={name}
        checked={value}
        onChange={e => {
          const value = e.target.checked;
          setter(value);
        }}
      />
      <Label htmlFor={name} style={{ cursor: "pointer" }}>
        <FormattedMessage id={label} />
      </Label>
    </InputWrap>
  );
};

const NotificationsPopup = ({ setPopperElement, styles, attributes, hub }) => {
  const [notifySpaceCopresence, setNotifySpaceCopresence] = useState("");
  const [notifyHubCopresence, setNotifyHubCopresence] = useState("");
  const [notifyChat, setNotifyChat] = useState("");
  const [notifyJoins, setNotifyJoins] = useState("");

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu style={{ padding: "36px 0px", borderRadius: "12px" }} className={sharedStyles.slideUpWhenPopped}>
        <PanelWrap>
          <PanelSectionHeader style={{ marginLeft: 0 }}>
            <FormattedMessage id="notifications-popup.space-settings" />
          </PanelSectionHeader>
          {checkboxControlFor("notify_space_copresence", notifySpaceCopresence, setNotifySpaceCopresence)}
          <PanelSectionHeader style={{ marginLeft: 0 }}>
            <FormattedMessage id="notifications-popup.world-settings" />
          </PanelSectionHeader>
          {checkboxControlFor("notify_hub_copresence", notifyHubCopresence, setNotifyHubCopresence)}
          {checkboxControlFor("notify_chat", notifyChat, setNotifyChat)}
          {checkboxControlFor("notify_joins", notifyJoins, setNotifyJoins, hub && hub.name)}
        </PanelWrap>
      </PopupPanelMenu>
    </div>
  );

  if (popupRoot) {
    return ReactDOM.createPortal(popupInput, popupRoot);
  } else {
    return popupInput;
  }
};

NotificationsPopup.propTypes = {
  hub: PropTypes.object
};

export { NotificationsPopup as default };
