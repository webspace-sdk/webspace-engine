import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";
import { b58Hash } from "../../hubs/utils/crypto";

export async function getHubIdFromHistory() {
  return (await b58Hash(document.location.href)).substring(0, 16);
}

export async function getSpaceIdFromHistory() {
  // Space id is the path the world is in.
  const pathParts = document.location.pathname.split("/");
  let toHash = document.location.href;

  if (pathParts.length > 1) {
    toHash = toHash.replace(new RegExp(`/${pathParts[pathParts.length - 1]}$`), "");
  }

  return (await b58Hash(toHash)).substring(0, 16);
}

export function navigateToHubUrl(history, url, replace = false) {
  const search = history.location.search;
  const path = new URL(url, document.location.origin).pathname;
  (replace ? replaceHistoryPath : pushHistoryPath)(history, path, search);
}
