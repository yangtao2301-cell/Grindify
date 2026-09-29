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

const iconMapping: [string, string][] = [
  ['running', 'run'],
  ['walking', 'walk'],
  ['cycling', 'bike'],
  ['football', 'soccer'],
  ['swimming', 'swim'],
  ['boxing', 'boxing-glove'],
  ['skiing', 'ski'],
  ['skating', 'skate'],
  ['other', 'dots-horizontal'],
];

export class MigrateActivityIconsToMdiNames1774300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 将列改为 text，以便自由更新值
    await queryRunner.query(
      `ALTER TABLE "activity" ALTER COLUMN "icon" TYPE TEXT`,
    );

    // 删除旧枚举类型
    await queryRunner.query(`DROP TYPE IF EXISTS "activity_icon_enum"`);

    // 将旧图标值重命名为正确的 MDI 图标名称
    for (const [oldValue, newValue] of iconMapping) {
      await queryRunner.query(
        `UPDATE "activity" SET "icon" = $1 WHERE "icon" = $2`,
        [newValue, oldValue],
      );
    }

    // 创建包含 MDI 图标名称的新枚举类型
    await queryRunner.query(
      `CREATE TYPE "activity_icon_enum" AS ENUM (` +
        `'run', 'walk', 'bike', 'soccer', 'swim', 'kayaking', 'hiking', ` +
        `'yoga', 'boxing-glove', 'tennis', 'basketball', 'volleyball', ` +
        `'ski', 'skate', 'rowing', 'dots-horizontal')`,
    );

    // 恢复枚举列
    await queryRunner.query(
      `ALTER TABLE "activity" ALTER COLUMN "icon" TYPE "activity_icon_enum" USING "icon"::"activity_icon_enum"`,
    );

    // 恢复默认值
    await queryRunner.query(
      `ALTER TABLE "activity" ALTER COLUMN "icon" SET DEFAULT 'dots-horizontal'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 将列改为 text
    await queryRunner.query(
      `ALTER TABLE "activity" ALTER COLUMN "icon" TYPE TEXT`,
    );

    // 删除新枚举类型
    await queryRunner.query(`DROP TYPE IF EXISTS "activity_icon_enum"`);

    // 将 MDI 图标名称还原为旧值
    for (const [oldValue, newValue] of iconMapping) {
      await queryRunner.query(
        `UPDATE "activity" SET "icon" = $1 WHERE "icon" = $2`,
        [oldValue, newValue],
      );
    }

    // 重新创建旧枚举类型
    await queryRunner.query(
      `CREATE TYPE "activity_icon_enum" AS ENUM (` +
        `'running', 'walking', 'cycling', 'football', 'swimming', 'kayaking', ` +
        `'hiking', 'yoga', 'boxing', 'tennis', 'basketball', 'volleyball', ` +
        `'skiing', 'skating', 'rowing', 'other')`,
    );

    // 恢复枚举列
    await queryRunner.query(
      `ALTER TABLE "activity" ALTER COLUMN "icon" TYPE "activity_icon_enum" USING "icon"::"activity_icon_enum"`,
    );

    // 恢复默认值
    await queryRunner.query(
      `ALTER TABLE "activity" ALTER COLUMN "icon" SET DEFAULT 'other'`,
    );
  }
}
