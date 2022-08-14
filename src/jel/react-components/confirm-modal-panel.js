import styled from "styled-components";
import PropTypes from "prop-types";
import React, { useCallback, forwardRef } from "react";
import { FormattedMessage } from "react-intl";
import SmallActionButton from "./small-action-button";
import importantIconSrc from "../../assets/jel/images/icons/important.svgi";
import { getMessages } from "../../hubs/utils/i18n";

const ConfirmModalPanelElement = styled.div`
  background-color: var(--dialog-background-color);
  min-width: 512px;
  height: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 6px;
  border: 1px solid var(--dialog-border-color);
  box-shadow: 0px 12px 28px var(--dialog-shadow-color);
  margin: 8px;
  user-select: none;
`;

const ConfirmModalBody = styled.div`
  color: var(--dialog-body-text-color);
  font-size: var(--dialog-body-text-size);
  font-weight: var(--dialog-body-text-weight);
  line-height: calc(var(--dialog-body-text-size) + 6px);
  width: 100%;
  min-height: 100px;
  max-width: 512px;
  padding: 8px 24px;
  margin: 16px 8px;
  border-radius: 4px;
  border: 0;

  & b {
    padding: 0px 2px;
  }
`;

const ConfirmModalTitleWrap = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  align-self: flex-start;
  margin-left: 10px;
  padding: 8px;
`;

const ConfirmModalTitle = styled.div`
  color: var(--dialog-title-text-color);
  font-size: var(--dialog-title-text-size);
  font-weight: var(--dialog-title-text-weight);
  text-transform: uppercase;
  margin-top: 4px;
  margin-left: 4px;
  line-height: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ConfirmModalTitleIcon = styled.div`
  width: 18px;
  height: 18px;
  margin-top: 7px;
  margin-right: 6px;
  color: var(--panel-text-color);
  color: var(--dialog-title-text-color);
`;

const ConfirmModalInfo = styled.div`
  color: var(--dialog-info-text-color);
  font-size: var(--dialog-info-text-size);
  font-weight: var(--dialog-info-text-weight);
  margin-top: 6px;
`;

const ConfirmModalFooter = styled.div`
  max-height: 64px;
  height: 64px;
  padding: 0px 8px;
  background-color: var(--dialog-footer-background-color);
  border-radius: 0px 0px 6px 6px;
  width: 100%;
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: flex-end;
`;

const CancelLink = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  border: none;
  background-color: transparent;
  text-decoration: underline;
  color: var(--action-button-text-color);
  font-weight: var(--small-action-button-text-weight);
  font-size: var(--small-action-button-text-size);
  padding: 0 12px;
`;

const ConfirmModalPanel = forwardRef(({ atomId, atomMetadata }, ref) => {
  // This confirmation dialog is only used for deleting channels currently
  // but could be made generic so is named generically.
  const messages = getMessages();
  const metadata = atomMetadata && atomMetadata.getMetadata(atomId);

  return (
    <ConfirmModalPanelElement>
      <ConfirmModalTitleWrap>
        <ConfirmModalTitleIcon dangerouslySetInnerHTML={{ __html: importantIconSrc }} />
        <ConfirmModalTitle>
          <FormattedMessage id="confirm-modal.delete-channel-title" />
        </ConfirmModalTitle>
      </ConfirmModalTitleWrap>

      <ConfirmModalBody>
        <span
          dangerouslySetInnerHTML={{
            __html: messages["confirm-modal.delete-channel-body-top"].replaceAll(
              "ATOM_DISPLAY_NAME",
              metadata && metadata.displayName
            )
          }}
        />
        <ConfirmModalInfo>This action cannot be undone.</ConfirmModalInfo>
      </ConfirmModalBody>
      <ConfirmModalFooter>
        <CancelLink onClick={useCallback(() => DOM_ROOT.activeElement?.blur(), [])} ref={ref}>
          <FormattedMessage id="confirm-modal.cancel" />
        </CancelLink>
        <SmallActionButton
          onClick={useCallback(
            () => {
              const roomId = window.APP.matrix.getChannelRoomId(atomId);
              window.APP.accountChannel.deleteChannelMatrixRoom(roomId);
              DOM_ROOT.activeElement?.blur();
            },
            [atomId]
          )}
          className="destructive"
        >
          <FormattedMessage id="confirm-modal.delete-channel-confirm" />
        </SmallActionButton>
      </ConfirmModalFooter>
    </ConfirmModalPanelElement>
  );
});

ConfirmModalPanel.displayName = "ConfirmModalPanel";

ConfirmModalPanel.propTypes = {
  atomMetadata: PropTypes.object,
  atomId: PropTypes.string
};

export default ConfirmModalPanel;
