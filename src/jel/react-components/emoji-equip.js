import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

const EmojiEquipElement = styled.div``;

export default function EmojiEquip({ emoji }) {
  return (
    <EmojiEquipElement>
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
      <svg style={{ position: "absolute" }} height="1200" width="1200" viewBox="0 0 20 20">
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
