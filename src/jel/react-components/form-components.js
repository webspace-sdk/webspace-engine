import styled from "styled-components";

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
`;

export const Tip = styled.div`
  color: var(--dialog-tip-text-color);
  font-size: var(--dialog-tip-text-size);
  font-weight: var(--dialog-tip-text-weight);
  margin-top: 6px;
  margin-bottom: 8px;
  margin-left: 12px;
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
  white-space: pre;
  line-height: 16px;

  & a {
    text-decoration: underline;
  }
`;

export const TextInputWrap = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  padding: 2px 4px;
  margin: 0 8px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
  margin: 12px;
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

  width: 300px;
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

  & ::before {
    content: "✔";
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
