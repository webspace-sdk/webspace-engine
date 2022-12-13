import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { BigIconButton } from "./icon-button";
import { objRgbToCssRgb } from "../utils/dom-utils";
import { storedColorToRgb } from "../storage/store";

const EquippedColorSwatch = styled.div`
  width: 100%;
  height: 100%;
  width: 26px;
  height: 26px;
  border-radius: 4px;
`;

export default function EquippedColorIcon() {
  const { store } = window.APP;
  const [equippedColor, setEquippedColor] = useState(store.state.equips.color);

  const { r, g, b } = storedColorToRgb(equippedColor);
  const cssRgb = objRgbToCssRgb({ r: r / 255.0, g: g / 255.0, b: b / 255.0 });

  // Equipped emoji
  useEffect(
    () => {
      const handler = () => setEquippedColor(store.state.equips.color);
      store.addEventListener("statechanged-equips", handler);
      return () => store.removeEventListener("statechanged-equips", handler);
    },
    [store, setEquippedColor]
  );

  return (
    <BigIconButton tabIndex={-1}>
      <EquippedColorSwatch style={{ backgroundColor: cssRgb }} />
    </BigIconButton>
  );
}
