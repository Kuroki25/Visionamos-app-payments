import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateUser, User } from '@repo/contracts';
import { Repository } from 'typeorm';

import { UserEntity } from './entities/user.entity';

function toUser(entity: UserEntity): User {
  return {
    id: entity.id,
    email: entity.email,
    fullName: entity.fullName,
    role: entity.role,
    createdAt: entity.createdAt.toISOString(),
  };
}

/**
 * Reference implementation of the vertical slice described in
 * docs/adr/003-backend-architecture.md, backed by TypeORM
 * (docs/adr/010-persistence.md). No real authorization can be demonstrated
 * here until docs/adr/006-authentication-strategy.md exists — see the TODO
 * on `findOne`.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(input: CreateUser): Promise<User> {
    const entity = this.usersRepository.create({
      email: input.email,
      fullName: input.fullName,
      role: input.role,
    });
    const saved = await this.usersRepository.save(entity);
    return toUser(saved);
  }

  async findOne(id: string): Promise<User> {
    // TODO(auth): once authentication exists, this must also verify the
    // requesting principal is allowed to read *this* object (API1 — Broken
    // Object Level Authorization), not just that a user record with this id
    // exists. Tracked in docs/SECURITY-CONTROLS.md as a pending control.
    const entity = await this.usersRepository.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return toUser(entity);
  }
}
