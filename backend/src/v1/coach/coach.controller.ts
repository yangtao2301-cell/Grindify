import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';
import { SuperAdminGuard } from '../guards/superAdmin.guard';
import { CoachControlService } from './coach-control.service';
import { CoachFeedbackDto } from './coach.dto';
import { CoachService } from './coach.service';
import { KnowledgeService } from './knowledge.service';
import { BailianService } from './bailian.service';
import {
  KnowledgeActionDto,
  SaveKnowledgeDto,
  SearchKnowledgeDto,
  SendCoachMessageDto,
  UpdateCoachMemoryDto,
} from './coach.dto';

type AuthRequest = Request & { user: { id: number } };

@Controller('coach')
@UseGuards(JwtAuthGuard)
export class CoachController {
  constructor(
    private readonly coach: CoachService,
    private readonly control: CoachControlService,
  ) {}
  @Post('messages/:id/feedback') feedback(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CoachFeedbackDto,
  ) {
    return this.control.feedback(req.user.id, id, dto);
  }
  @Get('status') status() {
    return this.coach.status();
  }
  @Get('conversations') list(@Req() req: AuthRequest) {
    return this.coach.conversations(req.user.id);
  }
  @Post('conversations') create(@Req() req: AuthRequest) {
    return this.coach.create(req.user.id);
  }
  @Get('conversations/:id/messages') history(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.coach.history(req.user.id, id);
  }
  @Delete('conversations/:id') async delete(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.coach.delete(req.user.id, id);
    return { ok: true };
  }
  @Get('memories') memories(@Req() req: AuthRequest) {
    return this.coach.memories(req.user.id);
  }
  @Put('memories/:id') async updateMemory(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCoachMemoryDto,
  ) {
    await this.coach.updateMemory(req.user.id, id, dto.content);
    return { ok: true };
  }
  @Delete('memories/:id') async deleteMemory(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.coach.deleteMemory(req.user.id, id);
    return { ok: true };
  }

  @Post('conversations/:id/messages')
  async send(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendCoachMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    const abort = new AbortController();
    const closed = () => abort.abort();
    res.on('close', closed);
    const emit = (data: object) => {
      if (res.destroyed || res.writableEnded) return;
      if (!res.headersSent) {
        res.status(200).set({
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        });
        res.flushHeaders();
      }
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    const heartbeat = setInterval(() => {
      if (res.headersSent && !res.destroyed && !res.writableEnded)
        res.write(': heartbeat\n\n');
    }, 15000);
    try {
      await this.coach.reply(req.user.id, id, dto, abort.signal, emit);
    } catch (error) {
      if (!res.destroyed) {
        const message =
          error instanceof HttpException
            ? error.message
            : '回答暂时中断，请稍后重试。';
        if (res.headersSent) emit({ type: 'error', message });
        else
          res
            .status(error instanceof HttpException ? error.getStatus() : 503)
            .json({ message });
      }
    } finally {
      clearInterval(heartbeat);
      res.off('close', closed);
      if (!res.writableEnded) res.end();
    }
  }
}

@Controller('admin/coach')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class CoachAdminController {
  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly ai: BailianService,
    private readonly control: CoachControlService,
  ) {}
  @Get('status') status() {
    return {
      available: this.ai.configured,
      chatModel: this.ai.model,
      embeddingModel: this.ai.embeddingModel,
      dimensions: this.ai.dimensions,
    };
  }
  @Get('documents') documents() {
    return this.knowledge.list();
  }
  @Post('documents') async create(
    @Req() req: AuthRequest,
    @Body() dto: SaveKnowledgeDto,
  ) {
    const result = await this.knowledge.save(dto);
    await this.control.audit(req.user.id, 'knowledge.create', result.id);
    return result;
  }
  @Put('documents/:id') async update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveKnowledgeDto,
  ) {
    const result = await this.knowledge.save(dto, id);
    await this.control.audit(req.user.id, 'knowledge.update', id);
    return result;
  }
  @Post('documents/:id/action') async action(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KnowledgeActionDto,
  ) {
    await this.knowledge.action(id, dto.action);
    await this.control.audit(req.user.id, 'knowledge.' + dto.action, id);
    return { ok: true };
  }
  @Delete('documents/:id') async delete(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.knowledge.delete(id);
    await this.control.audit(req.user.id, 'knowledge.delete', id);
    return { ok: true };
  }
  @Post('demo') async seed(@Req() req: AuthRequest) {
    const result = await this.knowledge.seed();
    await this.control.audit(req.user.id, 'knowledge.seed');
    return result;
  }
  @Post('search') search(@Body() dto: SearchKnowledgeDto) {
    this.ai.assertConfigured();
    return this.knowledge.search(dto.query);
  }
}
