//import PropTypes from "prop-types";
import PanelSectionHeader from "./panel-section-header";
import SegmentControl from "./segment-control";
import addIcon from "../../assets/jel/images/icons/add.svgi";
import ColorEquip from "./color-equip";
import { FormattedMessage } from "react-intl";
import React, { useRef, useCallback, forwardRef } from "react";

import styled from "styled-components";

const BuilderControlsElement = styled.div`
  display: flex;
  flex-direction: column;
`;

const BuilderControls = forwardRef((props, ref) => {
  const colorEquipRef = useRef();

  const onSelectedColorClicked = useCallback(() => {
    // TODO show color picker
  }, []);

  return (
    <BuilderControlsElement ref={ref}>
      <PanelSectionHeader style={{ height: "16px" }}>
        <FormattedMessage id="build.tool.header" />
      </PanelSectionHeader>
      <SegmentControl
        rows={2}
        cols={3}
        items={[
          { id: "builder.tool.paint", iconSrc: addIcon },
          { id: "builder.tool.box", iconSrc: addIcon },
          { id: "builder.tool.face", iconSrc: addIcon },
          { id: "builder.tool.circle", iconSrc: addIcon },
          { id: "builder.tool.fill", iconSrc: addIcon },
          { id: "builder.tool.pick", iconSrc: addIcon }
        ]}
      />
      <SegmentControl
        rows={1}
        cols={3}
        items={[
          { id: "builder.mode.add", iconSrc: addIcon },
          { id: "builder.mode.remove", iconSrc: addIcon },
          { id: "builder.mode.paint", iconSrc: addIcon }
        ]}
      />
      <PanelSectionHeader style={{ height: "16px" }}>
        <FormattedMessage id="build.options.header" />
      </PanelSectionHeader>
      <SegmentControl
        rows={1}
        cols={3}
        items={[
          { id: "builder.mirror.x", iconSrc: addIcon },
          { id: "builder.mirror.y", iconSrc: addIcon },
          { id: "builder.mirror.z", iconSrc: addIcon }
        ]}
      />
      <SegmentControl
        rows={1}
        cols={2}
        items={[{ id: "builder.crawl.geo", iconSrc: addIcon }, { id: "builder.crawl.color", iconSrc: addIcon }]}
      />
      <SegmentControl
        rows={1}
        cols={2}
        items={[{ id: "builder.crawl.four", iconSrc: addIcon }, { id: "builder.crawl.eight", iconSrc: addIcon }]}
      />
      <PanelSectionHeader style={{ height: "16px" }}>
        <FormattedMessage id="build.palette.header" />
      </PanelSectionHeader>
      <ColorEquip ref={colorEquipRef} onSelectedColorClicked={onSelectedColorClicked} />
    </BuilderControlsElement>
  );
});

BuilderControls.displayName = "BuilderControls";
BuilderControls.propTypes = {};

export { BuilderControls as default };
