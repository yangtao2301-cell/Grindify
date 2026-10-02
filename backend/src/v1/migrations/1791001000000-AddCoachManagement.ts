import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoachManagement1791001000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS coach_settings (id integer PRIMARY KEY CHECK(id=1), value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS coach_operation (
        id bigserial PRIMARY KEY, kind varchar(30) NOT NULL, model varchar(160) NOT NULL,
        status varchar(20) NOT NULL, duration_ms integer NOT NULL,
        input_tokens integer, output_tokens integer, error varchar(120), created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS coach_operation_time ON coach_operation(created_at DESC);
      CREATE TABLE IF NOT EXISTS coach_test_usage (
        user_id integer NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, day date NOT NULL,
        requests integer NOT NULL DEFAULT 0, PRIMARY KEY(user_id,day)
      );
      CREATE TABLE IF NOT EXISTS coach_feedback (
        id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        message_id uuid REFERENCES coach_message(id) ON DELETE SET NULL,
        rating varchar(10) NOT NULL CHECK(rating IN ('up','down')), comment varchar(1000) NOT NULL DEFAULT '',
        shared boolean NOT NULL DEFAULT false, question text, answer text, sources jsonb NOT NULL DEFAULT '[]',
        state varchar(20) NOT NULL DEFAULT 'open', resolution varchar(1000) NOT NULL DEFAULT '',
        document_id uuid REFERENCES coach_document(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id,message_id)
      );
      CREATE TABLE IF NOT EXISTS coach_admin_audit (
        id bigserial PRIMARY KEY, actor_id integer REFERENCES "user"(id) ON DELETE SET NULL,
        action varchar(80) NOT NULL, target varchar(80) NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'DROP TABLE IF EXISTS coach_admin_audit, coach_feedback, coach_test_usage, coach_operation, coach_settings',
    );
  }
}
