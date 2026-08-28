import { z } from 'zod';

export const HealthStatusSchema = z.enum(['ok', 'error']);

export const HealthCheckResponseSchema = z.object({
  status: HealthStatusSchema,
  info: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  error: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  details: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
