import { Validator } from "jsonschema";
import mixpanel from "mixpanel-browser";
import merge from "deepmerge";
import Cookies from "js-cookie";
import jwtDecode from "jwt-decode";

const LOCAL_STORE_KEY = "___jel_store";
const STORE_STATE_CACHE_KEY = Symbol();
const OAUTH_FLOW_CREDENTIALS_KEY = "ret-oauth-flow-account-credentials";
const validator = new Validator();
import { EventTarget } from "event-target-shim";
import { fetchRandomDefaultAvatarId, generateRandomName } from "../utils/identity.js";

export const rgbToStoredColor = ({ r, g, b }) => {
  return (r | (g << 8) | (b << 16)) >>> 0;
};

export const storedColorToRgb = color => {
  return { r: color & 0x0000ff, g: (color & 0x00ff00) >> 8, b: (color & 0xff0000) >> 16 };
};

export const DEFAULT_COLORS = [
  rgbToStoredColor({ r: 98, g: 0, b: 66 }),
  rgbToStoredColor({ r: 135, g: 5, b: 87 }),
  rgbToStoredColor({ r: 163, g: 6, b: 100 }),
  rgbToStoredColor({ r: 188, g: 10, b: 111 }),
  rgbToStoredColor({ r: 218, g: 18, b: 125 }),
  rgbToStoredColor({ r: 232, g: 54, b: 143 }),
  rgbToStoredColor({ r: 243, g: 100, b: 162 }),
  rgbToStoredColor({ r: 255, g: 140, b: 186 }),
  rgbToStoredColor({ r: 255, g: 184, b: 210 }),
  rgbToStoredColor({ r: 255, g: 227, b: 236 }),
  rgbToStoredColor({ r: 97, g: 3, b: 22 }),
  rgbToStoredColor({ r: 138, g: 4, b: 26 }),
  rgbToStoredColor({ r: 171, g: 9, b: 30 }),
  rgbToStoredColor({ r: 207, g: 17, b: 36 }),
  rgbToStoredColor({ r: 225, g: 45, b: 57 }),
  rgbToStoredColor({ r: 239, g: 78, b: 78 }),
  rgbToStoredColor({ r: 248, g: 106, b: 106 }),
  rgbToStoredColor({ r: 255, g: 155, b: 155 }),
  rgbToStoredColor({ r: 255, g: 189, b: 189 }),
  rgbToStoredColor({ r: 255, g: 227, b: 227 }),
  rgbToStoredColor({ r: 132, g: 16, b: 3 }),
  rgbToStoredColor({ r: 173, g: 29, b: 7 }),
  rgbToStoredColor({ r: 197, g: 39, b: 7 }),
  rgbToStoredColor({ r: 222, g: 58, b: 17 }),
  rgbToStoredColor({ r: 243, g: 86, b: 39 }),
  rgbToStoredColor({ r: 249, g: 112, b: 62 }),
  rgbToStoredColor({ r: 255, g: 148, b: 102 }),
  rgbToStoredColor({ r: 255, g: 176, b: 136 }),
  rgbToStoredColor({ r: 255, g: 208, b: 181 }),
  rgbToStoredColor({ r: 255, g: 232, b: 217 }),
  rgbToStoredColor({ r: 141, g: 43, b: 11 }),
  rgbToStoredColor({ r: 180, g: 77, b: 18 }),
  rgbToStoredColor({ r: 203, g: 110, b: 23 }),
  rgbToStoredColor({ r: 222, g: 145, b: 29 }),
  rgbToStoredColor({ r: 240, g: 180, b: 41 }),
  rgbToStoredColor({ r: 247, g: 201, b: 72 }),
  rgbToStoredColor({ r: 250, g: 219, b: 95 }),
  rgbToStoredColor({ r: 252, g: 229, b: 136 }),
  rgbToStoredColor({ r: 255, g: 243, b: 196 }),
  rgbToStoredColor({ r: 255, g: 251, b: 234 }),
  rgbToStoredColor({ r: 1, g: 77, b: 64 }),
  rgbToStoredColor({ r: 12, g: 107, b: 88 }),
  rgbToStoredColor({ r: 20, g: 125, b: 100 }),
  rgbToStoredColor({ r: 25, g: 148, b: 115 }),
  rgbToStoredColor({ r: 39, g: 171, b: 131 }),
  rgbToStoredColor({ r: 62, g: 189, b: 147 }),
  rgbToStoredColor({ r: 101, g: 214, b: 173 }),
  rgbToStoredColor({ r: 142, g: 237, b: 199 }),
  rgbToStoredColor({ r: 198, g: 247, b: 226 }),
  rgbToStoredColor({ r: 239, g: 252, b: 246 }),
  rgbToStoredColor({ r: 5, g: 96, b: 110 }),
  rgbToStoredColor({ r: 7, g: 129, b: 143 }),
  rgbToStoredColor({ r: 9, g: 154, b: 164 }),
  rgbToStoredColor({ r: 15, g: 181, b: 186 }),
  rgbToStoredColor({ r: 28, g: 212, b: 212 }),
  rgbToStoredColor({ r: 58, g: 231, b: 225 }),
  rgbToStoredColor({ r: 98, g: 224, b: 235 }),
  rgbToStoredColor({ r: 146, g: 253, b: 242 }),
  rgbToStoredColor({ r: 193, g: 254, b: 246 }),
  rgbToStoredColor({ r: 225, g: 252, b: 248 }),
  rgbToStoredColor({ r: 6, g: 17, b: 120 }),
  rgbToStoredColor({ r: 11, g: 29, b: 150 }),
  rgbToStoredColor({ r: 19, g: 45, b: 173 }),
  rgbToStoredColor({ r: 29, g: 61, b: 191 }),
  rgbToStoredColor({ r: 34, g: 81, b: 204 }),
  rgbToStoredColor({ r: 58, g: 102, b: 219 }),
  rgbToStoredColor({ r: 94, g: 138, b: 238 }),
  rgbToStoredColor({ r: 136, g: 177, b: 252 }),
  rgbToStoredColor({ r: 176, g: 208, b: 255 }),
  rgbToStoredColor({ r: 217, g: 232, b: 255 }),
  rgbToStoredColor({ r: 68, g: 5, b: 110 }),
  rgbToStoredColor({ r: 88, g: 10, b: 148 }),
  rgbToStoredColor({ r: 105, g: 12, b: 176 }),
  rgbToStoredColor({ r: 122, g: 14, b: 204 }),
  rgbToStoredColor({ r: 135, g: 25, b: 224 }),
  rgbToStoredColor({ r: 148, g: 70, b: 237 }),
  rgbToStoredColor({ r: 163, g: 104, b: 252 }),
  rgbToStoredColor({ r: 185, g: 144, b: 255 }),
  rgbToStoredColor({ r: 218, g: 196, b: 255 }),
  rgbToStoredColor({ r: 242, g: 235, b: 254 }),
  rgbToStoredColor({ r: 62, g: 39, b: 35 }),
  rgbToStoredColor({ r: 78, g: 52, b: 46 }),
  rgbToStoredColor({ r: 93, g: 64, b: 55 }),
  rgbToStoredColor({ r: 109, g: 76, b: 65 }),
  rgbToStoredColor({ r: 121, g: 85, b: 72 }),
  rgbToStoredColor({ r: 141, g: 110, b: 99 }),
  rgbToStoredColor({ r: 161, g: 136, b: 127 }),
  rgbToStoredColor({ r: 188, g: 170, b: 164 }),
  rgbToStoredColor({ r: 215, g: 204, b: 200 }),
  rgbToStoredColor({ r: 239, g: 235, b: 233 }),
  rgbToStoredColor({ r: 0, g: 0, b: 0 }),
  rgbToStoredColor({ r: 59, g: 59, b: 59 }),
  rgbToStoredColor({ r: 81, g: 81, b: 81 }),
  rgbToStoredColor({ r: 98, g: 98, b: 98 }),
  rgbToStoredColor({ r: 126, g: 126, b: 126 }),
  rgbToStoredColor({ r: 158, g: 158, b: 158 }),
  rgbToStoredColor({ r: 177, g: 177, b: 177 }),
  rgbToStoredColor({ r: 207, g: 207, b: 207 }),
  rgbToStoredColor({ r: 225, g: 225, b: 225 }),
  rgbToStoredColor({ r: 255, g: 255, b: 255 })
];

const capitalize = str => str[0].toUpperCase() + str.slice(1);

function randomString(len) {
  const p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return [...Array(len)].reduce(a => a + p[~~(Math.random() * p.length)], "");
}

// Durable (via local-storage) schema-enforced state that is meant to be consumed via forward data flow.
// (Think flux but with way less incidental complexity, at least for now :))
export const SCHEMA = {
  id: "/JelStore",

  definitions: {
    context: {
      type: "object",
      additionalProperties: false,
      properties: {
        spaceId: { type: "string" },
        lastJoinedHubId: { type: "string" }, // Deprecated
        lastJoinedHubIds: { type: "object" },
        isFirstVisitToSpace: { type: "boolean" }, // true the very first time a space is visited, for initial setup
        isSpaceCreator: { type: "boolean" } // true if this user ever created a space on this device
      }
    },

    profile: {
      type: "object",
      additionalProperties: false,
      properties: {
        displayName: { type: "string", pattern: "^[A-Za-z0-9 -]{3,32}$" },
        avatarId: { type: "string" }
      }
    },

    credentials: {
      type: "object",
      additionalProperties: false,
      properties: {
        token: { type: ["null", "string"] },
        matrixAccessToken: { type: ["null", "string"] },
        deviceId: { type: ["null", "string"] },
        email: { type: ["null", "string"] }
      }
    },

    activity: {
      type: "object",
      additionalProperties: false,
      properties: {
        hasRotated: { type: "boolean" }, // Legacy
        hasScaled: { type: "boolean" }, // Legacy
        hasFoundWiden: { type: "boolean" }, // Legacy
        lastEnteredAt: { type: "string" },
        entryCount: { type: "number" },
        narrow: { type: "boolean" },
        widen: { type: "boolean" },
        unmute: { type: "boolean" },
        toggleMuteKey: { type: "boolean" },
        wasd: { type: "boolean" },
        createMenu: { type: "boolean" },
        createWorld: { type: "boolean" },
        createChannel: { type: "boolean" },
        avatarEdit: { type: "boolean" },
        showInvite: { type: "boolean" },
        rightDrag: { type: "boolean" },
        narrowMouseLook: { type: "boolean" },
        rotated: { type: "boolean" },
        scaled: { type: "boolean" },
        mediaTextEdit: { type: "boolean" },
        mediaTextEditClose: { type: "boolean" },
        mediaTextCreate: { type: "boolean" },
        mediaRemove: { type: "boolean" },
        chat: { type: "boolean" },
        hasShownJumpedToMember: { type: "boolean" }
      }
    },

    settings: {
      type: "object",
      additionalProperties: false,
      properties: {
        preferredMicDeviceId: { type: "string" },
        hideKeyTips: { type: "boolean" },
        defaultDetailLevel: { type: "number" },
        defaultDetailLevelUntilSeconds: { type: "number" },
        hideNotificationBannerUntilSeconds: { type: "number" }
      }
    },

    equips: {
      type: "object",
      additionalProperties: false,
      properties: {
        launcher: { type: "string" },
        launcherSlot1: { type: "string" },
        launcherSlot2: { type: "string" },
        launcherSlot3: { type: "string" },
        launcherSlot4: { type: "string" },
        launcherSlot5: { type: "string" },
        launcherSlot6: { type: "string" },
        launcherSlot7: { type: "string" },
        launcherSlot8: { type: "string" },
        launcherSlot9: { type: "string" },
        launcherSlot10: { type: "string" },
        color: { type: "number" },
        colorPage: { type: "number" },
        colorSlot1: { type: "number" },
        colorSlot2: { type: "number" },
        colorSlot3: { type: "number" },
        colorSlot4: { type: "number" },
        colorSlot5: { type: "number" },
        colorSlot6: { type: "number" },
        colorSlot7: { type: "number" },
        colorSlot8: { type: "number" },
        colorSlot9: { type: "number" },
        colorSlot10: { type: "number" },
        colorSlot11: { type: "number" },
        colorSlot12: { type: "number" },
        colorSlot13: { type: "number" },
        colorSlot14: { type: "number" },
        colorSlot15: { type: "number" },
        colorSlot16: { type: "number" },
        colorSlot17: { type: "number" },
        colorSlot18: { type: "number" },
        colorSlot19: { type: "number" },
        colorSlot20: { type: "number" },
        colorSlot21: { type: "number" },
        colorSlot22: { type: "number" },
        colorSlot23: { type: "number" },
        colorSlot24: { type: "number" },
        colorSlot25: { type: "number" },
        colorSlot26: { type: "number" },
        colorSlot27: { type: "number" },
        colorSlot28: { type: "number" },
        colorSlot29: { type: "number" },
        colorSlot30: { type: "number" },
        colorSlot31: { type: "number" },
        colorSlot32: { type: "number" },
        colorSlot33: { type: "number" },
        colorSlot34: { type: "number" },
        colorSlot35: { type: "number" },
        colorSlot36: { type: "number" },
        colorSlot37: { type: "number" },
        colorSlot38: { type: "number" },
        colorSlot39: { type: "number" },
        colorSlot40: { type: "number" },
        colorSlot41: { type: "number" },
        colorSlot42: { type: "number" },
        colorSlot43: { type: "number" },
        colorSlot44: { type: "number" },
        colorSlot45: { type: "number" },
        colorSlot46: { type: "number" },
        colorSlot47: { type: "number" },
        colorSlot48: { type: "number" },
        colorSlot49: { type: "number" },
        colorSlot50: { type: "number" },
        colorSlot51: { type: "number" },
        colorSlot52: { type: "number" },
        colorSlot53: { type: "number" },
        colorSlot54: { type: "number" },
        colorSlot55: { type: "number" },
        colorSlot56: { type: "number" },
        colorSlot57: { type: "number" },
        colorSlot58: { type: "number" },
        colorSlot59: { type: "number" },
        colorSlot60: { type: "number" },
        colorSlot61: { type: "number" },
        colorSlot62: { type: "number" },
        colorSlot63: { type: "number" },
        colorSlot64: { type: "number" },
        colorSlot65: { type: "number" },
        colorSlot66: { type: "number" },
        colorSlot67: { type: "number" },
        colorSlot68: { type: "number" },
        colorSlot69: { type: "number" },
        colorSlot70: { type: "number" },
        colorSlot71: { type: "number" },
        colorSlot72: { type: "number" },
        colorSlot73: { type: "number" },
        colorSlot74: { type: "number" },
        colorSlot75: { type: "number" },
        colorSlot76: { type: "number" },
        colorSlot77: { type: "number" },
        colorSlot78: { type: "number" },
        colorSlot79: { type: "number" },
        colorSlot80: { type: "number" },
        colorSlot81: { type: "number" },
        colorSlot82: { type: "number" },
        colorSlot83: { type: "number" },
        colorSlot84: { type: "number" },
        colorSlot85: { type: "number" },
        colorSlot86: { type: "number" },
        colorSlot87: { type: "number" },
        colorSlot88: { type: "number" },
        colorSlot89: { type: "number" },
        colorSlot90: { type: "number" },
        colorSlot91: { type: "number" },
        colorSlot92: { type: "number" },
        colorSlot93: { type: "number" },
        colorSlot94: { type: "number" },
        colorSlot95: { type: "number" },
        colorSlot96: { type: "number" },
        colorSlot97: { type: "number" },
        colorSlot98: { type: "number" },
        colorSlot99: { type: "number" },
        colorSlot100: { type: "number" }
      }
    },

    preferences: {
      type: "object",
      additionalProperties: false,
      properties: {
        shouldPromptForRefresh: { type: "bool" },
        muteMicOnEntry: { type: "bool" },
        audioOutputMode: { type: "string" },
        invertTouchscreenCameraMove: { type: "bool" },
        enableOnScreenJoystickLeft: { type: "bool" },
        enableOnScreenJoystickRight: { type: "bool" },
        onlyShowNametagsInFreeze: { type: "bool" },
        allowMultipleHubsInstances: { type: "bool" },
        disableIdleDetection: { type: "bool" },
        preferMobileObjectInfoPanel: { type: "bool" },
        maxResolutionWidth: { type: "number" },
        maxResolutionHeight: { type: "number" },
        globalVoiceVolume: { type: "number" },
        globalMediaVolume: { type: "number" },
        snapRotationDegrees: { type: "number" },
        materialQualitySetting: { type: "string" },
        disableSoundEffects: { type: "bool" },
        disableMovement: { type: "bool" },
        disableBackwardsMovement: { type: "bool" },
        disableStrafing: { type: "bool" },
        disableTeleporter: { type: "bool" },
        disableAutoPixelRatio: { type: "bool" },
        movementSpeedModifier: { type: "number" },
        disableEchoCancellation: { type: "bool" },
        disableNoiseSuppression: { type: "bool" },
        disableAutoGainControl: { type: "bool" },
        disableAudioAmbience: { type: "bool" }
      }
    },

    embedTokens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          hubId: { type: "string" },
          embedToken: { type: "string" }
        }
      }
    },

    onLoadActions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: { type: "string" },
          args: { type: "object" }
        }
      }
    },

    uiState: {
      type: "object",
      additionalProperties: false,
      properties: {
        navPanelWidth: { type: "number" },
        presencePanelWidth: { type: "number" },
        mediaTextColorPresetIndex: { type: "number" },
        closedNotificationBanner: { type: "boolean" } // Deprecated
      }
    },

    expandedTreeNodes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          nodeId: { type: "string" }
        }
      }
    }
  },

  type: "object",

  properties: {
    context: { $ref: "#/definitions/context" },
    profile: { $ref: "#/definitions/profile" },
    credentials: { $ref: "#/definitions/credentials" },
    activity: { $ref: "#/definitions/activity" },
    settings: { $ref: "#/definitions/settings" },
    equips: { $ref: "#/definitions/equips" },
    preferences: { $ref: "#/definitions/preferences" },
    uiState: { $ref: "#/definitions/uiState" },
    embedTokens: { $ref: "#/definitions/embedTokens" },
    onLoadActions: { $ref: "#/definitions/onLoadActions" },
    expandedTreeNodes: { $ref: "#/definitions/expandedTreeNodes" }
  },

  additionalProperties: false
};

export default class Store extends EventTarget {
  constructor() {
    super();

    if (localStorage.getItem(LOCAL_STORE_KEY) === null) {
      localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify({}));
    }

    // When storage is updated in another window
    window.addEventListener("storage", e => {
      if (e.key !== LOCAL_STORE_KEY) return;
      delete this[STORE_STATE_CACHE_KEY];
      this.dispatchEvent(new CustomEvent("statechanged"));
    });

    this.update({
      context: {},
      activity: {},
      settings: {},
      equips: {},
      credentials: {},
      profile: {},
      embedTokens: [],
      onLoadActions: [],
      expandedTreeNodes: [],
      preferences: {},
      uiState: {}
    });

    this._shouldResetAvatarOnInit = false;

    const oauthFlowCredentials = Cookies.getJSON(OAUTH_FLOW_CREDENTIALS_KEY);
    if (oauthFlowCredentials) {
      this.update({ credentials: oauthFlowCredentials });
      this._shouldResetAvatarOnInit = true;
      Cookies.remove(OAUTH_FLOW_CREDENTIALS_KEY);
    }

    this._signOutOnExpiredAuthToken();
  }

  _signOutOnExpiredAuthToken = () => {
    if (!this.state.credentials.token) return;

    const expiry = jwtDecode(this.state.credentials.token).exp * 1000;
    if (expiry <= Date.now()) {
      this.clearCredentials();
    }
  };

  clearCredentials() {
    this.update({ credentials: { token: null, matrixAccessToken: null, deviceId: null, email: null } });
  }

  initDefaults = async () => {
    if (this._shouldResetAvatarOnInit) {
      await this.resetToRandomDefaultAvatar();
    } else {
      this.update({
        profile: { avatarId: await fetchRandomDefaultAvatarId(), ...(this.state.profile || {}) }
      });
    }

    // Regenerate name to encourage users to change it.
    if (!this.state.activity.hasChangedName) {
      this.update({ profile: { displayName: generateRandomName() } });
    }

    if (!this.state.equips.launcher) {
      this.update({
        equips: {
          launcher: "😀",
          launcherSlot1: "😀",
          launcherSlot2: "😂",
          launcherSlot3: "🤔",
          launcherSlot4: "😍",
          launcherSlot5: "😘",
          launcherSlot6: "🥺",
          launcherSlot7: "😭",
          launcherSlot8: "👍",
          launcherSlot9: "👏",
          launcherSlot10: "❤"
        }
      });
    }

    if (!this.state.equips.color) {
      this.update({
        equips: {
          color: DEFAULT_COLORS[0],
          colorPage: 0,
          colorSlot1: DEFAULT_COLORS[0],
          colorSlot2: DEFAULT_COLORS[1],
          colorSlot3: DEFAULT_COLORS[2],
          colorSlot4: DEFAULT_COLORS[3],
          colorSlot5: DEFAULT_COLORS[4],
          colorSlot6: DEFAULT_COLORS[5],
          colorSlot7: DEFAULT_COLORS[6],
          colorSlot8: DEFAULT_COLORS[7],
          colorSlot9: DEFAULT_COLORS[8],
          colorSlot10: DEFAULT_COLORS[9],
          colorSlot11: DEFAULT_COLORS[10],
          colorSlot12: DEFAULT_COLORS[11],
          colorSlot13: DEFAULT_COLORS[12],
          colorSlot14: DEFAULT_COLORS[13],
          colorSlot15: DEFAULT_COLORS[14],
          colorSlot16: DEFAULT_COLORS[15],
          colorSlot17: DEFAULT_COLORS[16],
          colorSlot18: DEFAULT_COLORS[17],
          colorSlot19: DEFAULT_COLORS[18],
          colorSlot20: DEFAULT_COLORS[19],
          colorSlot21: DEFAULT_COLORS[20],
          colorSlot22: DEFAULT_COLORS[21],
          colorSlot23: DEFAULT_COLORS[22],
          colorSlot24: DEFAULT_COLORS[23],
          colorSlot25: DEFAULT_COLORS[24],
          colorSlot26: DEFAULT_COLORS[25],
          colorSlot27: DEFAULT_COLORS[26],
          colorSlot28: DEFAULT_COLORS[27],
          colorSlot29: DEFAULT_COLORS[28],
          colorSlot30: DEFAULT_COLORS[29],
          colorSlot31: DEFAULT_COLORS[30],
          colorSlot32: DEFAULT_COLORS[31],
          colorSlot33: DEFAULT_COLORS[32],
          colorSlot34: DEFAULT_COLORS[33],
          colorSlot35: DEFAULT_COLORS[34],
          colorSlot36: DEFAULT_COLORS[35],
          colorSlot37: DEFAULT_COLORS[36],
          colorSlot38: DEFAULT_COLORS[37],
          colorSlot39: DEFAULT_COLORS[38],
          colorSlot40: DEFAULT_COLORS[39],
          colorSlot41: DEFAULT_COLORS[40],
          colorSlot42: DEFAULT_COLORS[41],
          colorSlot43: DEFAULT_COLORS[42],
          colorSlot44: DEFAULT_COLORS[43],
          colorSlot45: DEFAULT_COLORS[44],
          colorSlot46: DEFAULT_COLORS[45],
          colorSlot47: DEFAULT_COLORS[46],
          colorSlot48: DEFAULT_COLORS[47],
          colorSlot49: DEFAULT_COLORS[48],
          colorSlot50: DEFAULT_COLORS[49],
          colorSlot51: DEFAULT_COLORS[50],
          colorSlot52: DEFAULT_COLORS[51],
          colorSlot53: DEFAULT_COLORS[52],
          colorSlot54: DEFAULT_COLORS[53],
          colorSlot55: DEFAULT_COLORS[54],
          colorSlot56: DEFAULT_COLORS[55],
          colorSlot57: DEFAULT_COLORS[56],
          colorSlot58: DEFAULT_COLORS[57],
          colorSlot59: DEFAULT_COLORS[58],
          colorSlot60: DEFAULT_COLORS[59],
          colorSlot61: DEFAULT_COLORS[60],
          colorSlot62: DEFAULT_COLORS[61],
          colorSlot63: DEFAULT_COLORS[62],
          colorSlot64: DEFAULT_COLORS[63],
          colorSlot65: DEFAULT_COLORS[64],
          colorSlot66: DEFAULT_COLORS[65],
          colorSlot67: DEFAULT_COLORS[66],
          colorSlot68: DEFAULT_COLORS[67],
          colorSlot69: DEFAULT_COLORS[68],
          colorSlot70: DEFAULT_COLORS[69],
          colorSlot71: DEFAULT_COLORS[70],
          colorSlot72: DEFAULT_COLORS[71],
          colorSlot73: DEFAULT_COLORS[72],
          colorSlot74: DEFAULT_COLORS[73],
          colorSlot75: DEFAULT_COLORS[74],
          colorSlot76: DEFAULT_COLORS[75],
          colorSlot77: DEFAULT_COLORS[76],
          colorSlot78: DEFAULT_COLORS[77],
          colorSlot79: DEFAULT_COLORS[78],
          colorSlot80: DEFAULT_COLORS[79],
          colorSlot81: DEFAULT_COLORS[80],
          colorSlot82: DEFAULT_COLORS[81],
          colorSlot83: DEFAULT_COLORS[82],
          colorSlot84: DEFAULT_COLORS[83],
          colorSlot85: DEFAULT_COLORS[84],
          colorSlot86: DEFAULT_COLORS[85],
          colorSlot87: DEFAULT_COLORS[86],
          colorSlot88: DEFAULT_COLORS[87],
          colorSlot89: DEFAULT_COLORS[88],
          colorSlot90: DEFAULT_COLORS[89],
          colorSlot91: DEFAULT_COLORS[90],
          colorSlot92: DEFAULT_COLORS[91],
          colorSlot93: DEFAULT_COLORS[92],
          colorSlot94: DEFAULT_COLORS[93],
          colorSlot95: DEFAULT_COLORS[94],
          colorSlot96: DEFAULT_COLORS[95],
          colorSlot97: DEFAULT_COLORS[96],
          colorSlot98: DEFAULT_COLORS[97],
          colorSlot99: DEFAULT_COLORS[98],
          colorSlot100: DEFAULT_COLORS[99]
        }
      });
    }

    if (!this.state.credentials.deviceId) {
      this.update({ credentials: { deviceId: randomString(32) } });
    }
  };

  resetToRandomDefaultAvatar = async () => {
    this.update({
      profile: { ...(this.state.profile || {}), avatarId: await fetchRandomDefaultAvatarId() }
    });
  };

  get state() {
    if (!this.hasOwnProperty(STORE_STATE_CACHE_KEY)) {
      this[STORE_STATE_CACHE_KEY] = JSON.parse(localStorage.getItem(LOCAL_STORE_KEY));
    }

    return this[STORE_STATE_CACHE_KEY];
  }

  get credentialsAccountId() {
    if (this.state.credentials.token) {
      return jwtDecode(this.state.credentials.token).sub;
    } else {
      return null;
    }
  }

  bumpEntryCount() {
    const currentEntryCount = this.state.activity.entryCount || 0;
    this.update({ activity: { entryCount: currentEntryCount + 1 } });
  }

  // Sets a one-time action to perform the next time the page loads
  enqueueOnLoadAction(action, args) {
    this.update({ onLoadActions: [{ action, args }] });
  }

  executeOnLoadActions(sceneEl) {
    for (let i = 0; i < this.state.onLoadActions.length; i++) {
      const { action, args } = this.state.onLoadActions[i];

      if (action === "emit_scene_event") {
        sceneEl.emit(args.event, args.detail);
      }
    }

    this.clearOnLoadActions();
  }

  setLastJoinedHubId(spaceId, hubId) {
    const lastJoinedHubIds = this.state.context.lastJoinedHubIds || {};
    lastJoinedHubIds[spaceId] = hubId;
    this.update({ context: { lastJoinedHubIds } });
  }

  clearLastJoinedHubId(spaceId) {
    const lastJoinedHubIds = this.state.context.lastJoinedHubIds || {};

    if (lastJoinedHubIds[spaceId]) {
      delete lastJoinedHubIds[spaceId];
      this.update({ context: { lastJoinedHubIds } });
    }
  }

  clearOnLoadActions() {
    this.clearStoredArray("onLoadActions");
  }

  clearStoredArray(key) {
    const overwriteMerge = (destinationArray, sourceArray) => sourceArray;
    const update = {};
    update[key] = [];

    this.update(update, { arrayMerge: overwriteMerge });
  }

  update(newState, mergeOpts) {
    const finalState = merge(this.state, newState, mergeOpts);
    const { valid } = validator.validate(finalState, SCHEMA);

    if (!valid) {
      // Intentionally not including details about the state or validation result here, since we don't want to leak
      // sensitive data in the error message.
      throw new Error(`Write to store failed schema validation.`);
    }

    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(finalState));
    delete this[STORE_STATE_CACHE_KEY];

    if (newState.profile !== undefined) {
      this.dispatchEvent(new CustomEvent("profilechanged"));
    }
    if (newState.context !== undefined) {
      this.dispatchEvent(new CustomEvent("contextchanged"));
    }

    this.dispatchEvent(new CustomEvent("statechanged"));

    for (const key of Object.keys(newState)) {
      this.dispatchEvent(new CustomEvent(`statechanged-${key}`));
    }

    return finalState;
  }

  handleActivityFlag(flag) {
    const val = this.state.activity[flag];

    if (val === undefined) {
      this.update({ activity: { [flag]: true } });
      mixpanel.track(`First ${capitalize(flag)}`, {});
      this.dispatchEvent(new CustomEvent("activityflagged"));
    }
  }
}
