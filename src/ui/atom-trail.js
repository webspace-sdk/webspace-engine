import React, { useCallback, useState, useRef } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";
import { navigateToHubUrl } from "../utils/url-utils";
import { cancelEventIfFocusedWithin } from "../utils/dom-utils";

const MAX_ITEMS_IN_TRAIL = 3;

const AtomTrailElement = styled.div`
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
  margin: 0;
  padding: 14px 0 14px 8px;
  user-select: none;
  width: 50%;
`;

const AtomTrailAtomItem = styled.button`
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

  &.denied {
    pointer-events: none;
  }

  &:hover {
    background-color: var(--canvas-overlay-item-hover-background-color);
  }

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }
`;

const AtomTrailSeparatorItem = styled.div`
  width: 8px;
`;

export default function AtomTrail({
  atomIds,
  can,
  viewPermission,
  editPermission,
  metadata,
  renamePopupElement,
  showRenamePopup
}) {
  const primaryItemRef = useRef();

  const atomIdsToShow = atomIds || [];
  const names = [];

  while (atomIdsToShow.length > MAX_ITEMS_IN_TRAIL) {
    atomIdsToShow.shift();
  }

  // Yes, we use hooks in a loop here, but its a constant loop so it's OK
  for (let i = 0; i < MAX_ITEMS_IN_TRAIL; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [name, setName] = useState("");

    names.push(name);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useNameUpdateFromMetadata(atomIdsToShow[i] || null, metadata, setName);
  }

  const items = [];

  if (atomIdsToShow.length > 1) {
    for (let i = 0; i < atomIdsToShow.length - 1; i++) {
      const atomId = atomIdsToShow[i];

      if (can(viewPermission, atomId)) {
        items.push(
          <AtomTrailAtomItem
            key={`item-${i}`}
            className="short"
            onClick={() => navigateToHubUrl(metadata.getMetadata(atomId).url)}
          >
            {names[i]}
          </AtomTrailAtomItem>
        );
        items.push(<AtomTrailSeparatorItem key={`separator-${i}`}>/</AtomTrailSeparatorItem>);
      }
    }
  }

  const primaryAtomId = atomIdsToShow[atomIdsToShow.length - 1];

  const canRename = can && can(editPermission, primaryAtomId);
  items.push(
    <AtomTrailAtomItem
      key="primary-item"
      className={canRename ? "" : "denied"}
      ref={primaryItemRef}
      onMouseDown={e => cancelEventIfFocusedWithin(e, renamePopupElement)}
      onClick={useCallback(
        () => {
          if (canRename) {
            showRenamePopup(primaryAtomId, metadata, primaryItemRef, null, null);
          }
        },
        [canRename, primaryAtomId, primaryItemRef, metadata, showRenamePopup]
      )}
    >
      {names[atomIdsToShow.length - 1]}
    </AtomTrailAtomItem>
  );

  return <AtomTrailElement>{items}</AtomTrailElement>;
}

AtomTrail.propTypes = {
  atomIds: PropTypes.array,
  metadata: PropTypes.object,
  can: PropTypes.func,
  viewPermission: PropTypes.string,
  editPermission: PropTypes.string,
  renamePopupElement: PropTypes.object,
  showRenamePopup: PropTypes.func
};
