import { z } from 'zod';

/**
 * Example domain contract (section 7 of the project spec): Zod is the source
 * of truth, TypeScript types are inferred — never hand-duplicated.
 */
export const UserRoleSchema = z.enum(['admin', 'member']);

export const CreateUserSchema = z.object({
  email: z.email(),
  fullName: z.string().min(1).max(200),
  role: UserRoleSchema.default('member'),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = CreateUserSchema.partial();
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string(),
  role: UserRoleSchema,
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof UserSchema>;
