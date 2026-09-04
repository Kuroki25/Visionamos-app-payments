import { PublicPortalsQuerySchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class PublicPortalsQueryDto extends createZodDto(PublicPortalsQuerySchema) {}
