import PropTypes from "prop-types";
import React, {forwardRef, useState} from "react";
import {handleTextFieldBlur, handleTextFieldFocus} from "../utils/focus-utils";
import {FloatingTextElement, FloatingTextPanelElement, FloatingTextWrap} from "./floating-text-input";
import {getMessages} from "../utils/i18n";

const ChatInputPanel = forwardRef((props, ref) => {
  const { className, onMessageEntered, onEntryComplete } = props;
  const [message, setMessage] = useState("");
  const messages = getMessages();

  const placeholder = messages["chat.placeholder"];

  return (
    <FloatingTextPanelElement className={className}>
      <FloatingTextWrap>
        <form
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            DOM_ROOT.activeElement?.blur(); // This causes this element to hide via CSS
            if (message !== "") {
              onMessageEntered(message);
              onEntryComplete();
            }
          }}
        >
          <FloatingTextElement
            type="text"
            tabIndex={-1}
            value={message}
            placeholder={placeholder}
            ref={ref}
            className="blur-on-empty-space"
            onFocus={({ target }) => {
              handleTextFieldFocus(target, true);
              setMessage("");
            }}
            onBlur={({ target }) => {
              handleTextFieldBlur(target);
              onEntryComplete();
            }}
            onChange={({ target }) => setMessage(target.value)}
          />
        </form>
      </FloatingTextWrap>
    </FloatingTextPanelElement>
  );
});

ChatInputPanel.displayName = "ChatInputPanel";

ChatInputPanel.propTypes = {
  atomId: PropTypes.string,
  className: PropTypes.string,
  atomMetadata: PropTypes.object,
  onMessageEntered: PropTypes.func,
  onEntryComplete: PropTypes.func
};

export default ChatInputPanel;
