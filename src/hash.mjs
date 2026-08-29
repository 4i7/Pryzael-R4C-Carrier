import { createHash } from 'node:crypto';

export function sha256Hex(bytes) {
  return createHash('sha256').update(toBuffer(bytes)).digest('hex');
}

export function sha1Hex(bytes) {
  return createHash('sha1').update(toBuffer(bytes)).digest('hex');
}

export function toBuffer(value) {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  throw new TypeError('expected exact UTF-8 string, Buffer, or Uint8Array');
}

export function stableJson(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object' && !Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
