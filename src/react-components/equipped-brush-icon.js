import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { BigIconButton } from "./icon-button";
import pickIcon from "../../assets/jel/images/icons/pick.svgi";
import fillIcon from "../../assets/jel/images/icons/fill.svgi";
import { BRUSH_TYPES } from "../constants";

const EquippedBrushDiv = styled.div`
  width: 100%;
  height: 100%;
  opacity: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
`;

export default function EquippedBrushIcon() {
  const { store } = window.APP;
  const { builderSystem } = SYSTEMS;
  const [equippedBrush, setEquippedBrush] = useState(builderSystem.brushType);

  let content;

  switch (equippedBrush) {
    case BRUSH_TYPES.VOXEL:
      content = <EquippedBrushDiv>V</EquippedBrushDiv>;
      break;
    case BRUSH_TYPES.FACE:
      content = <EquippedBrushDiv>F</EquippedBrushDiv>;
      break;
    case BRUSH_TYPES.BOX:
      content = <EquippedBrushDiv>B</EquippedBrushDiv>;
      break;
    case BRUSH_TYPES.CENTER:
      content = <EquippedBrushDiv>C</EquippedBrushDiv>;
      break;
    case BRUSH_TYPES.PICK:
      content = <EquippedBrushDiv dangerouslySetInnerHTML={{ __html: pickIcon }} />;
      break;
    case BRUSH_TYPES.FILL:
      content = <EquippedBrushDiv dangerouslySetInnerHTML={{ __html: fillIcon }} />;
      break;
  }

  // Equipped emoji
  useEffect(
    () => {
      const { builderSystem } = SYSTEMS;
      const handler = () => setEquippedBrush(builderSystem.brushType);
      builderSystem.addEventListener("settingschanged", handler);
      return () => builderSystem.removeEventListener("settingschanged", handler);
    },
    [store, setEquippedBrush]
  );

  return <BigIconButton tabIndex={-1}>{content}</BigIconButton>;
}
