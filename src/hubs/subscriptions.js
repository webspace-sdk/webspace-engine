import nextTick from "./utils/next-tick.js";
import { EventTarget } from "event-target-shim";
const INIT_TIMEOUT_MS = 5000;

// Manages web push subscriptions
//
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default class Subscriptions extends EventTarget {
  constructor() {
    super();

    this.ready = false;
    this.subscribed = false;
  }

  setRegistration = registration => {
    this.registration = registration;
    this.checkIfReady();
  };

  setRegistrationFailed = () => {
    this.registration = null;
    this.checkIfReady();
  };

  setVapidPublicKey = vapidPublicKey => {
    this.vapidPublicKey = vapidPublicKey;
    this.checkIfReady();
  };

  handleExistingSubscriptions = existingSubscriptions => {
    this.existingSubscriptions = existingSubscriptions;
    this.checkIfReady();
  };

  checkIfReady = async () => {
    if (this.registration === undefined) return;
    if (this.vapidPublicKey === undefined) return;
    if (this.existingSubscriptions === undefined) return;

    const currentEndpoint = await this.getCurrentEndpoint();

    this.ready = true;
    this.subscribed = !!(
      currentEndpoint && this.existingSubscriptions.find(({ endpoint }) => currentEndpoint === endpoint)
    );

    this.dispatchEvent(new CustomEvent("subscriptions_updated"));
  };

  getCurrentEndpoint = async () => {
    if (!navigator.serviceWorker) return null;
    const startedAt = performance.now();

    // registration becomes null if failed, non null if registered
    while (this.registration === undefined && performance.now() - startedAt < INIT_TIMEOUT_MS) await nextTick();
    if (performance.now() - startedAt >= INIT_TIMEOUT_MS) console.warn("Service worker registration timed out.");
    if (!this.registration || !this.registration.pushManager) return null;

    while (this.vapidPublicKey === undefined) await nextTick();
    if (this.vapidPublicKey === null) return null;

    try {
      const convertedVapidKey = urlBase64ToUint8Array(this.vapidPublicKey);

      if (
        (await this.registration.pushManager.permissionState({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        })) !== "granted"
      )
        return null;
    } catch (e) {
      return null; // Chrome can throw here complaining about userVisible if push is not right
    }
    const sub = await this.registration.pushManager.getSubscription();
    if (!sub) return null;

    return sub.endpoint;
  };

  subscribe = async () => {
    if (!this.ready) return;
    if (!this.registration) return;
    if (this.subscribed) return;

    let pushSubscription = await this.registration.pushManager.getSubscription();

    if (!pushSubscription) {
      const convertedVapidKey = urlBase64ToUint8Array(this.vapidPublicKey);

      pushSubscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    window.APP.accountChannel.subscribe(pushSubscription);
    this.subscribed = true;
    this.dispatchEvent(new CustomEvent("subscriptions_updated"));
  };
}
