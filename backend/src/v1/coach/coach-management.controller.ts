import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';
import { SuperAdminGuard } from '../guards/superAdmin.guard';
import { CoachControlService } from './coach-control.service';
import { BailianService } from './bailian.service';
import { KnowledgeService } from './knowledge.service';
import {
  CoachSettingsDto,
  ResolveFeedbackDto,
  SearchKnowledgeDto,
} from './coach.dto';
import { SYSTEM_PROMPT } from './coach.service';
import { citedSources } from './coach.types';

@Controller('admin/coach')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class CoachManagementController {
  constructor(
    private readonly control: CoachControlService,
    private readonly ai: BailianService,
    private readonly knowledge: KnowledgeService,
    private readonly db: DataSource,
  ) {}
  @Get('settings') settings() {
    return this.control.settings();
  }
  @Put('settings') save(
    @Req() req: { user: { id: number } },
    @Body() dto: CoachSettingsDto,
  ) {
    return this.control.saveSettings(req.user.id, dto);
  }
  @Get('monitor') monitor() {
    return this.control.monitor();
  }
  @Get('health') async health() {
    return {
      ...(await this.control.health()),
      configured: this.ai.configured,
      enabled: (await this.control.settings()).enabled,
      chatModel: this.ai.model,
      embeddingModel: this.ai.embeddingModel,
    };
  }
  @Get('feedback') feedback() {
    return this.control.feedbackList();
  }
  @Get('feedback/:id') detail(
    @Req() req: { user: { id: number } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.control.feedbackDetail(req.user.id, id);
  }
  @Put('feedback/:id') resolve(
    @Req() req: { user: { id: number } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveFeedbackDto,
  ) {
    return this.control.resolveFeedback(req.user.id, id, dto);
  }
  @Post('test') async test(
    @Req() req: { user: { id: number } },
    @Body() dto: SearchKnowledgeDto,
  ) {
    return this.runTest(req.user.id, dto.query, false);
  }
  @Post('health/check') async check(@Req() req: { user: { id: number } }) {
    return this.runTest(req.user.id, '请回复 OK。', true);
  }
  private async runTest(actor: number, question: string, health: boolean) {
    this.ai.assertConfigured();
    const runner = this.db.createQueryRunner();
    await runner.connect();
    let locked = false;
    const start = Date.now();
    try {
      [{ locked }] = await runner.query(
        'SELECT pg_try_advisory_lock(7534,1) AS locked',
      );
      if (!locked)
        throw new ConflictException('Another admin test is running.');
      await this.control.reserveTest(actor);
      const settings = await this.control.settings();
      const signal = AbortSignal.timeout(120000);
      if (health) await this.ai.embed(['connection check'], signal);
      const sources = health
        ? []
        : await this.knowledge.search(question, signal);
      let answer = '';
      for await (const delta of this.ai.stream(
        [
          {
            role: 'system',
            content:
              SYSTEM_PROMPT +
              '\n回答风格：' +
              settings.style +
              '\n这是管理员测试，没有用户训练记录。',
          },
          { role: 'user', content: JSON.stringify({ sources }) },
          { role: 'user', content: question },
        ],
        signal,
        health ? 256 : settings.maxOutputTokens,
      ))
        answer += delta;
      if (!answer.trim()) throw new ServiceUnavailableException("Provider returned an empty answer.");
      await this.control.audit(
        actor,
        health ? 'health.check' : 'playground.test',
      );
      return {
        answer,
        sources,
        citations: citedSources(answer, sources),
        durationMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        chat: true,
        embedding: true,
      };
    } finally {
      if (locked) await runner.query('SELECT pg_advisory_unlock(7534,1)');
      await runner.release();
    }
  }
}
