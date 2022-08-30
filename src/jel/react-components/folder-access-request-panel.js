import React from "react";
import { PanelWrap, Info, Tip } from "./form-components";
import { FormattedMessage } from "react-intl";
import ActionButton from "./action-button";
import PropTypes from "prop-types";

const FolderAccessRequestPanel = ({ onAccessClicked }) => {
  return (
    <PanelWrap>
      <Info>
        <FormattedMessage id="folder-access-request.notice" />
      </Info>
      <Tip>
        <FormattedMessage id="folder-access-request.tip" />
      </Tip>
      <ActionButton style={{ minWidth: "calc(100% - 24px)" }} onClick={onAccessClicked}>
        <FormattedMessage id="folder-access-request.choose-folder" />
      </ActionButton>
    </PanelWrap>
  );
};

FolderAccessRequestPanel.propTypes = {
  onAccessClicked: PropTypes.func
};

export { FolderAccessRequestPanel as default };
