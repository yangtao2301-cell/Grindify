import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoachPlanDraft1791002000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS coach_plan_draft (
        id uuid PRIMARY KEY,
        user_id integer NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        request_id uuid NOT NULL,
        input_hash varchar(64) NOT NULL,
        status varchar(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied')),
        version integer NOT NULL DEFAULT 1,
        payload jsonb NOT NULL,
        applied jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
        UNIQUE(user_id,request_id)
      );
      CREATE INDEX IF NOT EXISTS coach_plan_draft_owner ON coach_plan_draft(user_id,created_at DESC);
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS coach_plan_draft');
  }
}
