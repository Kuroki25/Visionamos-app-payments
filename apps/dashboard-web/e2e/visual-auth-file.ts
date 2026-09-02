import path from 'node:path';

/** Shared by `auth.setup.ts` (writes it) and `visual.spec.ts` (reads it) — see both files' docblocks. Gitignored: it holds a live session cookie for the `e2e-superadmin` E2E-only account. */
export const VISUAL_AUTH_FILE = path.join(__dirname, '.auth', 'superadmin.json');
