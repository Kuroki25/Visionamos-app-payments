import { type MigrationInterface, type QueryRunner } from "typeorm";

export class AddPortalFields1788411205169 implements MigrationInterface {
    name = 'AddPortalFields1788411205169'

    // NOTE: hand-written, not the raw `migration:generate` output — same
    // recurring class of issue as AddTransactions1788150347573 and
    // AddTransactionAlertReads1788403671583: the generator diffed unrelated
    // drift (this time on BOTH the "users" FK to Better Auth's "user" table
    // AND every constraint on "transaction_alert_reads") because those were
    // hand-named in their own migrations instead of left to TypeORM's
    // deterministic hash-based naming. Verified against a real Postgres 18
    // instance: applies and reverts cleanly; a `\d users` / `\d
    // transaction_alert_reads` immediately after confirms both untouched.
    // All 4 new columns are nullable — additive only, no backfill for the
    // 3 portals seeded before this pass (Avanza/Otrahuilca/Coopenjo).

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "portals" ADD "display_name" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "portals" ADD "service_type" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "portals" ADD "description" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "portals" ADD "logo_path" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "portals" DROP COLUMN "logo_path"`);
        await queryRunner.query(`ALTER TABLE "portals" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "portals" DROP COLUMN "service_type"`);
        await queryRunner.query(`ALTER TABLE "portals" DROP COLUMN "display_name"`);
    }

}
