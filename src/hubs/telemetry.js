import Raven from "raven-js";
import configs from "./utils/configs";

export default function registerTelemetry() {
  const sentryDsn = configs.SENTRY_DSN;
  const gaTrackingId = configs.GA_TRACKING_ID;

  if (sentryDsn) {
    console.log("Tracking: Sentry DSN: " + sentryDsn);
    Raven.config(sentryDsn).install();
  }

  if (gaTrackingId) {
    window.dataLayer = window.dataLayer || [];
    const gtag = () => {
      window.dataLayer.push(arguments);
    };

    gtag("js", new Date());
    gtag("config", gaTrackingId);

    const el = document.createElement("script");
    el.type = "text/javascript";
    el.setAttribute("async", "true");
    el.setAttribute("src", `https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`);
    document.documentElement.firstChild.appendChild(el);
  }
}
