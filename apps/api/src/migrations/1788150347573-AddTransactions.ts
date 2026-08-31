import { type MigrationInterface, type QueryRunner } from "typeorm";

export class AddTransactions1788150347573 implements MigrationInterface {
    name = 'AddTransactions1788150347573'

    // NOTE: hand-edited after `migration:generate`, same class of bug as
    // InitSchema1788145516882 — "transaction_status" is used by both
    // transactions.status and transaction_events.previous_status/new_status;
    // the generator emitted CREATE TYPE for it twice. Verified against a
    // real Postgres 18 instance (docker-compose.yml): the unedited file
    // fails with "type already exists"; this version applies and reverts
    // cleanly.

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'PSE', 'DIGITAL_WALLET')`);
        await queryRunner.query(`CREATE TYPE "public"."transaction_status" AS ENUM('CREATED', 'PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'FAILED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "portal_id" uuid NOT NULL, "commerce_id" uuid NOT NULL, "service_id" uuid NOT NULL, "form_submission_id" uuid, "payer_email" character varying(320) NOT NULL, "payer_document_type" character varying(50) NOT NULL, "payer_document_number" character varying(50) NOT NULL, "payer_first_name" character varying(200) NOT NULL, "payer_last_name" character varying(200) NOT NULL, "payer_phone" character varying(30) NOT NULL, "amount" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'COP', "method" "public"."payment_method" NOT NULL, "status" "public"."transaction_status" NOT NULL DEFAULT 'CREATED', "internal_reference" character varying(100) NOT NULL, "provider_reference" character varying(200), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_cec1515cbda4b6b586a1db0e2ce" UNIQUE ("internal_reference"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a7356bf60c55d46c162ac631c2" ON "transactions"  ("portal_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d700e5f9334ef75f061aacb301" ON "transactions"  ("commerce_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f68d402ddc5eb2498ec7385a44" ON "transactions"  ("service_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_da87c55b3bbbe96c6ed88ea7ee" ON "transactions"  ("status") `);
        await queryRunner.query(`CREATE TYPE "public"."transaction_event_source" AS ENUM('SYSTEM', 'PAYMENT_PROVIDER', 'WEBHOOK', 'ADMINISTRATIVE_CORRECTION', 'RECONCILIATION')`);
        await queryRunner.query(`CREATE TABLE "transaction_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transaction_id" uuid NOT NULL, "previous_status" "public"."transaction_status", "new_status" "public"."transaction_status" NOT NULL, "source" "public"."transaction_event_source" NOT NULL, "metadata" jsonb, "occurred_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e0b1cdc84612e5aebf6e6273ff4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_83b75626572b009d46112374c4" ON "transaction_events"  ("transaction_id") `);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_a7356bf60c55d46c162ac631c27" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_d700e5f9334ef75f061aacb3014" FOREIGN KEY ("commerce_id") REFERENCES "commerces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_f68d402ddc5eb2498ec7385a44c" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_58fd85f5b5caf1509c71771142b" FOREIGN KEY ("form_submission_id") REFERENCES "form_submissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_events" ADD CONSTRAINT "FK_83b75626572b009d46112374c48" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_events" DROP CONSTRAINT "FK_83b75626572b009d46112374c48"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_58fd85f5b5caf1509c71771142b"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_f68d402ddc5eb2498ec7385a44c"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_d700e5f9334ef75f061aacb3014"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_a7356bf60c55d46c162ac631c27"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_83b75626572b009d46112374c4"`);
        await queryRunner.query(`DROP TABLE "transaction_events"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_event_source"`);
        // NOT dropping "transaction_status" here — "transactions" (below)
        // still references it at this point.
        await queryRunner.query(`DROP INDEX "public"."IDX_da87c55b3bbbe96c6ed88ea7ee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f68d402ddc5eb2498ec7385a44"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d700e5f9334ef75f061aacb301"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a7356bf60c55d46c162ac631c2"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        // Last of the two tables using "transaction_status"
        // (transaction_events/transactions) — safe to drop now.
        await queryRunner.query(`DROP TYPE "public"."transaction_status"`);
        await queryRunner.query(`DROP TYPE "public"."payment_method"`);
    }

}
