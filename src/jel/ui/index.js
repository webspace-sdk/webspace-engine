import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
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
import { getMessages } from "../../hubs/utils/i18n";
import grassSrc from "../assets/images/landing-grass.svg";
import logoSrc from "../assets/images/landing-logo.png";
import SmallActionButton from "../react-components/small-action-button";
import DotSpinner from "../react-components/dot-spinner";

const messages = getMessages();
const store = new Store();
const qs = new URLSearchParams(location.search);
const history = createBrowserHistory();
const authChannel = new AuthChannel(store);

window.APP = { store };

const Panel = styled.div`
  min-width: 400px;
  height: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 6px;
  border: 1px solid var(--dialog-border-color);
  padding: 8px;
  margin: 8px;
  user-select: none;
`;

const Grass = styled.div`
  background: url('${grassSrc}');
  position: fixed;
  bottom: 0px;
  width: 100%;
  height: 120px;
`;

const IndexWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  height: fit-content;
  width: 100%;
`;

const InfoPanel = styled.div`
  flex-direction: column;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Tagline = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--panel-banner-text-color);
  font-size: var(--panel-banner-text-size);
  margin-top: 10px;
`;

const Logo = styled.img`
  width: 200px;
`;

const InputWrap = styled.div`
  flex: 1;
  padding: 2px 4px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
  width: 250px;
  margin-top: 12px;
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  border: 0;
  color: var(--text-input-text-color);
  font-size: var(--text-input-text-size);
  font-weight: var(--text-input-text-weight);
  padding: 4px;

  &::placeholder {
    color: var(--text-input-placeholder-color);
  }
`;

const Wrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

const SignInWrap = styled.div`
  display: flex;
  color: var(--dialog-tip-text-color);
  font-size: var(--dialog-tip-text-size);
  font-weight: var(--dialog-tip-text-weight);
  margin-top: 24px;

  & a {
    text-decoration: underline;
  }
`;

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

function JelIndexUI() {
  const [path, setPath] = useState(history.location.pathname);
  const [spaceName, setSpaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      <form
        onSubmit={async e => {
          setIsLoading(true);
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
        <Panel>
          <InputWrap>
            <Input
              placeholder={messages["new-space.placeholder"]}
              required
              name="name"
              type="text"
              autoComplete={"off"}
              value={spaceName}
              onChange={e => setSpaceName(e.target.value)}
            />
          </InputWrap>
          {isLoading ? (
            <DotSpinner style={{ transform: "scale(0.4)" }} />
          ) : (
            <SmallActionButton type="submit" style={{ width: "250px" }}>
              <FormattedMessage id="new-space.create" />
            </SmallActionButton>
          )}
          <SignInWrap>
            <FormattedMessage id="home.have-account" />&nbsp;<a href="/signin">
              <FormattedMessage id="home.sign-in" />
            </a>
          </SignInWrap>
        </Panel>
      </form>
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
      <Wrap>
        <Grass />
        <IndexWrap>
          <InfoPanel>
            <Logo src={logoSrc} />
            <Tagline>
              <FormattedMessage id="home.tagline" />
            </Tagline>
          </InfoPanel>
          <JelIndexUI />
        </IndexWrap>
      </Wrap>
    </WrappedIntlProvider>
  );
  ReactDOM.render(root, document.getElementById("home-root"));
})();
