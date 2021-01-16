import React, { useState, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";
import styled from "styled-components";
import SmallActionButton from "../react-components/small-action-button";
import { FormattedMessage } from "react-intl";
import DotSpinner from "../react-components/dot-spinner";

const Message = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--panel-banner-text-color);
  font-size: var(--panel-banner-text-size);
  margin-top: 10px;
  margin-bottom: 20px;
`;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

export default function InviteUI({ store, inviteId, onInviteAccepted, showSignIn }) {
  const [spaceName, setSpaceName] = useState("");
  const [spaceId, setSpaceId] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  const [flowState, flowDispatch] = useReducer((state, action) => {
    switch (action) {
      case "init":
        return { loadingInvite: true, submittingInvite: false };
      case "ready":
        return { loadingInvite: false, submittingInvite: false };
      case "submit":
        return { loadingInvite: false, submittingInvite: true };
    }
  }, "init");

  const fetchInvite = async inviteId => {
    try {
      const res = await fetchReticulumAuthenticated(`/api/v1/invites/${inviteId}`);
      setSpaceName(res.space.name);
      setSpaceId(res.space.space_id);
    } catch (e) {
      setIsExpired(true);
    }

    flowDispatch("ready");
  };

  useEffect(
    () => {
      fetchInvite(inviteId);
    },
    [inviteId]
  );

  const onSubmit = async e => {
    if (flowState.submittingInvite) return;
    e.preventDefault();

    const accountId = store.credentialsAccountId;

    if (!accountId) {
      // Create a new account and set creds
      const { credentials } = await fetchReticulumAuthenticated("/api/v1/accounts", "POST", {});
      store.update({ credentials: { token: credentials } });

      // Pause due to rate limiter
      await new Promise(res => setTimeout(res, 1050));
    }

    flowDispatch("submit");
    await fetchReticulumAuthenticated(`/api/v1/accounts/${store.credentialsAccountId}/memberships`, "POST", {
      invite_id: inviteId
    });
    store.update({ context: { spaceId, lastHubId: "" } });
    onInviteAccepted();
  };

  if (isExpired) {
    return <div>expired</div>;
  }

  return (
    <Wrap>
      <Message>
        <FormattedMessage id="invite.info" />
      </Message>
      <form onSubmit={onSubmit}>
        {flowState.submittingInvite && <DotSpinner style={{ transform: "scale(0.4)" }} />}
        {!flowState.submittingInvite && (
          <SmallActionButton type="submit">
            <FormattedMessage id="invite.join" />&nbsp;{spaceName}
          </SmallActionButton>
        )}
      </form>
      {showSignIn && <a href="/signin">Sign In</a>}
    </Wrap>
  );
}

InviteUI.propTypes = {
  store: PropTypes.object,
  authChannel: PropTypes.object,
  inviteId: PropTypes.string,
  onInviteAccepted: PropTypes.func,
  showSignIn: PropTypes.bool
};
