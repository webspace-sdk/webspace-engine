export function mapFromArray(arr) {
  const m = new Map();

  for (const [k, v] of arr) {
    m.set(k, v);
  }

  return m;
}
