import PropTypes from "prop-types";
import React, { useState, useEffect, forwardRef } from "react";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";
import { FloatingTextPanelElement, FloatingTextWrap, FloatingTextElement } from "./floating-text-input";

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
    if (ref && DOM_ROOT.activeElement !== ref.current) {
      setName(rawName || "");
    }
  });

  const placeholder = atomMetadata && metadata && atomMetadata.defaultNameForType(metadata.type);

  return (
    <FloatingTextPanelElement className={props.className}>
      <FloatingTextWrap>
        <form
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            DOM_ROOT.activeElement?.blur(); // This causes this element to hide via CSS
          }}
        >
          <FloatingTextElement
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
      </FloatingTextWrap>
    </FloatingTextPanelElement>
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
