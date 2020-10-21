import React, { forwardRef } from "react";
import styled from "styled-components";
import avatarBodyIcon from "../assets/images/avatar/avatar.svgi";
import eyes1 from "../assets/images/avatar/eyes-1.svg";
import eyes2 from "../assets/images/avatar/eyes-1.svg";
import eyes3 from "../assets/images/avatar/eyes-1.svg";
import eyes4 from "../assets/images/avatar/eyes-1.svg";
import eyes5 from "../assets/images/avatar/eyes-1.svg";
import eyes6 from "../assets/images/avatar/eyes-2.svg";
import eyes7 from "../assets/images/avatar/eyes-3.svg";
import eyes8 from "../assets/images/avatar/eyes-4.svg";
import viseme1 from "../assets/images/avatar/viseme-0.svg";
import viseme2 from "../assets/images/avatar/viseme-1.svg";
import viseme3 from "../assets/images/avatar/viseme-2.svg";
import viseme4 from "../assets/images/avatar/viseme-3.svg";
import viseme5 from "../assets/images/avatar/viseme-4.svg";
import viseme6 from "../assets/images/avatar/viseme-5.svg";
import viseme7 from "../assets/images/avatar/viseme-6.svg";
import viseme8 from "../assets/images/avatar/viseme-7.svg";
import viseme9 from "../assets/images/avatar/viseme-8.svg";
import viseme10 from "../assets/images/avatar/viseme-9.svg";
import viseme11 from "../assets/images/avatar/viseme-10.svg";
import viseme12 from "../assets/images/avatar/viseme-11.svg";

const EYES = [eyes1, eyes2, eyes3, eyes4, eyes5, eyes6, eyes7, eyes8];
const VISEMES = [
  viseme1,
  viseme2,
  viseme3,
  viseme4,
  viseme5,
  viseme6,
  viseme7,
  viseme8,
  viseme9,
  viseme10,
  viseme11,
  viseme12
];

const AvatarSwatchElement = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 64px;
  height: 64px;
  flex: 0 0 64px;
  position: relative;
  color: transparent;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  border: 0;
  background: transparent;

  &:hover {
    filter: brightness(80%);
  }

  &:active {
    transform: translate(0px, 1px);
  }

  filter: brightness(100%);
  transform: scale(1, 1);
  transition-property: filter, transform;
  transition-duration: 75ms, 75ms;
  transition-delay: 1500ms;

  &:not([data-mouth="0"]) {
    filter: brightness(110%);
    transform: scale(1.05, 1.05);
    transition-delay: 0ms;
  }

  &[data-eyes="0"] .eyes-0 {
    visibility: visible;
  }
  &[data-eyes="1"] .eyes-1 {
    visibility: visible;
  }
  &[data-eyes="2"] .eyes-2 {
    visibility: visible;
  }
  &[data-eyes="3"] .eyes-3 {
    visibility: visible;
  }
  &[data-eyes="4"] .eyes-4 {
    visibility: visible;
  }
  &[data-eyes="5"] .eyes-5 {
    visibility: visible;
  }
  &[data-eyes="6"] .eyes-6 {
    visibility: visible;
  }
  &[data-eyes="7"] .eyes-7 {
    visibility: visible;
  }

  &[data-mouth="0"] .mouth-0 {
    visibility: visible;
  }
  &[data-mouth="1"] .mouth-1 {
    visibility: visible;
  }
  &[data-mouth="2"] .mouth-2 {
    visibility: visible;
  }
  &[data-mouth="3"] .mouth-3 {
    visibility: visible;
  }
  &[data-mouth="4"] .mouth-4 {
    visibility: visible;
  }
  &[data-mouth="5"] .mouth-5 {
    visibility: visible;
  }
  &[data-mouth="6"] .mouth-6 {
    visibility: visible;
  }
  &[data-mouth="7"] .mouth-7 {
    visibility: visible;
  }
  &[data-mouth="8"] .mouth-8 {
    visibility: visible;
  }
  &[data-mouth="9"] .mouth-9 {
    visibility: visible;
  }
  &[data-mouth="10"] .mouth-10 {
    visibility: visible;
  }
  &[data-mouth="11"] .mouth-11 {
    visibility: visible;
  }
`;

const AvatarBody = styled.div`
  width: 46px;
  height: 46px;
`;

const AvatarEyes = styled.img`
  position: absolute;
  top: 10px;
  left: 9px;
  width: 46px;
  height: 32px;
  visibility: hidden;
`;

const AvatarMouth = styled.img`
  position: absolute;
  top: 21px;
  left: 11px;
  width: 42px;
  height: 42px;
  transform: scale(1, 0.6);
  visibility: hidden;
`;

const AvatarSwatch = forwardRef((props, ref) => {
  const eyes = [];
  for (let i = 0; i < EYES.length; i++) {
    eyes.push(<AvatarEyes className={`eyes-${i}`} key={`eyes-${i}`} src={EYES[i]} />);
  }

  const mouths = [];
  for (let i = 0; i < VISEMES.length; i++) {
    mouths.push(<AvatarMouth className={`mouth-${i}`} key={`mouth-${i}`} src={VISEMES[i]} />);
  }

  return (
    <AvatarSwatchElement ref={ref} {...props}>
      <AvatarBody key="body" dangerouslySetInnerHTML={{ __html: avatarBodyIcon }} />
      {eyes}
      {mouths}
    </AvatarSwatchElement>
  );
});

AvatarSwatch.displayName = "AvatarSwatch";

AvatarSwatch.propTypes = {};

export default AvatarSwatch;
