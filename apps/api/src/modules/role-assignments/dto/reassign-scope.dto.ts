import { ReassignScopeSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class ReassignScopeDto extends createZodDto(ReassignScopeSchema) {}
