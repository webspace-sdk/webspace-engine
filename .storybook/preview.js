import React from "react";
import { useAccessibleOutlineStyle } from "../src/react-components/input/useAccessibleOutlineStyle";
import { WrappedIntlProvider } from "../src/react-components/wrapped-intl-provider";
import "../src/hubs/react-components/styles/global.scss";
import Store from "../src/storage/store";
import AccountChannel from "../src/utils/account-channel";
import SpaceChannel from "../src/utils/space-channel";
import { EventTarget } from "event-target-shim";

class Scene extends EventTarget {

}

const store = new Store();

window.APP = { store, accountChannel: new AccountChannel(),
  spaceChannel: new SpaceChannel(store), scene: new Scene() }

window.SYSTEMS = { voxSystem: {} };

const Layout = ({ children }) => {
  useAccessibleOutlineStyle();
  return <>{children}</>;
};

export const decorators = [
  Story => (
    <WrappedIntlProvider>
    <Layout>
      <Story />
    </Layout>
    </WrappedIntlProvider>
  )
];
