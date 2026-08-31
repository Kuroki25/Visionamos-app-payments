import { z } from 'zod';

// No RegisterSchema here — there is no public self-registration in Red
// Coopagos (docs/adr/006/011). User creation is CreateUserSchema
// (users.ts), an authenticated, role-gated operation.
export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});
export type Login = z.infer<typeof LoginSchema>;
