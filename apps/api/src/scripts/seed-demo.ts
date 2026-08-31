import 'reflect-metadata';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

import { AppDataSource } from '../config/data-source';
import { CategoryEntity } from '../modules/categories/entities/category.entity';
import { CommerceEntity } from '../modules/commerces/entities/commerce.entity';
import { FormDefinitionEntity } from '../modules/forms/entities/form-definition.entity';
import { FormFieldEntity } from '../modules/forms/entities/form-field.entity';
import { FormSubmissionEntity } from '../modules/forms/entities/form-submission.entity';
import { FormVersionEntity } from '../modules/forms/entities/form-version.entity';
import { PortalEntity } from '../modules/portals/entities/portal.entity';
import { RoleAssignmentEntity } from '../modules/role-assignments/entities/role-assignment.entity';
import { ServiceEntity } from '../modules/services/entities/service.entity';
import { TransactionEventEntity } from '../modules/transactions/entities/transaction-event.entity';
import { TransactionEntity } from '../modules/transactions/entities/transaction.entity';
import { UserEntity } from '../modules/users/entities/user.entity';

/**
 * Populates realistic Red Coopagos demo data — Portal → Category →
 * Commerce (classified) → Service → FormDefinition/Version/Field →
 * FormSubmission, sample Transactions cycling through the real state
 * machine, and one AppUser per role (docs/adr/011/012). Uses the same
 * direct-repository pattern as seed-superadmin.ts (a plain DataSource, not
 * a full Nest app boot) — deliberately: this is trusted, hand-crafted data
 * where every relationship is correct by construction, so it doesn't need
 * to re-exercise the HTTP-layer validation the e2e suite already covers
 * (docs/adr/010 — "the CLI is a developer/deploy-time tool").
 *
 * Idempotent: exits cleanly if Portal "Avanza" already exists.
 * Requires `pnpm seed:superadmin` to have run first — every audit event
 * needs a real actor.
 */

const DEMO_PASSWORD = 'a-strong-password-123';

interface FieldSpec {
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'DATE' | 'SELECT' | 'CHECKBOX';
  isRequired: boolean;
  sortOrder: number;
  options?: { value: string; label: string }[];
}

async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const usersRepo = AppDataSource.getRepository(UserEntity);
    const portalsRepo = AppDataSource.getRepository(PortalEntity);

    const existing = await portalsRepo.findOneBy({ name: 'Avanza' });
    if (existing) {
      console.error('Demo data already seeded (Portal "Avanza" exists) — nothing to do.');
      return;
    }

    const superadmin = await usersRepo
      .createQueryBuilder('user')
      .innerJoin('role_assignments', 'ra', 'ra.user_id = user.id')
      .where('ra.role = :role', { role: 'SUPERADMIN' })
      .getOne();
    if (!superadmin) {
      throw new Error('No SUPERADMIN found — run `pnpm seed:superadmin` first.');
    }

    await AppDataSource.transaction(async (manager) => {
      const portals = manager.getRepository(PortalEntity);
      const categories = manager.getRepository(CategoryEntity);
      const commerces = manager.getRepository(CommerceEntity);
      const services = manager.getRepository(ServiceEntity);
      const formDefinitions = manager.getRepository(FormDefinitionEntity);
      const formVersions = manager.getRepository(FormVersionEntity);
      const formFields = manager.getRepository(FormFieldEntity);
      const formSubmissions = manager.getRepository(FormSubmissionEntity);
      const transactions = manager.getRepository(TransactionEntity);
      const transactionEvents = manager.getRepository(TransactionEventEntity);
      const users = manager.getRepository(UserEntity);
      const roleAssignments = manager.getRepository(RoleAssignmentEntity);

      // --- Portals (docs/business/BUSINESS_MODEL_RED_COOPAGOS.md §4.1 examples) ---
      const avanza = await portals.save(portals.create({ name: 'Avanza', status: 'ACTIVE', isPublished: true }));
      const otrahuilca = await portals.save(portals.create({ name: 'Otrahuilca', status: 'ACTIVE', isPublished: true }));
      const coopenjo = await portals.save(portals.create({ name: 'Coopenjo', status: 'ACTIVE', isPublished: false }));

      // --- Categories (portal-scoped — docs/business/ROLE_PERMISSION_MATRIX.md §5.3) ---
      const catEducacionAvanza = await categories.save(categories.create({ portalId: avanza.id, name: 'Instituciones educativas' }));
      const catHotelesAvanza = await categories.save(categories.create({ portalId: avanza.id, name: 'Hoteles' }));
      const catDeportesOtrahuilca = await categories.save(categories.create({ portalId: otrahuilca.id, name: 'Deportes' }));
      const catSaludCoopenjo = await categories.save(categories.create({ portalId: coopenjo.id, name: 'Salud' }));

      // --- Commerces (classified into a category of their own portal) ---
      const universidadAvanza = await commerces.save(
        commerces.create({
          portalId: avanza.id,
          categoryId: catEducacionAvanza.id,
          tradeName: 'Universidad Avanza',
          legalName: 'Universidad Avanza S.A.S.',
          taxId: '900111222-1',
          contactName: 'Carlos Pérez',
          contactEmail: 'admisiones@universidadavanza.edu.co',
          contactPhone: '6011234567',
          address: 'Calle 100 # 15-20',
          city: 'Bogotá',
          status: 'ACTIVE',
          isPublished: true,
        }),
      );
      const hotelAvanzaPlaza = await commerces.save(
        commerces.create({
          portalId: avanza.id,
          categoryId: catHotelesAvanza.id,
          tradeName: 'Hotel Avanza Plaza',
          legalName: 'Hotel Avanza Plaza S.A.S.',
          taxId: '900111222-2',
          contactName: 'Diana Gómez',
          contactEmail: 'reservas@hotelavanzaplaza.com',
          contactPhone: '6017654321',
          address: 'Carrera 7 # 45-10',
          city: 'Bogotá',
          status: 'ACTIVE',
          isPublished: true,
        }),
      );
      // Demonstrates UPDATE against a real, already-persisted row.
      hotelAvanzaPlaza.contactPhone = '6017654322';
      await commerces.save(hotelAvanzaPlaza);

      const escuelaFutbolOtrahuilca = await commerces.save(
        commerces.create({
          portalId: otrahuilca.id,
          categoryId: catDeportesOtrahuilca.id,
          tradeName: 'Escuela de Fútbol Otrahuilca',
          legalName: 'Escuela de Fútbol Otrahuilca S.A.S.',
          taxId: '900111222-3',
          contactName: 'Jorge Ramírez',
          contactEmail: 'contacto@futbolotrahuilca.co',
          contactPhone: '3101234567',
          address: 'Calle 20 # 10-05',
          city: 'Neiva',
          status: 'ACTIVE',
          isPublished: true,
        }),
      );
      const clinicaCoopenjo = await commerces.save(
        commerces.create({
          portalId: coopenjo.id,
          categoryId: catSaludCoopenjo.id,
          tradeName: 'Clínica Coopenjo',
          legalName: 'Clínica Coopenjo S.A.S.',
          taxId: '900111222-4',
          contactName: 'Laura Torres',
          contactEmail: 'citas@clinicacoopenjo.co',
          contactPhone: '3209876543',
          address: 'Avenida 30 # 8-12',
          city: 'Enjo',
          status: 'ACTIVE',
          isPublished: false,
        }),
      );

      // --- Services (per commerce) ---
      const matricula = await services.save(services.create({ commerceId: universidadAvanza.id, name: 'Matrícula' }));
      await services.save(services.create({ commerceId: universidadAvanza.id, name: 'Mensualidad' }));
      await services.save(services.create({ commerceId: hotelAvanzaPlaza.id, name: 'Reserva' }));
      await services.save(services.create({ commerceId: escuelaFutbolOtrahuilca.id, name: 'Mensualidad' }));
      await services.save(services.create({ commerceId: clinicaCoopenjo.id, name: 'Consulta' }));

      // --- Dynamic form for "Matrícula" (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §8.1 example) ---
      const matriculaForm = await formDefinitions.save(formDefinitions.create({ serviceId: matricula.id }));

      const v1 = await formVersions.save(
        formVersions.create({ formDefinitionId: matriculaForm.id, versionNumber: 1, status: 'ACTIVE', isPublished: true }),
      );
      const v1Fields: FieldSpec[] = [
        { key: 'studentCode', label: 'Código de estudiante', type: 'TEXT', isRequired: true, sortOrder: 0 },
        { key: 'academicPeriod', label: 'Periodo académico', type: 'TEXT', isRequired: true, sortOrder: 1 },
        {
          key: 'program',
          label: 'Programa',
          type: 'SELECT',
          isRequired: true,
          sortOrder: 2,
          options: [
            { value: 'sistemas', label: 'Ingeniería de Sistemas' },
            { value: 'administracion', label: 'Administración de Empresas' },
            { value: 'derecho', label: 'Derecho' },
          ],
        },
      ];
      for (const field of v1Fields) {
        await formFields.save(
          formFields.create({
            formVersionId: v1.id,
            key: field.key,
            label: field.label,
            type: field.type,
            isRequired: field.isRequired,
            sortOrder: field.sortOrder,
            options: field.options ?? null,
            validationRules: null,
          }),
        );
      }

      // A second, draft version — shows versioning exists without disturbing
      // the single published version invariant (ux_form_versions_one_published).
      await formVersions.save(
        formVersions.create({ formDefinitionId: matriculaForm.id, versionNumber: 2, status: 'ACTIVE', isPublished: false }),
      );

      const submission = await formSubmissions.save(
        formSubmissions.create({
          formVersionId: v1.id,
          answers: { studentCode: 'A00123456', academicPeriod: '2026-1', program: 'sistemas' },
        }),
      );

      // --- Transactions: one full lifecycle each, real event history (docs/adr/012 state machine) ---
      async function createTransaction(overrides: {
        payerFirstName: string;
        payerLastName: string;
        formSubmissionId?: string | null;
      }) {
        const tx = await transactions.save(
          transactions.create({
            portalId: avanza.id,
            commerceId: universidadAvanza.id,
            serviceId: matricula.id,
            formSubmissionId: overrides.formSubmissionId ?? null,
            payerEmail: `${overrides.payerFirstName.toLowerCase()}@example.com`,
            payerDocumentType: 'CC',
            payerDocumentNumber: String(1_000_000_000 + Math.floor(Math.random() * 899_999_999)),
            payerFirstName: overrides.payerFirstName,
            payerLastName: overrides.payerLastName,
            payerPhone: '3000000000',
            amount: 5_000_000,
            currency: 'COP',
            method: 'PSE',
            status: 'CREATED',
            internalReference: `TX-${randomUUID()}`,
            providerReference: null,
          }),
        );
        await transactionEvents.save(
          transactionEvents.create({ transactionId: tx.id, previousStatus: null, newStatus: 'CREATED', source: 'SYSTEM', metadata: null }),
        );
        return tx;
      }

      async function transition(tx: TransactionEntity, newStatus: TransactionEntity['status']) {
        const previousStatus = tx.status;
        tx.status = newStatus;
        await transactions.save(tx);
        await transactionEvents.save(
          transactionEvents.create({ transactionId: tx.id, previousStatus, newStatus, source: 'SYSTEM', metadata: null }),
        );
      }

      const approvedTx = await createTransaction({ payerFirstName: 'Ana', payerLastName: 'Pérez', formSubmissionId: submission.id });
      await transition(approvedTx, 'PENDING');
      await transition(approvedTx, 'PROCESSING');
      await transition(approvedTx, 'APPROVED');

      const rejectedTx = await createTransaction({ payerFirstName: 'Luis', payerLastName: 'Gómez' });
      await transition(rejectedTx, 'PENDING');
      await transition(rejectedTx, 'REJECTED');

      await createTransaction({ payerFirstName: 'María', payerLastName: 'Rodríguez' });

      // --- Admin users, one per role/scope (docs/adr/011 §4 creation matrix) ---
      async function createUser(email: string, fullName: string) {
        const passwordHash = await argon2.hash(DEMO_PASSWORD);
        return users.save(users.create({ email, fullName, passwordHash, status: 'ACTIVE' }));
      }

      const adminPortalAvanzaUser = await createUser('admin.avanza@example.com', 'Admin Portal Avanza');
      await roleAssignments.save(
        roleAssignments.create({ userId: adminPortalAvanzaUser.id, role: 'ADMIN_PORTAL', scopeType: 'PORTAL', scopePortalId: avanza.id, scopeCommerceId: null }),
      );

      const adminCommerceUniversidadUser = await createUser('admin.universidad-avanza@example.com', 'Admin Universidad Avanza');
      await roleAssignments.save(
        roleAssignments.create({
          userId: adminCommerceUniversidadUser.id,
          role: 'ADMIN_COMMERCE',
          scopeType: 'COMMERCE',
          scopeCommerceId: universidadAvanza.id,
          scopePortalId: null,
        }),
      );

      const viewerAvanzaUser = await createUser('viewer.avanza@example.com', 'Viewer Avanza');
      await roleAssignments.save(
        roleAssignments.create({ userId: viewerAvanzaUser.id, role: 'VIEWER', scopeType: 'PORTAL', scopePortalId: avanza.id, scopeCommerceId: null }),
      );

      const adminPortalOtrahuilcaUser = await createUser('admin.otrahuilca@example.com', 'Admin Portal Otrahuilca');
      await roleAssignments.save(
        roleAssignments.create({ userId: adminPortalOtrahuilcaUser.id, role: 'ADMIN_PORTAL', scopeType: 'PORTAL', scopePortalId: otrahuilca.id, scopeCommerceId: null }),
      );

      /* eslint-disable no-console -- CLI script success summary, not leftover debug logs. */
      console.log('Demo data seeded:');
      console.log(`  Portals: Avanza(${avanza.id}), Otrahuilca(${otrahuilca.id}), Coopenjo(${coopenjo.id})`);
      console.log(`  Commerces: Universidad Avanza(${universidadAvanza.id}), Hotel Avanza Plaza(${hotelAvanzaPlaza.id}), Escuela de Fútbol Otrahuilca(${escuelaFutbolOtrahuilca.id}), Clínica Coopenjo(${clinicaCoopenjo.id})`);
      console.log(`  Published form: Matrícula v1(${v1.id}) with 3 fields, draft v2, 1 submission(${submission.id})`);
      console.log(`  Transactions: APPROVED(${approvedTx.id}), REJECTED(${rejectedTx.id}), CREATED(one more)`);
      console.log(`  Users (password for all: "${DEMO_PASSWORD}"):`);
      console.log(`    ADMIN_PORTAL   admin.avanza@example.com               (scope: Avanza)`);
      console.log(`    ADMIN_COMMERCE admin.universidad-avanza@example.com   (scope: Universidad Avanza)`);
      console.log(`    VIEWER         viewer.avanza@example.com              (scope: Avanza)`);
      console.log(`    ADMIN_PORTAL   admin.otrahuilca@example.com           (scope: Otrahuilca)`);
      console.log(`  Actor for audit_events: ${superadmin.email}`);
      /* eslint-enable no-console */
    });
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('seed-demo failed:', error);
  process.exitCode = 1;
});
