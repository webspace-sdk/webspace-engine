import Raven from "raven-js";
import configs from "./utils/configs";

function gtag() {
  window.dataLayer.push(arguments);
}

export default function registerTelemetry() {
  const sentryDsn = configs.SENTRY_DSN;
  const gaTrackingId = configs.GA_TRACKING_ID;

  if (sentryDsn) {
    console.log("Tracking: Sentry DSN: " + sentryDsn);
    Raven.config(sentryDsn).install();
  }

  if (gaTrackingId) {
    console.log("Tracking: GA Tracking ID: " + gaTrackingId);

    const el = document.createElement("script");
    el.type = "text/javascript";
    el.setAttribute("async", "true");
    el.setAttribute("src", `https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`);
    el.addEventListener("load", () => {
      window.dataLayer = window.dataLayer || [];

      gtag("js", new Date());
      gtag("config", gaTrackingId);
    });

    document.documentElement.firstChild.appendChild(el);
  }
}
