import PropTypes from "prop-types";
import styled from "styled-components";
import { FormattedMessage } from "react-intl";
import React, { useState, useEffect, forwardRef } from "react";
import sharedStyles from "../assets/stylesheets/shared.scss";

const KeyTipsElement = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  height: fit-content;
  border-radius: 6px;
  padding: 12px 24px;
  user-select: none;
`;

const KeyTipItem = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  margin: 6px 0;
`;

const KeyLabels = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
`;

const LetterKey = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  border-radius: 5px;
  background-color: rgba(32, 32, 32, 0.2);
  box-shadow: inset 0px 1px 4px rgba(32, 32, 32, 0.6);
  backdrop-filter: blur(8px);
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-tertiary-text-size);
  text-transform: uppercase;
  font: var(--key-label-font);
`;

const NamedKey = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: fit-content;
  height: 18px;
  height: 28px;
  border-radius: 5px;
  padding: 0 14px;
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-tertiary-text-size);
  background-color: rgba(32, 32, 32, 0.2);
  box-shadow: inset 0px 1px 3px rgba(32, 32, 32, 0.6);
  backdrop-filter: blur(2px);
  font: var(--key-label-font);
`;

const WideNamedKey = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: fit-content;
  height: 18px;
  height: 28px;
  border-radius: 5px;
  padding: 0 24px;
  color: var(--canvas-overlay-text-color);
  background-color: rgba(32, 32, 32, 0.2);
  box-shadow: inset 0px 1px 3px rgba(32, 32, 32, 0.6);
  backdrop-filter: blur(2px);
  font: var(--key-label-font);
`;

const TipLabel = styled.div`
  width: 60px;
  font-weight: var(--canvas-overlay-item-text-weight);
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-text-size);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  margin-left: 16px;
`;

const KeySeparator = styled.div`
  margin: 0px 6px;
  font-weight: var(--canvas-overlay-item-text-weight);
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-tertiary-text-size);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
`;

function KeyTips() {
  return (
    <KeyTipsElement>
      <KeyTipItem>
        <KeyLabels>
          <WideNamedKey>Space</WideNamedKey>
        </KeyLabels>
        <TipLabel>
          <FormattedMessage id="key-tips.play" />
        </TipLabel>
      </KeyTipItem>
      <KeyTipItem>
        <KeyLabels>
          <LetterKey>Q</LetterKey>
          <KeySeparator>/</KeySeparator>
          <LetterKey>E</LetterKey>
        </KeyLabels>
        <TipLabel>
          <FormattedMessage id="key-tips.seek" />
        </TipLabel>
      </KeyTipItem>
      <KeyTipItem>
        <KeyLabels>
          <LetterKey>T</LetterKey>
          <KeySeparator>/</KeySeparator>
          <LetterKey>G</LetterKey>
        </KeyLabels>
        <TipLabel>
          <FormattedMessage id="key-tips.volume" />
        </TipLabel>
      </KeyTipItem>
      <KeyTipItem>
        <KeyLabels>
          <LetterKey>R</LetterKey>
        </KeyLabels>
        <TipLabel>
          <FormattedMessage id="key-tips.rotate" />
        </TipLabel>
      </KeyTipItem>
      <KeyTipItem>
        <KeyLabels>
          <LetterKey>V</LetterKey>
        </KeyLabels>
        <TipLabel>
          <FormattedMessage id="key-tips.scale" />
        </TipLabel>
      </KeyTipItem>
      <KeyTipItem>
        <KeyLabels>
          <LetterKey>F</LetterKey>
        </KeyLabels>
        <TipLabel>
          <FormattedMessage id="key-tips.focus" />
        </TipLabel>
      </KeyTipItem>
      <KeyTipItem>
        <KeyLabels>
          <LetterKey>B</LetterKey>
        </KeyLabels>
        <TipLabel>
          <FormattedMessage id="key-tips.bake" />
        </TipLabel>
      </KeyTipItem>
      <KeyTipItem>
        <KeyLabels>
          <LetterKey>X</LetterKey>
          <KeySeparator>,</KeySeparator>
          <LetterKey>X</LetterKey>
        </KeyLabels>
        <TipLabel>
          <FormattedMessage id="key-tips.remove" />
        </TipLabel>
      </KeyTipItem>
    </KeyTipsElement>
  );
}

KeyTips.propTypes = {};

export { KeyTips as default };
