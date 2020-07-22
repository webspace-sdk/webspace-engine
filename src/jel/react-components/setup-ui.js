import React, { useState, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";

export default function SetupUI({ store, onSetupComplete }) {
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

SetupUI.propTypes = {
  onSetupComplete: PropTypes.func,
  store: PropTypes.object
};
