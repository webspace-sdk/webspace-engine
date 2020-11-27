import Raven from "raven-js";
import configs from "./utils/configs";

const ga = window.ga;

export default function registerTelemetry(trackedPage, trackedTitle) {
  const sentryDsn = "https://fcfe2540fcca4a5f8a55a17090f8a447@o481800.ingest.sentry.io/5535590";
  const gaTrackingId = configs.GA_TRACKING_ID;

  if (sentryDsn) {
    console.log("Tracking: Sentry DSN: " + sentryDsn);
    Raven.config(sentryDsn).install();
  }

  if (ga && gaTrackingId) {
    console.log("Tracking: Google Analytics ID: " + gaTrackingId);

    ga("create", gaTrackingId, "auto");

    if (trackedPage) {
      ga("set", "page", trackedPage);
    }

    if (trackedTitle) {
      ga("set", "title", trackedTitle);
    }

    ga("send", "pageview");
  }
}
