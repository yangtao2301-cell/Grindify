import { MigrationInterface, QueryRunner } from 'typeorm';

/** Coach tables use SQL because the project's TypeORM version has no vector column support. */
export class AddFitnessCoach1791000000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS coach_conversation (
        id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        title varchar(80) NOT NULL DEFAULT '新对话', summary text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS coach_conversation_owner ON coach_conversation(user_id, updated_at DESC);
      CREATE TABLE IF NOT EXISTS coach_message (
        id uuid PRIMARY KEY, sequence bigserial NOT NULL, conversation_id uuid NOT NULL REFERENCES coach_conversation(id) ON DELETE CASCADE,
        request_id uuid NOT NULL, role varchar(12) NOT NULL CHECK (role IN ('user','assistant')),
        content text NOT NULL DEFAULT '', status varchar(12) NOT NULL DEFAULT 'complete',
        sources jsonb NOT NULL DEFAULT '[]', memory_state varchar(12) NOT NULL DEFAULT 'none',
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(conversation_id, request_id, role)
      );
      CREATE INDEX IF NOT EXISTS coach_message_history ON coach_message(conversation_id, sequence);
      CREATE TABLE IF NOT EXISTS coach_memory (
        id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        kind varchar(30) NOT NULL, content varchar(500) NOT NULL,
        evidence varchar(1000) NOT NULL DEFAULT '', source_message_id uuid REFERENCES coach_message(id) ON DELETE SET NULL,
        locked boolean NOT NULL DEFAULT false, hidden boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, kind)
      );
      CREATE TABLE IF NOT EXISTS coach_usage (
        user_id integer NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        day date NOT NULL, requests integer NOT NULL DEFAULT 0, PRIMARY KEY(user_id, day)
      );
      CREATE TABLE IF NOT EXISTS coach_document (
        id uuid PRIMARY KEY, title varchar(160) NOT NULL, category varchar(60) NOT NULL DEFAULT '通用',
        source varchar(500) NOT NULL DEFAULT '', content text NOT NULL,
        demo boolean NOT NULL DEFAULT false, seed_key varchar(80) UNIQUE,
        revision uuid NOT NULL, active_revision uuid, enabled boolean NOT NULL DEFAULT false,
        state varchar(16) NOT NULL DEFAULT 'draft', error varchar(500),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS coach_chunk (
        id uuid PRIMARY KEY, document_id uuid NOT NULL REFERENCES coach_document(id) ON DELETE CASCADE,
        revision uuid NOT NULL, ordinal integer NOT NULL, content text NOT NULL,
        title varchar(160) NOT NULL, source varchar(500) NOT NULL, demo boolean NOT NULL,
        embedding vector NOT NULL, embedding_model varchar(160) NOT NULL, embedding_dimensions integer NOT NULL,
        UNIQUE(document_id, revision, ordinal)
      );
      CREATE INDEX IF NOT EXISTS coach_chunk_revision ON coach_chunk(document_id, revision);
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DROP TABLE IF EXISTS coach_chunk, coach_document, coach_memory, coach_message, coach_conversation, coach_usage`,
    );
  }
}
