import React from "react";
import { useAccessibleOutlineStyle } from "../src/hubs/react-components/input/useAccessibleOutlineStyle";
import { WrappedIntlProvider } from "../src/hubs/react-components/wrapped-intl-provider";
import "../src/hubs/react-components/styles/global.scss";
import Store from "../src/hubs/storage/store";
import AccountChannel from "../src/jel/utils/account-channel";

window.APP = { store: new Store(), accountChannel: new AccountChannel() }

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
