import React, { useState, useReducer } from "react";
import ReactDOM from "react-dom";
import Store from "./storage/store";
import AuthChannel from "./utils/auth-channel";
import { handleTextFieldFocus, handleTextFieldBlur } from "./utils/focus-utils";
import { connectToReticulum } from "./utils/phoenix-utils";

import "./assets/stylesheets/signup.scss";

const store = new Store();
window.APP = { store };
const authChannel = new AuthChannel(store);

function flowReducer(state, action) {
  switch (action) {
    case "init":
      return { signingUp: false, signedUp: false };
    case "submit":
      return { signingUp: true, signedUp: false };
    case "finish":
      return { signingUp: false, signedUp: true };
  }
}

function SignupUI() {
  const [email, setEmail] = useState("");
  const [flowState, flowDispatch] = useReducer(flowReducer, "init");

  const onSubmit = async e => {
    if (flowState.signingUp || flowState.signedUp) return;

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
        By proceeding, you agree to the{" "}
        <a rel="noopener noreferrer" target="_blank" href="https://jel.app/terms">
          terms of use
        </a>{" "}
        <a rel="noopener noreferrer" target="_blank" href="https://jel.app/privacy">
          privacy notice
        </a>
      </p>
      {flowState.signingUp && <span>Signing Up...</span>}
      {flowState.signedUp && <span>Check your email</span>}
      {!flowState.signingUp && !flowState.signedUp && <button type="submit">sign up</button>}
    </form>
  );
}

const root = <SignupUI />;
ReactDOM.render(root, document.getElementById("signup-root"));
