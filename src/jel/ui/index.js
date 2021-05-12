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
import ActionButton from "../react-components/action-button";
import DotSpinner from "../react-components/dot-spinner";
import registerTelemetry from "../../hubs/telemetry";

const store = new Store();
const qs = new URLSearchParams(location.search);
const history = createBrowserHistory();
const authChannel = new AuthChannel(store);

registerTelemetry();

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
  margin-bottom: 32px;
  user-select: none;
`;

const Grass = styled.div`
  background: url('${grassSrc}');
  position: fixed;
  bottom: 0px;
  width: 100%;
  height: 120px;

  @media (max-height: 820px) {
    display: none;
  }
`;

const BgColor = styled.div`
  background: linear-gradient(180deg, #001409 0%, #00182f 16.67%, #002b53 56.25%, #0068c9 98.44%);
  height: 100%;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -2;
`;

const InfoPanel = styled.div`
  flex-direction: column;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Logo = styled.img`
  width: 200px;
  margin-bottom: 8px;
`;

const Wrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  min-height: 100vh;
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
  width: 100%;
  left: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 32px;
  margin-bottom: 24px;

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

async function redirectedToLoggedInRoot(spaceId = null, hubId = null) {
  const accountId = store.credentialsAccountId;
  if (!accountId) {
    return false;
  }

  if (!spaceId) {
    spaceId = store.state && store.state.context && store.state.context.spaceId;
  }

  if (!hubId) {
    hubId =
      spaceId &&
      store.state &&
      store.state.context &&
      store.state.context.lastJoinedHubIds &&
      store.state.context.lastJoinedHubIds[spaceId];
  }

  if (hubId) {
    const hubRes = await fetchReticulumAuthenticated(`/api/v1/hubs/${hubId}`);

    if (hubRes && !hubRes.error) {
      if (hubRes.hubs && hubRes.hubs.length > 0) {
        const hub = hubRes.hubs[0];
        document.location = hub.url;
        return true;
      }
    }
  }

  const res = await fetchReticulumAuthenticated(`/api/v1/accounts/${accountId}`);

  let membership = res.memberships.filter(m => m.space.space_id === spaceId)[0];

  if (!membership && res.memberships.length > 0) {
    spaceId = [...res.memberships].sort(m => m.joined_at).pop().space.space_id;
    membership = res.memberships.filter(m => m.space.space_id === spaceId)[0];
    store.update({ context: { spaceId } });
  }

  if (membership) {
    const defaultHub = membership.default_hub;
    document.location = defaultHub.url;
    return true;
  }

  return false;
}

function JelIndexUI({ authResult, inviteId, inviteIsExpired, inviteSpaceId, inviteInitialHubId, inviteSpaceName }) {
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
      onInviteAccepted={() => redirectedToLoggedInRoot(inviteSpaceId, inviteInitialHubId)}
      inviteId={inviteId}
      spaceName={inviteSpaceName}
      spaceId={inviteSpaceId}
      isExpired={inviteIsExpired}
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
                context: { spaceId: space_id, isSpaceCreator: true, isFirstVisitToSpace: true }
              });
              redirectedToLoggedInRoot();
            }}
          >
            <Panel>
              {isLoading ? (
                <DotSpinner style={{ transform: "scale(0.4)" }} />
              ) : (
                <ActionButton type="submit" style={{ width: "250px" }}>
                  <FormattedMessage id="new-space.create" />
                </ActionButton>
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
  const path = history.location.pathname;

  if (hasAuthToken) {
    authResult = await authenticate();
    if (authResult == AUTH_RESULT.REDIRECTED) return;
  } else {
    if (path === "/" || path === "") {
      if (await redirectedToLoggedInRoot()) return;
    }
  }

  let inviteSpaceName = "";
  let inviteSpaceId = "";
  let inviteIsExpired = false;
  let inviteId = null;
  let inviteInitialHubId = null;

  if (path.startsWith("/i/")) {
    inviteId = path.split("/")[2];

    try {
      const res = await fetchReticulumAuthenticated(`/api/v1/invites/${inviteId}`);

      if (res.is_member) {
        // Already a member of this invite, redirect.
        if (await redirectedToLoggedInRoot(res.space.space_id, res.initial_hub && res.initial_hub.hub_id)) return;
      }

      inviteSpaceName = res.space.name;
      inviteSpaceId = res.space.space_id;
      inviteInitialHubId = res.initial_hub ? res.initial_hub.hub_id : null;
    } catch (e) {
      inviteIsExpired = true;
    }
  }

  const root = (
    <WrappedIntlProvider>
      <Wrap>
        <BgColor />
        <Grass />
        <Logo src={logoSrc} />
        <JelIndexUI
          authResult={authResult}
          inviteId={inviteId}
          inviteSpaceId={inviteSpaceId}
          inviteInitialHubId={inviteInitialHubId}
          inviteSpaceName={inviteSpaceName}
          inviteIsExpired={inviteIsExpired}
        />
      </Wrap>
    </WrappedIntlProvider>
  );
  ReactDOM.render(root, document.getElementById("home-root"));
})();
