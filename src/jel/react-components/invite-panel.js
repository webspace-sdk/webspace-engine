import styled from "styled-components";
import PropTypes from "prop-types";
import React, { useCallback, useEffect, useState, forwardRef } from "react";
import { FormattedMessage } from "react-intl";
import copy from "copy-to-clipboard";
import SmallActionButton from "./small-action-button";

const REFETCH_INVITE_LINK_MS = 5 * 60 * 1000;

const InvitePanelElement = styled.div`
  height: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  user-select: none;
  padding: 0 36px;
`;

const InviteFormRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin: 8px;

  & button {
    transition: all 0.25s;
  }

  &.copied {
    & button {
      border-color: var(--button-flash-border-color);
      background-color: var(--button-flash-background-color);
      color: var(--button-flash-text-color);
    }
  }
`;

const InviteWrap = styled.div`
  flex: 1;
  padding: 2px 4px;
  margin: 0 8px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
`;

const InviteInfo = styled.div`
  color: var(--dialog-info-text-color);
  font-size: var(--dialog-info-text-size);
  font-weight: var(--dialog-info-text-weight);
  margin-top: 6px;
`;

const InviteTip = styled.div`
  color: var(--dialog-tip-text-color);
  font-size: var(--dialog-tip-text-size);
  font-weight: var(--dialog-tip-text-weight);
  margin-top: 6px;
  margin-bottom: 8px;
`;

const InviteElement = styled.input`
  width: 100%;
  border: 0;
  color: var(--text-input-text-color);
  font-size: var(--text-input-text-size);
  font-weight: var(--text-input-text-weight);
  padding: 4px;
`;

const InvitePanel = forwardRef((props, ref) => {
  const { fetchInviteUrl } = props;
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteUrlCreatedAt, setInviteUrlCreatedAt] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const shouldRefetch = useCallback(
    () => !inviteUrl || performance.now() - inviteUrlCreatedAt >= REFETCH_INVITE_LINK_MS,
    [inviteUrl, inviteUrlCreatedAt]
  );

  useEffect(() => {
    if (shouldRefetch()) {
      fetchInviteUrl().then(url => {
        if (url && shouldRefetch()) {
          setInviteUrl(url);
          setInviteUrlCreatedAt(performance.now());
        }
      });
    }
  });

  return (
    <InvitePanelElement>
      <InviteFormRow className={isCopied ? "copied" : null}>
        <InviteWrap>
          <InviteElement
            type="text"
            tabIndex={-1}
            readOnly
            value={inviteUrl}
            ref={ref}
            onFocus={e => e.target.select()}
          />
        </InviteWrap>
        <SmallActionButton
          style={{ width: "100px", padding: "12px 12px" }}
          onClick={useCallback(
            e => {
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 3000);
              copy(inviteUrl);
              e.preventDefault();
              e.stopPropagation();
            },
            [inviteUrl]
          )}
        >
          <FormattedMessage id={isCopied ? "invite-panel.copied" : "invite-panel.copy"} />
        </SmallActionButton>
      </InviteFormRow>
      <InviteInfo>
        <FormattedMessage id={`invite-panel.info`} />
      </InviteInfo>
      <InviteTip>
        <FormattedMessage id={`invite-panel.expires-info`} />
      </InviteTip>
    </InvitePanelElement>
  );
});

InvitePanel.displayName = "InvitePanel";

InvitePanel.propTypes = {
  fetchInviteUrl: PropTypes.func
};

export default InvitePanel;