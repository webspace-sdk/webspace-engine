import styled from "styled-components";
import React, { Component } from "react";

const MenuElement = styled.div`
  background-color: red;
  width: 256px;
  height: 256px;
`;

export default class PopupMenu extends Component {
  render() {
    return <MenuElement />;
  }
}
