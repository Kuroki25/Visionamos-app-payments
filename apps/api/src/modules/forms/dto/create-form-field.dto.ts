import { CreateFormFieldSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateFormFieldDto extends createZodDto(CreateFormFieldSchema) {}
