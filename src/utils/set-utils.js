export function hasIntersection(a, b) {
  for (const e of a) {
    if (b.has(e)) return true;
  }

  return false;
}

// Is a full subset of a b
export function isSubset(a, b) {
  for (const e of a) {
    if (!b.has(e)) return false;
  }

  return true;
}

export function isSetEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
