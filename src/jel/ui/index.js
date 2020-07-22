import React, { useEffect, useState, useReducer } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import "../assets/stylesheets/index.scss";
import Store from "../../storage/store";
import { createBrowserHistory } from "history";
import { connectToReticulum, fetchReticulumAuthenticated } from "../../utils/phoenix-utils";
import AuthChannel from "../../utils/auth-channel";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../utils/focus-utils";
import { replaceHistoryPath, pushHistoryPath } from "../../utils/history";
import NewUI from "../react-components/new-ui";

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
    spaceId = [...res.memberships].sort(m => m.joined_at).pop().space_id;
    store.update({ context: { spaceId } });
  }

  const homeHub = res.memberships.filter(m => m.space_id === spaceId)[0].home_hub;
  document.location = homeHub.url;
  return true;
}

function LoginUI({ postAuthUrl, isSignUp }) {
  const [email, setEmail] = useState("");
  const [flowState, flowDispatch] = useReducer((state, action) => {
    switch (action) {
      case "init":
        return { signingIn: false, signedIn: false };
      case "submit":
        return { signingIn: true, signedIn: false };
      case "finish":
        return { signingIn: false, signedIn: true };
    }
  }, "init");

  useEffect(
    () => {
      document.title = isSignUp ? "Sign Up" : "Sign In";
    },
    [isSignUp]
  );

  const onSubmit = async e => {
    if (flowState.signingIn || flowState.signedIn) return;

    e.preventDefault();
    flowDispatch("submit");
    authChannel.setSocket(await connectToReticulum());
    await authChannel.startAuthentication(email, null, { post_auth_url: postAuthUrl });
    flowDispatch("finish");
  };

  return (
    <form onSubmit={onSubmit}>
      <input
        name="email"
        type="email"
        required
        placeholder="Your email address"
        value={email}
        onFocus={e => handleTextFieldFocus(e.target)}
        onBlur={() => handleTextFieldBlur()}
        onChange={e => setEmail(e.target.value)}
      />
      {isSignUp && (
        <p>
          {" "}
          By proceeding, you agree to the{" "}
          <a rel="noopener noreferrer" target="_blank" href="https://jel.app/terms">
            {" "}
            terms of use
          </a>{" "}
          <a rel="noopener noreferrer" target="_blank" href="https://jel.app/privacy">
            privacy notice
          </a>
        </p>
      )}
      {flowState.signingIn && <span>Signing In...</span>}
      {flowState.signedIn && <span>Check your email</span>}
      {!flowState.signingIn && !flowState.signedIn && <button type="submit">sign in</button>}
    </form>
  );
}

function SetupUI({ onSetupComplete }) {
  const [name, setName] = useState("");
  const [flowState, flowDispatch] = useReducer((state, action) => {
    switch (action) {
      case "init":
        return { settingUp: false };
      case "submit":
        return { settingUp: true };
    }
  }, "init");

  useEffect(() => {
    document.title = "Setup";
  }, []);

  const onSubmit = async e => {
    if (flowState.settingUp || flowState.setUp) return;

    e.preventDefault();
    flowDispatch("submit");

    await fetchReticulumAuthenticated(`/api/v1/accounts/${store.credentialsAccountId}`, "PATCH", { name });
    onSetupComplete();
  };

  return (
    <form onSubmit={onSubmit}>
      <input
        name="name"
        type="text"
        required
        placeholder="Your name"
        value={name}
        maxLength={64}
        onFocus={e => handleTextFieldFocus(e.target)}
        onBlur={() => handleTextFieldBlur()}
        onChange={e => setName(e.target.value)}
      />
      {flowState.settingUp && <span>Setting up...</span>}
      {!flowState.settingUp && <button type="submit">set profile</button>}
    </form>
  );
}

function InviteUI({ inviteId, onInviteAccepted }) {
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
    <form onSubmit={onSubmit}>
      {flowState.loadingInvite && <span>Loading...</span>}
      {flowState.submittingInvite && <span>Joining...</span>}
      {!flowState.submittingInvite && <button type="submit">Join {spaceName}</button>}
    </form>
  );
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

  const signInUI = <LoginUI postAuthUrl={postAuthUrl} />;
  const signUpUI = <LoginUI isSignUp={true} postAuthUrl={postAuthUrl} />;
  const newUI = <NewUI onSpaceCreated={() => redirectedToLoggedInRoot()} />;
  const setupUI = <SetupUI onSetupComplete={() => redirectedToLoggedInRoot()} />;
  const inviteUI = <InviteUI onInviteAccepted={() => redirectedToLoggedInRoot()} inviteId={path.split("/")[2]} />;

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

LoginUI.propTypes = {
  postAuthUrl: PropTypes.string,
  isSignUp: PropTypes.bool
};

SetupUI.propTypes = {
  onSetupComplete: PropTypes.func
};

InviteUI.propTypes = {
  inviteId: PropTypes.string,
  onInviteAccepted: PropTypes.func
};

(async () => {
  if (history.location.pathname === "/" || history.location.pathname === "") {
    if (await authenticateAndDidRedirect()) return;
    if (await redirectedToLoggedInRoot()) return;
  }

  const root = <JelIndex />;
  ReactDOM.render(root, document.getElementById("home-root"));
})();
