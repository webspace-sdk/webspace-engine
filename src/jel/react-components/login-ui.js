import React, { useState, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { FormattedMessage } from "react-intl";
import { connectToReticulum } from "../../hubs/utils/phoenix-utils";
import SmallActionButton from "../react-components/small-action-button";
import DotSpinner from "../react-components/dot-spinner";

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
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

const Status = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  color: var(--dialog-info-text-color);
  font-size: var(--dialog-info-text-size);
  font-weight: var(--dialog-info-text-weight);
  margin-top: 24px;

  & a {
    text-decoration: underline;
  }
`;

const Tip = styled.div`
  color: var(--dialog-tip-text-color);
  font-size: var(--dialog-tip-text-size);
  font-weight: var(--dialog-tip-text-weight);
  margin-top: 6px;
`;

export default function LoginUI({ authChannel, postAuthUrl }) {
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
    e.preventDefault();

    if (flowState.signingIn || flowState.signedIn) return;
    flowDispatch("submit");
    authChannel.setSocket(await connectToReticulum());
    await authChannel.startAuthentication(email, null, { post_auth_url: postAuthUrl });
    flowDispatch("finish");
  };

  return (
    <form onSubmit={onSubmit}>
      <Wrap>
        <InputWrap>
          <Input
            name="email"
            type="email"
            required
            placeholder="Your email address"
            value={email}
            onFocus={e => handleTextFieldFocus(e.target)}
            onBlur={() => handleTextFieldBlur()}
            onChange={e => setEmail(e.target.value)}
          />
        </InputWrap>
        {flowState.signingIn && <DotSpinner style={{ transform: "scale(0.4)" }} />}
        {flowState.signedIn && (
          <Status>
            <FormattedMessage id="home.signing-in" />
            <Tip>
              <FormattedMessage id="home.signing-in-tip" />
            </Tip>
          </Status>
        )}
        {!flowState.signingIn &&
          !flowState.signedIn && (
            <SmallActionButton type="submit">
              <FormattedMessage id="home.sign-in" />
            </SmallActionButton>
          )}
      </Wrap>
    </form>
  );
}

LoginUI.propTypes = {
  authChannel: PropTypes.object,
  postAuthUrl: PropTypes.string
};
