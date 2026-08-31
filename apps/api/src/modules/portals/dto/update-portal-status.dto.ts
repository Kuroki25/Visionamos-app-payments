import { UpdatePortalStatusSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdatePortalStatusDto extends createZodDto(UpdatePortalStatusSchema) {}
