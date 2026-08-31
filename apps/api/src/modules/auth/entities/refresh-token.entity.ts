import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One row per issued refresh token, so a token can be individually revoked
 * (logout, rotation, suspected theft) instead of only being invalidatable by
 * rotating a single global signing secret (section 20/21 — "revocación").
 * The raw token value is never stored, only a SHA-256 hash of it
 * (AuthService.hashToken) — identical rationale to password hashing: a
 * database read alone must not be enough to impersonate a session.
 */
@Entity({ name: 'refresh_tokens' })
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column()
  expiresAt!: Date;

  // `type: Date` (not a bare string) so TypeORM still auto-picks each
  // driver's native timestamp type ('datetime' on the SQLite test driver,
  // 'timestamp' on Postgres). Needed explicitly here — unlike `expiresAt`
  // above, reflect-metadata's design:type for a `Date | null` union
  // collapses to `Object`, not `Date`, so there is nothing to infer from.
  @Column({ type: Date, nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
