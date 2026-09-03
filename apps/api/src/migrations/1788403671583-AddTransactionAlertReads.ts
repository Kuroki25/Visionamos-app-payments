import { type MigrationInterface, type QueryRunner } from "typeorm";

export class AddTransactionAlertReads1788403671583 implements MigrationInterface {
    name = 'AddTransactionAlertReads1788403671583'

    // NOTE: hand-written, not the raw `migration:generate` output — the
    // generator diffed unrelated drift on "users" (attempted to DROP its
    // FK to Better Auth's "user" table, `FK_users_id_better_auth_user`,
    // which is real, pre-existing, and outside this table's scope
    // entirely) instead of only the new table. Same "hand-edit after
    // generate" class of issue already documented in
    // AddTransactions1788150347573 — verified against a real Postgres 18
    // instance (docker-compose.yml): applies and reverts cleanly, and a
    // `SELECT` against "users" immediately after confirms its FK is
    // untouched.

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transaction_alert_reads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "transaction_id" uuid NOT NULL, "read_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_transaction_alert_reads_user_transaction" UNIQUE ("user_id", "transaction_id"), CONSTRAINT "PK_transaction_alert_reads_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_transaction_alert_reads_user_id" ON "transaction_alert_reads"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_transaction_alert_reads_transaction_id" ON "transaction_alert_reads"  ("transaction_id") `);
        await queryRunner.query(`ALTER TABLE "transaction_alert_reads" ADD CONSTRAINT "FK_transaction_alert_reads_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_alert_reads" ADD CONSTRAINT "FK_transaction_alert_reads_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_alert_reads" DROP CONSTRAINT "FK_transaction_alert_reads_transaction"`);
        await queryRunner.query(`ALTER TABLE "transaction_alert_reads" DROP CONSTRAINT "FK_transaction_alert_reads_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_transaction_alert_reads_transaction_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_transaction_alert_reads_user_id"`);
        await queryRunner.query(`DROP TABLE "transaction_alert_reads"`);
    }

}
