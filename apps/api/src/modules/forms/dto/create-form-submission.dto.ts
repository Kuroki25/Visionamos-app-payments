import { CreateFormSubmissionSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateFormSubmissionDto extends createZodDto(CreateFormSubmissionSchema) {}
