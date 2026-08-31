import { UpdateFormVersionSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateFormVersionDto extends createZodDto(UpdateFormVersionSchema) {}
