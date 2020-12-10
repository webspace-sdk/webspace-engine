import PropTypes from "prop-types";
import React, { useState, forwardRef } from "react";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { FloatingTextPanelElement, FloatingTextWrap, FloatingTextElement } from "./floating-text-input";
import { getMessages } from "../../hubs/utils/i18n";

const ChatInputPanel = forwardRef((props, ref) => {
  const { className, onMessageEntered } = props;
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
            document.activeElement.blur(); // This causes this element to hide via CSS
            if (message !== "") {
              onMessageEntered(message);
            }
          }}
        >
          <FloatingTextElement
            type="text"
            tabIndex={-1}
            value={message}
            placeholder={placeholder}
            ref={ref}
            onFocus={({ target }) => handleTextFieldFocus(target)}
            onBlur={({ target }) => handleTextFieldBlur(target)}
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
  onMessageEntered: PropTypes.func
};

export default ChatInputPanel;
