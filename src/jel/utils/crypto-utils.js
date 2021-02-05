export async function toHexDigest(str) {
  const hashData = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  const hashArray = Array.from(new Uint8Array(hashData));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
