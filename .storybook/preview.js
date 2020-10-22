import React from "react";
import { useAccessibleOutlineStyle } from "../src/hubs/react-components/input/useAccessibleOutlineStyle";
import { WrappedIntlProvider } from "../src/hubs/react-components/wrapped-intl-provider";
import "../src/hubs/react-components/styles/global.scss";

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
