import firstTemplateSrc from "../templates/first.html";
import welcomeTemplateSrc from "../templates/welcome.html";
import whatsNewTemplateSrc from "../templates/whats-new.html";
import faqTemplateSrc from "../templates/faq.html";
import WorldImporter from "./world-importer";
import { toHexDigest } from "./crypto-utils";

export function getHtmlForTemplate(name) {
  let data = null;

  switch (name) {
    case "first":
      data = firstTemplateSrc;
      break;
    case "welcome":
      data = welcomeTemplateSrc;
      break;
    case "faq":
      data = faqTemplateSrc;
      break;
    case "whats-new":
      data = whatsNewTemplateSrc;
      break;
  }

  return data;
}

export async function applyTemplate(name, synced_at = null, hash = null, force = false) {
  const { hubChannel } = window.APP;

  if (!hubChannel.can("spawn_and_move_media")) return;
  const html = getHtmlForTemplate(name);
  if (!html) return;

  // Special case of allowing one time sync only for "first" template.
  // We don't want to re-add the template objects for their first world if we change the template.
  if (synced_at !== null && name === "first" && !force) return;

  const newHash = await toHexDigest(html);

  // Don't sync templates when others are here.
  const isByMyself =
    hubChannel.presence && hubChannel.presence.state && Object.keys(hubChannel.presence.state).length == 1;

  const shouldSync = isByMyself && name && hash !== newHash;
  if (!force && !shouldSync) return;

  await new WorldImporter().importHtmlToCurrentWorld(html, true, force);
  window.APP.hubChannel.templateSynced(newHash);
}

export async function resetTemplate(name) {
  applyTemplate(name, null, null, true);
}
