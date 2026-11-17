import crypto from "crypto-browserify";

export const createHash = crypto.createHash;
export const createCipheriv = crypto.createCipheriv;
export const createDecipheriv = crypto.createDecipheriv;
export const pbkdf2Sync = crypto.pbkdf2Sync;

export function timingSafeEqual(left, right) {
  if (left.length !== right.length) throw new RangeError("Buffer lengths differ");
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}
