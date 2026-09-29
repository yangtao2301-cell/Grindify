/*
 * Copyright (c) 2026 FalkenDev
 *
 * This file is part of Grindify.
 *
 * Grindify is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with Grindify. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class GlobalExercisesAndTranslations1775500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 训练动作表 ────────────────────────────────────────────────────────

    // 允许全局训练动作（没有所有者）
    await queryRunner.query(
      `ALTER TABLE "exercise" ALTER COLUMN "createdById" DROP NOT NULL`,
    );

    // 全局标记——所有现有训练动作保持为 false（属于用户）
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "isGlobal" boolean NOT NULL DEFAULT false`,
    );

    // 个性化跟踪——用户复制或继承已删除的全局训练动作时设置
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "personalizedFromGlobalId" integer NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "personalizedAt" timestamptz NULL`,
    );

    // title：JSONB 翻译对象——由现有 name 字符串迁移而来
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "title" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "exercise" SET "title" = jsonb_build_object('default', "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ALTER COLUMN "title" SET NOT NULL`,
    );

    // descriptionI18n：JSONB——由现有 description 字符串迁移而来
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "descriptionI18n" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "exercise" SET "descriptionI18n" = jsonb_build_object('default', "description")
       WHERE "description" IS NOT NULL AND "description" != ''`,
    );

    // instructionsI18n：JSONB——由现有 JSONB 数组迁移而来
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "instructionsI18n" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "exercise" SET "instructionsI18n" = jsonb_build_object('default', "instructions")
       WHERE "instructions" IS NOT NULL`,
    );

    // proTipsI18n：JSONB——由现有 JSONB 数组迁移而来
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "proTipsI18n" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "exercise" SET "proTipsI18n" = jsonb_build_object('default', "proTips")
       WHERE "proTips" IS NOT NULL`,
    );

    // mistakesI18n：JSONB——由现有 JSONB 数组迁移而来
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "mistakesI18n" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "exercise" SET "mistakesI18n" = jsonb_build_object('default', "mistakes")
       WHERE "mistakes" IS NOT NULL`,
    );

    // ── 活动表 ────────────────────────────────────────────────────────

    // 删除组合唯一约束（name、createdById）——由下面的部分索引替代
    await queryRunner.query(`
      DO $$
      DECLARE
        cname text;
      BEGIN
        SELECT c.conname INTO cname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'activity'
          AND c.contype = 'u'
          AND EXISTS (
            SELECT 1 FROM pg_attribute a
            WHERE a.attrelid = t.oid AND a.attname = 'name' AND a.attnum = ANY(c.conkey)
          )
          AND EXISTS (
            SELECT 1 FROM pg_attribute a
            WHERE a.attrelid = t.oid AND a.attname = 'createdById' AND a.attnum = ANY(c.conkey)
          );
        IF cname IS NOT NULL THEN
          EXECUTE 'ALTER TABLE activity DROP CONSTRAINT "' || cname || '"';
        END IF;
      END $$;
    `);

    // 允许全局活动（没有所有者）
    await queryRunner.query(
      `ALTER TABLE "activity" ALTER COLUMN "createdById" DROP NOT NULL`,
    );

    // 全局标记 + 个性化跟踪
    await queryRunner.query(
      `ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "isGlobal" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "personalizedFromGlobalId" integer NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "personalizedAt" timestamptz NULL`,
    );

    // title：JSONB——由现有 name 字符串迁移而来
    await queryRunner.query(
      `ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "title" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "activity" SET "title" = jsonb_build_object('default', "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" ALTER COLUMN "title" SET NOT NULL`,
    );

    // descriptionI18n：JSONB——由现有 description 字符串迁移而来
    await queryRunner.query(
      `ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "descriptionI18n" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "activity" SET "descriptionI18n" = jsonb_build_object('default', "description")
       WHERE "description" IS NOT NULL AND "description" != ''`,
    );

    // 用部分唯一索引替代旧的组合约束
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_activity_name_user"
        ON "activity" ("name", "createdById")
        WHERE "createdById" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_activity_name_global"
        ON "activity" ("name")
        WHERE "createdById" IS NULL
    `);

    // ── 用户表 ────────────────────────────────────────────────────────────

    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "language" varchar(10) NOT NULL DEFAULT 'default'`,
    );

    // ── 肌群表 ────────────────────────────────────────────────────

    // nameI18n：JSONB 展示名称——由现有 name 字符串迁移而来（name 仍作为内部键）
    await queryRunner.query(
      `ALTER TABLE "muscle_group" ADD COLUMN IF NOT EXISTS "nameI18n" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "muscle_group" SET "nameI18n" = jsonb_build_object('default', "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "muscle_group" ALTER COLUMN "nameI18n" SET NOT NULL`,
    );

    // descriptionI18n：JSONB——由现有 description 字符串迁移而来
    await queryRunner.query(
      `ALTER TABLE "muscle_group" ADD COLUMN IF NOT EXISTS "descriptionI18n" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "muscle_group" SET "descriptionI18n" = jsonb_build_object('default', "description")
       WHERE "description" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── 肌群 ──────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "muscle_group" DROP COLUMN IF EXISTS "descriptionI18n"`,
    );
    await queryRunner.query(
      `ALTER TABLE "muscle_group" DROP COLUMN IF EXISTS "nameI18n"`,
    );

    // ── 用户 ──────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "language"`,
    );

    // ── 活动 ──────────────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_activity_name_global"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_activity_name_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" DROP COLUMN IF EXISTS "descriptionI18n"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" DROP COLUMN IF EXISTS "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" DROP COLUMN IF EXISTS "personalizedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" DROP COLUMN IF EXISTS "personalizedFromGlobalId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" DROP COLUMN IF EXISTS "isGlobal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" ALTER COLUMN "createdById" SET NOT NULL`,
    );
    // 恢复原有唯一约束
    await queryRunner.query(
      `ALTER TABLE "activity" ADD CONSTRAINT "UQ_activity_name_createdBy"
       UNIQUE ("name", "createdById")`,
    );

    // ── 训练动作 ──────────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "mistakesI18n"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "proTipsI18n"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "instructionsI18n"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "descriptionI18n"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "personalizedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "personalizedFromGlobalId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "isGlobal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ALTER COLUMN "createdById" SET NOT NULL`,
    );
  }
}
