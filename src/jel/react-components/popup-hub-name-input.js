import styled from "styled-components";
import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import { getMessages } from "../../hubs/utils/i18n";

const PopupHubNameInputPanel = styled.div`
  background-color: var(--menu-background-color);
  min-width: 512px;
  height: fit-content;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  border-radius: 3px;
  border: 1px solid var(--menu-border-color);
  box-shadow: 2px 2px 2px var(--menu-shadow-color);
  padding: 6px;
`;

const PopupHubNameInputWrap = styled.div`
  flex: 1;
  padding: 2px;
  border-radius: 4px;
  border: 1px solid black;
  background: #fff;
`;

const PopupHubNameInputElement = styled.input`
  width: 100%;
  border: 0;
  font-size: 18px;
  color: black;
  padding: 4px;
`;

function PopupHubNameInput({ hubId, hubMetadata, onNameChanged }) {
  const [editingHubId, setEditingHubId] = useState(hubId);
  const [name, setName] = useState((hubMetadata && hubMetadata.name) || "");

  useEffect(
    () => {
      // If we are now editing a new hub, reset the input field. Otherwise ignore metadata changes.
      if (editingHubId !== hubId) {
        setEditingHubId(hubId);
        setName((hubMetadata && hubMetadata.name) || "");
      }
    },
    [hubId, hubMetadata]
  );

  const messages = getMessages();

  return (
    <PopupHubNameInputPanel>
      <PopupHubNameInputWrap>
        <PopupHubNameInputElement
          type="text"
          value={name}
          placeholder={messages["hub.unnamed-title"]}
          onChange={e => {
            const newName = e.target.value;
            setName(newName);
            if (onNameChanged) {
              onNameChanged(newName);
            }
          }}
        />
      </PopupHubNameInputWrap>
    </PopupHubNameInputPanel>
  );
}

PopupHubNameInput.propTypes = {
  hubId: PropTypes.string,
  hubMetadata: PropTypes.object,
  onNameChanged: PropTypes.func
};

export default PopupHubNameInput;
