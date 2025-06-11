/**
 * Polyfill for crypto.getRandomValues() used by UUID package
 * This is needed for environments where the Web Crypto API is not available
 */

export function polyfillCrypto() {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    // Simple polyfill for crypto.getRandomValues using Math.random
    // Not cryptographically secure, but sufficient for generating UUIDs in this app
    global.crypto = {
      getRandomValues: function (arr) {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    };
    console.log("Applied crypto.getRandomValues() polyfill");
  }
}

export default polyfillCrypto;
