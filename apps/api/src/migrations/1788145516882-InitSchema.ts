import { type MigrationInterface, type QueryRunner } from "typeorm";

export class InitSchema1788145516882 implements MigrationInterface {
    name = 'InitSchema1788145516882'

    // NOTE: hand-edited after `migration:generate` — the generator does not
    // deduplicate `CREATE TYPE`/`DROP TYPE` for an enum shared by several
    // columns (`entity_status` is used by users/portals/commerces/form_versions,
    // `scope_type` by audit_events/role_assignments): it emitted one
    // CREATE TYPE per column, which fails on Postgres ("type already
    // exists") the moment a second column using the same shared type is
    // reached. Verified against a real Postgres 18 instance
    // (docker-compose.yml): the unedited generated file failed exactly this
    // way on `migration:run`; this version applies and reverts cleanly.
    // Each type is created once, and dropped once — only after every table
    // still referencing it has already been dropped.

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "revoked_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens"  ("user_id") `);
        await queryRunner.query(`CREATE TYPE "public"."entity_status" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "portals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "status" "public"."entity_status" NOT NULL DEFAULT 'ACTIVE', "is_published" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9e98e17887b48b68b4f826802ae" UNIQUE ("name"), CONSTRAINT "PK_85b8f3d841e5461991291c91706" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "portal_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5f206da37970350879363326951" UNIQUE ("portal_id", "name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f7df3e1ab14ce82df68a6d14cc" ON "categories"  ("portal_id") `);
        await queryRunner.query(`CREATE TABLE "commerces" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "portal_id" uuid NOT NULL, "category_id" uuid NOT NULL, "trade_name" character varying(200) NOT NULL, "legal_name" character varying(200) NOT NULL, "tax_id" character varying(50) NOT NULL, "contact_name" character varying(200) NOT NULL, "contact_email" character varying(320) NOT NULL, "contact_phone" character varying(30) NOT NULL, "address" character varying(300) NOT NULL, "city" character varying(100) NOT NULL, "status" "public"."entity_status" NOT NULL DEFAULT 'ACTIVE', "is_published" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b5aa0813a93fbc5beca8aab9410" UNIQUE ("tax_id"), CONSTRAINT "PK_f589550ef99c2016fbfface36d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_02590e24cd7494c3f0972f56ae" ON "commerces"  ("portal_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_89afcaa793cf06afb34fbc8000" ON "commerces"  ("category_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b453a3eb46f0d64d75ca5051d5" ON "commerces"  ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_9555f7874e3d77bad406c306af" ON "commerces"  ("is_published") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(320) NOT NULL, "full_name" character varying(200) NOT NULL, "password_hash" character varying(255) NOT NULL, "status" "public"."entity_status" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."audit_action" AS ENUM('USER_CREATED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'ROLE_REASSIGNED', 'PORTAL_ACTIVATED', 'PORTAL_DEACTIVATED', 'PORTAL_PUBLISHED', 'PORTAL_UNPUBLISHED', 'COMMERCE_ACTIVATED', 'COMMERCE_DEACTIVATED', 'COMMERCE_PUBLISHED', 'COMMERCE_UNPUBLISHED', 'FORM_VERSION_PUBLISHED', 'FORM_VERSION_UNPUBLISHED')`);
        await queryRunner.query(`CREATE TYPE "public"."audit_target_type" AS ENUM('USER', 'ROLE_ASSIGNMENT', 'PORTAL', 'COMMERCE', 'FORM_VERSION')`);
        await queryRunner.query(`CREATE TYPE "public"."scope_type" AS ENUM('GLOBAL', 'PORTAL', 'COMMERCE')`);
        await queryRunner.query(`CREATE TABLE "audit_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actor_user_id" uuid NOT NULL, "action" "public"."audit_action" NOT NULL, "target_type" "public"."audit_target_type" NOT NULL, "target_id" uuid NOT NULL, "scope_type" "public"."scope_type" NOT NULL, "scope_portal_id" uuid, "scope_commerce_id" uuid, "previous_value" jsonb, "new_value" jsonb, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_b596fbd9f35e6cb295cb5d9ceb" CHECK (("scope_type" = 'GLOBAL' AND "scope_portal_id" IS NULL AND "scope_commerce_id" IS NULL)
    OR ("scope_type" = 'PORTAL' AND "scope_portal_id" IS NOT NULL AND "scope_commerce_id" IS NULL)
    OR ("scope_type" = 'COMMERCE' AND "scope_commerce_id" IS NOT NULL AND "scope_portal_id" IS NULL)), CONSTRAINT "PK_910f64d901a5c3e9878f0d4a407" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_da4e1f7755a2ab9a8b7ddefaa4" ON "audit_events"  ("actor_user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d76fae023f217b90282388cf34" ON "audit_events"  ("scope_portal_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_54bce107ad3b43a7e22544acc0" ON "audit_events"  ("scope_commerce_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_497bb4f7c4c55db9749616cd2a" ON "audit_events"  ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_d5de0add56627328f0ce0aba9a" ON "audit_events"  ("target_type", "target_id") `);
        await queryRunner.query(`CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "commerce_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8bb9350fa96365a6075ee1c3332" UNIQUE ("commerce_id", "name"), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_377c5d5c8abddb91f62ee99bbd" ON "services"  ("commerce_id") `);
        await queryRunner.query(`CREATE TABLE "form_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_2a150189c2f6418f7cf70ab251" UNIQUE ("service_id"), CONSTRAINT "PK_e7b46c89a49ab24f30618b410d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "form_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "form_definition_id" uuid NOT NULL, "version_number" integer NOT NULL, "status" "public"."entity_status" NOT NULL DEFAULT 'ACTIVE', "is_published" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7f5b65eac594d12f4d58cdb7e5d" UNIQUE ("form_definition_id", "version_number"), CONSTRAINT "PK_46dbd35ef6adf11a8684deae1b1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a5d45ac3c8c9515699f76ca6df" ON "form_versions"  ("form_definition_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_form_versions_one_published" ON "form_versions"  ("form_definition_id") WHERE "is_published" = true`);
        await queryRunner.query(`CREATE TYPE "public"."form_field_type" AS ENUM('TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'SELECT', 'CHECKBOX')`);
        await queryRunner.query(`CREATE TABLE "form_fields" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "form_version_id" uuid NOT NULL, "key" character varying(100) NOT NULL, "label" character varying(200) NOT NULL, "type" "public"."form_field_type" NOT NULL, "is_required" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', "options" jsonb, "validation_rules" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b67be4602c655d88d66b62903cb" UNIQUE ("form_version_id", "key"), CONSTRAINT "CHK_4c07b161774ac3aa5174a14427" CHECK ("type" <> 'SELECT' OR "options" IS NOT NULL), CONSTRAINT "PK_dc4b73290f2926c3a7d7c92d1e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3abcfea84755e14ddd59095677" ON "form_fields"  ("form_version_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e3d49ee8e7db62425d86da7543" ON "form_fields"  ("sort_order") `);
        await queryRunner.query(`CREATE TABLE "form_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "form_version_id" uuid NOT NULL, "answers" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fb6e1e9f26cda31c358a8a1530e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_11d3040556882d762d2a787887" ON "form_submissions"  ("form_version_id") `);
        await queryRunner.query(`CREATE TYPE "public"."role" AS ENUM('SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE', 'VIEWER')`);
        await queryRunner.query(`CREATE TABLE "role_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "role" "public"."role" NOT NULL, "scope_type" "public"."scope_type" NOT NULL, "scope_portal_id" uuid, "scope_commerce_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_d91c8ac0c10fd8c6acdcc5ee94" UNIQUE ("user_id"), CONSTRAINT "CHK_288ad6d843e5e2413af0c46bff" CHECK (("role" = 'SUPERADMIN' AND "scope_type" = 'GLOBAL')
    OR ("role" = 'ADMIN_PORTAL' AND "scope_type" = 'PORTAL')
    OR ("role" = 'ADMIN_COMMERCE' AND "scope_type" = 'COMMERCE')
    OR ("role" = 'VIEWER')), CONSTRAINT "CHK_da6d2696f7140d89a36a99551f" CHECK (("scope_type" = 'GLOBAL' AND "scope_portal_id" IS NULL AND "scope_commerce_id" IS NULL)
    OR ("scope_type" = 'PORTAL' AND "scope_portal_id" IS NOT NULL AND "scope_commerce_id" IS NULL)
    OR ("scope_type" = 'COMMERCE' AND "scope_commerce_id" IS NOT NULL AND "scope_portal_id" IS NULL)), CONSTRAINT "PK_fc2df9835ac1d2a34839f113783" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_60eb0651640961b2bd149829bc" ON "role_assignments"  ("scope_portal_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_444d46d34372e6a48531a67104" ON "role_assignments"  ("scope_commerce_id") `);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_f7df3e1ab14ce82df68a6d14ccb" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commerces" ADD CONSTRAINT "FK_02590e24cd7494c3f0972f56ae3" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commerces" ADD CONSTRAINT "FK_89afcaa793cf06afb34fbc80002" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_events" ADD CONSTRAINT "FK_da4e1f7755a2ab9a8b7ddefaa4d" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_events" ADD CONSTRAINT "FK_d76fae023f217b90282388cf341" FOREIGN KEY ("scope_portal_id") REFERENCES "portals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_events" ADD CONSTRAINT "FK_54bce107ad3b43a7e22544acc0d" FOREIGN KEY ("scope_commerce_id") REFERENCES "commerces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "FK_377c5d5c8abddb91f62ee99bbdf" FOREIGN KEY ("commerce_id") REFERENCES "commerces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form_definitions" ADD CONSTRAINT "FK_2a150189c2f6418f7cf70ab251f" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form_versions" ADD CONSTRAINT "FK_a5d45ac3c8c9515699f76ca6dfa" FOREIGN KEY ("form_definition_id") REFERENCES "form_definitions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form_fields" ADD CONSTRAINT "FK_3abcfea84755e14ddd59095677d" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form_submissions" ADD CONSTRAINT "FK_11d3040556882d762d2a787887a" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_assignments" ADD CONSTRAINT "FK_d91c8ac0c10fd8c6acdcc5ee946" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_assignments" ADD CONSTRAINT "FK_60eb0651640961b2bd149829bc0" FOREIGN KEY ("scope_portal_id") REFERENCES "portals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_assignments" ADD CONSTRAINT "FK_444d46d34372e6a48531a671042" FOREIGN KEY ("scope_commerce_id") REFERENCES "commerces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_assignments" DROP CONSTRAINT "FK_444d46d34372e6a48531a671042"`);
        await queryRunner.query(`ALTER TABLE "role_assignments" DROP CONSTRAINT "FK_60eb0651640961b2bd149829bc0"`);
        await queryRunner.query(`ALTER TABLE "role_assignments" DROP CONSTRAINT "FK_d91c8ac0c10fd8c6acdcc5ee946"`);
        await queryRunner.query(`ALTER TABLE "form_submissions" DROP CONSTRAINT "FK_11d3040556882d762d2a787887a"`);
        await queryRunner.query(`ALTER TABLE "form_fields" DROP CONSTRAINT "FK_3abcfea84755e14ddd59095677d"`);
        await queryRunner.query(`ALTER TABLE "form_versions" DROP CONSTRAINT "FK_a5d45ac3c8c9515699f76ca6dfa"`);
        await queryRunner.query(`ALTER TABLE "form_definitions" DROP CONSTRAINT "FK_2a150189c2f6418f7cf70ab251f"`);
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "FK_377c5d5c8abddb91f62ee99bbdf"`);
        await queryRunner.query(`ALTER TABLE "audit_events" DROP CONSTRAINT "FK_54bce107ad3b43a7e22544acc0d"`);
        await queryRunner.query(`ALTER TABLE "audit_events" DROP CONSTRAINT "FK_d76fae023f217b90282388cf341"`);
        await queryRunner.query(`ALTER TABLE "audit_events" DROP CONSTRAINT "FK_da4e1f7755a2ab9a8b7ddefaa4d"`);
        await queryRunner.query(`ALTER TABLE "commerces" DROP CONSTRAINT "FK_89afcaa793cf06afb34fbc80002"`);
        await queryRunner.query(`ALTER TABLE "commerces" DROP CONSTRAINT "FK_02590e24cd7494c3f0972f56ae3"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_f7df3e1ab14ce82df68a6d14ccb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_444d46d34372e6a48531a67104"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_60eb0651640961b2bd149829bc"`);
        await queryRunner.query(`DROP TABLE "role_assignments"`);
        await queryRunner.query(`DROP TYPE "public"."role"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_11d3040556882d762d2a787887"`);
        await queryRunner.query(`DROP TABLE "form_submissions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3d49ee8e7db62425d86da7543"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3abcfea84755e14ddd59095677"`);
        await queryRunner.query(`DROP TABLE "form_fields"`);
        await queryRunner.query(`DROP TYPE "public"."form_field_type"`);
        await queryRunner.query(`DROP INDEX "public"."ux_form_versions_one_published"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a5d45ac3c8c9515699f76ca6df"`);
        await queryRunner.query(`DROP TABLE "form_versions"`);
        await queryRunner.query(`DROP TABLE "form_definitions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_377c5d5c8abddb91f62ee99bbd"`);
        await queryRunner.query(`DROP TABLE "services"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d5de0add56627328f0ce0aba9a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_497bb4f7c4c55db9749616cd2a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_54bce107ad3b43a7e22544acc0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d76fae023f217b90282388cf34"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da4e1f7755a2ab9a8b7ddefaa4"`);
        await queryRunner.query(`DROP TABLE "audit_events"`);
        // Both role_assignments and audit_events (the only two tables using
        // "scope_type") are gone at this point — safe to drop now.
        await queryRunner.query(`DROP TYPE "public"."scope_type"`);
        await queryRunner.query(`DROP TYPE "public"."audit_target_type"`);
        await queryRunner.query(`DROP TYPE "public"."audit_action"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9555f7874e3d77bad406c306af"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b453a3eb46f0d64d75ca5051d5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_89afcaa793cf06afb34fbc8000"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_02590e24cd7494c3f0972f56ae"`);
        await queryRunner.query(`DROP TABLE "commerces"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f7df3e1ab14ce82df68a6d14cc"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TABLE "portals"`);
        // Last of the four tables using "entity_status"
        // (users/portals/commerces/form_versions) — safe to drop now.
        await queryRunner.query(`DROP TYPE "public"."entity_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    }

}
