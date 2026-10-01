import { MigrationInterface, QueryRunner } from 'typeorm';

export class GlobalWorkoutTemplates1790900000000 implements MigrationInterface {
  name = 'GlobalWorkoutTemplates1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "workout" ALTER COLUMN "createdById" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "titleI18n" jsonb');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "descriptionI18n" jsonb');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "isGlobal" boolean NOT NULL DEFAULT false');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "templateKey" varchar');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "status" varchar NOT NULL DEFAULT \'published\'');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "difficulty" varchar');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "goal" varchar');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "equipment" jsonb');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "sortOrder" integer NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE "workout" ADD COLUMN "sourceTemplateId" integer');
    await queryRunner.query('CREATE UNIQUE INDEX "UQ_workout_templateKey" ON "workout" ("templateKey") WHERE "templateKey" IS NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_workout_global_status" ON "workout" ("isGlobal", "status")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM "workout" WHERE "isGlobal" = true');
    await queryRunner.query('DROP INDEX "IDX_workout_global_status"');
    await queryRunner.query('DROP INDEX "UQ_workout_templateKey"');
    for (const column of ['sourceTemplateId', 'sortOrder', 'equipment', 'goal', 'difficulty', 'status', 'templateKey', 'isGlobal', 'descriptionI18n', 'titleI18n']) {
      await queryRunner.query(`ALTER TABLE "workout" DROP COLUMN "${column}"`);
    }
    await queryRunner.query('ALTER TABLE "workout" ALTER COLUMN "createdById" SET NOT NULL');
  }
}
