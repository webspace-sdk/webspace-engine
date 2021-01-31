import React from "react";
import { PanelWrap, Info, Tip } from "./form-components";
import { FormattedMessage } from "react-intl";
import ActionButton from "./action-button";
import PropTypes from "prop-types";

const NotificationRequestPanel = ({ onEnableClicked }) => {
  return (
    <PanelWrap>
      <Info>
        <FormattedMessage id="notification-request.notice" />
      </Info>
      <Tip>
        <FormattedMessage id="notification-request.tip" />
      </Tip>
      <ActionButton style={{ minWidth: "calc(100% - 24px)" }} onClick={onEnableClicked}>
        <FormattedMessage id="notification-request.turn-on" />
      </ActionButton>
    </PanelWrap>
  );
};

NotificationRequestPanel.propTypes = {
  onEnableClicked: PropTypes.func
};

export { NotificationRequestPanel as default };
