import React, { useState, useReducer } from "react";
import ReactDOM from "react-dom";
import Store from "./storage/store";
import { handleTextFieldFocus, handleTextFieldBlur } from "./utils/focus-utils";
import { fetchReticulumAuthenticated } from "./utils/phoenix-utils";

import "./assets/stylesheets/signup.scss";

const store = new Store();
window.APP = { store };

function flowReducer(state, action) {
  switch (action) {
    case "init":
      return { settingUp: false };
    case "submit":
      return { settingUp: true };
  }
}

function SignupUI() {
  const [name, setName] = useState("");
  const [flowState, flowDispatch] = useReducer(flowReducer, "init");

  const onSubmit = async e => {
    if (flowState.settingUp || flowState.setUp) return;

    e.preventDefault();
    flowDispatch("submit");

    await fetchReticulumAuthenticated(`/api/v1/accounts/${store.credentialsAccountId}`, "PATCH", { name });

    // Index page will determine what to do next.
    document.location = "/";
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

const root = <SignupUI />;
ReactDOM.render(root, document.getElementById("signup-root"));
