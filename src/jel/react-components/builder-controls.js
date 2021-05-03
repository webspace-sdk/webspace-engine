//import PropTypes from "prop-types";
import PanelSectionHeader from "./panel-section-header";
import SegmentControl from "./segment-control";
import addIcon from "../../assets/jel/images/icons/add.svgi";
import ColorEquip from "./color-equip";
import { FormattedMessage } from "react-intl";
import React, { useState, useRef, useCallback, forwardRef, useEffect } from "react";

import styled from "styled-components";

const BuilderControlsElement = styled.div`
  display: flex;
  flex-direction: column;
`;

const BuilderControls = forwardRef((props, ref) => {
  const { builderSystem } = SYSTEMS;
  const [tool, setTool] = useState(builderSystem.brushType);
  const [mode, setMode] = useState(builderSystem.brushMode);
  const [shape, setShape] = useState(builderSystem.brushShape);
  const [mirrorX, setMirrorX] = useState(builderSystem.mirrorX);
  const [mirrorY, setMirrorY] = useState(builderSystem.mirrorY);
  const [mirrorZ, setMirrorZ] = useState(builderSystem.mirrorZ);
  const [crawlType, setCrawlType] = useState(builderSystem.brushCrawlType);
  const [crawlExtents, setCrawlExtents] = useState(builderSystem.brushCrawlExtents);
  const [colorFillMode, setColorFillMode] = useState(builderSystem.brushColorFillMode);
  const colorEquipRef = useRef();

  useEffect(
    () => {
      if (!builderSystem) return;
      const handler = () => {
        setTool(builderSystem.brushType);
        setMode(builderSystem.brushMode);
        setShape(builderSystem.brushShape);
        setMirrorX(builderSystem.mirrorX);
        setMirrorY(builderSystem.mirrorY);
        setMirrorZ(builderSystem.mirrorZ);
        setCrawlType(builderSystem.brushCrawlType);
        setCrawlExtents(builderSystem.brushCrawlExtents);
        setColorFillMode(builderSystem.brushColorFillMode);
      };

      builderSystem.addEventListener("settingschanged", handler);
      return () => builderSystem.removeEventListener("settingschanged", handler);
    },
    [builderSystem, setTool, setMode, setMirrorX, setMirrorY, setMirrorZ, setCrawlType, setCrawlExtents]
  );

  const onToolChanged = useCallback(
    (id, idx) => {
      builderSystem.setBrushType(idx);
      document.activeElement.blur(); // focuses canvas
    },
    [builderSystem]
  );
  const onModeChanged = useCallback(
    (id, idx) => {
      builderSystem.setBrushMode(idx);
      document.activeElement.blur(); // focuses canvas
    },
    [builderSystem]
  );
  const onShapeChanged = useCallback(
    (id, idx) => {
      builderSystem.setBrushShape(idx);
      document.activeElement.blur(); // focuses canvas
    },
    [builderSystem]
  );
  const onMirrorChanged = useCallback(
    (id, idx) => {
      if (idx === 0) {
        builderSystem.toggleMirrorX();
      } else if (idx === 1) {
        builderSystem.toggleMirrorY();
      } else if (idx === 2) {
        builderSystem.toggleMirrorZ();
      }
      document.activeElement.blur();
    },
    [builderSystem]
  );
  const onCrawlTypeChanged = useCallback(
    (id, idx) => {
      builderSystem.setBrushCrawlType(idx);
      document.activeElement.blur(); // focuses canvas
    },
    [builderSystem]
  );
  const onCrawlExtentsChanged = useCallback(
    (id, idx) => {
      builderSystem.setBrushCrawlExtents(idx);
      document.activeElement.blur(); // focuses canvas
    },
    [builderSystem]
  );
  const onColorFillModeChanged = useCallback(
    (id, idx) => {
      builderSystem.setBrushColorFillMode(idx);
      document.activeElement.blur(); // focuses canvas
    },
    [builderSystem]
  );

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
        onChange={onToolChanged}
        selectedIndices={[tool]}
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
        onChange={onModeChanged}
        selectedIndices={[mode]}
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
        onChange={onMirrorChanged}
        selectedIndices={[mirrorX ? 0 : null, mirrorY ? 1 : null, mirrorZ ? 2 : null].filter(x => x !== null)}
        items={[
          { id: "builder.mirror.x", iconSrc: addIcon },
          { id: "builder.mirror.y", iconSrc: addIcon },
          { id: "builder.mirror.z", iconSrc: addIcon }
        ]}
      />
      <SegmentControl
        rows={1}
        cols={2}
        onChange={onShapeChanged}
        selectedIndices={[shape]}
        items={[{ id: "builder.shape.box", iconSrc: addIcon }, { id: "builder.shape.sphere", iconSrc: addIcon }]}
      />
      <SegmentControl
        rows={1}
        cols={2}
        onChange={onCrawlTypeChanged}
        selectedIndices={[crawlType]}
        items={[{ id: "builder.crawl.geo", iconSrc: addIcon }, { id: "builder.crawl.color", iconSrc: addIcon }]}
      />
      <SegmentControl
        rows={1}
        cols={2}
        onChange={onCrawlExtentsChanged}
        selectedIndices={[crawlExtents]}
        items={[{ id: "builder.crawl.nsew", iconSrc: addIcon }, { id: "builder.crawl.all", iconSrc: addIcon }]}
      />
      <SegmentControl
        rows={1}
        cols={2}
        onChange={onColorFillModeChanged}
        selectedIndices={[colorFillMode]}
        items={[
          { id: "builder.color-fill-mode.selected", iconSrc: addIcon },
          { id: "builder.color-fill-mode.existing", iconSrc: addIcon }
        ]}
      />
      <PanelSectionHeader style={{ height: "16px" }}>
        <FormattedMessage id="build.palette.header" />
      </PanelSectionHeader>
      <ColorEquip ref={colorEquipRef} onSelectedColorClicked={onSelectedColorClicked} />*/
    </BuilderControlsElement>
  );
});

BuilderControls.displayName = "BuilderControls";
BuilderControls.propTypes = {};

export { BuilderControls as default };
