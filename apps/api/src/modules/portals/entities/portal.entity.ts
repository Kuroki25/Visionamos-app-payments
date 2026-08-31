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

  @Column({ type: 'simple-enum', enum: EntityStatusSchema.options, enumName: 'entity_status', default: 'ACTIVE' })
  status!: EntityStatus;

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
