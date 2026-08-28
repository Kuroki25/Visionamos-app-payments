import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Repository } from 'typeorm';

import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

// Unit test: the repository is mocked so this exercises UsersService in
// isolation. The real Postgres/SQLite-backed path is covered by the
// integration test in test/app.e2e-spec.ts (docs/adr/007-testing-strategy.md).
type MockRepository = Partial<Record<keyof Repository<UserEntity>, jest.Mock>>;

function createMockRepository(): MockRepository {
  return {
    create: jest.fn((input: Partial<UserEntity>) => input as UserEntity),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(getRepositoryToken(UserEntity));
  });

  it('creates a user via the repository and maps it to the contract shape', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    (repository.save as jest.Mock).mockResolvedValue({
      id: 'a70b6c9e-1b1a-4b1a-9c1a-000000000001',
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'member',
      createdAt: now,
    } satisfies UserEntity);

    const user = await service.create({
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'member',
    });

    expect(repository.create).toHaveBeenCalledWith({
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'member',
    });
    expect(user).toEqual({
      id: 'a70b6c9e-1b1a-4b1a-9c1a-000000000001',
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'member',
      createdAt: now.toISOString(),
    });
  });

  it('returns the mapped user when findOneBy finds a match', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    (repository.findOneBy as jest.Mock).mockResolvedValue({
      id: 'a70b6c9e-1b1a-4b1a-9c1a-000000000001',
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'member',
      createdAt: now,
    } satisfies UserEntity);

    const user = await service.findOne('a70b6c9e-1b1a-4b1a-9c1a-000000000001');

    expect(user.email).toBe('ana@example.com');
  });

  it('throws NotFoundException when findOneBy finds nothing', async () => {
    (repository.findOneBy as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      NotFoundException,
    );
  });
});
