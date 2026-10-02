import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  CoachFeedbackDto,
  CoachSettingsDto,
  ResolveFeedbackDto,
} from './coach.dto';

@Injectable()
export class CoachControlService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}
  async settings(): Promise<CoachSettingsDto> {
    const [row] = await this.db.query(
      'SELECT value FROM coach_settings WHERE id=1',
    );
    const num = (key: string, fallback: number, max: number) =>
      Math.min(max, Math.max(1, Math.floor(Number(this.config.get(key))) || fallback));
    return (
      row?.value || {
        enabled: true,
        name: '健身教练',
        welcome:
          '我可以结合你的训练记录，帮你复盘、解答疑问，找到下一步的方向。',
        quickQuestions: [
          '分析我最近的训练',
          '今天适合练什么？',
          '如何安排每周训练？',
        ],
        style: 'balanced',
        dailyUserLimit: num('COACH_DAILY_USER_LIMIT', 30, 500),
        dailyTotalLimit: num('COACH_DAILY_TOTAL_LIMIT', 1000, 50000),
        maxOutputTokens: Math.max(
          256,
          num('COACH_MAX_OUTPUT_TOKENS', 1500, 4000),
        ),
      }
    );
  }
  async saveSettings(actor: number, value: CoachSettingsDto) {
    await this.db.transaction(async (q) => {
      await q.query(
        `INSERT INTO coach_settings(id,value) VALUES(1,$1::jsonb) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=now()`,
        [JSON.stringify(value)],
      );
      await q.query(
        `INSERT INTO coach_admin_audit(actor_id,action) VALUES($1,'settings.update')`,
        [actor],
      );
    });
    return value;
  }
  async audit(actor: number, action: string, target = '') {
    await this.db.query(
      'INSERT INTO coach_admin_audit(actor_id,action,target) VALUES($1,$2,$3)',
      [actor, action, target],
    );
  }
  async record(
    kind: string,
    model: string,
    status: string,
    start: number,
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    },
    errorCode?: string,
  ) {
    const token = (n: unknown) =>
      typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 2147483647
        ? n
        : null;
    // Store operational metadata only; never prompts, provider response bodies or credentials.
    await this.db
      .query(
        `INSERT INTO coach_operation(kind,model,status,duration_ms,input_tokens,output_tokens,error) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [
          kind,
          model,
          status,
          Math.min(2147483647, Date.now() - start),
          token(usage?.prompt_tokens ?? usage?.total_tokens),
          kind === 'embedding' ? null : token(usage?.completion_tokens),
          status === 'failed'
            ? errorCode || 'invalid_or_interrupted_response'
            : null,
        ],
      )
      .catch(() => undefined);
  }
  async monitor() {
    const [summary, daily, recent, queues, audit] = await Promise.all([
      this.db
        .query(`SELECT count(*)::int AS requests,count(*) FILTER(WHERE status='success')::int AS succeeded,
        count(*) FILTER(WHERE status='failed')::int AS failed,round(avg(duration_ms))::int AS avg_ms,
        COALESCE(sum(input_tokens),0)::bigint AS input_tokens,COALESCE(sum(output_tokens),0)::bigint AS output_tokens,
        count(*) FILTER(WHERE input_tokens IS NULL)::int AS unknown_usage
        FROM coach_operation WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai'`),
      this.db
        .query(`SELECT to_char(created_at AT TIME ZONE 'Asia/Shanghai','YYYY-MM-DD') AS day,count(*)::int AS requests,
        count(*) FILTER(WHERE status='failed')::int AS failed FROM coach_operation WHERE created_at>now()-interval '7 days' GROUP BY 1 ORDER BY 1`),
      this.db.query('SELECT * FROM coach_operation ORDER BY id DESC LIMIT 100'),
      this.db.query(
        `SELECT state,count(*)::int AS count FROM coach_document GROUP BY state`,
      ),
      this.db.query(
        'SELECT * FROM coach_admin_audit ORDER BY id DESC LIMIT 50',
      ),
    ]);
    return { summary: summary[0], daily, recent, queues, audit };
  }
  async health() {
    const [row] = await this.db
      .query(`SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname='vector') AS vector,
      (SELECT count(*)::int FROM coach_document WHERE state='failed') AS failed_documents,
      (SELECT count(*)::int FROM coach_document WHERE state IN ('queued','processing')) AS pending_documents`);
    return { database: true, ...row };
  }
  async reserveTest(actor: number) {
    const settings = await this.settings();
    await this.db.transaction(async (q) => {
      await q.query('SELECT pg_advisory_xact_lock(7533,1)');
      const [{ total }] = await q.query(
        `SELECT (SELECT COALESCE(sum(requests),0) FROM coach_usage WHERE day=(now() AT TIME ZONE 'Asia/Shanghai')::date)+(SELECT COALESCE(sum(requests),0) FROM coach_test_usage WHERE day=(now() AT TIME ZONE 'Asia/Shanghai')::date) AS total`,
      );
      if (Number(total) >= settings.dailyTotalLimit)
        throw new HttpException('Daily site limit reached.', 429);
      const rows = await q.query(
        `WITH changed AS (INSERT INTO coach_test_usage(user_id,day,requests) VALUES($1,(now() AT TIME ZONE 'Asia/Shanghai')::date,1)
        ON CONFLICT(user_id,day) DO UPDATE SET requests=coach_test_usage.requests+1 WHERE coach_test_usage.requests<20 RETURNING requests) SELECT * FROM changed`,
        [actor],
      );
      if (!rows.length)
        throw new HttpException('Admin tests are limited to 20 per day.', 429);
    });
  }
  async feedback(userId: number, messageId: string, dto: CoachFeedbackDto) {
    const [m] = await this.db.query(
      `SELECT m.content,m.sources,(SELECT content FROM coach_message u WHERE u.conversation_id=m.conversation_id AND u.request_id=m.request_id AND u.role='user') AS question
      FROM coach_message m JOIN coach_conversation c ON c.id=m.conversation_id WHERE m.id=$1 AND c.user_id=$2 AND m.role='assistant' AND m.status='complete'`,
      [messageId, userId],
    );
    if (!m) throw new NotFoundException('回答不存在。');
    await this.db.query(
      `INSERT INTO coach_feedback(id,user_id,message_id,rating,comment,shared,question,answer,sources)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT(user_id,message_id) DO UPDATE SET
      rating=excluded.rating,comment=excluded.comment,shared=excluded.shared,question=excluded.question,answer=excluded.answer,sources=excluded.sources,state='open',resolution='',document_id=NULL,updated_at=now()`,
      [
        randomUUID(),
        userId,
        messageId,
        dto.rating,
        dto.comment,
        dto.shareContext,
        dto.shareContext ? m.question : null,
        dto.shareContext ? m.content : null,
        JSON.stringify(dto.shareContext ? m.sources : []),
      ],
    );
    return { ok: true };
  }
  async feedbackList() {
    return this.db.query(
      `SELECT id,rating,comment,shared,state,resolution,document_id,created_at,updated_at FROM coach_feedback ORDER BY updated_at DESC LIMIT 200`,
    );
  }
  async feedbackDetail(actor: number, id: string) {
    const [row] = await this.db.query(
      'SELECT id,rating,comment,shared,question,answer,sources,state,resolution,document_id FROM coach_feedback WHERE id=$1',
      [id],
    );
    if (!row) throw new NotFoundException();
    await this.audit(actor, 'feedback.view', id);
    return row;
  }
  async resolveFeedback(actor: number, id: string, dto: ResolveFeedbackDto) {
    await this.db.transaction(async (q) => {
      if (dto.documentId) {
        const rows = await q.query(
          'SELECT id FROM coach_document WHERE id=$1',
          [dto.documentId],
        );
        if (!rows.length)
          throw new NotFoundException('Knowledge document not found.');
      }
      const rows = await q.query(
        `WITH changed AS (UPDATE coach_feedback SET state=$2,resolution=$3,document_id=$4,updated_at=now() WHERE id=$1 RETURNING id) SELECT * FROM changed`,
        [id, dto.state, dto.resolution, dto.documentId || null],
      );
      if (!rows.length) throw new NotFoundException();
      await q.query(
        `INSERT INTO coach_admin_audit(actor_id,action,target) VALUES($1,'feedback.resolve',$2)`,
        [actor, id],
      );
    });
    return { ok: true };
  }
}
