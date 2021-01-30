import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import { FormattedMessage } from "react-intl";
import { PanelWrap, checkboxControlFor } from "./form-components";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const HubNotificationsPopup = ({ setPopperElement, styles, attributes, hub }) => {
  const [notifyJoins, setNotifyJoins] = useState("");
  const labelMapper = useCallback(x => x.replaceAll("HUB_NAME", hub && hub.name), [hub]);

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
            <FormattedMessage id="hub-notifications-popup.world-settings" />
          </PanelSectionHeader>
          {checkboxControlFor(
            "notify_joins",
            "hub-notifications-popup.notify_joins",
            notifyJoins,
            setNotifyJoins,
            labelMapper
          )}
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

HubNotificationsPopup.propTypes = {
  hub: PropTypes.object
};

export { HubNotificationsPopup as default };
