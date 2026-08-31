import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { CommerceEntity } from '../../commerces/entities/commerce.entity';

/**
 * A payable concept offered by a Commerce
 * (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §3.3 — matrícula,
 * mensualidad, cuota...). No `status` column: unlike Portal/Commerce/
 * FormVersion, an activate/deactivate lifecycle for Service is not
 * confirmed by the business — not invented here (docs/adr/011).
 */
@Entity({ name: 'services' })
@Unique(['commerceId', 'name'])
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'commerce_id' })
  @Index()
  commerceId!: string;

  @ManyToOne(() => CommerceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'commerce_id' })
  commerce!: CommerceEntity;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
