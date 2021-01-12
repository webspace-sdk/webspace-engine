import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

const EmojiEquipElement = styled.div`
  padding: 0;
  margin: 0;
  background-color: yellow;
  position: relative;
  display: flex;
  width: 100%;
  height: 300px;
`;

const SlotButton = styled.div`
  position: absolute;
  background-color: red;
  width: 24px;
  height: 24px;
  z-index: 1;
`;

export default function EmojiEquip({ emoji }) {
  const [selectedSlot, setSelectedSlot] = useState(0);

  return (
    <EmojiEquipElement>
      <SlotButton style={{ left: "calc(50% + 9px)", top: "calc(50% - 46px)" }} />
      <SlotButton style={{ left: "calc(50% + 42px)", top: "calc(50% - 20px)" }} />
      <SlotButton style={{ left: "calc(50% + 56px)", top: "calc(50% + 17px)" }} />
      <SlotButton style={{ left: "calc(50% + 42px)", top: "calc(50% + 56px)" }} />
      <SlotButton style={{ left: "calc(50% + 9px)", top: "calc(50% + 82px)" }} />
      <SlotButton style={{ left: "calc(50% - 31px)", top: "calc(50% + 82px)" }} />
      <SlotButton style={{ left: "calc(50% - 66px)", top: "calc(50% + 56px)" }} />
      <SlotButton style={{ left: "calc(50% - 80px)", top: "calc(50% + 17px)" }} />
      <SlotButton style={{ left: "calc(50% - 66px)", top: "calc(50% - 20px)" }} />
      <SlotButton style={{ left: "calc(50% - 66px)", top: "calc(50% - 20px)" }} />
      <SlotButton style={{ left: "calc(50% - 31px)", top: "calc(50% - 46px)" }} />

      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="tomato"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(-90) translate(-20)"
        />
      </svg>
      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="green"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(-54) translate(-12.22, 3.97)"
        />
      </svg>
      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="blue"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(-18) translate(-3.59, 2.6)"
        />
      </svg>
      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="green"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(18) translate(2.60, -3.58)"
        />
      </svg>
      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="blue"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(54) translate(3.97, -12.22)"
        />
      </svg>
      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="green"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(90) translate(0, -20)"
        />
      </svg>
      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="blue"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(126) translate(-7.79, -23.98)"
        />
      </svg>
      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="green"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(162) translate(-16.41, -22.61)"
        />
      </svg>
      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="blue"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(198) translate(-22.61, -16.43)"
        />
      </svg>
      <svg style={{ position: "absolute", left: "calc(-10%)" }} height="120%" width="120%" viewBox="0 0 20 20">
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="green"
          strokeWidth="4"
          strokeDasharray="calc(10 * 31.42 / 100) 31.42"
          transform="rotate(234) translate(-23.96, -7.79)"
        />
      </svg>
    </EmojiEquipElement>
  );
}

EmojiEquip.propTypes = {};
