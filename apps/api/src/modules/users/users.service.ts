import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { CreateUser, CreateUserResponse, ScopeType, UpdateUser, User } from '@repo/contracts';
import * as argon2 from 'argon2';
import { randomBytes, randomUUID } from 'node:crypto';
import type { DataSource, Repository } from 'typeorm';

import type { AuthenticatedRequestUser } from '../auth/types/authenticated-request-user.type';
import { AuditService } from '../audit/audit.service';
import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { createBetterAuthIdentity } from '../../infra/better-auth/create-better-auth-identity';
import { RoleAssignmentEntity } from '../role-assignments/entities/role-assignment.entity';
import { ScopeAuthorizationService } from '../role-assignments/scope-authorization.service';
import { UserEntity } from './entities/user.entity';

function toUser(user: UserEntity, assignment: RoleAssignmentEntity): User {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: assignment.role,
    scopeType: assignment.scopeType,
    scopePortalId: assignment.scopePortalId,
    scopeCommerceId: assignment.scopeCommerceId,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * A cryptographically random provisional password for a newly created
 * user (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.1 — "Se generarán
 * credenciales provisionales automáticamente"). `randomBytes` from
 * `node:crypto` (CSPRNG), never `Math.random()`. Base64url keeps every
 * character safe to display/copy as-is; 18 bytes → 24 chars, comfortably
 * inside `PasswordSchema`'s 12-128 bound.
 */
function generateTemporaryPassword(): string {
  return randomBytes(18).toString('base64url');
}

/** SUPERADMIN → GLOBAL, ADMIN_PORTAL → PORTAL, ADMIN_COMMERCE → COMMERCE. VIEWER derives from whichever scope id is present (docs/adr/011 §4). */
function deriveScopeType(input: CreateUser): ScopeType {
  if (input.role === 'SUPERADMIN') return 'GLOBAL';
  if (input.role === 'ADMIN_PORTAL') return 'PORTAL';
  if (input.role === 'ADMIN_COMMERCE') return 'COMMERCE';
  if (input.scopeCommerceId) return 'COMMERCE';
  if (input.scopePortalId) return 'PORTAL';
  return 'GLOBAL';
}

/**
 * Reference implementation of the vertical slice described in
 * docs/adr/003-backend-architecture.md, extended for Role+Scope (ADR 011).
 * Object-level authorization (who is *allowed* to read/manage a given
 * user) is enforced here rather than the controller for this module,
 * because most checks need `role_assignments`/`commerces` data the
 * controller has no reason to load itself.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleAssignmentEntity)
    private readonly roleAssignmentsRepository: Repository<RoleAssignmentEntity>,
    @InjectRepository(CommerceEntity)
    private readonly commercesRepository: Repository<CommerceEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly scopeAuthorization: ScopeAuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * `POST /users` (docs/adr/006/011 — replaces the removed public
   * `POST /auth/register`). Transactional: user + role assignment + audit
   * event all succeed together or not at all.
   *
   * The caller never chooses the new user's password — a provisional one
   * is generated here and returned exactly once in the response
   * (`temporaryPassword`). Never persisted in plaintext (only its Argon2id
   * hash goes to Better Auth's `account.password`), never logged, never
   * audited (`newValue` below omits it), never returned again by any GET.
   */
  async createWithRoleAssignment(actor: AuthenticatedRequestUser, input: CreateUser): Promise<CreateUserResponse> {
    const scopeType = deriveScopeType(input);
    await this.scopeAuthorization.assertCanAssignRole(actor, {
      role: input.role,
      scopePortalId: input.scopePortalId ?? null,
      scopeCommerceId: input.scopeCommerceId ?? null,
    });

    const existing = await this.usersRepository.findOneBy({ email: input.email });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword);
    // Generated here, not left to the database, because Better Auth's
    // `user` row (created first, below) must exist before `users.id` can
    // reference it — `users.id` is a plain FK column since the cutover
    // (`UserEntity`, `FOREIGN KEY (id) REFERENCES "user"(id)`), no longer
    // self-generated.
    const userId = randomUUID();

    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const assignmentRepo = manager.getRepository(RoleAssignmentEntity);

      // Must exist before the `users` row below (FK) — also the only place
      // this user's credential lives now (Better Auth's `account.password`,
      // docs/adr/013 "Contraseñas"). Without this the user could never sign
      // in — the gap was designed for but never wired in until the cutover
      // surfaced it via failing e2e tests, see
      // docs/backend/authentication/BETTER_AUTH_CUTOVER_SOURCE_OF_TRUTH.md.
      await createBetterAuthIdentity(manager, {
        userId,
        email: input.email,
        fullName: input.fullName,
        passwordHash,
      });

      const user = await userRepo.save(userRepo.create({ id: userId, email: input.email, fullName: input.fullName, status: 'ACTIVE' }));

      const assignment = await assignmentRepo.save(
        assignmentRepo.create({
          userId: user.id,
          role: input.role,
          scopeType,
          scopePortalId: input.scopePortalId ?? null,
          scopeCommerceId: input.scopeCommerceId ?? null,
        }),
      );

      await this.auditService.record(manager, {
        actorUserId: actor.sub,
        action: 'USER_CREATED',
        targetType: 'USER',
        targetId: user.id,
        scopeType,
        scopePortalId: assignment.scopePortalId,
        scopeCommerceId: assignment.scopeCommerceId,
        newValue: { email: user.email, role: assignment.role, scopeType },
      });

      return { ...toUser(user, assignment), temporaryPassword };
    });
  }

  /** Scope-filtered per docs/adr/011 §5: GLOBAL sees all, PORTAL sees own portal + its commerces' users, COMMERCE sees only its own users. */
  async findAll(actor: AuthenticatedRequestUser): Promise<User[]> {
    const query = this.roleAssignmentsRepository.createQueryBuilder('assignment').leftJoinAndSelect('assignment.user', 'user');

    if (actor.scopeType === 'PORTAL') {
      query
        .leftJoin(CommerceEntity, 'commerce', 'commerce.id = assignment.scope_commerce_id')
        .where(
          '(assignment.scope_type = :portalScope AND assignment.scope_portal_id = :portalId) OR (assignment.scope_type = :commerceScope AND commerce.portal_id = :portalId)',
          { portalScope: 'PORTAL', commerceScope: 'COMMERCE', portalId: actor.scopePortalId },
        );
    } else if (actor.scopeType === 'COMMERCE') {
      query.where('assignment.scope_type = :commerceScope AND assignment.scope_commerce_id = :commerceId', {
        commerceScope: 'COMMERCE',
        commerceId: actor.scopeCommerceId,
      });
    }
    // GLOBAL: no filter — sees everyone.

    const assignments = await query.orderBy('user.createdAt', 'ASC').getMany();
    return assignments.map((assignment) => toUser(assignment.user, assignment));
  }

  async findOne(id: string, actor: AuthenticatedRequestUser): Promise<User> {
    const { user, assignment } = await this.loadUserWithAssignment(id);
    if (!(await this.isWithinManagedScope(actor, assignment))) {
      throw new ForbiddenException('You do not have access to this user.');
    }
    return toUser(user, assignment);
  }

  async update(id: string, actor: AuthenticatedRequestUser, input: UpdateUser): Promise<User> {
    const { user, assignment } = await this.loadUserWithAssignment(id);
    if (!(await this.isWithinManagedScope(actor, assignment))) {
      throw new ForbiddenException('You do not have access to this user.');
    }
    user.fullName = input.fullName;
    const saved = await this.usersRepository.save(user);
    return toUser(saved, assignment);
  }

  async updateStatus(id: string, actor: AuthenticatedRequestUser, status: 'ACTIVE' | 'INACTIVE'): Promise<User> {
    const { user, assignment } = await this.loadUserWithAssignment(id);
    if (actor.sub === id) {
      throw new ForbiddenException('You cannot change your own status.');
    }
    if (!(await this.isWithinManagedScope(actor, assignment))) {
      throw new ForbiddenException('You do not have access to this user.');
    }

    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const previousStatus = user.status;
      user.status = status;
      const saved = await userRepo.save(user);

      await this.auditService.record(manager, {
        actorUserId: actor.sub,
        action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        targetType: 'USER',
        targetId: saved.id,
        scopeType: assignment.scopeType,
        scopePortalId: assignment.scopePortalId,
        scopeCommerceId: assignment.scopeCommerceId,
        previousValue: { status: previousStatus },
        newValue: { status },
      });

      return toUser(saved, assignment);
    });
  }

  /**
   * Public (unlike the rest of this module's per-user methods) — no BOLA/
   * scope check, because it isn't an admin action. `BetterAuthSessionGuard`
   * uses it to resolve role/scope fresh on every authenticated request
   * (docs/adr/013-better-auth-migration.md), which is a system operation,
   * not an admin browsing another admin's record.
   */
  async loadUserWithAssignment(id: string): Promise<{ user: UserEntity; assignment: RoleAssignmentEntity }> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    const assignment = await this.roleAssignmentsRepository.findOneBy({ userId: id });
    if (!assignment) {
      // Every user is created together with its assignment in the same
      // transaction (createWithRoleAssignment) — reaching this means data
      // corruption, not a normal 404.
      throw new NotFoundException(`User ${id} has no role assignment.`);
    }
    return { user, assignment };
  }

  /**
   * BOLA (API1) for viewing/managing a specific user. Always true for one's
   * own record. SUPERADMIN: always. ADMIN_PORTAL: any assignment that
   * resolves within their portal (PORTAL scope matching, or COMMERCE scope
   * whose commerce belongs to that portal). ADMIN_COMMERCE: only VIEWERs of
   * their own commerce — matches the creation matrix (an ADMIN_COMMERCE
   * never creates anyone else), so by construction it never needs to manage
   * a different target. VIEWER: nobody but itself.
   */
  private async isWithinManagedScope(actor: AuthenticatedRequestUser, target: RoleAssignmentEntity): Promise<boolean> {
    if (actor.sub === target.userId) {
      return true;
    }
    if (actor.role === 'SUPERADMIN') {
      return true;
    }

    if (actor.role === 'ADMIN_PORTAL') {
      if (target.scopeType === 'PORTAL') {
        return target.scopePortalId === actor.scopePortalId;
      }
      if (target.scopeType === 'COMMERCE' && target.scopeCommerceId) {
        const commerce = await this.commercesRepository.findOneBy({ id: target.scopeCommerceId });
        return commerce?.portalId === actor.scopePortalId;
      }
      return false;
    }

    if (actor.role === 'ADMIN_COMMERCE') {
      return target.scopeType === 'COMMERCE' && target.scopeCommerceId === actor.scopeCommerceId;
    }

    return false;
  }
}
