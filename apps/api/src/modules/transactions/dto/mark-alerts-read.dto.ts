import { MarkAlertsReadSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class MarkAlertsReadDto extends createZodDto(MarkAlertsReadSchema) {}
