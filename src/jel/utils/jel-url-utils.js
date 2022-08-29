import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";
import { b58Hash } from "../../hubs/utils/crypto";

let currentHref = null;
let currentHubId = null;
let currentSpaceId = null;

const update = async () => {
  if (currentHref === document.location.href) return;
  currentHref = document.location.href;
  currentHubId = (await b58Hash(document.location.href)).substring(0, 16);

  // Space id is the path the world is in.
  const pathParts = document.location.pathname.split("/");
  let toHash = document.location.href;

  if (pathParts.length > 1) {
    toHash = toHash.replace(new RegExp(`/${pathParts[pathParts.length - 1]}$`), "");
  }

  currentSpaceId = (await b58Hash(toHash)).substring(0, 16);
};

export async function getHubIdFromHistory() {
  await update();
  return currentHubId;
}

export async function getSpaceIdFromHistory() {
  await update();
  return currentSpaceId;
}

export function navigateToHubUrl(history, url, replace = false) {
  const search = history.location.search;
  const path = new URL(url, document.location.origin).pathname;
  (replace ? replaceHistoryPath : pushHistoryPath)(history, path, search);
}
