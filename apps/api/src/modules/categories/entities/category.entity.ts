import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { PortalEntity } from '../../portals/entities/portal.entity';

/**
 * Category classifies Comercios Aliados and is specific to a single Portal
 * (docs/business/ROLE_PERMISSION_MATRIX.md §5.3 — "las categorías son
 * específicas por portal"): `UNIQUE(portalId, name)`, not a global unique
 * name, so two different portals may each have their own "Salud" category.
 *
 * `portal` is a real relation (`ON DELETE RESTRICT`) so PostgreSQL enforces
 * the FK physically, not just at the application layer; `portalId` is the
 * same underlying column exposed as a plain property for filtering/
 * comparison without forcing a join — the documented TypeORM pattern of
 * pairing `@Column` + `@JoinColumn` on the same column name.
 */
@Entity({ name: 'categories' })
@Unique(['portalId', 'name'])
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'portal_id' })
  @Index()
  portalId!: string;

  @ManyToOne(() => PortalEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'portal_id' })
  portal!: PortalEntity;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
