import styled from "styled-components";

export default styled.button`
  background-color: var(--action-button-background-color);
  border: 1px solid var(--action-button-border-color);
  color: var(--action-button-text-color);
  font-weight: var(--action-button-text-weight);
  padding: 12px;
  min-width: 196px;
  border-radius: 6px;
  margin: 12px;

  &:hover {
    background-color: var(--action-button-hover-background-color);
  }

  &:active {
    background-color: var(--action-button-active-background-color);
  }
`;
