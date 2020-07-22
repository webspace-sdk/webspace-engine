import React, { useState, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { connectToReticulum } from "../../hubs/utils/phoenix-utils";

export default function LoginUI({ authChannel, postAuthUrl, isSignUp }) {
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

LoginUI.propTypes = {
  authChannel: PropTypes.object,
  postAuthUrl: PropTypes.string,
  isSignUp: PropTypes.bool
};
