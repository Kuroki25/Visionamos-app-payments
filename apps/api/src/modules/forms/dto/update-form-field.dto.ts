import { UpdateFormFieldSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateFormFieldDto extends createZodDto(UpdateFormFieldSchema) {}
