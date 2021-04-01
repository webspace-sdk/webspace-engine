import styled from "styled-components";

export default styled.div`
  color: var(--panel-header-text-color);
  font-size: var(--panel-header-text-size);
  font-weight: var(--panel-header-text-weight);
  text-transform: uppercase;
  margin: 32px 16px 16px 16px;
  display: flex;
  align-items: center;

  &:first-child {
    margin-top: 0;
  }

  & .show-on-hover {
    visibility: hidden;
  }

  &:hover .show-on-hover {
    visibility: visible;
  }
`;
