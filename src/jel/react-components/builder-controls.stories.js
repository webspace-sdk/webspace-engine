import React from "react";
import styled from "styled-components";
import BuilderControls from "./builder-controls";
import { EventTarget } from "event-target-shim";
import {
  BRUSH_TYPES,
  BRUSH_MODES,
  BRUSH_SHAPES,
  BRUSH_CRAWL_TYPES,
  BRUSH_CRAWL_EXTENTS,
  BRUSH_COLOR_FILL_MODE
} from "../constants";

class MockBuilderSystem extends EventTarget {
  brushType = BRUSH_TYPES.VOXEL;
  brushMode = BRUSH_MODES.ADD;
  brushShape = BRUSH_SHAPES.BOX;
  brushSize = 3;
  mirrorX = true;
  mirrorY = false;
  mirrorZ = true;
  brushCrawlType = BRUSH_CRAWL_TYPES.GEO;
  brushCrawlExtents = BRUSH_CRAWL_EXTENTS.NSEW;
  brushColorFillMode = BRUSH_COLOR_FILL_MODE.EXISTING;

  setBrushSize(brushSize) {
    this.brushSize = brushSize;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushType(brushType) {
    this.brushType = brushType;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushMode(brushMode) {
    this.brushMode = brushMode;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushShape(brushShape) {
    this.brushShape = brushShape;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  toggleMirrorX() {
    this.mirrorX = !this.mirrorX;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  toggleMirrorY() {
    this.mirrorY = !this.mirrorY;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  toggleMirrorZ() {
    this.mirrorZ = !this.mirrorZ;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushCrawlType(crawlType) {
    this.brushCrawlType = crawlType;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushCrawlExtents(crawlExtents) {
    this.brushCrawlExtents = crawlExtents;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushColorFillMode(colorFillMode) {
    this.brushColorFillMode = colorFillMode;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }
}

window.SYSTEMS = { builderSystem: new MockBuilderSystem() };

const BuilderContent = styled.div`
  color: var(--panel-text-color);
  background-color: var(--panel-background-color);
  flex: 1 1 auto;
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  width: 220px;
  height: 640px;
  min-height: 640px;
  padding: 8px 0;
`;

export const Normal = () => {
  return (
    <BuilderContent>
      <BuilderControls />
    </BuilderContent>
  );
};

export default {
  title: "Builder Controls"
};
