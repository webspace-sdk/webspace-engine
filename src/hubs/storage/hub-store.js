import { Validator } from "jsonschema";
import merge from "deepmerge";

const LOCAL_STORE_KEY_PREFIX = "___jel_hub_store_";
const STORE_STATE_CACHE_KEY = Symbol();
const validator = new Validator();
import { EventTarget } from "event-target-shim";

// Durable (via local-storage) schema-enforced state that is meant to be consumed via forward data flow.
// Bound to a specific hub.
export const SCHEMA = {
  id: "/JelHubStore",

  definitions: {
    lastPosition: {
      type: "object",
      additionalProperties: false,
      properties: {
        x: { type: "number" },
        y: { type: "number" },
        z: { type: "number" }
      }
    },

    lastRotation: {
      type: "object",
      additionalProperties: false,
      properties: {
        x: { type: "number" },
        y: { type: "number" },
        z: { type: "number" },
        w: { type: "number" }
      }
    }
  },

  type: "object",

  properties: {
    lastPosition: { $ref: "#/definitions/lastPosition" },
    lastRotation: { $ref: "#/definitions/lastRotation" }
  },

  additionalProperties: false
};

export default class HubStore extends EventTarget {
  constructor(hubId) {
    super();

    const cacheKey = (this.localStorageCacheKey = `${LOCAL_STORE_KEY_PREFIX}${hubId}`);

    if (localStorage.getItem(cacheKey) === null) {
      localStorage.setItem(cacheKey, JSON.stringify({}));
    }

    // When storage is updated in another window
    window.addEventListener("storage", e => {
      if (e.key !== cacheKey) return;
      delete this[cacheKey];
      this.dispatchEvent(new CustomEvent("statechanged"));
    });

    this.update({
      lastPosition: {},
      lastRotation: {}
    });
  }

  get state() {
    if (!this.hasOwnProperty(STORE_STATE_CACHE_KEY)) {
      this[STORE_STATE_CACHE_KEY] = JSON.parse(localStorage.getItem(this.localStorageCacheKey));
    }

    return this[STORE_STATE_CACHE_KEY];
  }

  update(newState, mergeOpts) {
    const finalState = merge(this.state, newState, mergeOpts);
    const { valid } = validator.validate(finalState, SCHEMA);

    if (!valid) {
      // Intentionally not including details about the state or validation result here, since we don't want to leak
      // sensitive data in the error message.
      throw new Error(`Write to store failed schema validation.`);
    }

    localStorage.setItem(this.localStorageCacheKey, JSON.stringify(finalState));
    delete this[STORE_STATE_CACHE_KEY];

    this.dispatchEvent(new CustomEvent("statechanged"));

    return finalState;
  }
}
