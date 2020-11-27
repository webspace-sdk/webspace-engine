import Raven from "raven-js";
import configs from "./utils/configs";
import mixpanel from "mixpanel-browser";

const ga = window.ga;

export default function registerTelemetry(trackedPage, trackedTitle) {
  const sentryDsn = configs.SENTRY_DSN;
  const mixpanelToken = configs.MIXPANEL_TOKEN;
  const gaTrackingId = configs.GA_TRACKING_ID;

  if (sentryDsn) {
    console.log("Tracking: Sentry DSN: " + sentryDsn);
    Raven.config(sentryDsn).install();
  }

  if (mixpanelToken) {
    mixpanel.init(mixpanelToken, { batch_requests: true });
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
