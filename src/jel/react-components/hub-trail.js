import React, { useState } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { cancelEventIfFocusedWithin } from "../utils/dom-utils";

const MAX_ITEMS_IN_TRAIL = 3;

const HubTrailElement = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: flex-start;
  width: fit-content;
  align-items: center;
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-text-size);
  display: flex;
  align-items: center;
  position: relative;
  margin: 11px 0 0 8px;
  user-select: none;
  width: 50%;
`;

const HubTrailHubItem = styled.button`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  cursor: pointer;
  padding: 6px 10px;
  margin: 0 6px;
  border: 0;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  flex: 3;
  font-weight: var(--canvas-overlay-item-text-weight);
  text-align: left;
  max-width: fit-content;
  line-height: calc(var(--canvas-overlay-text-size) + 2px);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  pointer-events: auto;

  &.short {
    flex: 1;
    font-weight: var(--canvas-overlay-item-secondary-text-weight);
    font-size: var(--canvas-overlay-secondary-text-size);
    line-height: calc(var(--canvas-overlay-secondary-text-size) + 2px);
  }

  &:hover {
    background-color: var(--canvas-overlay-item-hover-background-color);
  }

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }
`;

const HubTrailSeparatorItem = styled.div`
  width: 8px;
`;

export default function HubTrail({ hubIds, hubCan, hubMetadata, history, hubRenamePopupElement, showRenamePopup }) {
  const primaryItemRef = React.createRef();

  const hubIdsToShow = hubIds || [];
  const names = [];

  while (hubIdsToShow.length > MAX_ITEMS_IN_TRAIL) {
    hubIdsToShow.shift();
  }

  // Yes, we use hooks in a loop here, but its a constant loop so it's OK
  for (let i = 0; i < MAX_ITEMS_IN_TRAIL; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [name, setName] = useState("");

    names.push(name);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useNameUpdateFromMetadata(hubIdsToShow[i] || null, hubMetadata, setName);
  }

  const items = [];

  if (hubIdsToShow.length > 1) {
    for (let i = 0; i < hubIdsToShow.length - 1; i++) {
      const hubId = hubIdsToShow[i];

      if (hubCan("join_hub", hubId)) {
        items.push(
          <HubTrailHubItem
            key={`item-${i}`}
            className="short"
            onClick={() => navigateToHubUrl(history, hubMetadata.getMetadata(hubId).url)}
          >
            {names[i]}
          </HubTrailHubItem>
        );
        items.push(<HubTrailSeparatorItem key={`separator-${i}`}>/</HubTrailSeparatorItem>);
      }
    }
  }

  const primaryHubId = hubIdsToShow[hubIdsToShow.length - 1];
  items.push(
    <HubTrailHubItem
      key="primary-item"
      ref={primaryItemRef}
      onMouseDown={e => cancelEventIfFocusedWithin(e, hubRenamePopupElement)}
      onClick={() => showRenamePopup(primaryHubId, primaryItemRef, null, null)}
    >
      {names[hubIdsToShow.length - 1]}
    </HubTrailHubItem>
  );

  return <HubTrailElement>{items}</HubTrailElement>;
}

HubTrail.propTypes = {
  history: PropTypes.object,
  hubIds: PropTypes.array,
  hubMetadata: PropTypes.object,
  hubCan: PropTypes.func,
  onHubNameChanged: PropTypes.func,
  hubRenamePopupElement: PropTypes.object,
  showRenamePopup: PropTypes.func
};
