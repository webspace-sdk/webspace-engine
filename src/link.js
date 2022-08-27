import "./hubs/webxr-bypass-hacks";
import "./hubs/utils/theme";
import "./hubs/utils/configs";
import "./assets/hubs/stylesheets/link.scss";
import "aframe";
import React from "react";
import ReactDOM from "react-dom";
import registerTelemetry from "./hubs/telemetry";
import LinkRoot from "./hubs/react-components/link-root";
import { connectToReticulum } from "./hubs/utils/phoenix-utils";
import Store from "./hubs/storage/store";

registerTelemetry("/link", "Hubs Device Link");

const store = new Store();
