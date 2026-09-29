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

/**
 * 第 11 阶段清理：删除已被 1775500000000-GlobalExercisesAndTranslations
 * 中 JSONB i18n 列替代的旧字符串列。
 *
 * 新 JSONB 列上线并确认稳定后即可安全执行。删除后，down() 迁移无法恢复字符串数据，
 * 因此执行前请先备份数据库。
 */
export class DropLegacyColumns1775600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 训练动作表 ────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "instructions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "proTips"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "mistakes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "i18nKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP COLUMN IF EXISTS "isNameCustom"`,
    );

    // ── 活动表 ────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "activity" DROP COLUMN IF EXISTS "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" DROP COLUMN IF EXISTS "description"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 恢复训练动作旧列（数据已经丢失，列将为空）
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "name" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "instructions" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "proTips" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "mistakes" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "i18nKey" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN IF NOT EXISTS "isNameCustom" boolean NOT NULL DEFAULT false`,
    );

    // 恢复活动旧列（数据已经丢失）
    await queryRunner.query(
      `ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "name" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "description" text`,
    );
  }
}
