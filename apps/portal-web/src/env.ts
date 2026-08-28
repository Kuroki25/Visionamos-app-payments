import { z } from 'zod';

// Only NEXT_PUBLIC_-prefixed variables may end up in the browser bundle
// (section 9) — this file is the single place that reads process.env in this
// app, so nothing un-prefixed can leak in by accident.
const EnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default('http://localhost:4000/api/v1'),
});

export const env = EnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
