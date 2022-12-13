import React from "react";
import AssetPanel from "./asset-panel";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";
import MediaTree from "../utils/media-tree";

const VOX_DATA = [
  {
    vox_id: "EWCKYaB",
    url: "https://hubs.local:4000/api/v1/vox/EWCKYaB",
    thumb_url: "https://hubs.local:4000/files/af765fc2-74d8-4031-a66b-d17562f3c8b7.png",
    preview_url: "https://hubs.local:4000/files/acf25b39-5bf8-4153-8cb3-53d216f4ff95.png",
    permissions: { view_vox: true, edit_vox: true },
    name: "Object Name",
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "i7kdAZj",
    url: "https://hubs.local:4000/api/v1/vox/i7kdAZj",
    thumb_url: "https://hubs.local:4000/files/af765fc2-74d8-4031-a66b-d17562f3c8b7.png",
    preview_url: "https://hubs.local:4000/files/acf25b39-5bf8-4153-8cb3-53d216f4ff95.png",
    permissions: { view_vox: true, edit_vox: true },
    name: "Really Really Really Long Object Name",
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "cpzqq3H",
    url: "https://hubs.local:4000/api/v1/vox/cpzqq3H",
    thumb_url: "https://hubs.local:4000/files/af765fc2-74d8-4031-a66b-d17562f3c8b7.png",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "rQ4ciVU",
    url: "https://hubs.local:4000/api/v1/vox/rQ4ciVU",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "iMDxTzn",
    url: "https://hubs.local:4000/api/v1/vox/iMDxTzn",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "xMqJKYY",
    url: "https://hubs.local:4000/api/v1/vox/xMqJKYY",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "KShKx9k",
    url: "https://hubs.local:4000/api/v1/vox/KShKx9k",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "SEMet8P",
    url: "https://hubs.local:4000/api/v1/vox/SEMet8P",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "CqeXiP9",
    url: "https://hubs.local:4000/api/v1/vox/CqeXiP9",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "B6MZQc5",
    url: "https://hubs.local:4000/api/v1/vox/B6MZQc5",
    permissions: { view_vox: true, edit_vox: true },
    name: "Grey Laptop",
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "qzkUiEw",
    url: "https://hubs.local:4000/api/v1/vox/qzkUiEw",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "Ufc38AH",
    url: "https://hubs.local:4000/api/v1/vox/Ufc38AH",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "nP98DRD",
    url: "https://hubs.local:4000/api/v1/vox/nP98DRD",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "LWJQBCU",
    url: "https://hubs.local:4000/api/v1/vox/LWJQBCU",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "75RUPVd",
    url: "https://hubs.local:4000/api/v1/vox/75RUPVd",
    permissions: { view_vox: true, edit_vox: true },
    name: "Paper3",
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "aZc3Hwc",
    url: "https://hubs.local:4000/api/v1/vox/aZc3Hwc",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "gtwTAjx",
    url: "https://hubs.local:4000/api/v1/vox/gtwTAjx",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "HXzz6hs",
    url: "https://hubs.local:4000/api/v1/vox/HXzz6hs",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "aEkmYpj",
    url: "https://hubs.local:4000/api/v1/vox/aEkmYpj",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "5muAKxC",
    url: "https://hubs.local:4000/api/v1/vox/5muAKxC",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "CXiqxsb",
    url: "https://hubs.local:4000/api/v1/vox/CXiqxsb",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "jBVuXM6",
    url: "https://hubs.local:4000/api/v1/vox/jBVuXM6",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "EpsWbHM",
    url: "https://hubs.local:4000/api/v1/vox/EpsWbHM",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "bjhQDyf",
    url: "https://hubs.local:4000/api/v1/vox/bjhQDyf",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "CxaamWm",
    url: "https://hubs.local:4000/api/v1/vox/CxaamWm",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "g7hPeQY",
    url: "https://hubs.local:4000/api/v1/vox/g7hPeQY",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "eqJNF8f",
    url: "https://hubs.local:4000/api/v1/vox/eqJNF8f",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "deuggCT",
    url: "https://hubs.local:4000/api/v1/vox/deuggCT",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "nco4Mq7",
    url: "https://hubs.local:4000/api/v1/vox/nco4Mq7",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "N9HjNog",
    url: "https://hubs.local:4000/api/v1/vox/N9HjNog",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "Re5zJZQ",
    url: "https://hubs.local:4000/api/v1/vox/Re5zJZQ",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "d9zRZZx",
    url: "https://hubs.local:4000/api/v1/vox/d9zRZZx",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "MtWYwEz",
    url: "https://hubs.local:4000/api/v1/vox/MtWYwEz",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "r6TnhQq",
    url: "https://hubs.local:4000/api/v1/vox/r6TnhQq",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "o9CZ3CC",
    url: "https://hubs.local:4000/api/v1/vox/o9CZ3CC",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "dUQfyXc",
    url: "https://hubs.local:4000/api/v1/vox/dUQfyXc",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "pJMPdhe",
    url: "https://hubs.local:4000/api/v1/vox/pJMPdhe",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "8BL4bxP",
    url: "https://hubs.local:4000/api/v1/vox/8BL4bxP",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "6zdKfxk",
    url: "https://hubs.local:4000/api/v1/vox/6zdKfxk",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "8DMmJp5",
    url: "https://hubs.local:4000/api/v1/vox/8DMmJp5",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "XEbVHcP",
    url: "https://hubs.local:4000/api/v1/vox/XEbVHcP",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "ro4AKCE",
    url: "https://hubs.local:4000/api/v1/vox/ro4AKCE",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "svNHtjy",
    url: "https://hubs.local:4000/api/v1/vox/svNHtjy",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "sQzMpFS",
    url: "https://hubs.local:4000/api/v1/vox/sQzMpFS",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "EYk5XyA",
    url: "https://hubs.local:4000/api/v1/vox/EYk5XyA",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "vm6MYHv",
    url: "https://hubs.local:4000/api/v1/vox/vm6MYHv",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "eupeGDd",
    url: "https://hubs.local:4000/api/v1/vox/eupeGDd",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "Q6KQuK7",
    url: "https://hubs.local:4000/api/v1/vox/Q6KQuK7",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "cuskKYi",
    url: "https://hubs.local:4000/api/v1/vox/cuskKYi",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "PCjh4aQ",
    url: "https://hubs.local:4000/api/v1/vox/PCjh4aQ",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "TE9XNs5",
    url: "https://hubs.local:4000/api/v1/vox/TE9XNs5",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "nQPJDKQ",
    url: "https://hubs.local:4000/api/v1/vox/nQPJDKQ",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "3vHjfwz",
    url: "https://hubs.local:4000/api/v1/vox/3vHjfwz",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "5Aii9sL",
    url: "https://hubs.local:4000/api/v1/vox/5Aii9sL",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "96gtFZ9",
    url: "https://hubs.local:4000/api/v1/vox/96gtFZ9",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "7BmHDxM",
    url: "https://hubs.local:4000/api/v1/vox/7BmHDxM",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "H2zvEWc",
    url: "https://hubs.local:4000/api/v1/vox/H2zvEWc",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "MMxQKi3",
    url: "https://hubs.local:4000/api/v1/vox/MMxQKi3",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  },
  {
    vox_id: "kMw3BiP",
    url: "https://hubs.local:4000/api/v1/vox/kMw3BiP",
    permissions: { view_vox: true, edit_vox: true },
    name: null,
    collection: "Office Kit",
    category: "Conference Props"
  }
];

const SCENE_DATA = [
  {
    collection: "Welcome World",
    name: "Hello World",
    permissions: {
      view_world_template: true
    },
    thumb_url: "https://hubs.local:4000/files/2d7a0559-e64f-45c7-b764-2589501e1842.png",
    preview_url: "https://hubs.local:4000/files/2d7a0559-e64f-45c7-b764-2589501e1842.png",
    url: "https://hubs.local:4000/api/v1/world_templates/GRYzhpx",
    world_template_id: "GRYzhpx"
  }
];

const voxTree = new MediaTree("vox");
voxTree.build(VOX_DATA);

const sceneTree = new MediaTree("world_templates");
sceneTree.build(SCENE_DATA);

export const Normal = () => (
  <div
    className={classNames(sharedStyles.secondaryPanel)}
    style={{
      display: "flex",
      flexDirection: "row",
      width: "1200px",
      height: "290px",
      paddingTop: "8px",
      paddingBottom: "8px"
    }}
  >
    <AssetPanel voxTree={voxTree} sceneTree={sceneTree} expanded={true} />
  </div>
);

export default {
  title: "Asset Panel"
};
