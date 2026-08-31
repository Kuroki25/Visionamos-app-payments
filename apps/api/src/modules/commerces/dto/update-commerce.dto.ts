import { UpdateCommerceSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateCommerceDto extends createZodDto(UpdateCommerceSchema) {}
