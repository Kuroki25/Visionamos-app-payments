import type { PORTAL_LOGO_ALLOWED_MIME_TYPES } from '@repo/contracts';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Local disk storage for Portal logos (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md
 * §17.2 — "storage local en disco", the user's own choice over S3/CDN for
 * now). Never under `src/` (would leak into `git status`/the TS build) —
 * `apps/api/uploads/`, gitignored. `process.cwd()` matches every script in
 * this package (`start`, `start:dev`, `start:prod`, tests) already running
 * from `apps/api`, same assumption `.env` loading makes.
 */
export const PORTAL_LOGOS_DIR = path.join(process.cwd(), 'uploads', 'portal-logos');

export async function ensurePortalLogosDir(): Promise<void> {
  await fs.mkdir(PORTAL_LOGOS_DIR, { recursive: true });
}

/**
 * Real content validation (OWASP: "no confiar en el header MIME del
 * cliente") — magic-byte signatures for exactly the 3 formats the
 * reference image allows (PNG, JPEG, WebP), independent of whatever
 * `Content-Type`/filename extension the request claimed.
 */
export function detectImageMimeType(buffer: Buffer): (typeof PORTAL_LOGO_ALLOWED_MIME_TYPES)[number] | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

const EXTENSION_BY_MIME: Record<(typeof PORTAL_LOGO_ALLOWED_MIME_TYPES)[number], string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

/** Server-generated filename — never the client-supplied one (path traversal, collisions). */
export function generateLogoFilename(mimeType: (typeof PORTAL_LOGO_ALLOWED_MIME_TYPES)[number]): string {
  return `${randomUUID()}${EXTENSION_BY_MIME[mimeType]}`;
}
