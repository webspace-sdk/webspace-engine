export const ATOM_TREE = `
  .atom-tree {
     margin: 0;
     border: 1px solid transparent;
     width: 100%;
  }
   .atom-tree .atom-tree-treenode {
     margin: 0;
     padding: 0 8px;
     line-height: 28px;
     white-space: nowrap;
     list-style: none;
     outline: 0;
     display: flex;
     align-items: center;
     font-size: var(--panel-item-text-size);
  }
  .atom-tree .atom-tree-treenode .draggable {
     -moz-user-select: none;
     -khtml-user-select: none;
     -webkit-user-select: none;
     user-select: none;
    /* Required to make elements draggable in old WebKit */
     -khtml-user-drag: element;
     -webkit-user-drag: element;
  }
  .atom-tree .atom-tree-treenode:hover {
     background-color: var(--panel-item-hover-background-color);
     color: var(--panel-item-hover-text-color);
  }
  .atom-tree .atom-tree-treenode:active {
     background-color: var(--panel-item-active-background-color);
     color: var(--panel-item-active-text-color);
  }
  .atom-tree .atom-tree-treenode.drag-over > .draggable {
     background-color: var(--panel-item-hover-background-color);
     opacity: 0.8;
  }
  .atom-tree .atom-tree-treenode.drag-over-gap-top > .draggable {
     border-top: 2px var(--panel-item-drag-line-color) solid;
  }
  .atom-tree .atom-tree-treenode.drag-over-gap-bottom > .draggable {
     border-bottom: 2px var(--panel-item-drag-line-color) solid;
  }
  .atom-tree .atom-tree-treenode ul {
     margin: 0;
     padding: 0 0 0 18px;
  }
  .atom-tree .atom-tree-treenode-selected {
     background-color: var(--panel-item-selected-background-color);
     color: var(--panel-selected-text-color);
  }
  .atom-tree .atom-tree-treenode .atom-tree-node-content-wrapper {
     display: flex;
     flex-direction: row;
     height: 30px;
     width: 100%;
     flex-shrink: 10;
     margin: 0;
     padding: 1px 3px 0 0;
     text-decoration: none;
     vertical-align: top;
     overflow: hidden;
     cursor: pointer;
  }
  .atom-tree .atom-tree-treenode span.atom-tree-title {
     overflow: hidden;
     flex: 1;
  }
  .atom-tree .atom-tree-treenode span.atom-tree-switcher, .atom-tree .atom-tree-treenode span.atom-tree-checkbox, .atom-tree .atom-tree-treenode span.atom-tree-iconEle {
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
  }
  .atom-tree .atom-tree-treenode span.atom-tree-switcher.atom-tree-icon__customize, .atom-tree .atom-tree-treenode span.atom-tree-checkbox.atom-tree-icon__customize, .atom-tree .atom-tree-treenode span.atom-tree-iconEle.atom-tree-icon__customize {
     background-image: none;
  }
  .atom-tree .atom-tree-treenode span.atom-tree-icon_loading {
     margin-right: 2px;
     vertical-align: top;
  }
  .atom-tree .atom-tree-treenode span.atom-tree-switcher.atom-tree-switcher-noop {
     cursor: auto;
  }
  .atom-tree .atom-tree-treenode span.atom-tree-switcher.atom-tree-switcher_open {
     mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
     -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
     background-color: var(--panel-text-color);
     transform: rotate(90deg);
     transition: transform 0.25s;
  }
  .atom-tree .atom-tree-treenode span.atom-tree-switcher.atom-tree-switcher_close {
     mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
     -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
     background-color: var(--panel-text-color);
     transform: rotate(0deg);
     transition: transform 0.25s;
  }
   .atom-tree .atom-tree-treenode span.atom-tree-checkbox {
     width: 13px;
     height: 13px;
     margin: 0 3px;
     background-position: 0 0;
  }
   .atom-tree .atom-tree-treenode span.atom-tree-checkbox-checked {
     background-position: -14px 0;
  }
   .atom-tree .atom-tree-treenode span.atom-tree-checkbox-indeterminate {
     background-position: -14px -28px;
  }
   .atom-tree .atom-tree-treenode span.atom-tree-checkbox-disabled {
     background-position: 0 -56px;
  }
   .atom-tree .atom-tree-treenode span.atom-tree-checkbox.atom-tree-checkbox-checked.atom-tree-checkbox-disabled {
     background-position: -14px -56px;
  }
   .atom-tree .atom-tree-treenode span.atom-tree-checkbox.atom-tree-checkbox-indeterminate.atom-tree-checkbox-disabled {
     position: relative;
     background: #ccc;
     border-radius: 3px;
  }
   .atom-tree .atom-tree-treenode span.atom-tree-checkbox.atom-tree-checkbox-indeterminate.atom-tree-checkbox-disabled::after {
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
     content: '
     '
    ;
  }
   .atom-tree:not(.atom-tree-show-line) .atom-tree-treenode .atom-tree-switcher-noop {
     background: none;
  }
   .atom-tree.atom-tree-show-line .atom-tree-treenode:not(:last-child) > ul {
     background: url('data:image/gif;base64,R0lGODlhCQACAIAAAMzMzP///yH5BAEAAAEALAAAAAAJAAIAAAIEjI9pUAA7') 0 0 repeat-y;
  }
   .atom-tree.atom-tree-show-line .atom-tree-treenode:not(:last-child) >
   .atom-tree-switcher-noop {
     background-position: -56px -18px;
  }
   .atom-tree.atom-tree-show-line .atom-tree-treenode:last-child >
   .atom-tree-switcher-noop {
     background-position: -56px -36px;
  }
   .atom-tree-child-tree {
     display: none;
  }
   .atom-tree-child-tree-open {
     display: block;
  }
   .atom-tree-treenode-disabled >
   span:not(.atom-tree-switcher), .atom-tree-treenode-disabled >
   a, .atom-tree-treenode-disabled >
   a span {
     color: #767676;
     cursor: not-allowed;
  }
   .atom-tree #-treenode-active {
     background: rgba(0, 0, 0, 0.1);
  }
   .atom-tree-node-selected {
     background-color: transparent;
  }
   .atom-tree-icon__open {
     margin-right: 2px;
     vertical-align: top;
     background-position: -110px -16px;
  }
   .atom-tree-icon__close {
     margin-right: 2px;
     vertical-align: top;
     background-position: -110px 0;
  }
   .atom-tree-icon__docu {
     margin-right: 2px;
     vertical-align: top;
     background-position: -110px -32px;
  }
   .atom-tree-icon__customize {
     margin-right: 2px;
     vertical-align: top;
  }
   .atom-tree-indent-unit {
     display: inline-block;
     padding-left: 18px;
  }
   .hub-trash-tree .atom-tree-switcher, .hub-trash-tree .atom-tree-iconEle {
     display: none !important;
  }
   .hub-trash-tree .atom-tree-treenode {
     border-radius: 2px;
  }
   .hub-trash-tree .atom-tree-node-content-wrapper {
     padding-left: 8px !important;
  }
`;

export const SPACE_TREE = `
  space-tree {
  	 margin: 0;
  	 border: 1px solid transparent;
  }
   .space-tree self-focused:not(&
  -active-focused) {
  	 border-color: cyan;
  }
   .space-tree-title {
  	 display: none;
  }
   .space-tree .space-tree-treenode {
  	 margin: 4px 6px 4px 14px;
  	 padding: 0;
  	 line-height: 30px;
  	 white-space: nowrap;
  	 list-style: none;
  	 outline: 0;
  }
   .space-tree .space-tree-treenode:first-child {
  	 margin-top: 8px;
  }
   .space-tree .space-tree-treenode .draggable {
  	 -moz-user-select: none;
  	 -khtml-user-select: none;
  	 -webkit-user-select: none;
  	 user-select: none;
  	/* Required to make elements draggable in old WebKit */
  	 -khtml-user-drag: element;
  	 -webkit-user-drag: element;
  }
   .space-tree .space-tree-treenode .space-tree-iconEle .spaceNodeIcon {
  	 background-color: var(--tertiary-panel-item-background-color);
  }
   .space-tree .space-tree-treenode:active .space-tree-iconEle .spaceNodeIcon, .space-tree .space-tree-treenode .spaceAddIcon {
  	 transform: translate(0px, 2px);
  }
   .space-tree .space-tree-treenode.drag-over >
   .draggable {
  	 background-color: var(--tertiary-panel-item-hover-background-color);
  	 opacity: 0.8;
  }
   .space-tree .space-tree-treenode.drag-over-gap-top >
   .draggable {
  	 border-top: 2px var(--tertiary-panel-item-drag-line-color) solid;
  }
   .space-tree .space-tree-treenode.drag-over-gap-bottom >
   .draggable {
  	 border-bottom: 2px var(--tertiary-panel-item-drag-line-color) solid;
  }
   .space-tree .space-tree-treenode ul {
  	 margin: 0;
  	 padding: 0;
  }
   .space-tree .space-tree-treenode-selected .space-tree-iconEle .spaceNodeIcon {
  	 background-color: var(--tertiary-panel-item-selected-background-color);
  	 border: 3px solid var(--tertiary-panel-item-selected-border-color);
  }
   .space-tree .space-tree-treenode-selected .space-tree-iconEle .spaceAddIcon {
  	 border: 3px solid var(--tertiary-panel-item-selected-border-color);
  }
   .space-tree .space-tree-treenode .space-tree-node-content-wrapper {
  	 display: inline-block;
  	 height: 64px;
  	 width: 64px;
  	 margin: 0;
  	 padding: 0;
  	 text-decoration: none;
  	 vertical-align: top;
  	 cursor: pointer;
  }
   .space-tree .space-tree-treenode span.space-tree-switcher, .space-tree .space-tree-treenode span.space-tree-checkbox {
  	 display: none;
  }
   .space-tree .space-tree-treenode span.space-tree-iconEle {
  	 width: 64px;
  	 height: 64px;
  	 outline: none;
  	 cursor: pointer;
  }
   .space-tree .space-tree-treenode span.space-tree-iconEle.space-tree-icon__customize {
  	 background-image: none;
  }
   .space-tree .space-tree-treenode span.space-tree-icon_loading {
  	 margin-right: 2px;
  	 vertical-align: top;
  }
   .space-tree .space-tree-treenode span.space-tree-switcher.space-tree-switcher-noop {
  	 cursor: auto;
  }
   .space-tree .space-tree-treenode span.space-tree-switcher.space-tree-switcher_open {
  	 mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
  	 -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
  	 background-color: var(--panel-text-color);
  	 transform: rotate(90deg);
  	 transition: transform 0.25s;
  }
   .space-tree .space-tree-treenode span.space-tree-switcher.space-tree-switcher_close {
  	 mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
  	 -webkit-mask: url('../images/icons/switcher.svg') 0 0/15px 15px;
  	 background-color: var(--panel-text-color);
  	 transform: rotate(0deg);
  	 transition: transform 0.25s;
  }
   .space-tree .space-tree-treenode span.space-tree-checkbox {
  	 width: 13px;
  	 height: 13px;
  	 margin: 0 3px;
  	 background-position: 0 0;
  }
   .space-tree .space-tree-treenode span.space-tree-checkbox-checked {
  	 background-position: -14px 0;
  }
   .space-tree .space-tree-treenode span.space-tree-checkbox-indeterminate {
  	 background-position: -14px -28px;
  }
   .space-tree .space-tree-treenode span.space-tree-checkbox-disabled {
  	 background-position: 0 -56px;
  }
   .space-tree .space-tree-treenode span.space-tree-checkbox.space-tree-checkbox-checked.space-tree-checkbox-disabled {
  	 background-position: -14px -56px;
  }
   .space-tree .space-tree-treenode span.space-tree-checkbox.space-tree-checkbox-indeterminate.space-tree-checkbox-disabled {
  	 position: relative;
  	 background: #ccc;
  	 border-radius: 3px;
  }
   .space-tree .space-tree-treenode span.space-tree-checkbox.space-tree-checkbox-indeterminate.space-tree-checkbox-disabled::after {
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
  	 content: '
  	 '
  	;
  }
   .space-tree:not(.space-tree-show-line) .space-tree-treenode .space-tree-switcher-noop {
  	 background: none;
  }
   .space-tree.space-tree-show-line .space-tree-treenode:not(:last-child) >
   ul {
  	 background: url('data:image/gif; base64,R0lGODlhCQACAIAAAMzMzP///yH5BAEAAAEALAAAAAAJAAIAAAIEjI9pUAA7') 0 0 repeat-y;
  }
   .space-tree.space-tree-show-line .space-tree-treenode:not(:last-child) >
   .space-tree-switcher-noop {
  	 background-position: -56px -18px;
  }
   .space-tree.space-tree-show-line .space-tree-treenode:last-child >
   .space-tree-switcher-noop {
  	 background-position: -56px -36px;
  }
   .space-tree-child-tree {
  	 display: none;
  }
   .space-tree-child-tree-open {
  	 display: block;
  }
   .space-tree-treenode-disabled >
   span:not(.space-tree-switcher), .space-tree-treenode-disabled >
   a, .space-tree-treenode-disabled >
   a span {
  	 color: #767676;
  	 cursor: not-allowed;
  }
   .space-tree #-treenode-active {
  	 background: rgba(0, 0, 0, 0.1);
  }
   .space-tree-node-selected {
  	 background-color: transparent;
  }
   .space-tree-icon__open {
  	 margin-right: 2px;
  	 vertical-align: top;
  	 background-position: -110px -16px;
  }
   .space-tree-icon__close {
  	 margin-right: 2px;
  	 vertical-align: top;
  	 background-position: -110px 0;
  }
   .space-tree-icon__docu {
  	 margin-right: 2px;
  	 vertical-align: top;
  	 background-position: -110px -32px;
  }
   .space-tree-icon__customize {
  	 margin-right: 2px;
  	 vertical-align: top;
  }
   .space-tree-indent-unit {
  	 display: inline-block;
  	 padding-left: 0;
  }
`;
