import styled from "styled-components";
import PropTypes from "prop-types";
import React, { useState, useEffect, forwardRef } from "react";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";

const NameInputPanelElement = styled.div`
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

const NameInputWrap = styled.div`
  flex: 1;
  padding: 2px 4px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
`;

const NameInputElement = styled.input`
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

const NameInputPanel = forwardRef((props, ref) => {
  const { atomId, atomMetadata, onNameChanged } = props;
  const metadata = atomMetadata && atomMetadata.getMetadata(atomId);
  const [editingAtomId, setEditingAtomId] = useState(atomId);
  const [name, setName] = useState((metadata && metadata.name) || "");

  useEffect(
    () => {
      // If we are now editing a new atom, reset the input field. Otherwise ignore metadata changes.
      if (editingAtomId !== atomId) {
        setEditingAtomId(atomId);
        setName((metadata && metadata.name) || "");
      }
    },
    [atomId, metadata, editingAtomId, setEditingAtomId]
  );

  // If text field isn't focused, keep it up to date with metadata
  useNameUpdateFromMetadata(atomId, atomMetadata, null, rawName => {
    if (ref && document.activeElement !== ref.current) {
      setName(rawName || "");
    }
  });

  const isHome = metadata && !!metadata.is_home;
  const placeholder = isHome ? atomMetadata && atomMetadata.defaultHomeName : atomMetadata && atomMetadata.defaultName;

  return (
    <NameInputPanelElement className={props.className}>
      <NameInputWrap>
        <form
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            document.activeElement.blur(); // This causes this element to hide via CSS
          }}
        >
          <NameInputElement
            type="text"
            tabIndex={-1}
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
      </NameInputWrap>
    </NameInputPanelElement>
  );
});

NameInputPanel.displayName = "NameInputPanel";

NameInputPanel.propTypes = {
  atomId: PropTypes.string,
  className: PropTypes.string,
  atomMetadata: PropTypes.object,
  onNameChanged: PropTypes.func
};

export default NameInputPanel;
