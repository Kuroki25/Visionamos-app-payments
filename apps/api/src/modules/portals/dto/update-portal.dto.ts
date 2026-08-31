import { UpdatePortalSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdatePortalDto extends createZodDto(UpdatePortalSchema) {}
