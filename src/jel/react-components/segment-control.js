import PropTypes from "prop-types";
import React, { forwardRef } from "react";

import styled from "styled-components";

const SegmentControlElement = styled.div`
  display: grid;
`;

const SegmentButton = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: var(--action-button-background-color);
  border: 1px solid var(--action-button-border-color);
  color: var(--action-button-text-color);
  font-weight: var(--tiny-action-button-text-weight);
  font-size: var(--tiny-action-button-text-size);
  padding: 4px 18px;
  min-width: 32px;
  position: relative;
  white-space: nowrap;
  height: 32px;

  &:hover {
    background-color: var(--action-button-hover-background-color);
  }

  &:active {
    background-color: var(--action-button-active-background-color);
  }

  &:disabled {
    opacity: 0.5;
  }

  &.top-left {
    border-radius: 6px 0 0 0;
  }

  &.top-right {
    border-radius: 0 6px 0 0;
  }

  &.top-bottom-left {
    border-radius: 6px 0 0 6px;
  }

  &.top-left-right {
    border-radius: 6px 6px 0 0;
  }

  &.bottom-left {
    border-radius: 0 0 0 6px;
  }

  &.bottom-right {
    border-radius: 0 0 6px 0;
  }

  &.top-bottom-right {
    border-radius: 0 6px 6px 0;
  }

  &.bottom-left-right {
    border-radius: 0 0 6px 6px;
  }

  &.selected {
    background-color: var(--action-button-text-color);
    color: var(--action-button-background-color);
  }
`;

const SegmentButtonIconHolder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 10px;
`;

const SegmentButtonIcon = styled.div`
  width: 18px;
  height: 18px;
`;

const SegmentControl = forwardRef((props, ref) => {
  const { items, rows, cols, selectedId, onChange } = props;

  const cssRows = new Array(rows).fill("32px").join(" ");
  const cssCols = new Array(cols).fill("40px").join(" ");

  const cssClasses = Array(rows * cols).fill(null);

  for (let i = 0; i < cssClasses.length; i++) {
    if (i === 0) {
      if (rows === 1) {
        cssClasses[i] = "top-bottom-left";
      } else if (cols === 1) {
        cssClasses[i] = "top-left-right";
      } else {
        cssClasses[i] = "top-left";
      }
    } else if (i === cols - 1) {
      if (rows === 1) {
        cssClasses[i] = "top-bottom-right";
      } else {
        cssClasses[i] = "top-right";
      }
    } else if (i === cols * (rows - 1)) {
      if (cols === 1) {
        cssClasses[i] = "bottom-left-right";
      } else {
        cssClasses[i] = "bottom-left";
      }
    } else if (i === cols * rows - 1) {
      cssClasses[i] = "bottom-right";
    }
  }

  return (
    <SegmentControlElement ref={ref} style={{ gridTemplateRows: cssRows, gridTemplateColumns: cssCols }}>
      {items.map(({ id, iconSrc }, idx) => {
        const cssClass = cssClasses[idx];

        return (
          <SegmentButton
            key={id}
            className={selectedId === id ? `selected ${cssClass}` : cssClass}
            onClick={() => {
              if (onChange) {
                onChange(id);
              }
            }}
          >
            <SegmentButtonIconHolder>
              <SegmentButtonIcon dangerouslySetInnerHTML={{ __html: iconSrc }} />
            </SegmentButtonIconHolder>
          </SegmentButton>
        );
      })}
    </SegmentControlElement>
  );
});

SegmentControl.displayName = "SegmentControl";
SegmentControl.propTypes = {
  items: PropTypes.array,
  rows: PropTypes.number,
  cols: PropTypes.number,
  selectedId: PropTypes.string,
  onChange: PropTypes.func
};

export { SegmentControl as default };
