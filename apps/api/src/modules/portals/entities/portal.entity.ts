import { EntityStatusSchema } from '@repo/contracts';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { z } from 'zod';

type EntityStatus = z.infer<typeof EntityStatusSchema>;

/**
 * Portal de Pago (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §2.3) —
 * groups Comercios Aliados. `status` gates whether it can operate at all;
 * `isPublished` gates visibility in the future public Portal (separate
 * concerns, both confirmed capabilities — docs/adr/011).
 */
@Entity({ name: 'portals' })
@Unique(['name'])
export class PortalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  // Nullable, unlike `CreatePortalSchema`'s requirement of them for every
  // NEW portal — the 3 portals seeded before these columns existed
  // (Avanza/Otrahuilca/Coopenjo) have none of these, and this migration is
  // additive-only (no backfill invented). `logoPath` is the filename on
  // disk (`uploads/portal-logos/`, docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md
  // §17.2) — never the client-supplied name (path traversal), and never
  // exposed directly; `PortalsService.toPortal` turns it into `logoUrl`.
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'display_name' })
  displayName!: string | null;

  // Free text, not a constrained enum: the reference image shows a
  // dropdown ("Selecciona un tipo"), but no confirmed set of service-type
  // categories exists anywhere in docs/business/ — inventing one would be
  // exactly the "no inventar negocio no confirmado" this pass keeps
  // avoiding. Trivial to convert to an enum once the business defines the
  // real options (see §17.2).
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'service_type' })
  serviceType!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'logo_path' })
  logoPath!: string | null;

  @Column({ type: 'simple-enum', enum: EntityStatusSchema.options, enumName: 'entity_status', default: 'ACTIVE' })
  status!: EntityStatus;

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
