import type { UserRoleSchema } from '@repo/contracts';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type { z } from 'zod';

type UserRole = z.infer<typeof UserRoleSchema>;

@Entity({ name: 'users' })
@Unique(['email'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 200 })
  fullName!: string;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role!: UserRole;

  // No explicit `type` here on purpose: TypeORM maps CreateDateColumn to each
  // driver's native timestamp type automatically (`timestamp` on Postgres,
  // `datetime` on the SQLite driver used in tests — docs/adr/010-persistence.md).
  @CreateDateColumn()
  createdAt!: Date;
}
