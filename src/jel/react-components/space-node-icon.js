import PropTypes from "prop-types";
import React from "react";
import styled from "styled-components";

const SpaceNodeIconElement = styled.div`
  width: 64px;
  height: 64px;

  border-radius: 32px;
  transition: border-radius 0.1s;

  &:hover {
    transition: border-radius 0.1s;
    border-radius: 12px;
  }

  display: flex;
  justify-content: center;
  align-items: center;
`;

const SpaceNodeIconNonImage = styled.div`
  border: none;
  text-transform: uppercase;
  font-size: var(--secondary-panel-item-text-size);
  font-weight: var(--secondary-panel-item-text-weight);
  color: var(--secondary-panel-item-text-color);
`;

export default function SpaceNodeIcon({ spaceTreeDataItem: { icon, title } }) {
  if (icon) {
    return <SpaceNodeIconElement className="spaceNodeIcon" style={{ backgroundImage: `url(${icon})` }} />;
  } else {
    return (
      <SpaceNodeIconElement className="spaceNodeIcon">
        <SpaceNodeIconNonImage>{title && title.substring(0, 1)}</SpaceNodeIconNonImage>
      </SpaceNodeIconElement>
    );
  }
}

SpaceNodeIcon.propTypes = {
  spaceTreeDataItem: PropTypes.object
};
