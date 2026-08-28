import { z } from 'zod';

/**
 * RFC 9457 (Problem Details for HTTP APIs) response shape. Every error the
 * API returns uses this schema — see docs/API_GUIDELINES.md and
 * docs/adr/005-validation-strategy.md. Never include stack traces, SQL,
 * internal paths, secrets or infrastructure names in `detail`.
 */
export const ProblemDetailsSchema = z.object({
  type: z.string().describe('URI identifying the problem type (e.g. "about:blank").'),
  title: z.string().describe('Short, human-readable summary of the problem type.'),
  status: z.number().int().min(100).max(599),
  detail: z.string().optional().describe('Human-readable explanation specific to this occurrence.'),
  instance: z.string().optional().describe('URI identifying this specific occurrence.'),
  errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional()
    .describe('Per-field validation errors, present on 400/422 responses.'),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
