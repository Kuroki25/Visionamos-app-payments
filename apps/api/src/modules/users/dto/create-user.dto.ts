import { CreateUserSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

// The DTO's shape is never redeclared here — @repo/contracts' Zod schema is
// the single source of truth for both runtime validation and the generated
// OpenAPI schema (docs/adr/004-api-contract-strategy.md).
export class CreateUserDto extends createZodDto(CreateUserSchema) {}
