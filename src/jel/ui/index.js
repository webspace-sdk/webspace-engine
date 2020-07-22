import React, { useEffect, useState, useReducer } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import "../assets/stylesheets/index.scss";
import Store from "../../storage/store";
import { createBrowserHistory } from "history";
import { connectToReticulum, fetchReticulumAuthenticated } from "../../utils/phoenix-utils";
import AuthChannel from "../../utils/auth-channel";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../utils/focus-utils";
import { pushHistoryPath } from "../../utils/history";
import NewUI from "../react-components/new-ui";

const store = new Store();
const qs = new URLSearchParams(location.search);
const history = createBrowserHistory();
const authChannel = new AuthChannel(store);

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

async function redirectToLoggedInRoot() {
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

function SigninUI() {
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

  const onSubmit = async e => {
    if (flowState.signingIn || flowState.signedIn) return;

    e.preventDefault();
    flowDispatch("submit");
    authChannel.setSocket(await connectToReticulum());
    await authChannel.startAuthentication(email);
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

function JelIndex() {
  const [path, setPath] = useState(history.location.pathname);

  useEffect(() => {
    history.listen(() => {
      setPath(history.location.pathname);
    });
  });

  const signInUI = <SigninUI />;
  const newUI = <NewUI onSpaceCreated={() => redirectToLoggedInRoot()} />;
  const setupUI = <SetupUI onSetupComplete={() => redirectToLoggedInRoot()} />;

  if (path.startsWith("/signin")) {
    return signInUI;
  } else if (path.startsWith("/new")) {
    return newUI;
  } else if (path.startsWith("/setup")) {
    return setupUI;
  } else {
    return (
      <div>
        <a href="/signin">Sign In</a>
        {path}
      </div>
    );
  }
}

SetupUI.propTypes = {
  onSetupComplete: PropTypes.func
};

(async () => {
  if (history.location.pathname === "/" || history.location.pathname === "") {
    if (await checkForAuthentication()) return;
    if (await redirectToLoggedInRoot()) return;
  }

  const root = <JelIndex />;
  ReactDOM.render(root, document.getElementById("home-root"));
})();
