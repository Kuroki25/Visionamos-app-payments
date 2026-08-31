import { UpdateCommerceStatusSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateCommerceStatusDto extends createZodDto(UpdateCommerceStatusSchema) {}
