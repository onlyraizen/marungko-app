import * as ExpoCrypto from "expo-crypto";

/**
 * React Native has no WebCrypto, and supabase-js needs it for PKCE: without it the sign-in "code challenge" is the
 * secret itself ("plain", visible in the sign-in link) and the secret is made with Math.random. This adds the two
 * pieces it looks for, backed by the phone's own crypto (expo-crypto): crypto.getRandomValues and
 * crypto.subtle.digest. Anything the platform already has (the web) is left alone.
 * Check: Metro must NOT print "WebCrypto API is not supported", and the [google] log shows method s256.
 */
type Digest = (algorithm: string | { name: string }, data: BufferSource) => Promise<ArrayBuffer>;
const scope = globalThis as unknown as { crypto?: { getRandomValues?: unknown; subtle?: { digest: Digest } } };

if (scope.crypto === undefined) scope.crypto = {};
const target = scope.crypto;

if (typeof target.getRandomValues !== "function") {
  target.getRandomValues = ExpoCrypto.getRandomValues;
}
if (target.subtle === undefined) {
  target.subtle = {
    digest: (algorithm, data) => {
      const name = (typeof algorithm === "string" ? algorithm : algorithm.name).toUpperCase();
      return ExpoCrypto.digest(name as ExpoCrypto.CryptoDigestAlgorithm, data);
    },
  };
}
