import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { BailianService } from './bailian.service';
import { KnowledgeDocument, Source, splitDocument } from './coach.types';
import { SaveKnowledgeDto } from './coach.dto';
import { COACH_DEMO_DOCUMENTS } from './coach-demo.data';

@Injectable()
export class KnowledgeService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private readonly logger = new Logger(KnowledgeService.name);
  constructor(
    private readonly db: DataSource,
    private readonly ai: BailianService,
  ) {}
  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.work(), 4000);
    this.timer.unref();
  }
  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  list(): Promise<KnowledgeDocument[]> {
    return this.db.query(
      'SELECT * FROM coach_document ORDER BY updated_at DESC LIMIT 500',
    );
  }
  async save(input: SaveKnowledgeDto, id?: string): Promise<KnowledgeDocument> {
    if (!input.content.trim() || input.content.trim().length < 20)
      throw new BadRequestException('请填写至少 20 字的正文。');
    const params = [
      input.title.trim(),
      input.category.trim(),
      input.source.trim(),
      input.content.trim(),
      input.demo,
      randomUUID(),
    ];
    const rows: KnowledgeDocument[] = id
      ? await this.db.query(
          `WITH saved AS (UPDATE coach_document SET title=$1, category=$2, source=$3, content=$4, demo=$5, revision=$6,
          state='draft', error=NULL, updated_at=now() WHERE id=$7 RETURNING *) SELECT * FROM saved`,
          [...params, id],
        )
      : await this.db.query(
          `INSERT INTO coach_document(title,category,source,content,demo,revision,id)
          VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [...params, randomUUID()],
        );
    if (!rows[0]) throw new NotFoundException('资料不存在。');
    return rows[0];
  }
  async seed(): Promise<{ added: number }> {
    let added = 0;
    for (const item of COACH_DEMO_DOCUMENTS) {
      const rows = await this.db.query(
        `INSERT INTO coach_document(id,title,category,source,content,demo,revision,seed_key)
        VALUES($1,$2,$3,'平台生成的演示资料 · 未经专业审核',$4,true,$5,$6) ON CONFLICT(seed_key) DO NOTHING RETURNING id`,
        [
          randomUUID(),
          item.title,
          item.category,
          item.content,
          randomUUID(),
          item.key,
        ],
      );
      added += rows.length;
    }
    return { added };
  }
  async action(id: string, action: 'publish' | 'unpublish'): Promise<void> {
    if (action === 'publish') this.ai.assertConfigured();
    const rows = await this.db.query(
      action === 'publish'
        ? `WITH changed AS (UPDATE coach_document SET state='queued', error=NULL, updated_at=now() WHERE id=$1 RETURNING id) SELECT * FROM changed`
        : `WITH changed AS (UPDATE coach_document SET enabled=false, state='draft', revision=$2, error=NULL, updated_at=now() WHERE id=$1 RETURNING id) SELECT * FROM changed`,
      action === 'publish' ? [id] : [id, randomUUID()],
    );
    if (!rows.length) throw new NotFoundException('资料不存在。');
  }
  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM coach_document WHERE id=$1', [id]);
  }

  async search(query: string, signal?: AbortSignal): Promise<Source[]> {
    const [{ count }] = await this.db.query(
      `SELECT count(*)::int AS count FROM coach_document WHERE enabled AND active_revision IS NOT NULL`,
    );
    if (!count) return [];
    const [embedding] = await this.ai.embed([query.slice(0, 2000)], signal);
    const threshold =
      this.ai.number('COACH_MIN_SIMILARITY_PERCENT', 35, 0, 100) / 100;
    const rows: {
      id: string;
      documentId: string;
      title: string;
      source: string;
      demo: boolean;
      excerpt: string;
      score: number;
    }[] = await this.db.query(
      `
      SELECT c.id, c.document_id AS "documentId", c.title, c.source, c.demo, c.content AS excerpt,
        1 - (c.embedding <=> $1::vector) AS score
      FROM coach_chunk c JOIN coach_document d ON d.id=c.document_id AND d.active_revision=c.revision
      WHERE d.enabled AND c.embedding_model=$2 AND c.embedding_dimensions=$3
        AND 1 - (c.embedding <=> $1::vector) >= $4
      ORDER BY c.embedding <=> $1::vector LIMIT 5`,
      [
        JSON.stringify(embedding),
        this.ai.embeddingModel,
        this.ai.dimensions,
        threshold,
      ],
    );
    return rows;
  }

  private async work(): Promise<void> {
    if (this.busy || !this.ai.configured) return;
    this.busy = true;
    const runner = this.db.createQueryRunner();
    let locked = false;
    let doc: KnowledgeDocument | undefined;
    try {
      await runner.connect();
      [{ locked }] = await runner.query(
        'SELECT pg_try_advisory_lock(7531,1) AS locked',
      );
      if (!locked) return;
      // A processing row survives restart. The advisory lock guarantees there is no live previous worker.
      [doc] = await runner.query(
        `SELECT * FROM coach_document WHERE state IN ('queued','processing') ORDER BY updated_at LIMIT 1`,
      );
      if (!doc) return;
      await runner.query(
        `UPDATE coach_document SET state='processing' WHERE id=$1 AND revision=$2`,
        [doc.id, doc.revision],
      );
      const chunks = splitDocument(doc.content);
      const vectors = await this.ai.embed(
        chunks.map((chunk) => `${doc!.title}\n${chunk}`),
      );
      await runner.startTransaction();
      const [current] = await runner.query(
        'SELECT revision, state FROM coach_document WHERE id=$1 FOR UPDATE',
        [doc.id],
      );
      if (
        current?.revision !== doc.revision ||
        current.state !== 'processing'
      ) {
        await runner.rollbackTransaction();
        return;
      }
      await runner.query('DELETE FROM coach_chunk WHERE document_id=$1', [
        doc.id,
      ]);
      for (let i = 0; i < chunks.length; i++) {
        await runner.query(
          `INSERT INTO coach_chunk(id,document_id,revision,ordinal,content,title,source,demo,embedding,embedding_model,embedding_dimensions)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10,$11)`,
          [
            randomUUID(),
            doc.id,
            doc.revision,
            i,
            chunks[i],
            doc.title,
            doc.source,
            doc.demo,
            JSON.stringify(vectors[i]),
            this.ai.embeddingModel,
            this.ai.dimensions,
          ],
        );
      }
      await runner.query(
        `UPDATE coach_document SET active_revision=revision, enabled=true, state='ready', error=NULL, updated_at=now() WHERE id=$1`,
        [doc.id],
      );
      await runner.commitTransaction();
    } catch {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (doc)
        await this.db.query(
          `UPDATE coach_document SET state='failed',error='向量化失败，请检查百炼配置后重新发布。' WHERE id=$1 AND revision=$2 AND state='processing'`,
          [doc.id, doc.revision],
        );
      this.logger.warn(
        'Knowledge indexing failed; retry is available in the admin panel.',
      );
    } finally {
      if (locked) await runner.query('SELECT pg_advisory_unlock(7531,1)');
      await runner.release();
      this.busy = false;
    }
  }
}
