import React from "react";
import PropTypes from "prop-types";
import {FormattedMessage} from "react-intl";
import styled from "styled-components";
import nextPageIconSrc from "../assets/jel/images/icons/next-page.svgi";
import prevPageIconSrc from "../assets/jel/images/icons/prev-page.svgi";

const LayerPagerElement = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: flex-start;
  width: fit-content;
  align-items: center;
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-secondary-text-size);
  font-weight: var(--canvas-overlay-secondary-text-weight);
  display: flex;
  align-items: center;
  position: relative;
  margin: 11px 0 0 8px;
  user-select: none;
  pointer-events: auto;
`;

const LayerPagerPage = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  padding: 6px 10px;
  margin: 0 6px;
  border: 0;
  flex: 3;
  font-weight: var(--canvas-overlay-secondary-text-weight);
  text-align: left;
  max-width: fit-content;
  line-height: calc(var(--canvas-overlay-text-size) + 2px);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
`;

const LayerPagerPageButton = styled.button`
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

  .panels-collapsed & {
    display: none;
  }

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

  &.disabled-page-button {
    opacity: 0.4;
    pointer-events: none;

    &:hover {
      background-color: transparent;
    }

    &:active {
      background-color: transparent;
    }
  }
`;

const LayerPagerPageButtonIcon = styled.div`
  width: 12px;
  height: 12px;
`;

export default function LayerPager({ page, maxPage, onPageChanged }) {
  return (
    <LayerPagerElement>
      <LayerPagerPageButton
        onClick={e => {
          e.preventDefault();

          const newPage = Math.max(1, page - 1);

          if (page !== newPage) {
            if (onPageChanged) onPageChanged(newPage);
          }
        }}
        className={page === 1 ? "disabled-page-button" : ""}
      >
        <LayerPagerPageButtonIcon dangerouslySetInnerHTML={{ __html: prevPageIconSrc }} />
      </LayerPagerPageButton>
      <LayerPagerPage>
        <FormattedMessage id="hub-pager.layer" />&nbsp;{page}
      </LayerPagerPage>
      <LayerPagerPageButton
        onClick={e => {
          e.preventDefault();

          const newPage = Math.min(maxPage, page + 1);

          if (page !== newPage) {
            if (onPageChanged) onPageChanged(newPage);
          }
        }}
        className={page === maxPage ? "disabled-page-button" : ""}
      >
        <LayerPagerPageButtonIcon dangerouslySetInnerHTML={{ __html: nextPageIconSrc }} />
      </LayerPagerPageButton>
    </LayerPagerElement>
  );
}

LayerPager.propTypes = {
  page: PropTypes.number,
  maxPage: PropTypes.number,
  onPageChanged: PropTypes.func,
  showButtons: PropTypes.bool
};
