import { PublicCommercesQuerySchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class PublicCommercesQueryDto extends createZodDto(PublicCommercesQuerySchema) {}
