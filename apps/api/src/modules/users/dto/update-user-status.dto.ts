import { UpdateUserStatusSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateUserStatusDto extends createZodDto(UpdateUserStatusSchema) {}
