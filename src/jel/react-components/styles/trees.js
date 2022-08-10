export const ATOM_TREE = `
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

  .hub-trash-tree {
    .atom-tree-switcher, .atom-tree-iconEle {
      display: none !important; // Hacky, hide switcher + icon
    }

    .atom-tree-treenode {
      border-radius: 2px;
    }

    .atom-tree-node-content-wrapper {
      padding-left: 8px !important; // Hacky, add some side padding to cells
    }
  }
`;

export const SPACE_TREE = `
  @keyframes expand-tree-node { from { transform: rotate(0deg); } to { transform: rotate(90deg); } }
  @keyframes collapse-tree-node { from { transform: rotate(90deg); } to { transform: rotate(0deg); } }

  .space-tree {
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
      & .space-tree-iconEle .spaceNodeIcon {
        background-color: var(--tertiary-panel-item-background-color);
      }
      &:hover .space-tree-iconEle .spaceNodeIcon,.spaceAddIcon {
      }
      &:active .space-tree-iconEle .spaceNodeIcon,.spaceAddIcon {
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
      &-selected .space-tree-iconEle .spaceNodeIcon {
        background-color: var(--tertiary-panel-item-selected-background-color);
        border: 3px solid var(--tertiary-panel-item-selected-border-color);
      }
      &-selected .space-tree-iconEle .spaceAddIcon {
        border: 3px solid var(--tertiary-panel-item-selected-border-color);
      }
      .space-tree-node-content-wrapper {
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
        &.space-tree-switcher,
        &.space-tree-checkbox {
          display: none;
        }
        &.space-tree-iconEle {
          width: 64px;
          height: 64px;
          outline: none;
          cursor: pointer;

          &.space-tree-icon__customize {
            background-image: none;
          }
        }
        &.space-tree-icon_loading {
          margin-right: 2px;
          vertical-align: top;
        }
        &.space-tree-switcher {
          &.space-tree-switcher-noop {
            cursor: auto;
          }
          &.space-tree-switcher_open {
            mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            background-color: var(--panel-text-color);
            transform: rotate(90deg);
            transition: transform 0.25s;
          }
          &.space-tree-switcher_close {
            mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
            background-color: var(--panel-text-color);
            transform: rotate(0deg);
            transition: transform 0.25s;
          }
        }
        &.space-tree-checkbox {
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
          &.space-tree-checkbox-checked.space-tree-checkbox-disabled {
            background-position: -14px -56px;
          }
          &.space-tree-checkbox-indeterminate.space-tree-checkbox-disabled {
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
    &:not(.space-tree-show-line) {
      .space-tree-treenode {
        .space-tree-switcher-noop {
          background: none;
        }
      }
    }
    &.space-tree-show-line {
      .space-tree-treenode:not(:last-child) {
        > ul {
          background: url('data:image/gif;base64,R0lGODlhCQACAIAAAMzMzP///yH5BAEAAAEALAAAAAAJAAIAAAIEjI9pUAA7')
            0 0 repeat-y;
        }
        > .space-tree-switcher-noop {
          background-position: -56px -18px;
        }
      }
      .space-tree-treenode:last-child {
        > .space-tree-switcher-noop {
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
      > span:not(.space-tree-switcher),
      > a,
      > a span {
        color: #767676;
        cursor: not-allowed;
      }
    }
    #-treenode-active {
      background: rgba(0, 0, 0, 0.1);

      // .space-tree-node-content-wrapper {
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
