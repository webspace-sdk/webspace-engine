import styled from "styled-components";
import PropTypes from "prop-types";
import React, { useState, useEffect, forwardRef } from "react";
import { getMessages } from "../../hubs/utils/i18n";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";

const PopupHubNameInputPanel = styled.div`
  background-color: var(--menu-background-color);
  min-width: 512px;
  height: fit-content;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  border-radius: 4px;
  border: 1px solid var(--menu-border-color);
  box-shadow: 0px 12px 28px var(--menu-shadow-color);
  padding: 6px;
`;

const PopupHubNameInputWrap = styled.div`
  flex: 1;
  padding: 2px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
`;

const PopupHubNameInputElement = styled.input`
  width: 100%;
  border: 0;
  font-size: 18px;
  color: var(--text-input-text-color);
  font-size: var(--text-input-text-size);
  font-weight: var(--text-input-text-weight);
  padding: 4px;

  &::placeholder {
    color: var(--text-input-placeholder-color);
  }
`;

const PopupHubNameInput = forwardRef(({ hubId, hubMetadata, onNameChanged }, ref) => {
  const metadata = hubMetadata && hubMetadata.getMetadata(hubId);
  const [editingHubId, setEditingHubId] = useState(hubId);
  const [name, setName] = useState((metadata && metadata.name) || "");

  useEffect(
    () => {
      // If we are now editing a new hub, reset the input field. Otherwise ignore metadata changes.
      if (editingHubId !== hubId) {
        setEditingHubId(hubId);
        setName((metadata && metadata.name) || "");
      }
    },
    [hubId, metadata, editingHubId, setEditingHubId]
  );

  // If text field isn't focused, keep it up to date with metadata
  useNameUpdateFromMetadata(hubId, hubMetadata, null, rawName => {
    if (ref && document.activeElement !== ref.current) {
      setName(rawName || "");
    }
  });

  const messages = getMessages();
  const isHome = metadata && !!metadata.is_home;
  const placeholder = messages[isHome ? "hub.unnamed-home-title" : "hub.unnamed-title"];

  return (
    <PopupHubNameInputPanel>
      <PopupHubNameInputWrap>
        <form
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            document.activeElement.blur(); // This causes this element to hide via CSS
          }}
        >
          <PopupHubNameInputElement
            type="text"
            value={name}
            placeholder={placeholder}
            ref={ref}
            onFocus={e => handleTextFieldFocus(e.target)}
            onBlur={e => {
              handleTextFieldBlur(e.target);
            }}
            onChange={e => {
              const newName = e.target.value;
              setName(newName);

              if (onNameChanged) {
                onNameChanged(newName);
              }
            }}
          />
        </form>
      </PopupHubNameInputWrap>
    </PopupHubNameInputPanel>
  );
});

PopupHubNameInput.displayName = "PopupHubNameInput";

PopupHubNameInput.propTypes = {
  hubId: PropTypes.string,
  hubMetadata: PropTypes.object,
  onNameChanged: PropTypes.func
};

export default PopupHubNameInput;
