import React from "react";
import { PanelWrap, Info, Tip } from "./form-components";
import { FormattedMessage } from "react-intl";
import ActionButton from "./action-button";
import PropTypes from "prop-types";

const FolderAccessRequestPanel = ({ showErrorTip, onAccessClicked }) => {
  return (
    <PanelWrap>
      {!showErrorTip && (
        <Info>
          <FormattedMessage id="folder-access-request.notice" />
        </Info>
      )}
      <Tip>
        <FormattedMessage id={showErrorTip ? "folder-access-request.error-tip" : "folder-access-request.tip"} />
      </Tip>
      <ActionButton style={{ minWidth: "calc(100% - 24px)" }} onClick={onAccessClicked}>
        <FormattedMessage id="folder-access-request.choose-folder" />
      </ActionButton>
    </PanelWrap>
  );
};

FolderAccessRequestPanel.propTypes = {
  onAccessClicked: PropTypes.func,
  showErrorTip: PropTypes.bool
};

export { FolderAccessRequestPanel as default };
