import "./hubs/webxr-bypass-hacks";
import "./hubs/utils/theme";
import "./hubs/utils/configs";
import "./hubs/assets/stylesheets/link.scss";
import "aframe";
import React from "react";
import ReactDOM from "react-dom";
import registerTelemetry from "./hubs/telemetry";
import LinkRoot from "./hubs/react-components/link-root";
import LinkChannel from "./hubs/utils/link-channel";
import { connectToReticulum } from "./hubs/utils/phoenix-utils";
import Store from "./hubs/storage/store";

registerTelemetry("/link", "Hubs Device Link");

const store = new Store();

const linkChannel = new LinkChannel(store);

(async () => {
  const socket = await connectToReticulum();
  linkChannel.setSocket(socket);
})();

ReactDOM.render(<LinkRoot store={store} linkChannel={linkChannel} />, document.getElementById("link-root"));
