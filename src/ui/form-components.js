import React, { forwardRef } from "react";
import styled from "styled-components";
import { getMessages } from "../utils/i18n";
import PropTypes from "prop-types";

const isMobile = AFRAME.utils.device.isMobile();

export const PanelWrap = styled.div`
  width: fit-content;
  height: fit-content;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 0 32px;
`;

export const Info = styled.div`
  color: var(--dialog-info-text-color);
  font-size: var(--dialog-info-text-size);
  font-weight: var(--dialog-info-text-weight);
  margin-top: 12px;
  margin-left: 12px;
  margin-right: 12px;
`;

export const Tip = styled.div`
  display: flex;
  flex-direction: row;
  color: var(--dialog-tip-text-color);
  font-size: var(--dialog-tip-text-size);
  font-weight: var(--dialog-tip-text-weight);
  margin-top: 6px;
  margin-bottom: 8px;
  margin-left: 12px;
  margin-right: 12px;
  white-space: pre;
  line-height: 16px;

  & a {
    text-decoration: underline;
  }
`;

export const Label = styled.label`
  color: var(--dialog-label-text-color);
  font-size: var(--dialog-label-text-size);
  font-weight: var(--dialog-label-text-weight);
  margin-top: 6px;
  margin-bottom: 8px;
  margin-left: 12px;
  margin-right: 12px;
  white-space: pre;
  line-height: 16px;

  & a {
    text-decoration: underline;
  }
`;

export const EditableTextInputWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding-right: 12px;
`;

export const EditableTextInputValue = styled.div`
  color: var(--dialog-info-text-color);
  font-size: var(--dialog-info-text-size);
  font-weight: var(--dialog-info-text-weight);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  flex: 1;
  padding: 2px 4px;
  border: 0;
  margin: 0px 8px;
`;

export const TextInputWrap = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  padding: 2px 4px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
  margin: 12px;

  & input:disabled {
    opacity: 0.5;
  }
`;

export const InputWrap = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  padding: 2px 4px;
  margin: 0 8px;
  border: 0;

  & input:disabled {
    opacity: 0.5;
  }
`;

export const Input = styled.input`
  width: 100%;
  border: 0;
  color: var(--text-input-text-color);
  font-size: var(--text-input-text-size);
  font-weight: var(--text-input-text-weight);
  padding: 4px;

  &::placeholder {
    color: var(--text-input-placeholder-color);
  }

  width: ${isMobile ? 150 : 300}px;
`;

export const Checkbox = styled.input`
  color: var(--dialog-tip-text-color);
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
  height: 16px;
  width: 16px;
  border: 1px solid var(--panel-item-active-background-color);
  border-radius: 2px;
  vertical-align: -2px;
  color: var(--panel-item-active-text-color);
  cursor: pointer;
  position: relative;
  background-color: transparent;
  margin-bottom: 2px;

  &:checked {
    background-color: var(--panel-item-active-background-color);
  }

  &:disabled {
    cursor: auto;
  }

  & ::before {
    content: "✓";
    color: var(--panel-item-active-text-color);
    padding: 2px;
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    visibility: hidden;
  }

  &:checked ::before {
    visibility: visible;
  }
`;

export const Radio = styled.input`
  color: var(--dialog-tip-text-color);
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
  height: 16px;
  width: 16px;
  border: 1px solid var(--panel-item-active-background-color);
  border-radius: 8px;
  vertical-align: -2px;
  color: var(--panel-item-active-text-color);
  cursor: pointer;
  position: relative;
  background-color: transparent;
  margin-bottom: 2px;

  &:checked {
    background-color: var(--panel-item-active-background-color);
  }

  &:disabled {
    cursor: auto;
  }

  & ::before {
    content: "•";
    color: var(--panel-item-active-text-color);
    padding: 2px;
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    visibility: hidden;
  }

  &:checked ::before {
    visibility: visible;
  }
`;

const FieldEditButtonElement = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  border: 1px transparent;
  color: var(--dialog-field-action-button-color);
  font-weight: var(--tiny-action-button-text-weight);
  font-size: var(--tiny-action-button-text-size);
  padding: 4px 6px;
  min-width: 34px;
  border-radius: 6px;
  margin: 0px;
  position: relative;
  white-space: nowrap;
  height: 32px;

  &:hover {
    color: var(--dialog-field-action-button-hover-color);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const FieldEditButtonIconHolder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 8px;
`;

const FieldEditButtonIcon = styled.div`
  width: 18px;
  height: 18px;
`;

export const FieldEditButton = forwardRef((props, ref) => {
  const filteredProps = { ...props };
  delete filteredProps.iconSrc;
  delete filteredProps.children;
  return (
    <FieldEditButtonElement {...filteredProps} ref={ref}>
      <FieldEditButtonIconHolder>
        <FieldEditButtonIcon dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
      </FieldEditButtonIconHolder>
      <TextContainer>{props.children}</TextContainer>
    </FieldEditButtonElement>
  );
});

FieldEditButton.displayName = "FieldEditButton";

FieldEditButton.propTypes = {
  iconSrc: PropTypes.string,
  children: PropTypes.node
};

const TextContainer = styled.div`
  box-sizing: border-box;
  height: calc(var(--tiny-action-button-text-size) - 9px);
  line-height: calc(var(--tiny-action-button-text-size) - 10px);
`;

export const checkboxControlFor = (name, labelMessageId, value, setter, onChange) => {
  const messages = getMessages();
  const label = messages[labelMessageId];

  return (
    <InputWrap>
      <Checkbox
        type="checkbox"
        id={name}
        name={name}
        checked={value}
        onChange={e => {
          const value = e.target.checked;
          setter(value);
          if (onChange) onChange(value);
        }}
      />
      <Label htmlFor={name} style={{ cursor: "pointer" }}>
        {label}
      </Label>
    </InputWrap>
  );
};
