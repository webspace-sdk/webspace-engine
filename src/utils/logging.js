// A-Frame blows away any npm debug log filters so this allow the user to set the log filter
// via the query string.
import debug from "debug";

const qs = new URLSearchParams(location.search);
const logFilter = qs.get("log_filter");

if (logFilter) {
  debug.enable(logFilter);
}
