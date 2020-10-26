import PropTypes from "prop-types";
import React, { useState } from "react";
import { CustomPicker } from "react-color";
import { Hue, Saturation } from "react-color/lib/components/common";
import styled from "styled-components";

const PickerElement = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  user-select: none;
`;

const HueSlider = styled.div`
  width: 100%;
  height: 20px;
  position: relative;

  .hue-horizontal {
    border-radius: 0 0 6px 6px;
  }
`;

const SatSlider = styled.div`
  width: 100%;
  flex: 1;
  position: relative;

  div {
    border-radius: 6px 6px 0 0;
  }

  .saturation-white,
  .saturation-black {
    border-radius: 6px 6px 0 0;
  }
`;

const HuePointer = () => (
  <div
    style={{
      marginTop: "1px",
      width: "4px",
      borderRadius: "1px",
      height: "12px",
      boxShadow: "0 0 2px rgba(0, 0, 0, .6)",
      background: "#fff",
      transform: "translate(-2px, 2px)"
    }}
  />
);

const SatPointer = () => (
  <div
    style={{
      width: "4px",
      height: "4px",
      boxShadow: `0 0 0 1.5px #fff, inset 0 0 1px 1px rgba(255,255,255),
            0 0 1px 2px rgba(255,255,255)`,
      borderRadius: "50%",
      cursor: "hand",
      transform: "translate(-2px, -2px)"
    }}
  />
);

const InnerPicker = CustomPicker(({ hsl, hsv, onChange }) => {
  return (
    <PickerElement>
      <SatSlider>
        <Saturation hsl={hsl} hsv={hsv} onChange={onChange} pointer={SatPointer} />
      </SatSlider>
      <HueSlider>
        <Hue hsl={hsl} onChange={onChange} pointer={HuePointer} />
      </HueSlider>
    </PickerElement>
  );
});

const Picker = ({ onChange, onChangeComplete }) => {
  const [color, setColor] = useState("orange");
  const handleColorChange = data => {
    setColor(data.hex);
    if (onChange) onChange(data);
  };

  return <InnerPicker color={color} onChange={handleColorChange} onChangeComplete={onChangeComplete} />;
};

Picker.propTypes = {
  onChange: PropTypes.func,
  onChangeComplete: PropTypes.func
};

export default Picker;