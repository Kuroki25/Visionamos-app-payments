import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { ServiceEntity } from '../../services/entities/service.entity';

/**
 * The form configured for a Service (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md
 * §8.1). Service 0..1 FormDefinition — a real `OneToOne` (TypeORM makes the
 * owning join column unique automatically), not every Service needs a form.
 *
 * `ON DELETE RESTRICT` (not CASCADE, unlike FormFieldEntity below): once a
 * FormVersion has real FormSubmissions hanging off it, the definition must
 * not be able to disappear silently through a cascade.
 */
@Entity({ name: 'form_definitions' })
export class FormDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // No `unique: true` here — the OneToOne relation below already makes its
  // owning join column unique; declaring it twice on the same physical
  // column would be redundant.
  @Column({ type: 'uuid', name: 'service_id' })
  serviceId!: string;

  @OneToOne(() => ServiceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
