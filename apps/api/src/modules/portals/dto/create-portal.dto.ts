import { CreatePortalSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreatePortalDto extends createZodDto(CreatePortalSchema) {}
