import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "../assets/stylesheets/index.scss";
import Store from "../../hubs/storage/store";
import { createBrowserHistory } from "history";
import { connectToReticulum, fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";
import AuthChannel from "../../hubs/utils/auth-channel";
import { replaceHistoryPath, pushHistoryPath } from "../../hubs/utils/history";
import NewUI from "../react-components/new-ui";
import SetupUI from "../react-components/setup-ui";
import InviteUI from "../react-components/invite-ui";
import LoginUI from "../react-components/login-ui";

const store = new Store();
const qs = new URLSearchParams(location.search);
const history = createBrowserHistory();
const authChannel = new AuthChannel(store);

window.APP = { store };

async function authenticateAndDidRedirect() {
  const authToken = qs.get("auth_token");
  if (!authToken) return false;

  const authTopic = qs.get("auth_topic");
  const authPayload = qs.get("auth_payload");

  const authChannel = new AuthChannel(store);
  authChannel.setSocket(await connectToReticulum());
  const decryptedPayload = await authChannel.verifyAuthentication(authTopic, authToken, authPayload);

  if (decryptedPayload.post_auth_url) {
    // Original auth request included a URL to redirect to after logging in. (Eg invites.)
    document.location = decryptedPayload.post_auth_url;
    return true;
  }

  return false;
}

async function redirectedToLoggedInRoot() {
  const accountId = store.credentialsAccountId;
  if (!accountId) {
    return false;
  }

  let spaceId = store.state && store.state.context && store.state.context.spaceId;

  const res = await fetchReticulumAuthenticated(`/api/v1/accounts/${accountId}`);

  if (!res.identity) {
    // Go to account setup flow if account is created but no identity.
    pushHistoryPath(history, "/setup", "");
    return false;
  }

  if (res.memberships.length === 0) {
    // Go to new space page if not yet a member of a space.
    pushHistoryPath(history, "/new", "");
    return false;
  }

  if (!spaceId) {
    spaceId = [...res.memberships].sort(m => m.joined_at).pop().space.space_id;
    store.update({ context: { spaceId } });
  }

  const homeHub = res.memberships.filter(m => m.space.space_id === spaceId)[0].home_hub;
  document.location = homeHub.url;
  return true;
}

function JelIndex() {
  const [path, setPath] = useState(history.location.pathname);
  const [postAuthUrl, setPostAuthUrl] = useState(null);

  useEffect(() => {
    return history.listen(() => {
      setPath(history.location.pathname);
    });
  });

  useEffect(
    () => {
      if (path.startsWith("/i/") && !store.credentialsAccountId) {
        setPostAuthUrl(document.location.toString());
        replaceHistoryPath(history, "/signin", "");
      }
    },
    [path]
  );

  const signInUI = <LoginUI authChannel={authChannel} postAuthUrl={postAuthUrl} />;
  const signUpUI = <LoginUI authChannel={authChannel} isSignUp={true} postAuthUrl={postAuthUrl} />;
  const newUI = <NewUI onSpaceCreated={() => redirectedToLoggedInRoot()} />;
  const setupUI = <SetupUI store={store} onSetupComplete={() => redirectedToLoggedInRoot()} />;
  const inviteUI = (
    <InviteUI store={store} onInviteAccepted={() => redirectedToLoggedInRoot()} inviteId={path.split("/")[2]} />
  );

  if (path.startsWith("/signin")) {
    return signInUI;
  } else if (path.startsWith("/signup")) {
    return signUpUI;
  } else if (path.startsWith("/new")) {
    return newUI;
  } else if (path.startsWith("/setup")) {
    return setupUI;
  } else if (path.startsWith("/i/")) {
    return inviteUI;
  } else {
    return (
      <div>
        <a href="/signin">Sign In</a>
        {path}
      </div>
    );
  }
}

(async () => {
  if (history.location.pathname === "/" || history.location.pathname === "") {
    if (await authenticateAndDidRedirect()) return;
    if (await redirectedToLoggedInRoot()) return;
  }

  const root = <JelIndex />;
  ReactDOM.render(root, document.getElementById("home-root"));
})();
