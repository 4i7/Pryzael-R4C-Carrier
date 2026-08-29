import { TextDecoder } from 'node:util';
import { sha256Hex, toBuffer } from './hash.mjs';

const UTF8 = new TextDecoder('utf-8', { fatal: true });

export function captureResponse(exactBytes, metadata = {}) {
  if (exactBytes === null || exactBytes === undefined) throw new Error('exact response bytes unavailable');
  const responseBytes = toBuffer(exactBytes);
  try {
    UTF8.decode(responseBytes);
  } catch {
    return markResponseInconclusive('INVALID_UTF8_RESPONSE', metadata);
  }
  return Object.freeze({
    status: 'CAPTURED',
    captureMethod: metadata.captureMethod ?? 'unspecified',
    timestamp: metadata.timestamp ?? null,
    byteCount: responseBytes.length,
    sha256: sha256Hex(responseBytes),
    responseBytes
  });
}

export function markResponseInconclusive(reason, metadata = {}) {
  if (typeof reason !== 'string' || !reason) throw new Error('INCONCLUSIVE reason required');
  return Object.freeze({
    status: 'INCONCLUSIVE',
    reason,
    captureMethod: metadata.captureMethod ?? 'unspecified',
    timestamp: metadata.timestamp ?? null,
    byteCount: null,
    sha256: null,
    responseBytes: null
  });
}

export function verifyResponseCapture(exactBytes, capture) {
  if (!capture || capture.status === 'INCONCLUSIVE') throw new Error('response evidence is INCONCLUSIVE');
  if (capture.status !== 'CAPTURED') throw new Error('response capture status invalid');
  const bytes = toBuffer(exactBytes);
  try { UTF8.decode(bytes); } catch { throw new Error('response bytes are not valid UTF-8'); }
  if (bytes.length !== capture.byteCount) throw new Error(`response byte count mismatch: expected ${capture.byteCount}, got ${bytes.length}`);
  const digest = sha256Hex(bytes);
  if (digest !== capture.sha256) throw new Error(`response digest mismatch: expected ${capture.sha256}, got ${digest}`);
  return true;
}
