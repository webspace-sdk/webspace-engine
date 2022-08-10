import { createGlobalStyle } from "styled-components";

const PRIMARY_SUB0 = "#050E2E";
const PRIMARY_0 = "#061139";
const PRIMARY_1 = "#111749";
const PRIMARY_1B = "#151c5b";
const PRIMARY_2 = "#19216C";
const PRIMARY_3 = "#2D3A8C";
const PRIMARY_4 = "#35469C";
const PRIMARY_5 = "#4055A8";
const PRIMARY_6 = "#4C63B6";
const PRIMARY_7 = "#647ACB";
const PRIMARY_8 = "#7B93DB";
const PRIMARY_9 = "#98AEEB";
const PRIMARY_10 = "#BED0F7";
const PRIMARY_10B = "#CFDCF8"; // eslint-disable-line
const PRIMARY_11 = "#E0E8F9";
const PRIMARY_11B = "#F0F4FC"; // eslint-disable-line
const PRIMARY_12 = "#FFFFFF"; // eslint-disable-line

const NEUTRAL_1 = "#0F1923";
const NEUTRAL_2 = "#1F2933";
const NEUTRAL_3 = "#323F4B"; // eslint-disable-line
const NEUTRAL_4 = "#3E4C59"; // eslint-disable-line
const NEUTRAL_5 = "#52606D"; // eslint-disable-line
const NEUTRAL_6 = "#616E7C";
const NEUTRAL_7 = "#7B8794"; // eslint-disable-line
const NEUTRAL_8 = "#9AA5B1";
const NEUTRAL_9 = "#CBD2D9";
const NEUTRAL_10 = "#E4E7EB";
const NEUTRAL_11 = "#F5F7FA";

const ACCENT_1_1 = "#035388";
const ACCENT_1_2 = "#0B69A3"; // eslint-disable-line
const ACCENT_1_3 = "#127FBF";
const ACCENT_1_4 = "#1992D4"; // eslint-disable-line
const ACCENT_1_5 = "#2BB0ED"; // eslint-disable-line
const ACCENT_1_6 = "#40C3F7"; // eslint-disable-line
const ACCENT_1_7 = "#5ED0FA"; // eslint-disable-line
const ACCENT_1_8 = "#81DEFD";
const ACCENT_1_9 = "#B3ECFF"; // eslint-disable-line
const ACCENT_1_10 = "#E3F8FF"; // eslint-disable-line

const ACCENT_2_1 = "#841003"; // eslint-disable-line
const ACCENT_2_2 = "#AD1D07"; // eslint-disable-line
const ACCENT_2_3 = "#C52507"; // eslint-disable-line
const ACCENT_2_4 = "#DE3A11"; // eslint-disable-line
const ACCENT_2_5 = "#F35627"; // eslint-disable-line
const ACCENT_2_6 = "#F9703E";
const ACCENT_2_7 = "#FF9466"; // eslint-disable-line
const ACCENT_2_8 = "#FFB088"; // eslint-disable-line
const ACCENT_2_9 = "#FFD0B5"; // eslint-disable-line
const ACCENT_2_10 = "#FFE8D9"; // eslint-disable-line

const ACCENT_3_1 = "#610316"; // eslint-disable-line
const ACCENT_3_2 = "#8A041A"; // eslint-disable-line
const ACCENT_3_3 = "#AB091E";
const ACCENT_3_4 = "#CF1124";
const ACCENT_3_5 = "#E12D39";
const ACCENT_3_6 = "#EF4E4E";
const ACCENT_3_7 = "#F86A6A"; // eslint-disable-line
const ACCENT_3_8 = "#FF9B9B"; // eslint-disable-line
const ACCENT_3_9 = "#FFBDBD"; // eslint-disable-line
const ACCENT_3_10 = "#FFE3E3"; // eslint-disable-line

const ACCENT_4_1 = "#014D40";
const ACCENT_4_2 = "#0C6B58";
const ACCENT_4_3 = "#147D64";
const ACCENT_4_4 = "#199473";
const ACCENT_4_5 = "#27AB83";
const ACCENT_4_6 = "#3EBD93";
const ACCENT_4_7 = "#64D6AD"; // eslint-disable-line
const ACCENT_4_8 = "#8EEDC7";
const ACCENT_4_9 = "#C6F7E2"; // eslint-disable-line
const ACCENT_4_10 = "#EFFCF6"; // eslint-disable-line

const TEXT_1_SIZE = "12px";
const TEXT_2_SIZE = "14px";
const TEXT_3_SIZE = "16px";
const TEXT_4_SIZE = "18px";
const TEXT_5_SIZE = "20px";
const TEXT_6_SIZE = "24px"; // eslint-disable-line
const TEXT_7_SIZE = "30px"; // eslint-disable-line
const TEXT_8_SIZE = "36px"; // eslint-disable-line
const TEXT_9_SIZE = "48px"; // eslint-disable-line
const TEXT_10_SIZE = "60px"; // eslint-disable-line
const TEXT_11_SIZE = "72px"; // eslint-disable-line

const TEXT_1_WEIGHT = "400";
const TEXT_2_WEIGHT = "700";
const TEXT_3_WEIGHT = "900";

const SMALL_TEXT_SIZE = TEXT_3_SIZE;
const SMALL_TEXT_WEIGHT = TEXT_1_WEIGHT;
const SMALL_TEXT_SEMI_BOLD_WEIGHT = TEXT_2_WEIGHT; // eslint-disable-line
const SMALL_TEXT_BOLD_WEIGHT = TEXT_3_WEIGHT; // eslint-disable-line

const XSMALL_TEXT_SIZE = TEXT_1_SIZE;
const XSMALL_TEXT_WEIGHT = TEXT_1_WEIGHT;
const XSMALL_TEXT_BOLD_WEIGHT = TEXT_2_WEIGHT; // eslint-disable-line

const ATOM_TREE = `
  .atom-tree {
    margin: 0;
    border: 1px solid transparent;
    width: 100%;
    
    // padding: 5px;
    .atom-tree-treenode {
      margin: 0;
      padding: 0 8px;
      line-height: 28px;
      white-space: nowrap;
      list-style: none;
      outline: 0;
      display: flex;
      align-items: center;
      .draggable {
        -moz-user-select: none;
        -khtml-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        /* Required to make elements draggable in old WebKit */
        -khtml-user-drag: element;
        -webkit-user-drag: element;
      }
      font-size: var(--panel-item-text-size);
      &:hover {
        background-color: var(--panel-item-hover-background-color);
        color: var(--panel-item-hover-text-color);
      }
      &:active {
        background-color: var(--panel-item-active-background-color);
        color: var(--panel-item-active-text-color);
      }
      &.drag-over {
        > .draggable {
          background-color: var(--panel-item-hover-background-color);
          opacity: 0.8;
        }
      }
      &.drag-over-gap-top {
        > .draggable {
          border-top: 2px var(--panel-item-drag-line-color) solid;
        }
      }
      &.drag-over-gap-bottom {
        > .draggable {
          border-bottom: 2px var(--panel-item-drag-line-color) solid;
        }
      }
      &.filter-node {
        > .atom-tree-node-content-wrapper {
        }
      }
      ul {
        margin: 0;
        padding: 0 0 0 18px;
      }
      &-selected {
        background-color: var(--panel-item-selected-background-color);
        color: var(--panel-selected-text-color);
      }
      .atom-tree-node-content-wrapper {
        display: flex;
        flex-direction: row;
        height: 30px;
        width: 100%;
        flex-shrink: 10; // Hacky - deeply nested nodes start shrinking expander 
        margin: 0;
        padding: 1px 3px 0 0;
        text-decoration: none;
        vertical-align: top;
        overflow: hidden;
        cursor: pointer;
      }
      span {
        &.atom-tree-title {
          overflow: hidden;
          flex: 1;
        }

        &.atom-tree-switcher,
        &.atom-tree-checkbox,
        &.atom-tree-iconEle {
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-right: 2px;
          line-height: 16px;
          vertical-align: middle;
          background-color: transparent;
          background-repeat: no-repeat;
          background-attachment: scroll;
          border: 0 none;
          outline: none;
          cursor: pointer;

          &.atom-tree-icon__customize {
            background-image: none;
          }
        }
        &.atom-tree-icon_loading {
          margin-right: 2px;
          vertical-align: top;
        }
        &.atom-tree-switcher {
          &.atom-tree-switcher-noop {
            cursor: auto;
          }
          &.atom-tree-switcher_open {
            mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            background-color: var(--panel-text-color);
            transform: rotate(90deg);
            transition: transform 0.25s;
          }
          &.atom-tree-switcher_close {
            mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            background-color: var(--panel-text-color);
            transform: rotate(0deg);
            transition: transform 0.25s;
          }
        }
        &.atom-tree-checkbox {
          width: 13px;
          height: 13px;
          margin: 0 3px;
          background-position: 0 0;
          &-checked {
            background-position: -14px 0;
          }
          &-indeterminate {
            background-position: -14px -28px;
          }
          &-disabled {
            background-position: 0 -56px;
          }
          &.atom-tree-checkbox-checked.atom-tree-checkbox-disabled {
            background-position: -14px -56px;
          }
          &.atom-tree-checkbox-indeterminate.atom-tree-checkbox-disabled {
            position: relative;
            background: #ccc;
            border-radius: 3px;
            &::after {
              position: absolute;
              top: 5px;
              left: 3px;
              width: 5px;
              height: 0;
              border: 2px solid #fff;
              border-top: 0;
              border-left: 0;
              -webkit-transform: scale(1);
              transform: scale(1);
              content: ' ';
            }
          }
        }
      }
    }
    &:not(.atom-tree-show-line) {
      .atom-tree-treenode {
        .atom-tree-switcher-noop {
          background: none;
        }
      }
    }
    &.atom-tree-show-line {
      .atom-tree-treenode:not(:last-child) {
        > ul {
          background: url('data:image/gif;base64,R0lGODlhCQACAIAAAMzMzP///yH5BAEAAAEALAAAAAAJAAIAAAIEjI9pUAA7')
            0 0 repeat-y;
        }
        > .atom-tree-switcher-noop {
          background-position: -56px -18px;
        }
      }
      .atom-tree-treenode:last-child {
        > .atom-tree-switcher-noop {
          background-position: -56px -36px;
        }
      }
    }
    &-child-tree {
      display: none;
      &-open {
        display: block;
      }
    }
    &-treenode-disabled {
      > span:not(.atom-tree-switcher),
      > a,
      > a span {
        color: #767676;
        cursor: not-allowed;
      }
    }
    #-treenode-active {
      background: rgba(0, 0, 0, 0.1);

      // .atom-tree-node-content-wrapper {
      //   background: rgba(0, 0, 0, 0.1);
      // }
    }
    &-node-selected {
      background-color: transparent;
    }
    &-icon__open {
      margin-right: 2px;
      vertical-align: top;
      background-position: -110px -16px;
    }
    &-icon__close {
      margin-right: 2px;
      vertical-align: top;
      background-position: -110px 0;
    }
    &-icon__docu {
      margin-right: 2px;
      vertical-align: top;
      background-position: -110px -32px;
    }
    &-icon__customize {
      margin-right: 2px;
      vertical-align: top;
    }
    &-indent-unit {
      display: inline-block;
      padding-left: 18px;
    }
  }
`;

const SPACE_TREE = `
  $treePrefixCls: space-tree;
  $treeNodePrefixCls: space-tree-treenode;

  @keyframes expand-tree-node { from { transform: rotate(0deg); } to { transform: rotate(90deg); } }
  @keyframes collapse-tree-node { from { transform: rotate(90deg); } to { transform: rotate(0deg); } }

  .#{$treePrefixCls} {
    margin: 0;
    border: 1px solid transparent;
    
    &-focused:not(&-active-focused) {
      border-color: cyan;
    }
    
    &-title {
      display: none;
    }

    // padding: 5px;
    .space-tree-treenode {
      margin: 4px 6px 4px 14px;

      &:first-child {
        margin-top: 8px;
      }

      padding: 0;
      line-height: 30px;
      white-space: nowrap;
      list-style: none;
      outline: 0;
      .draggable {
        -moz-user-select: none;
        -khtml-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        /* Required to make elements draggable in old WebKit */
        -khtml-user-drag: element;
        -webkit-user-drag: element;
      }
      & .#{$treePrefixCls}-iconEle .spaceNodeIcon {
        background-color: var(--tertiary-panel-item-background-color);
      }
      &:hover .#{$treePrefixCls}-iconEle .spaceNodeIcon,.spaceAddIcon {
      }
      &:active .#{$treePrefixCls}-iconEle .spaceNodeIcon,.spaceAddIcon {
        transform: translate(0px, 2px);
      }
      &.drag-over {
        > .draggable {
          background-color: var(--tertiary-panel-item-hover-background-color);
          opacity: 0.8;
        }
      }
      &.drag-over-gap-top {
        > .draggable {
          border-top: 2px var(--tertiary-panel-item-drag-line-color) solid;
        }
      }
      &.drag-over-gap-bottom {
        > .draggable {
          border-bottom: 2px var(--tertiary-panel-item-drag-line-color) solid;
        }
      }
      ul {
        margin: 0;
        padding: 0;
      }
      &-selected .#{$treePrefixCls}-iconEle .spaceNodeIcon {
        background-color: var(--tertiary-panel-item-selected-background-color);
        border: 3px solid var(--tertiary-panel-item-selected-border-color);
      }
      &-selected .#{$treePrefixCls}-iconEle .spaceAddIcon {
        border: 3px solid var(--tertiary-panel-item-selected-border-color);
      }
      .#{$treePrefixCls}-node-content-wrapper {
        display: inline-block;
        height: 64px;
        width: 64px;
        margin: 0;
        padding: 0;
        text-decoration: none;
        vertical-align: top;
        cursor: pointer;
      }
      span {
        &.#{$treePrefixCls}-switcher,
        &.#{$treePrefixCls}-checkbox {
          display: none;
        }
        &.#{$treePrefixCls}-iconEle {
          width: 64px;
          height: 64px;
          outline: none;
          cursor: pointer;

          &.#{$treePrefixCls}-icon__customize {
            background-image: none;
          }
        }
        &.#{$treePrefixCls}-icon_loading {
          margin-right: 2px;
          vertical-align: top;
        }
        &.#{$treePrefixCls}-switcher {
          &.#{$treePrefixCls}-switcher-noop {
            cursor: auto;
          }
          &.#{$treePrefixCls}-switcher_open {
            mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            background-color: var(--panel-text-color);
            transform: rotate(90deg);
            transition: transform 0.25s;
          }
          &.#{$treePrefixCls}-switcher_close {
            mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            background-color: var(--panel-text-color);
            transform: rotate(0deg);
            transition: transform 0.25s;
          }
        }
        &.#{$treePrefixCls}-checkbox {
          width: 13px;
          height: 13px;
          margin: 0 3px;
          background-position: 0 0;
          &-checked {
            background-position: -14px 0;
          }
          &-indeterminate {
            background-position: -14px -28px;
          }
          &-disabled {
            background-position: 0 -56px;
          }
          &.#{$treePrefixCls}-checkbox-checked.#{$treePrefixCls}-checkbox-disabled {
            background-position: -14px -56px;
          }
          &.#{$treePrefixCls}-checkbox-indeterminate.#{$treePrefixCls}-checkbox-disabled {
            position: relative;
            background: #ccc;
            border-radius: 3px;
            &::after {
              position: absolute;
              top: 5px;
              left: 3px;
              width: 5px;
              height: 0;
              border: 2px solid #fff;
              border-top: 0;
              border-left: 0;
              -webkit-transform: scale(1);
              transform: scale(1);
              content: ' ';
            }
          }
        }
      }
    }
    &:not(.#{$treePrefixCls}-show-line) {
      .space-tree-treenode {
        .#{$treePrefixCls}-switcher-noop {
          background: none;
        }
      }
    }
    &.#{$treePrefixCls}-show-line {
      .space-tree-treenode:not(:last-child) {
        > ul {
          background: url('data:image/gif;base64,R0lGODlhCQACAIAAAMzMzP///yH5BAEAAAEALAAAAAAJAAIAAAIEjI9pUAA7')
            0 0 repeat-y;
        }
        > .#{$treePrefixCls}-switcher-noop {
          background-position: -56px -18px;
        }
      }
      .space-tree-treenode:last-child {
        > .#{$treePrefixCls}-switcher-noop {
          background-position: -56px -36px;
        }
      }
    }
    &-child-tree {
      display: none;
      &-open {
        display: block;
      }
    }
    &-treenode-disabled {
      > span:not(.#{$treePrefixCls}-switcher),
      > a,
      > a span {
        color: #767676;
        cursor: not-allowed;
      }
    }
    #-treenode-active {
      background: rgba(0, 0, 0, 0.1);

      // .#{$treePrefixCls}-node-content-wrapper {
      //   background: rgba(0, 0, 0, 0.1);
      // }
    }
    &-node-selected {
      background-color: transparent;
    }
    &-icon__open {
      margin-right: 2px;
      vertical-align: top;
      background-position: -110px -16px;
    }
    &-icon__close {
      margin-right: 2px;
      vertical-align: top;
      background-position: -110px 0;
    }
    &-icon__docu {
      margin-right: 2px;
      vertical-align: top;
      background-position: -110px -32px;
    }
    &-icon__customize {
      margin-right: 2px;
      vertical-align: top;
    }
    &-indent-unit {
      display: inline-block;
      padding-left: 0;
    }
  }
`;

const JEL_THEME = `
  * {
    --panel-header-text-color: ${PRIMARY_6};
    --panel-header-text-size: ${TEXT_2_SIZE};
    --panel-header-text-weight: ${TEXT_2_WEIGHT};
    --panel-subheader-text-color: ${PRIMARY_6};
    --panel-subheader-text-size: ${TEXT_1_SIZE};
    --panel-subheader-text-weight: ${TEXT_2_WEIGHT};
    --panel-selected-text-color: ${PRIMARY_11};
    --panel-unread-text-color: ${PRIMARY_10};
    --panel-text-size: ${TEXT_4_SIZE};
    --panel-text-weight: ${TEXT_1_WEIGHT};
    --panel-text-color: ${PRIMARY_9};
    --panel-banner-text-size: ${TEXT_4_SIZE};
    --panel-banner-text-weight: ${TEXT_2_WEIGHT};
    --panel-banner-text-color: ${PRIMARY_11};
    --panel-small-banner-text-size: ${TEXT_3_SIZE};
    --panel-small-banner-text-weight: ${TEXT_2_WEIGHT};
    --panel-small-banner-text-color: ${PRIMARY_11};
    --panel-small-banner-text-secondary-size: ${TEXT_2_SIZE};
    --panel-small-banner-text-secondary-weight: ${TEXT_1_WEIGHT};
    --panel-small-banner-text-secondary-color: ${PRIMARY_8};
    --panel-small-banner-subtext-size: ${TEXT_2_SIZE};
    --panel-small-banner-subtext-weight: ${TEXT_1_WEIGHT};
    --channel-header-background-color: ${PRIMARY_1B};
    --panel-background-color: ${PRIMARY_1};
    --panel-selected-text-weight: ${TEXT_2_WEIGHT};
    --panel-unread-text-weight: ${TEXT_2_WEIGHT};
    --panel-item-text-size: ${TEXT_3_SIZE};
    --panel-item-selected-background-color: ${PRIMARY_3};
    --panel-item-hover-background-color: ${PRIMARY_3};
    --panel-item-hover-text-color: ${PRIMARY_11};
    --panel-item-active-text-color: ${PRIMARY_11};
    --panel-item-active-background-color: ${PRIMARY_5};
    --panel-item-drag-line-color: ${PRIMARY_8};
    --menu-background-color: ${PRIMARY_3};
    --menu-border-color: ${PRIMARY_4};
    --menu-shadow-color: ${NEUTRAL_1}cc;
    --menu-cell-border-color: ${PRIMARY_0};
    --menu-cell-background-color: ${PRIMARY_2};
    --menu-item-text-color: ${PRIMARY_11};
    --menu-item-text-size: ${TEXT_4_SIZE};
    --menu-item-hover-background-color: ${PRIMARY_5};
    --menu-item-hover-text-color: ${PRIMARY_11};
    --menu-item-active-text-color: ${PRIMARY_10};
    --menu-item-active-background-color: ${PRIMARY_4};
    --secondary-menu-item-text-color: ${PRIMARY_11};
    --secondary-menu-item-text-size: ${TEXT_3_SIZE};
    --secondary-menu-item-hover-background-color: ${PRIMARY_3};
    --secondary-menu-item-hover-text-color: ${PRIMARY_11};
    --secondary-menu-item-active-text-color: ${PRIMARY_10};
    --secondary-menu-item-active-background-color: ${PRIMARY_2};
    --secondary-menu-item-icon-color: ${ACCENT_1_8};
    --secondary-panel-background-color: ${PRIMARY_0};
    --secondary-panel-item-text-color: ${PRIMARY_11};
    --secondary-panel-item-text-weight: ${TEXT_2_WEIGHT};
    --secondary-panel-item-text-size: ${TEXT_5_SIZE};
    --secondary-panel-item-background-color: ${PRIMARY_2};
    --secondary-panel-item-selected-background-color: ${PRIMARY_2};
    --secondary-panel-item-selected-border-color: ${PRIMARY_4};
    --secondary-panel-item-hover-background-color: ${PRIMARY_2};
    --secondary-panel-item-active-background-color: ${PRIMARY_3};
    --secondary-panel-item-drag-line-color: ${PRIMARY_8};
    --tertiary-panel-background-color: ${PRIMARY_SUB0};
    --tertiary-panel-item-text-color: ${PRIMARY_11};
    --tertiary-panel-item-text-weight: ${TEXT_2_WEIGHT};
    --tertiary-panel-item-text-size: ${TEXT_5_SIZE};
    --tertiary-panel-item-background-color: ${PRIMARY_1};
    --tertiary-panel-item-selected-background-color: ${PRIMARY_1};
    --tertiary-panel-item-selected-border-color: ${PRIMARY_3};
    --tertiary-panel-item-hover-background-color: ${PRIMARY_1};
    --tertiary-panel-item-active-background-color: ${PRIMARY_2};
    --tertiary-panel-item-drag-line-color: ${PRIMARY_7};
    --dialog-background-color: ${PRIMARY_1};
    --dialog-footer-background-color: ${PRIMARY_0};
    --dialog-body-text-color: ${PRIMARY_10};
    --dialog-body-text-size: ${TEXT_4_SIZE};
    --dialog-body-text-weight: ${TEXT_1_WEIGHT};
    --dialog-info-text-color: ${PRIMARY_9};
    --dialog-info-text-size: ${TEXT_3_SIZE};
    --dialog-info-text-weight: ${TEXT_2_WEIGHT};
    --dialog-label-text-color: ${PRIMARY_7};
    --dialog-label-text-size: ${TEXT_2_SIZE};
    --dialog-label-text-weight: ${TEXT_2_WEIGHT};
    --dialog-tip-text-color: ${PRIMARY_7};
    --dialog-tip-text-size: ${TEXT_1_SIZE};
    --dialog-tip-text-weight: ${TEXT_2_WEIGHT};
    --dialog-title-text-color: ${PRIMARY_7};
    --dialog-title-text-size: ${TEXT_1_SIZE};
    --dialog-title-text-weight: ${TEXT_2_WEIGHT};
    --dialog-field-action-button-color: ${PRIMARY_5};
    --dialog-field-action-button-hover-color: ${PRIMARY_9};
    --dialog-shadow-color: ${NEUTRAL_1}cc;
    --action-button-text-color: ${PRIMARY_10};
    --action-button-destructive-text-color: ${NEUTRAL_10};
    --action-button-text-size: ${TEXT_4_SIZE};
    --action-button-text-weight: ${TEXT_2_WEIGHT};
    --action-button-background-color: ${PRIMARY_6};
    --action-button-border-color: ${PRIMARY_4}A0;
    --action-button-destructive-background-color: ${ACCENT_3_5};
    --action-button-destructive-border-color: ${ACCENT_3_6}A0;
    --action-button-hover-background-color: ${PRIMARY_5};
    --action-button-active-background-color: ${PRIMARY_4};
    --action-button-destructive-hover-background-color: ${ACCENT_3_4};
    --action-button-destructive-hover-border-color: ${ACCENT_3_5};
    --action-button-destructive-active-background-color: ${ACCENT_3_3};
    --action-button-destructive-active-border-color: ${ACCENT_3_3};
    --small-action-button-text-size: ${TEXT_3_SIZE};
    --small-action-button-text-weight: ${TEXT_2_WEIGHT};
    --tiny-action-button-text-size: ${TEXT_2_SIZE};
    --tiny-action-button-text-weight: ${TEXT_2_WEIGHT};
    --tiny-icon-button-border-color: ${PRIMARY_4};
    --tiny-icon-button-background-color: ${PRIMARY_3};
    --action-color: ${PRIMARY_9};
    --action-hover-color: ${PRIMARY_9};
    --action-pressed-color: ${PRIMARY_9};
    --scroll-thumb-color: ${PRIMARY_9}A0;
    --secondary-scroll-thumb-color: ${NEUTRAL_9}A0;
    --input-text-color: black;
    --tooltip-background-color: ${NEUTRAL_2};
    --tooltip-text-size: ${TEXT_2_SIZE};
    --tooltip-text-weight: ${TEXT_1_WEIGHT};
    --tooltip-text-color: ${NEUTRAL_11};
    --big-tooltip-background-color: ${NEUTRAL_2};
    --big-tooltip-text-size: ${TEXT_4_SIZE};
    --big-tooltip-text-weight: ${TEXT_2_WEIGHT};
    --big-tooltip-text-color: ${NEUTRAL_11};
    --text-input-text-color: ${NEUTRAL_1};
    --text-input-placeholder-color: ${NEUTRAL_6};
    --text-input-placeholder-ephemeral-color: ${NEUTRAL_8};
    --text-input-background-color: ${NEUTRAL_11};
    --text-input-text-size: ${TEXT_3_SIZE};
    --text-input-text-weight: ${TEXT_1_WEIGHT};
    --canvas-overlay-text-color: ${NEUTRAL_11};
    --canvas-overlay-text-size: ${TEXT_3_SIZE};
    --canvas-overlay-secondary-text-weight: ${TEXT_1_WEIGHT};
    --canvas-overlay-secondary-text-size: ${TEXT_3_SIZE};
    --canvas-overlay-tertiary-text-size: ${TEXT_2_SIZE};
    --canvas-overlay-item-text-weight: ${TEXT_2_WEIGHT};
    --canvas-overlay-item-secondary-text-weight: ${TEXT_1_WEIGHT};
    --canvas-overlay-item-hover-background-color: ${PRIMARY_4}60;
    --canvas-overlay-item-active-background-color: ${PRIMARY_3}60;
    --canvas-overlay-neutral-item-background-color: ${PRIMARY_1}40;
    --canvas-overlay-neutral-item-link-color: ${PRIMARY_9};
    --canvas-overlay-tertiary-text-weight: ${TEXT_1_WEIGHT};
    --canvas-overlay-tertiary-text-size: ${TEXT_2_SIZE};
    --canvas-overlay-item-tertiary-text-weight: ${TEXT_1_WEIGHT};
    --key-label-font: 600 13px "Raleway", monospace;
    --big-key-label-font: 600 22px "Raleway", monospace;
    --dropdown-thumb-background-color: ${PRIMARY_4};
    --dropdown-thumb-border-color: ${PRIMARY_0};
    --dropdown-thumb-active-background-color: ${PRIMARY_7};
    --loading-background-color: #333;
    --button-flash-background-color: ${ACCENT_1_3};
    --button-flash-border-color: ${ACCENT_1_1};
    --button-flash-text-color: ${NEUTRAL_9};
    --important-icon-color: ${ACCENT_2_6};
    --footer-link-text-color: ${NEUTRAL_11};
    --footer-link-text-size: ${TEXT_3_SIZE};
    --footer-link-text-weight: ${TEXT_2_WEIGHT};
    --notify-banner-background-color: ${PRIMARY_0};
    --notify-banner-text-color: ${NEUTRAL_11};
    --notify-banner-close-color: ${NEUTRAL_9};
    --snackbar-background-color: ${ACCENT_4_5};
    --snackbar-border-color: ${ACCENT_4_6};
    --snackbar-text-color: ${NEUTRAL_11};
    --snackbar-text-size: ${TEXT_4_SIZE};
    --snackbar-small-text-size: ${TEXT_2_SIZE};
    --snackbar-text-weight: ${TEXT_2_WEIGHT};
    --snackbar-action-button-text-color: ${NEUTRAL_11};
    --snackbar-action-button-text-size: ${TEXT_4_SIZE};
    --snackbar-action-button-text-weight: ${TEXT_2_WEIGHT};
    --snackbar-action-button-background-color: ${ACCENT_4_3};
    --snackbar-action-button-border-color: transparent;
    --snackbar-action-button-hover-background-color: ${ACCENT_4_2};
    --snackbar-action-button-active-background-color: ${ACCENT_4_1};
    --snackbar-secondary-action-button-text-color: ${NEUTRAL_11};
    --snackbar-secondary-action-button-text-size: ${TEXT_4_SIZE};
    --snackbar-secondary-action-button-text-weight: ${TEXT_2_WEIGHT};
    --snackbar-secondary-action-button-background-color: transparent;
    --snackbar-secondary-action-button-border-color: ${ACCENT_4_8}A0;
    --snackbar-secondary-action-button-hover-background-color: ${ACCENT_4_4};
    --snackbar-secondary-action-button-active-background-color: ${ACCENT_4_3};
    --notification-ping-color: ${ACCENT_3_5};
    --notification-unread-color: ${PRIMARY_8};
    --notification-text-color: ${NEUTRAL_11};
    --notification-count-font: 600 14px "Inconsolata", monospace;
  }
`;

const NORMALIZE_CSS = `
  html {
    line-height: 1.15; /* 1 */
    -webkit-text-size-adjust: 100%; /* 2 */
  }
  
  body {
    margin: 0;
  }
  
  main {
    display: block;
  }
  
  h1 {
    font-size: 2em;
    margin: 0.67em 0;
  }
  
  hr {
    box-sizing: content-box; /* 1 */
    height: 0; /* 1 */
    overflow: visible; /* 2 */
  }
  
  pre {
    font-family: monospace, monospace; /* 1 */
    font-size: 1em; /* 2 */
  }
  
  a {
    background-color: transparent;
  }
  
  abbr[title] {
    border-bottom: none; /* 1 */
    text-decoration: underline; /* 2 */
    text-decoration: underline dotted; /* 2 */
  }
  
  b,
  strong {
    font-weight: bolder;
  }
  
  code,
  kbd,
  samp {
    font-family: monospace, monospace; /* 1 */
    font-size: 1em; /* 2 */
  }
  
  small {
    font-size: 80%;
  }
  
  sub,
  sup {
    font-size: 75%;
    line-height: 0;
    position: relative;
    vertical-align: baseline;
  }
  
  sub {
    bottom: -0.25em;
  }
  
  sup {
    top: -0.5em;
  }
  
  img {
    border-style: none;
  }
  
  button,
  input,
  optgroup,
  select,
  textarea {
    font-family: inherit; /* 1 */
    font-size: 100%; /* 1 */
    line-height: 1.15; /* 1 */
    margin: 0; /* 2 */
  }
  
  button,
  input { /* 1 */
    overflow: visible;
  }
  
  button,
  select { /* 1 */
    text-transform: none;
  }
  
  button,
  [type="button"],
  [type="reset"],
  [type="submit"] {
    -webkit-appearance: button;
  }
  
  button::-moz-focus-inner,
  [type="button"]::-moz-focus-inner,
  [type="reset"]::-moz-focus-inner,
  [type="submit"]::-moz-focus-inner {
    border-style: none;
    padding: 0;
  }
  
  button:-moz-focusring,
  [type="button"]:-moz-focusring,
  [type="reset"]:-moz-focusring,
  [type="submit"]:-moz-focusring {
    outline: 1px dotted ButtonText;
  }
  
  fieldset {
    padding: 0.35em 0.75em 0.625em;
  }
  
  legend {
    box-sizing: border-box; /* 1 */
    color: inherit; /* 2 */
    display: table; /* 1 */
    max-width: 100%; /* 1 */
    padding: 0; /* 3 */
    white-space: normal; /* 1 */
  }
  
  progress {
    vertical-align: baseline;
  }
  
  textarea {
    overflow: auto;
  }
  
  [type="checkbox"],
  [type="radio"] {
    box-sizing: border-box; /* 1 */
    padding: 0; /* 2 */
  }
  
  [type="number"]::-webkit-inner-spin-button,
  [type="number"]::-webkit-outer-spin-button {
    height: auto;
  }
  
  [type="search"] {
    -webkit-appearance: textfield; /* 1 */
    outline-offset: -2px; /* 2 */
  }
  
  [type="search"]::-webkit-search-decoration {
    -webkit-appearance: none;
  }
  
  ::-webkit-file-upload-button {
    -webkit-appearance: button; /* 1 */
    font: inherit; /* 2 */
  }
  
  details {
    display: block;
  }
  
  summary {
    display: list-item;
  }
  
  template {
    display: none;
  }
  
  [hidden] {
    display: none;
  }
`;

export default createGlobalStyle`
  ${JEL_THEME}
  ${NORMALIZE_CSS}

  @keyframes expand-tree-node { from { transform: rotate(0deg); } to { transform: rotate(90deg); } }
  @keyframes collapse-tree-node { from { transform: rotate(90deg); } to { transform: rotate(0deg); } }

  ${ATOM_TREE}
  ${SPACE_TREE}

  *, *:before, *:after {
    box-sizing: inherit;
  }

  blockquote, dl, dd, h1, h2, h3, h4, h5, h6, hr, figure, p, pre {
    margin: 0;
  }
  
  fieldset {
    margin: 0;
    padding: 0;
  }
  
  ol, ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  
  /*
   * Ensure horizontal rules are visible by default
   */
  
  hr {
    border-top-width: 1px;
  }
  
  textarea {
    resize: vertical;
  }
  
  button, [role="button"] {
    cursor: pointer;
    user-select: none;
  }
  
  table {
    border-collapse: collapse;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-size: inherit;
    font-weight: inherit;
  }
  
  /**
   * Reset form element properties that are easy to forget to
   * style explicitly so you don't inadvertently introduce
   * styles that deviate from your design system. These styles
   * supplement a partial reset that is already applied by
   * normalize.css.
   */
  
  button, input, optgroup, select, textarea {
    padding: 0;
    line-height: inherit;
    color: inherit;
  }
  
  /**
   * Monospace font stack: https://css-tricks.com/snippets/css/font-stacks/
   */
  
  pre, code, kbd, samp {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
  }
  
  /**
   * Make replaced elements display: block by default as that's
   * the behavior you want almost all of the time. Inspired by
   * CSS Remedy, with svg added as well.
   *
   * https://github.com/mozdevs/cssremedy/issues/14
   */
  
  img, svg, video, canvas, audio, iframe, embed, object {
    display: block;
    vertical-align: middle;
  }
  
  /**
   * Constrain images and videos to the parent width and preserve
   * their instrinsic aspect ratio.
   *
   * https://github.com/mozdevs/cssremedy/issues/14
   */
  
  img, video {
    max-width: 100%;
    height: auto;
  }
  
  label {
    font-size: ${SMALL_TEXT_SIZE};
    font-weight: ${SMALL_TEXT_WEIGHT};
  }
  
  body :focus {
    outline: none;
  }
  
  /* We want svg icons to have title elements for screen readers, but we don't need to show their tooltips when they are inside buttons */
  button svg {
    pointer-events: none;
  }
  
  /**
   * Breakpoint definitions for use wuth react-use-css-breakpoints
   * https://github.com/matthewhall/react-use-css-breakpoints
   */
  body::before {
    content: "sm";
    display: none;
  }
  
  @media (min-width: hubs-theme.$breakpoint-md) {
    body::before {
      content: "md";
    }
  }
  
  @media (min-width: hubs-theme.$breakpoint-lg) {
    body::before {
      content: "lg";
    }
  }
  
  h5 {
    font-size: ${XSMALL_TEXT_SIZE};
    font-weight: ${XSMALL_TEXT_WEIGHT};
  }
  
  label, small {
    font-size: ${XSMALL_TEXT_SIZE};
    font-weight: ${XSMALL_TEXT_WEIGHT};
  }
  
  /**
   * Reset links to optimize for opt-in styling instead of
   * opt-out.
   */
  
  a {
    color: var(--action-color);
  
    &:hover {
      color: var(--action-hover-color);
    }
  
    &:active {
      color: var(--action-pressed-color);
    }
  
    color: inherit;
    text-decoration: inherit;
  }
  
  input::placeholder {
    color: var(--input-text-color);
  }

  .base-panel {
    color: var(--panel-text-color);
    background-color: var(--panel-background-color);
    font-weight: $small-text-weight;
  }

  .secondary-panel {
    color: var(--panel-text-color);
    background-color: var(--secondary-panel-background-color);
    font-weight: $small-text-weight;
    font-size: var(--panel-text-size);
    font-weight: var(--panel-text-weight);
  }

  .show-when-popped {
    position: relative;
    opacity: 0;
    pointer-events: none;

    transition: opacity 0.15s linear;

    .slide-down-when-popped {
      transform: translateY(-4px) scale(0.95,0.95);
      transition: transform 0.15s linear
    }

    .slide-up-when-popped {
      transform: translateY(4px) scale(0.95,0.95);
      transition: transform 0.15s linear
    }

    :focus-within {
      opacity: 1;
      pointer-events: auto;

      transition: opacity 0.15s linear;

      .slide-down-when-popped , .slide-up-when-popped {
        transform: translateY(0px) scale(1, 1);
        transition: transform 0.15s cubic-bezier(0.760, -0.005, 0.515, 2.25);
      }

      .modal-background {
        pointer-events: auto;
      }
    }
  }

  .fast-show-when-popped {
    opacity: 0;
    pointer-events: none;

    transition: opacity 0.05s linear;

    &:focus-within {
      opacity: 1;
      pointer-events: auto;

      transition: opacity 0.05s linear;

      .modal-background {
        pointer-events: auto;
      }
    }
  }

  .svg-overlay-shadow {
    filter: drop-shadow(0px 0px 4px var(--menu-shadow-color));
  }

  @keyframes float_logo { from { top: -18px; } to { top: -5px; }  }
  @keyframes float_logo_shadow { from { transform: scaleX(1.2) } to { transform: scaleX(1.0); }  }

  :host(body) {
    overflow: hidden;

    a-scene {
      height: 100%;
      top: 0;
      position: fixed;
      z-index: 3;
      visibility: hidden;

      &.visible {
        visibility: visible;
      }
    }
  }

  :host(.show-css-cursor) #gaze-cursor{
    overflow: hidden;
  }

  #jel-popup-root {
    position: absolute;
    pointer-events: none;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 7;
  }

  #nav-drag-target {
    position: absolute;
    width: 32px;
    left: calc(var(--nav-width) - 16px);
    top: 0;
    z-index: 6;
    height: 100%;
    cursor: col-resize;
    display: block;
  }

  #presence-drag-target {
    position: absolute;
    width: 32px;
    right: calc(var(--presence-width) - 16px);
    top: 0;
    z-index: 6;
    height: 100%;
    cursor: col-resize;
    display: block;
  }

  :host(.panels-collapsed) #presence-drag-target {
    display: none;
  }

  :host(.panels-collapsed) #nav-drag-target {
    display: none;
  }

  :host(.panels-collapsed) #jel-ui-wrap,
  :host(.paused) #jel-ui-wrap {
    height: 100%;
  }

  :host(.panels-collapsed) #asset-panel {
    display: none;
  }

  :host(.panels-collapsed) #left-expand-trigger {
    display: flex;
  }

  :host(.paused) #jel-interface.hub-type-world #jel-ui-wrap {
    pointer-events: auto;
    background-color: rgba(0, 0, 0, 0.6);
  }

  :host(.paused) #jel-interface.hub-type-channel #jel-ui-wrap {
    pointer-events: none;
    background-color: transparent;
  }

  :host(.paused) #jel-interface.hub-type-world #asset-panel {
    display: none;
  }

  :host(.paused) #jel-interface.hub-type-channel #asset-panel {
    display: none;
  }

  :host(.panels-collapsed) #right-expand-trigger {
    display: flex;
  }

  :host(.panels-collapsed) #bottom-expand-trigger {
    display: flex;
  }

  :host(.low-detail) #fade-edges {
    background: none;
  }

  :host(.paused) #paused-info-label {
    display: block;
  }

  :host(.paused) #unpaused-info-label {
    display: none;
  }

  :host(.paused) #unpaused-info-label-2 {
    display: none;
  }

  :host(.paused) .external-camera-on #external-camera-canvas {
    display: none;
  }

  :host(.paused) .external-camera-on #external-camera-rotate-button {
    display: none;
  }

  :host(.paused) #key-tips-wrap {
      opacity: 0.4;
  }

  :host(.panels-collapsed) #device-statuses {
    display: flex;
  }

  :host(.paused) #device-statuses {
    display: none;
  }

  :host(.panels-collapsed) #snackbar {
    display: none;
  }

  :host(.paused) #snackbar {
    display: none;
  }

  :host(.panels-collapsed) #self-panel {
     background-color: var(--canvas-overlay-neutral-item-background-color);
     text-shadow: 0px 0px 4px var(--menu-shadow-color);
     border-radius: 0 12px 0 0;
  }

  :host(.panels-collapsed) #top-panel {
     display: none;
  }

  :host(.panels-collapsed) #chat-log {
    bottom: 64px;
  }

  :host(.paused) #chat-log {
      visibility: hidden;
  }

  :host(.panels-collapsed) .hide-when-expanded {
    display: none;
  }

  :host(.panels-collapsed) .pause-info-label {
     bottom: 76px;
  }
`;
