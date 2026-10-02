import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AddFitnessCoach1791000000000 } from '../migrations/1791000000000-AddFitnessCoach';
import { AddCoachManagement1791001000000 } from '../migrations/1791001000000-AddCoachManagement';
import { CoachControlService } from './coach-control.service';
import { CoachManagementController } from './coach-management.controller';
import { BailianService } from './bailian.service';
import { CoachService } from './coach.service';
import { KnowledgeService } from './knowledge.service';
import { CoachAdminController, CoachController } from './coach.controller';

@Injectable()
class CoachDevelopmentSchema implements OnModuleInit {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}
  async onModuleInit(): Promise<void> {
    // synchronize mode skips migrations; initialize only these SQL-owned tables in that development mode.
    if (
      this.config.get('DATABASE_SYNCHRONIZE') !== 'true' ||
      this.config.get('NODE_ENV') === 'production'
    )
      return;
    const runner = this.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('SELECT pg_advisory_xact_lock(7531,0)');
      await new AddFitnessCoach1791000000000().up(runner);
      await new AddCoachManagement1791001000000().up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}

@Module({
  controllers: [
    CoachController,
    CoachAdminController,
    CoachManagementController,
  ],
  providers: [
    CoachDevelopmentSchema,
    CoachControlService,
    BailianService,
    CoachService,
    KnowledgeService,
  ],
})
export class CoachModule {}
