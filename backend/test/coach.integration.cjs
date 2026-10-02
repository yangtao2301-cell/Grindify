/* Run against the disposable coach_test database only. No live model calls are made. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '15439',
  DATABASE_USER: 'coach_test',
  DATABASE_PASSWORD: 'coach-test-only',
  DATABASE_NAME: 'coach_test',
  DATABASE_SYNCHRONIZE: 'true',
  JWT_SECRET: 'coach-integration-test-secret',
  COACH_ENABLED: 'true',
  DASHSCOPE_API_KEY: 'test-only-not-a-key',
  DASHSCOPE_BASE_URL: 'https://coach-test.invalid/compatible-mode/v1',
  COACH_DAILY_USER_LIMIT: '3',
  GOOGLE_CLIENT_ID: '',
  GITHUB_CLIENT_ID: '',
  RESEND_API_KEY: '',
  AUTH_COOKIE_DOMAIN: '',
  AUTH_COOKIE_SECURE: 'false',
  AUTH_COOKIE_SAMESITE: 'lax',
  AUTH_COOKIE_PATH: '/',
});
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const { DataSource } = require('typeorm');
const { JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const { AppModule } = require('../dist/app.module');
const { CoachService } = require('../dist/coach/coach.service');
const { KnowledgeService } = require('../dist/coach/knowledge.service');
const { BailianService } = require('../dist/coach/bailian.service');
const {
  AddFitnessCoach1791000000000,
} = require('../dist/migrations/1791000000000-AddFitnessCoach');
const { splitDocument, citedSources } = require('../dist/coach/coach.types');

async function main() {
  const ai = new BailianService(new ConfigService(process.env));
  let providerCalls = 0;
  let failStream = false;
  let beforeEmbed;
  let capturedMessages;
  ai.embed = async (texts) => {
    if (beforeEmbed) {
      const hook = beforeEmbed;
      beforeEmbed = undefined;
      await hook();
    }
    return texts.map(() => [1, ...Array(ai.dimensions - 1).fill(0)]);
  };
  ai.stream = async function* (messages) {
    providerCalls++;
    capturedMessages = messages;
    yield '根据最近28天的训练记录，';
    if (failStream) {
      failStream = false;
      throw new Error('simulated disconnect');
    }
    yield '我们可以先核对你的训练目标。演示资料 [1]。';
  };
  ai.json = async (messages) => {
    const data = JSON.parse(messages[1].content);
    const evidence = data.user.includes('三次')
      ? '每周可以训练三次'
      : data.user.includes('四次')
        ? '每周可以训练四次'
        : '';
    return {
      memories: evidence
        ? [{ kind: 'schedule', content: evidence, evidence }]
        : [],
      summary: '用户在讨论每周训练时间。',
    };
  };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(BailianService)
    .useValue(ai)
    .compile();
  const app = module.createNestApplication({ logger: false });
  app.useBodyParser('json', { limit: '1mb' });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: ['http://localhost:5179', 'http://localhost:5180'],
    credentials: true,
  });
  await app.init().catch(async (error) => {
    await app.close();
    throw error;
  });
  const db = app.get(DataSource);
  assert.equal(db.options.database, 'coach_test');
  const coach = app.get(CoachService);
  const knowledge = app.get(KnowledgeService);
  clearInterval(coach.timer);
  clearInterval(knowledge.timer);
  let preview = false;
  try {
    // Migration rollback/reapplication only touches its own tables and works repeatedly.
    const runner = db.createQueryRunner();
    await runner.connect();
    const migration = new AddFitnessCoach1791000000000();
    await migration.down(runner);
    await migration.up(runner);
    await migration.up(runner);
    await runner.release();
    const [a] = await db.query(
      `INSERT INTO "user"(email,role,"onboardingCompleted") VALUES($1,'superadmin',true) RETURNING id`,
      [`coach-a-${randomUUID()}@example.invalid`],
    );
    const [b] = await db.query(
      `INSERT INTO "user"(email,"onboardingCompleted") VALUES($1,true) RETURNING id`,
      [`coach-b-${randomUUID()}@example.invalid`],
    );
    const jwt = app.get(JwtService);
    const cookieA = `auth_token=${jwt.sign({ id: a.id })}`;
    const cookieB = `auth_token=${jwt.sign({ id: b.id })}`;
    const http = request(app.getHttpServer());
    await http.get('/v1/coach/conversations').expect(401);
    await http
      .get('/v1/admin/coach/documents')
      .set('Cookie', cookieB)
      .expect(403);
    assert.equal((await knowledge.seed()).added, 6);
    assert.equal((await knowledge.seed()).added, 0);
    const doc = (await knowledge.list())[0];
    assert.equal(
      (await knowledge.search('训练')).length,
      0,
      'drafts are not searchable',
    );
    await knowledge.action(doc.id, 'publish');
    await knowledge.work();
    assert.equal((await knowledge.search('训练'))[0].title, doc.title);
    const updated = {
      ...doc,
      title: '新版资料标题',
      content: doc.content + '\n新版本的测试资料内容。',
    };
    await knowledge.save(updated, doc.id);
    assert.equal(
      (await knowledge.search('训练'))[0].title,
      doc.title,
      'old snapshot stays live',
    );
    await knowledge.action(doc.id, 'publish');
    beforeEmbed = () => knowledge.action(doc.id, 'unpublish');
    await knowledge.work();
    assert.equal(
      (await knowledge.search('训练')).length,
      0,
      'unpublish during indexing must not republish',
    );
    await knowledge.action(doc.id, 'publish');
    await knowledge.work();
    assert.equal((await knowledge.search('训练'))[0].title, updated.title);
    await db.query(
      `INSERT INTO workout_session("userId",status,"totalWeight") VALUES($1,'finished',100),($2,'finished',999)`,
      [a.id, b.id],
    );
    const training = await coach.trainingContext(a.id);
    assert.equal(training.totals.completed_sessions, 1);
    assert.equal(Number(training.totals.recorded_volume_kg), 100);
    const conversation = (
      await http
        .post('/v1/coach/conversations')
        .set('Cookie', cookieA)
        .expect(201)
    ).body;
    await http
      .get(`/v1/coach/conversations/${conversation.id}/messages`)
      .set('Cookie', cookieB)
      .expect(404);
    const requestId = randomUUID();
    const body = { content: '我每周可以训练三次', requestId };
    await http
      .post(`/v1/coach/conversations/${conversation.id}/messages`)
      .set('Cookie', cookieA)
      .send({ ...body, userId: b.id })
      .expect(400);
    const reply = await http
      .post(`/v1/coach/conversations/${conversation.id}/messages`)
      .set('Cookie', cookieA)
      .send(body)
      .expect(200);
    assert.match(reply.text, /"type":"done"/);
    const history = await coach.history(a.id, conversation.id);
    assert.equal(history.length, 2);
    assert.equal(history[1].sources[0].title, updated.title);
    assert.ok(
      capturedMessages.some((m) => m.content.includes('recorded_volume_kg')),
    );
    await http
      .post(`/v1/coach/conversations/${conversation.id}/messages`)
      .set('Cookie', cookieA)
      .send(body)
      .expect(200);
    assert.equal(providerCalls, 1, 'idempotent retries do not charge again');
    await coach.extractMemory();
    const memory = (await coach.memories(a.id))[0];
    assert.equal(memory.content, '每周可以训练三次');
    assert.equal((await coach.memories(b.id)).length, 0);
    await http
      .put(`/v1/coach/memories/${memory.id}`)
      .set('Cookie', cookieB)
      .send({ content: '更改他人记忆' })
      .expect(404);
    await coach.updateMemory(a.id, memory.id, '用户手动固定的训练安排');
    await http
      .post(`/v1/coach/conversations/${conversation.id}/messages`)
      .set('Cookie', cookieA)
      .send({ content: '我每周可以训练四次', requestId: randomUUID() })
      .expect(200);
    await coach.extractMemory();
    assert.equal(
      (await coach.memories(a.id))[0].content,
      '用户手动固定的训练安排',
    );
    await coach.deleteMemory(a.id, memory.id);
    failStream = true;
    const failedId = randomUUID();
    const failed = await http
      .post(`/v1/coach/conversations/${conversation.id}/messages`)
      .set('Cookie', cookieA)
      .send({ content: '我每周可以训练四次', requestId: failedId })
      .expect(200);
    assert.match(failed.text, /"type":"error"/);
    assert.equal(
      (await coach.history(a.id, conversation.id)).at(-1).status,
      'failed',
    );
    await http
      .post(`/v1/coach/conversations/${conversation.id}/messages`)
      .set('Cookie', cookieA)
      .send({ content: '额度检查', requestId: randomUUID() })
      .expect(429);
    await db.query('UPDATE coach_usage SET requests=0 WHERE user_id=$1', [
      a.id,
    ]);
    await http
      .post(`/v1/coach/conversations/${conversation.id}/messages`)
      .set('Cookie', cookieA)
      .send({ content: '我每周可以训练四次', requestId: failedId })
      .expect(200);
    assert.equal(
      (await coach.history(a.id, conversation.id)).filter(
        (m) => m.request_id === failedId,
      ).length,
      2,
    );
    await coach.extractMemory();
    assert.equal(
      (await coach.memories(a.id)).length,
      0,
      'deleted memory cannot be resurrected',
    );
    await http
      .delete(`/v1/coach/conversations/${conversation.id}`)
      .set('Cookie', cookieB)
      .expect(200);
    assert.ok(await coach.owned(a.id, conversation.id));
    await coach.delete(a.id, conversation.id);
    assert.equal(
      (
        await db.query('SELECT * FROM coach_message WHERE conversation_id=$1', [
          conversation.id,
        ])
      ).length,
      0,
    );
    const chunks = splitDocument('训练资料。'.repeat(700));
    assert.ok(chunks.length > 1 && chunks.every((c) => c.length <= 901));
    assert.deepEqual(citedSources('未引用', [doc]), []);
    console.log(
      'PASS: auth, ownership, training isolation, vector retrieval, version publication, cancellation, citations, idempotency, memory extraction/edit/delete, retry, daily limit, migration lifecycle.',
    );
    if (process.argv.includes('--preview')) {
      await db.query(
        `DELETE FROM "user" WHERE email='coach-preview@example.invalid'`,
      );
      const hash = await require('bcrypt').hash('Coach-test-only-2026!', 10);
      await db.query(
        `UPDATE "user" SET email=$2,password=$3,"firstName"='教练',"lastName"='演示',language='zho' WHERE id=$1`,
        [a.id, 'coach-preview@example.invalid', hash],
      );
      await db.query('UPDATE coach_usage SET requests=0 WHERE user_id=$1', [
        a.id,
      ]);
      for (const item of await knowledge.list())
        await knowledge.action(item.id, 'unpublish');
      const demoDoc = (await knowledge.list()).find((item) =>
        item.title.includes('训练目标'),
      );
      await knowledge.action(demoDoc.id, 'publish');
      await knowledge.work();
      coach.onApplicationBootstrap();
      knowledge.onApplicationBootstrap();
      await app.listen(15440, '127.0.0.1');
      preview = true;
      console.log('Local mock preview API: http://localhost:15440/v1');
    }
  } finally {
    if (!preview) await app.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
