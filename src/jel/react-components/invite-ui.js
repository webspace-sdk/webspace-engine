import React, { useState, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";

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

  useEffect(() => {
    document.title = "Join Space";
  }, []);

  const fetchInvite = async inviteId => {
    try {
      const res = await fetchReticulumAuthenticated(`/api/v1/invites/${inviteId}`);
      setSpaceName(res.space.name);
      setSpaceId(res.space.space_id);
      document.title = `Join ${res.space.name}`;
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
    store.update({ context: { spaceId } });
    onInviteAccepted();
  };

  if (isExpired) {
    return <div>expired</div>;
  }

  return (
    <div>
      <form onSubmit={onSubmit}>
        {flowState.loadingInvite && <span>Loading...</span>}
        {flowState.submittingInvite && <span>Joining...</span>}
        {!flowState.submittingInvite && <button type="submit">Join {spaceName}</button>}
      </form>
      {showSignIn && <a href="/signin">Sign In</a>}
    </div>
  );
}

InviteUI.propTypes = {
  store: PropTypes.object,
  authChannel: PropTypes.object,
  inviteId: PropTypes.string,
  onInviteAccepted: PropTypes.func,
  showSignIn: PropTypes.bool
};
