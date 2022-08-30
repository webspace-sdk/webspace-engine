import React from "react";
import { PanelWrap, Info, Tip } from "./form-components";
import { FormattedMessage } from "react-intl";
import ActionButton from "./action-button";
import PropTypes from "prop-types";

const FolderAccessRequestPanel = ({ showErrorTip, onAccessClicked }) => {
  const supported = !!window.showDirectoryPicker;

  return (
    <PanelWrap>
      {!showErrorTip && (
        <Info>
          <FormattedMessage
            id={supported ? "folder-access-request.notice" : "folder-access-request.unsupported-notice"}
          />
        </Info>
      )}
      <Tip>
        <FormattedMessage
          id={
            supported
              ? showErrorTip
                ? "folder-access-request.error-tip"
                : "folder-access-request.tip"
              : "folder-access-request.unsupported-tip"
          }
        />
      </Tip>
      {supported && (
        <ActionButton style={{ minWidth: "calc(100% - 24px)" }} onClick={onAccessClicked}>
          <FormattedMessage id="folder-access-request.choose-folder" />
        </ActionButton>
      )}
    </PanelWrap>
  );
};

FolderAccessRequestPanel.propTypes = {
  onAccessClicked: PropTypes.func,
  showErrorTip: PropTypes.bool
};

export { FolderAccessRequestPanel as default };
