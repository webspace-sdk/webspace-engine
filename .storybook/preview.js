import React from "react";
import { useAccessibleOutlineStyle } from "../src/hubs/react-components/input/useAccessibleOutlineStyle";
import "../src/hubs/react-components/styles/global.scss";

const Layout = ({ children }) => {
  useAccessibleOutlineStyle();
  return <>{children}</>;
};

export const decorators = [
  Story => (
    <Layout>
      <Story />
    </Layout>
  )
];
