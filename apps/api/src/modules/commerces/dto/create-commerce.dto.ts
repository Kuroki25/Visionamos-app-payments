import { CreateCommerceSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateCommerceDto extends createZodDto(CreateCommerceSchema) {}
