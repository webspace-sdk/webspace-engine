import React from "react";
import ReactDOM from "react-dom";
import "../assets/stylesheets/index.scss";
import Store from "../../storage/store";
import { connectToReticulum, fetchReticulumAuthenticated } from "../../utils/phoenix-utils";
import AuthChannel from "../../utils/auth-channel";

const store = new Store();
const qs = new URLSearchParams(location.search);

window.APP = { store };

async function checkForAuthentication() {
  const authToken = qs.get("auth_token");
  if (!authToken) return;

  const authTopic = qs.get("auth_topic");
  const authPayload = qs.get("auth_payload");

  const authChannel = new AuthChannel(store);
  authChannel.setSocket(await connectToReticulum());
  await authChannel.verifyAuthentication(authTopic, authToken, authPayload);
}

async function checkForCredentials() {
  const accountId = store.credentialsAccountId;
  if (!accountId) {
    return false;
  }

  let spaceId = store.state && store.state.context && store.state.context.spaceId;

  const res = await fetchReticulumAuthenticated(`/api/v1/accounts/${accountId}`);

  if (!res.identity) {
    // Go to account setup flow if account is created but no identity.
    document.location = "/setup";
    return true;
  }

  if (res.memberships.length === 0) {
    // Go to new space page if not yet a member of a space.
    document.location = "/new";
    return true;
  }

  if (!spaceId) {
    spaceId = [...res.memberships].sort(m => m.joined_at).pop().space_id;
    store.update({ context: { space_id: spaceId } });
  }

  const homeHub = res.memberships.filter(m => m.space_id === spaceId)[0].home_hub;
  document.location = homeHub.url;
}

function JelHome() {
  return (
    <div>
      <a href="/signin">Sign In</a>
      <br />
      <a href="/signup">Sign Up</a>
    </div>
  );
}

(async () => {
  if (await checkForAuthentication()) return;
  if (await checkForCredentials()) return;

  const root = <JelHome />;
  ReactDOM.render(root, document.getElementById("home-root"));
})();
