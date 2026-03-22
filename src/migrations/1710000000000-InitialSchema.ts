import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
        CREATE TYPE "user_type" AS ENUM ('user','provider', 'admin');
      END IF;
    END
    $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(128) NOT NULL,
        "userName" varchar(128) NOT NULL UNIQUE,
        "passwordHash" text NOT NULL,
        "type" "user_type" NOT NULL DEFAULT 'user',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_userName" ON "users" ("userName")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "nfcCardUid" varchar(128),
        "pinHash" text NOT NULL,
        "publicKeyHex" varchar(130) NOT NULL,
        "encryptedPrivateKey" text NOT NULL,
        "balance" numeric(18,2) NOT NULL DEFAULT 0,
        "isLocked" boolean NOT NULL DEFAULT FALSE,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_accounts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
       )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_accounts_nfcCardUid" ON "accounts" ("nfcCardUid")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_accounts_userId" ON "accounts" ("userId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "account_attempts" (
        "id" serial PRIMARY KEY,
        "accountId" uuid NOT NULL,
        "attemptedAt" timestamptz NOT NULL DEFAULT now(),
        "success" boolean NOT NULL DEFAULT FALSE,
        "ipAddress" varchar(128) NOT NULL,
        CONSTRAINT "FK_account_attempts_account" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_account_attempts_accountId" ON "account_attempts" ("accountId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blocks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "height" bigint NOT NULL,
        "prevHash" varchar(64) NOT NULL,
        "hash" varchar(64) NOT NULL,
        "txHash" varchar(64) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blocks_height" ON "blocks" ("height")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blocks_hash" ON "blocks" ("hash")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transactions" (
        "id" serial PRIMARY KEY,
        "accountId" uuid NOT NULL,
        "toAccountId" uuid NULL,
        "nfcCardUid" varchar(128) NULL,
        "amount" numeric(18,2) NOT NULL,
        "type" varchar(16) NOT NULL,
        "description" text NULL,
        "blockchainPayload" text NOT NULL,
        "blockchainSignature" varchar(130) NOT NULL,
        "blockId" uuid NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_transactions_account" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_transactions_block" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_transactions_toAccount" FOREIGN KEY ("toAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "chk_complex_logic" CHECK (
           CASE
             WHEN "type" = 'MINT' THEN "accountId" IS NULL
             WHEN "type" = 'PURCHASE' THEN "accountId" IS NOT NULL
             ELSE "accountId" IS NOT NULL
           END
         )
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transactions_accountId" ON "transactions" ("accountId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transactions_createdAt" ON "transactions" ("createdAt")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_transactions_blockId" ON "transactions" ("blockId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_toAccountId" ON "transactions" ("toAccountId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_nfcCardUid" ON "transactions" ("nfcCardUid")`,
    );

    await queryRunner.query(`DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_token_type') THEN
          CREATE TYPE "api_token_type" AS ENUM ('login', 'api');
        END IF;
      END
      $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "privilege" varchar(16) NOT NULL,
        "type" "api_token_type" NOT NULL DEFAULT 'login',
        "expiresAt" timestamptz NULL,
        "revokedAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_api_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_api_tokens_userId" ON "api_tokens" ("userId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "item_providers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(128) NOT NULL,
        "userId" uuid NOT NULL,
        "accountId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_item_providers_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_item_providers_account" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_item_providers_userId" ON "item_providers" ("userId")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_item_providers_accountId" ON "item_providers" ("accountId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "providerId" uuid NOT NULL,
        "name" varchar(128) NOT NULL,
        "description" text NOT NULL,
        "value" numeric(18,2) NOT NULL,
        "amount" int NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_items_provider" FOREIGN KEY ("providerId") REFERENCES "item_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_items_providerId" ON "items" ("providerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_items_name" ON "items" ("name")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_items_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_items_providerId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "items"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_item_providers_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "item_providers"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_api_tokens_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_tokens"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "api_token_type"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_nfcCardUid"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_toAccountId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_blockId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_accountId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_blocks_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_blocks_height"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blocks"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_account_attempts_accountId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "account_attempts"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounts_nfcCardUid"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounts_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "accounts"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_userName"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "user_type"`);
  }
}
