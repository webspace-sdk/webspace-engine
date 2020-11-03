import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "../assets/stylesheets/index.scss";
import Store from "../../hubs/storage/store";
import { createBrowserHistory } from "history";
import { connectToReticulum, fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";
import AuthChannel from "../../hubs/utils/auth-channel";
import { FormattedMessage } from "react-intl";
import InviteUI from "../react-components/invite-ui";
import LoginUI from "../react-components/login-ui";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { createSpace } from "../../hubs/utils/phoenix-utils";

const store = new Store();
const qs = new URLSearchParams(location.search);
const history = createBrowserHistory();
const authChannel = new AuthChannel(store);

window.APP = { store };

async function authenticateAndDidNotRedirect() {
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

  let membership = res.memberships.filter(m => m.space.space_id === spaceId)[0];

  if (!membership) {
    spaceId = [...res.memberships].sort(m => m.joined_at).pop().space.space_id;
    membership = res.memberships.filter(m => m.space.space_id === spaceId)[0];
    store.update({ context: { spaceId } });
  }

  const homeHub = membership.home_hub;
  document.location = homeHub.url;
  return true;
}

function JelIndex() {
  const [path, setPath] = useState(history.location.pathname);
  const [spaceName, setSpaceName] = useState("");

  useEffect(() => {
    return history.listen(() => {
      setPath(history.location.pathname);
    });
  });

  const signInUI = <LoginUI authChannel={authChannel} postAuthUrl={"/"} />;
  const signUpUI = <LoginUI authChannel={authChannel} postAuthUrl={"/"} isSignUp={true} />;
  const inviteUI = (
    <InviteUI
      store={store}
      showSignIn={!store.credentialsAccountId}
      onInviteAccepted={() => redirectedToLoggedInRoot()}
      inviteId={path.split("/")[2]}
    />
  );

  const authToken = qs.get("auth_token");

  if (authToken) {
    return <div>Logged in</div>;
  } else if (path.startsWith("/signin")) {
    return signInUI;
  } else if (path.startsWith("/signup")) {
    return signUpUI;
  } else if (path.startsWith("/i/")) {
    return inviteUI;
  } else {
    return (
      <div>
        <form
          onSubmit={async e => {
            e.preventDefault();
            const accountId = store.credentialsAccountId;

            if (!accountId) {
              // Create a new account and set creds
              const { credentials } = await fetchReticulumAuthenticated("/api/v1/accounts", "POST", {});
              store.update({ credentials: { token: credentials } });

              // Pause due to rate limiter
              await new Promise(res => setTimeout(res, 1050));
            }

            const { space_id } = await createSpace(spaceName);
            store.update({ context: { spaceId: space_id } });
            redirectedToLoggedInRoot();
          }}
        >
          <input required name="name" type="text" value={spaceName} onChange={e => setSpaceName(e.target.value)} />
          <button type="submit">
            <FormattedMessage id="new-space.create" />
          </button>
        </form>
        <a href="/signin">Sign In</a>
        {path}
      </div>
    );
  }
}

(async () => {
  const hasAuthToken = !!qs.get("auth_token");

  if (hasAuthToken) {
    const authDidNotRedirect = await authenticateAndDidNotRedirect();
    if (!authDidNotRedirect) return;
  } else {
    if (history.location.pathname === "/" || history.location.pathname === "") {
      if (await redirectedToLoggedInRoot()) return;
    }
  }

  const root = (
    <WrappedIntlProvider>
      <JelIndex />
    </WrappedIntlProvider>
  );
  ReactDOM.render(root, document.getElementById("home-root"));
})();
