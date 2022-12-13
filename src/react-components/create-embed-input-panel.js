import styled from "styled-components";
import PropTypes from "prop-types";
import React, {forwardRef, useCallback, useState} from "react";
import {FormattedMessage} from "react-intl";
import {getMessages} from "../utils/i18n";
import {handleTextFieldBlur, handleTextFieldFocus} from "../utils/focus-utils";
import SmallActionButton from "./small-action-button";
import linkIconSrc from "../assets/jel/images/icons/link.svgi";

const CreateEmbedInputPanelElement = styled.div`
  background-color: var(--dialog-background-color);
  min-width: 512px;
  height: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 6px;
  border: 1px solid var(--dialog-border-color);
  box-shadow: 0px 12px 28px var(--dialog-shadow-color);
  padding: 8px;
  margin: 8px;
  user-select: none;
`;

const CreateEmbedFormRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin: 8px;
`;

const CreateEmbedInputWrap = styled.div`
  flex: 1;
  padding: 2px 4px;
  margin: 0 8px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
`;

const CreateEmbedTitleWrap = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  align-self: flex-start;
  margin-left: 10px;
`;

const CreateEmbedTitle = styled.div`
  color: var(--dialog-title-text-color);
  font-size: var(--dialog-title-text-size);
  font-weight: var(--dialog-title-text-weight);
  text-transform: uppercase;
  margin-top: 4px;
  margin-left: 4px;
  line-height: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CreateEmbedTitleIcon = styled.div`
  width: 18px;
  height: 18px;
  margin-top: 7px;
  margin-right: 6px;
  color: var(--panel-text-color);
  color: var(--dialog-title-text-color);
`;

const CreateEmbedInfo = styled.div`
  color: var(--dialog-info-text-color);
  font-size: var(--dialog-info-text-size);
  font-weight: var(--dialog-info-text-weight);
  margin-top: 6px;
`;

const CreateEmbedTip = styled.div`
  color: var(--dialog-tip-text-color);
  font-size: var(--dialog-tip-text-size);
  font-weight: var(--dialog-tip-text-weight);
  margin-top: 6px;
  margin-bottom: 8px;
`;

const CreateEmbedInputElement = styled.input`
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

const CreateEmbedInputPanel = forwardRef((props, ref) => {
  const { embedType, onURLEntered } = props;
  const [url, setUrl] = useState("");

  const messages = getMessages();
  const placeholder = messages[`create-embed.${embedType}-placeholder`];
  const handleSubmit = useCallback(
    e => {
      e.preventDefault();
      e.stopPropagation();

      if (url === "") return;

      if (onURLEntered) {
        onURLEntered(url);
      }

      DOM_ROOT.activeElement?.blur(); // This causes this element to hide via CSS
    },
    [url, onURLEntered]
  );

  return (
    <CreateEmbedInputPanelElement>
      <CreateEmbedTitleWrap>
        <CreateEmbedTitleIcon dangerouslySetInnerHTML={{ __html: linkIconSrc }} />
        <CreateEmbedTitle>
          <FormattedMessage id={`create-embed.${embedType}-title`} />
        </CreateEmbedTitle>
      </CreateEmbedTitleWrap>

      <CreateEmbedFormRow>
        <CreateEmbedInputWrap>
          <form onSubmit={handleSubmit}>
            <CreateEmbedInputElement
              type="text"
              tabIndex={-1}
              value={url}
              placeholder={placeholder}
              ref={ref}
              onFocus={e => handleTextFieldFocus(e.target)}
              onBlur={e => {
                // Hacky, clear after blur but not before button event fires or fade out happens
                setTimeout(() => setUrl(""), 250);
                handleTextFieldBlur(e.target);
              }}
              onChange={e => {
                const newUrl = e.target.value;
                setUrl(newUrl);
              }}
            />
          </form>
        </CreateEmbedInputWrap>
        <SmallActionButton onClick={handleSubmit}>
          <FormattedMessage id="create-embed.embed" />
        </SmallActionButton>
      </CreateEmbedFormRow>
      <CreateEmbedInfo>
        <FormattedMessage id={`create-embed.${embedType}-info`} />
      </CreateEmbedInfo>
      <CreateEmbedTip>
        <FormattedMessage id={`create-embed.tip`} />
      </CreateEmbedTip>
    </CreateEmbedInputPanelElement>
  );
});

CreateEmbedInputPanel.displayName = "CreateEmbedInputPanel";

CreateEmbedInputPanel.propTypes = {
  embedType: PropTypes.string,
  onURLEntered: PropTypes.func
};

export default CreateEmbedInputPanel;
