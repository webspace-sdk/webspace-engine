import { hashString } from "./crypto";
import bs58 from "bs58";
import random from "random";
import seedrandom from "seedrandom";

random.use(seedrandom("base"));

let currentHref = null;
let currentHubId = null;
let currentHubSeed = null;
let currentSpaceId = null;

export async function getHubIdFromUrl(url) {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch (e) {
    parsedUrl = new URL(url, document.location.href); // Relative path
  }

  const hubHash = await hashString(parsedUrl.toString());
  return bs58.encode(hubHash).substring(0, 16);
}

export async function getSpaceIdFromUrl(url) {
  const { origin, pathname } = new URL(url);

  // Space id is the path the world is in.
  const pathParts = pathname.split("/");
  let toHash = origin + pathname;

  if (pathParts.length > 1) {
    toHash = toHash.replace(new RegExp(`/${pathParts[pathParts.length - 1]}$`), "");
  }

  return bs58.encode(await hashString(toHash)).substring(0, 16);
}

const update = async () => {
  const { origin, pathname } = document.location;
  if (currentHref === origin + pathname && currentHubId && currentSpaceId) return;

  currentHref = origin + pathname;

  currentHubId = await getHubIdFromUrl(currentHref);
  const hubHash = await hashString(currentHref);
  currentHubSeed = Math.floor(hubHash[0] / 2); // 0-127
  currentSpaceId = await getSpaceIdFromUrl(document.location.toString());
};

export async function getHubIdFromHistory() {
  await update();
  return currentHubId;
}

export async function getSpaceIdFromHistory() {
  await update();
  return currentSpaceId;
}

export async function navigateToHubUrl(url) {
  if (window.APP.atomAccessManager.hasUnsavedChanges) {
    // Just do a direct nav to cause the prompt
    document.location = url;
  } else {
    DOM_ROOT.querySelector(".loading-complete").classList.add("loading");
    setTimeout(() => (document.location = url), 400);
  }
}

export async function getSeedForHubIdFromHistory() {
  await update();
  return currentHubSeed;
}

// Get the local relative path to the url from the specified URL
// Returns null if the toURL is not from the local origin
export function getLocalRelativePathFromUrl(toUrlString) {
  let toUrl;
  try {
    toUrl = new URL(toUrlString);
  } catch (e) {
    toUrl = new URL(toUrlString, document.location.href); // Relative path
  }

  const fromUrl = document.location;

  if (toUrl.origin !== fromUrl.origin) return null;

  const relativePath = toUrl.pathname;
  let currentPath = fromUrl.pathname;
  currentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
  return relativePath.replace(currentPath, "").replace(/^\//, "");
}

export function assetFileNameForName(name, extension) {
  return `${name.toLowerCase().replace(/\s/g, "_")}-${Math.floor(Math.random() * 999999) + 1}.${extension}`;
}

export function parseUrlAndCheckRelative(src) {
  let parsedUrl,
    isRelativeUrl = false;

  try {
    parsedUrl = new URL(src);
  } catch (e) {
    try {
      parsedUrl = new URL(src, document.location.href);
      isRelativeUrl = true;
    } catch (e) { // eslint-disable-line
    }
  }

  return [parsedUrl, isRelativeUrl];
}
