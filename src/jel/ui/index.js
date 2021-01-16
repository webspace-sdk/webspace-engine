import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import "../../assets/jel/stylesheets/index.scss";
import Store from "../../hubs/storage/store";
import { createBrowserHistory } from "history";
import { connectToReticulum, fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";
import AuthChannel from "../../hubs/utils/auth-channel";
import { FormattedMessage } from "react-intl";
import InviteUI from "../react-components/invite-ui";
import LoginUI from "../react-components/login-ui";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { createSpace } from "../../hubs/utils/phoenix-utils";
import grassSrc from "../../assets/jel/images/landing-grass.svg";
import logoSrc from "../../assets/jel/images/landing-logo.png";
import SmallActionButton from "../react-components/small-action-button";
import DotSpinner from "../react-components/dot-spinner";

const store = new Store();
const qs = new URLSearchParams(location.search);
const history = createBrowserHistory();
const authChannel = new AuthChannel(store);

window.APP = { store };

const AUTH_RESULT = {
  OK: 1,
  FAILED: 2,
  REDIRECTED: 3
};

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

const Wrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: linear-gradient(180deg, #001409 0%, #00182f 16.67%, #002b53 56.25%, #0068c9 98.44%);
`;

const Tip = styled.div`
  display: flex;
  color: var(--dialog-tip-text-color);
  font-size: var(--dialog-tip-text-size);
  font-weight: var(--dialog-tip-text-weight);
  margin-top: 6px;

  & a {
    text-decoration: underline;
  }
`;

const SignedIn = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Footer = styled.div`
  position: fixed;
  width: 100%;
  bottom: 125px;
  left: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  a {
    color: var(--footer-link-text-color);
    font-size: var(--footer-link-text-size);
    font-weight: var(--footer-link-text-weight);
    text-decoration: none;
    margin: 0 16px;
  }

  a:hover {
    text-decoration: underline;
  }

  span {
    color: var(--dialog-tip-text-color);
  }
`;

async function authenticate() {
  const authToken = qs.get("auth_token");
  if (!authToken) return false;

  const authTopic = qs.get("auth_topic");
  const authPayload = qs.get("auth_payload");

  const authChannel = new AuthChannel(store);
  authChannel.setSocket(await connectToReticulum());
  let decryptedPayload;

  try {
    decryptedPayload = await authChannel.verifyAuthentication(authTopic, authToken, authPayload);
  } catch {
    return AUTH_RESULT.FAILED;
  }

  if (decryptedPayload.post_auth_url) {
    // Original auth request included a URL to redirect to after logging in. (Eg invites.)
    document.location = decryptedPayload.post_auth_url;
    return AUTH_RESULT.REDIRECTED;
  }

  return AUTH_RESULT.OK;
}

async function redirectedToLoggedInRoot() {
  const accountId = store.credentialsAccountId;
  if (!accountId) {
    return false;
  }

  let spaceId = store.state && store.state.context && store.state.context.spaceId;
  const lastJoinedHubId = spaceId && store.state && store.state.context && store.state.context.lastJoinedHubId;

  if (lastJoinedHubId) {
    const lastHubRes = await fetchReticulumAuthenticated(`/api/v1/hubs/${lastJoinedHubId}`);

    if (lastHubRes && !lastHubRes.error) {
      if (lastHubRes.hubs && lastHubRes.hubs.length > 0) {
        const lastHub = lastHubRes.hubs[0];
        document.location = lastHub.url;
        return true;
      }
    }
  }

  const res = await fetchReticulumAuthenticated(`/api/v1/accounts/${accountId}`);

  let membership = res.memberships.filter(m => m.space.space_id === spaceId)[0];

  if (!membership && res.memberships.length > 0) {
    spaceId = [...res.memberships].sort(m => m.joined_at).pop().space.space_id;
    membership = res.memberships.filter(m => m.space.space_id === spaceId)[0];
    store.update({ context: { spaceId, lastJoinedHubId: "" } });
  }

  if (membership) {
    const defaultHub = membership.default_hub;
    document.location = defaultHub.url;
    return true;
  }

  return false;
}

function JelIndexUI({ authResult }) {
  const [path, setPath] = useState(history.location.pathname);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return history.listen(() => {
      setPath(history.location.pathname);
    });
  });

  const signInUI = <LoginUI authChannel={authChannel} postAuthUrl={"/"} />;
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
    if (authResult === AUTH_RESULT.OK) {
      return (
        <SignedIn>
          <FormattedMessage id="home.signin-complete" />
          <Tip>
            <FormattedMessage id="home.signin-complete-close" />
          </Tip>
        </SignedIn>
      );
    } else {
      return (
        <SignedIn>
          <FormattedMessage id="home.signin-failed" />
          <Tip>
            <FormattedMessage id="home.signin-failed-close" />
          </Tip>
        </SignedIn>
      );
    }
  } else if (path.startsWith("/signin")) {
    return <InfoPanel>{signInUI}</InfoPanel>;
  } else if (path.startsWith("/i/")) {
    return inviteUI;
  } else {
    return (
      <div>
        <InfoPanel>
          <Tagline>
            <FormattedMessage id="home.tagline" />
          </Tagline>
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

              const { space_id } = await createSpace();
              store.update({
                context: { spaceId: space_id, lastJoinedHubId: "", isSpaceCreator: true, isFirstVisitToSpace: true }
              });
              redirectedToLoggedInRoot();
            }}
          >
            <Panel>
              {isLoading ? (
                <DotSpinner style={{ transform: "scale(0.4)" }} />
              ) : (
                <SmallActionButton type="submit" style={{ width: "250px" }}>
                  <FormattedMessage id="new-space.create" />
                </SmallActionButton>
              )}
              {!store.credentialsAccountId && (
                <Tip style={{ marginTop: "24px" }}>
                  <FormattedMessage id="home.have-account" />&nbsp;<a href="/signin">
                    <FormattedMessage id="home.sign-in" />
                  </a>
                </Tip>
              )}
            </Panel>
          </form>
        </InfoPanel>
        <Footer>
          <a href="https://discord.gg/wSCy58w54j">
            <FormattedMessage id="home.join-discord" />
          </a>
          <span>-</span>
          <a href="https://gfodor.medium.com/introducing-jel-the-un-zoom-320d3dcfd8f6">
            <FormattedMessage id="home.launch-post" />
          </a>
          <span>-</span>
          <a href="https://twitter.com/jel_app">
            <FormattedMessage id="home.twitter" />
          </a>
          <span>-</span>
          <a href="https://github.com/jel-app/policies/blob/master/TERMS.md">
            <FormattedMessage id="home.terms" />
          </a>
          <span>-</span>
          <a href="https://github.com/jel-app/policies/blob/master/PRIVACY.md">
            <FormattedMessage id="home.privacy" />
          </a>
        </Footer>
      </div>
    );
  }
}

(async () => {
  const hasAuthToken = !!qs.get("auth_token");
  let authResult;

  if (hasAuthToken) {
    authResult = await authenticate();
    if (authResult == AUTH_RESULT.REDIRECTED) return;
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
          <Logo src={logoSrc} />
          <JelIndexUI authResult={authResult} />
        </IndexWrap>
      </Wrap>
    </WrappedIntlProvider>
  );
  ReactDOM.render(root, document.getElementById("home-root"));
})();
