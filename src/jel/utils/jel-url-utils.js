import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";
import { b58Hash } from "../../hubs/utils/crypto";

let currentHref = null;
let currentHubId = null;
let currentSpaceId = null;

const update = async () => {
  const { origin, pathname } = document.location;
  if (currentHref === origin + pathname && currentHubId && currentSpaceId) return;

  currentHref = origin + pathname;
  currentHubId = (await b58Hash(currentHref)).substring(0, 16);

  // Space id is the path the world is in.
  const pathParts = pathname.split("/");
  let toHash = origin + pathname;

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
