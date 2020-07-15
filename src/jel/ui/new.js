import React from "react";
import ReactDOM from "react-dom";
import NewUI from "../react-components/new-ui";
import Store from "../../storage/store";

import "../assets/stylesheets/new.scss";

const store = new Store();
window.APP = { store };

const root = <NewUI />;
ReactDOM.render(root, document.getElementById("new-root"));
