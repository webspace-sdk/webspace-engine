import React, { useState } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import { FormattedMessage } from "react-intl";
import { checkboxControlFor, PanelWrap } from "./form-components";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const SpaceNotificationsPopup = ({ setPopperElement, styles, attributes }) => {
  const [notifySpaceCopresence, setNotifySpaceCopresence] = useState("");
  const [notifyHubCopresence, setNotifyHubCopresence] = useState("");
  const [notifyChat, setNotifyChat] = useState("");

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
            <FormattedMessage id="space-notifications-popup.space-settings" />
          </PanelSectionHeader>
          {checkboxControlFor(
            "notify_space_copresence",
            "space-notifications-popup.notify_space_copresence",
            notifySpaceCopresence,
            setNotifySpaceCopresence
          )}
          {checkboxControlFor(
            "notify_hub_copresence",
            "space-notifications-popup.notify_hub_copresence",
            notifyHubCopresence,
            setNotifyHubCopresence
          )}
          {checkboxControlFor("notify_chat", "space-notifications-popup.notify_chat", notifyChat, setNotifyChat)}
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

SpaceNotificationsPopup.propTypes = {
  hub: PropTypes.object
};

export { SpaceNotificationsPopup as default };
