import React from "react";
import styled from "styled-components";
import BuilderControls from "./builder-controls";

const BuilderContent = styled.div`
  color: var(--panel-text-color);
  background-color: var(--panel-background-color);
  flex: 1 1 auto;
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  width: 270px;
  height: 640px;
  min-height: 640px;
  padding: 8px 0;
`;

export const Normal = () => {
  return (
    <BuilderContent>
      <BuilderControls />;
    </BuilderContent>
  );
};

export default {
  title: "Builder Controls"
};
