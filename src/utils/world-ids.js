// Ids of world objects (the direct children of <body>). Any selector-safe id works, so authors and scripts can
// use readable ids like "lamp" or "door-2"; the engine only generates ids for elements that lack a usable one.
export const isValidWorldId = id => typeof id === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id);

// Tags that live in the document but are not objects in the world
export const NON_WORLD_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "LINK", "META", "NAV"]);
