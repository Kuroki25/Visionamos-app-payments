import { LoginSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class LoginDto extends createZodDto(LoginSchema) {}
