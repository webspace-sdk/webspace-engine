import styled from "styled-components";

export const FloatingTextPanelElement = styled.div`
  background-color: var(--menu-background-color);
  min-width: 512px;
  height: fit-content;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  border-radius: 6px;
  border: 1px solid var(--menu-border-color);
  box-shadow: 0px 12px 28px var(--menu-shadow-color);
  padding: 6px;
`;

export const FloatingTextWrap = styled.div`
  flex: 1;
  padding: 2px 4px;
  border-radius: 4px;
  border: 0;
  background: var(--text-input-background-color);
  box-shadow: inset 0px 0px 2px var(--menu-background-color);
`;

export const FloatingTextElement = styled.input`
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
