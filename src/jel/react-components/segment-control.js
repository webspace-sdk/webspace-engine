import PropTypes from "prop-types";
import React, { forwardRef } from "react";

import styled from "styled-components";

const SegmentControlElement = styled.div`
  background-color: red;
`;

const SegmentControl = forwardRef((props, ref) => {
  return <SegmentControlElement ref={ref}>hi</SegmentControlElement>;
});

SegmentControl.displayName = "SegmentControl";
SegmentControl.propTypes = {
  items: PropTypes.array
};

export { SegmentControl as default };
