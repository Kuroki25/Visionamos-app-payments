import { EntityStatusSchema } from '@repo/contracts';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { z } from 'zod';

import { CategoryEntity } from '../../categories/entities/category.entity';
import { PortalEntity } from '../../portals/entities/portal.entity';

type EntityStatus = z.infer<typeof EntityStatusSchema>;

/**
 * Comercio Aliado (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §3.1).
 * Belongs to exactly one Portal (`portalId`, RESTRICT) and one Category
 * (`categoryId`, RESTRICT) — Category–Commerce is 1:N by decision (no join
 * table). `taxId` is UNIQUE: the same fiscal identification can't register
 * as two different commerces.
 *
 * Deliberately **no** banking/settlement fields — that's a separate,
 * explicitly-pending concept ("SettlementAccount",
 * docs/business/BUSINESS_MODEL_RED_COOPAGOS.md §9.3) kept out of this table.
 *
 * `category.portalId === commerce.portalId` (a category can't be assigned
 * across portals) is a cross-table invariant that PostgreSQL's `CHECK`
 * cannot express — it's validated in `CommercesService.create`/`update`
 * (load the category, compare `portalId`) and covered by a dedicated e2e
 * test, not by a database constraint.
 */
@Entity({ name: 'commerces' })
@Unique(['taxId'])
export class CommerceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'portal_id' })
  @Index()
  portalId!: string;

  @ManyToOne(() => PortalEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'portal_id' })
  portal!: PortalEntity;

  @Column({ type: 'uuid', name: 'category_id' })
  @Index()
  categoryId!: string;

  @ManyToOne(() => CategoryEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: CategoryEntity;

  @Column({ type: 'varchar', length: 200 })
  tradeName!: string;

  @Column({ type: 'varchar', length: 200 })
  legalName!: string;

  @Column({ type: 'varchar', length: 50 })
  taxId!: string;

  @Column({ type: 'varchar', length: 200 })
  contactName!: string;

  @Column({ type: 'varchar', length: 320 })
  contactEmail!: string;

  @Column({ type: 'varchar', length: 30 })
  contactPhone!: string;

  @Column({ type: 'varchar', length: 300 })
  address!: string;

  @Column({ type: 'varchar', length: 100 })
  city!: string;

  @Index()
  @Column({ type: 'simple-enum', enum: EntityStatusSchema.options, enumName: 'entity_status', default: 'ACTIVE' })
  status!: EntityStatus;

  @Index()
  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
