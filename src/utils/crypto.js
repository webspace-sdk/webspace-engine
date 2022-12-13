export async function keyToJwk(key) {
  return await crypto.subtle.exportKey("jwk", key);
}

export async function keyToString(key) {
  return JSON.stringify(keyToJwk(key));
}

export async function jwkToKey(jwk, usages) {
  return await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, usages);
}

export async function stringToKey(s, usages) {
  return await jwkToKey(JSON.parse(s), usages);
}

export async function signString(s, jwk) {
  const cryptoKey = await jwkToKey(jwk, ["sign"]);
  const data = new TextEncoder().encode(s);
  return await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-512" }, cryptoKey, data);
}

export async function verifyString(s, jwk, signature) {
  const cryptoKey = await jwkToKey(jwk, ["verify"]);
  return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-512" }, cryptoKey, signature, s);
}

// This allows a single object to be passed encrypted from a receiver in a req -> response flow

// Requestor generates a public key and private key, and should send the public key to receiver.
export async function generateKeys() {
  const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["verify", "sign"]);
  return { publicKeyJwk: await keyToJwk(keyPair.publicKey), privateKeyJwk: await keyToJwk(keyPair.privateKey) };
}

export async function hashString(s) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
