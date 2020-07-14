export function hasIntersection(a, b) {
  for (const e of a) {
    if (b.has(e)) return true;
  }

  return false;
}
