import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import avatarBodyIcon from "../assets/images/avatar/avatar.svgi";
import eyes1 from "../assets/images/avatar/eyes-1.svg";
import eyes2 from "../assets/images/avatar/eyes-1.svg";
import eyes3 from "../assets/images/avatar/eyes-1.svg";
import eyes4 from "../assets/images/avatar/eyes-1.svg";
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

const EYES = [eyes1, eyes2, eyes3, eyes4];
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

const AvatarSwatchElement = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 64px;
  height: 100%;
  background-color: green;
  position: relative;
`;

const AvatarBody = styled.div`
  width: 48px;
  height: 48px;
`;

const AvatarEyes = styled.img`
  position: absolute;
  top: 6px;
  left: 7px;
  width: 48px;
  height: 38px;
`;

const AvatarMouth = styled.img`
  position: absolute;
  top: 20px;
  left: 11px;
  width: 42px;
  height: 42px;
  transform: scale(1, 0.6);
`;

export default function AvatarSwatch({ color }) {
  return (
    <AvatarSwatchElement>
      <AvatarBody style={{ color }} dangerouslySetInnerHTML={{ __html: avatarBodyIcon }} />
      <AvatarEyes src={EYES[0]} />
      <AvatarMouth src={VISEMES[2]} />
    </AvatarSwatchElement>
  );
}

AvatarSwatch.propTypes = {
  color: PropTypes.string
};
