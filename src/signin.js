import React, { useState, useReducer } from "react";
import ReactDOM from "react-dom";
import Store from "./storage/store";
import AuthChannel from "./utils/auth-channel";
import { handleTextFieldFocus, handleTextFieldBlur } from "./utils/focus-utils";
import { connectToReticulum } from "./utils/phoenix-utils";

import "./assets/stylesheets/signin.scss";

const store = new Store();
window.APP = { store };
const authChannel = new AuthChannel(store);

function flowReducer(state, action) {
  switch (action) {
    case "init":
      return { signingIn: false, signedIn: false };
    case "submit":
      return { signingIn: true, signedIn: false };
    case "finish":
      return { signingIn: false, signedIn: true };
  }
}

function SigninUI() {
  const [email, setEmail] = useState("");
  const [flowState, flowDispatch] = useReducer(flowReducer, "init");

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
      {flowState.signingIn && <span>Signing In...</span>}
      {flowState.signedIn && <span>Check your email</span>}
      {!flowState.signingIn && !flowState.signedIn && <button type="submit">sign in</button>}
    </form>
  );
}

const root = <SigninUI />;
ReactDOM.render(root, document.getElementById("signin-root"));
