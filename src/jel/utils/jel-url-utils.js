import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";

export function getHubIdFromHistory() {
  return "fU8ox2d";
}

export function getSpaceIdFromHistory() {
  return "tKod5";
}

export function navigateToHubUrl(history, url, replace = false) {
  const search = history.location.search;
  const path = new URL(url, document.location.origin).pathname;
  (replace ? replaceHistoryPath : pushHistoryPath)(history, path, search);
}
