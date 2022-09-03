import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";
import { hashString } from "../../hubs/utils/crypto";
import bs58 from "bs58";
import random from "random";
import seedrandom from "seedrandom";
random.use(seedrandom("base"));

let currentHref = null;
let currentHubId = null;
let currentHubSeed = null;
let currentSpaceId = null;

const update = async () => {
  const { origin, pathname } = document.location;
  if (currentHref === origin + pathname && currentHubId && currentSpaceId) return;

  currentHref = origin + pathname;

  const hubHash = await hashString(currentHref);
  currentHubId = bs58.encode(hubHash).substring(0, 16);
  currentHubSeed = hubHash[0];

  // Space id is the path the world is in.
  const pathParts = pathname.split("/");
  let toHash = origin + pathname;

  if (pathParts.length > 1) {
    toHash = toHash.replace(new RegExp(`/${pathParts[pathParts.length - 1]}$`), "");
  }

  currentSpaceId = bs58.encode(await hashString(toHash)).substring(0, 16);
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

export async function getSeedForHubIdFromHistory() {
  await update();
  return currentHubSeed;
}
