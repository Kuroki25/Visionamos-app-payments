import { CreateServiceSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateServiceDto extends createZodDto(CreateServiceSchema) {}
