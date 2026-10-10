import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ScheduledSessionService } from '../scheduledSession/scheduledSession.service';
import { Workout } from '../workout/workout.entity';
import { WorkoutExercise } from '../workout/workoutExercise.entity';
import { ScheduledSession } from '../scheduledSession/scheduledSession.entity';
import { ScheduledSessionType } from '../scheduledSession/scheduledSession.entity';
import { BailianService } from './bailian.service';
import { CoachControlService } from './coach-control.service';
import { CoachService } from './coach.service';
import {
  CoachPlanService,
  ExerciseOption,
  PlanPayload,
} from './coach-plan.service';
import { GenerateCoachPlanFromMessageDto } from './coach.dto';

const options: ExerciseOption[] = [
  { id: 1, name: '动作一', equipment: [] },
  { id: 2, name: '动作二', equipment: [] },
];
const future = '2099-01-05';
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const confirmed = (
  requestId: string,
  pattern: 'weekly' | 'four_on_one_off' | 'five_on_one_off' = 'weekly',
): GenerateCoachPlanFromMessageDto => ({
  requestId,
  pattern,
  ...(pattern !== 'weekly' ? { cycles: 2 } : {}),
  startDate: today,
  daysOfWeek:
    pattern === 'weekly'
      ? [(new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7]
      : [],
  minutes: 30,
  goal: '提升力量',
  experience: 'intermediate',
  equipment: '哑铃',
  limitations: '无',
});
const payload: PlanPayload = {
  windowStart: '2099-01-05',
  windowEnd: '2099-01-11',
  summary: '训练说明',
  days: [
    {
      date: future,
      title: '全身训练',
      minutes: 45,
      note: '',
      exercises: [
        { exerciseId: 1, sets: 3, reps: 8, pauseSeconds: 90 },
        { exerciseId: 2, sets: 2, reps: 12, pauseSeconds: 60 },
      ],
    },
  ],
};

function createService(conflict = false) {
  const row = {
    id: 'draft-1',
    user_id: 7,
    request_id: 'request-1',
    input_hash: 'hash',
    status: 'pending' as 'pending' | 'applied',
    version: 1,
    payload,
    expires_at: '2099-01-12T00:00:00Z',
    applied: null as object | null,
  };
  let nextId = 10;
  const manager = {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.startsWith('SELECT * FROM coach_plan_draft')) return [row];
      if (sql.startsWith('UPDATE coach_plan_draft SET status=')) {
        row.status = 'applied';
        row.applied = JSON.parse(params?.[1] as string) as object;
      }
      return [];
    }),
    create: jest.fn((_entity: unknown, data: object) => data),
    save: jest.fn(async (_entity: unknown, data: unknown) =>
      Array.isArray(data) ? data : { ...(data as object), id: nextId++ },
    ),
  };
  const db = {
    query: jest.fn<Promise<unknown[]>, [string, unknown[]?]>(async () => []),
    transaction: (work: (manager: EntityManager) => unknown) =>
      work(manager as unknown as EntityManager),
  };
  const schedules = {
    findForDateRange: jest.fn(async () =>
      conflict
        ? [{ resolvedDate: future, type: ScheduledSessionType.WORKOUT }]
        : [],
    ),
  };
  const service = new CoachPlanService(
    db as unknown as DataSource,
    { assertConfigured: jest.fn() } as unknown as BailianService,
    {} as CoachService,
    {
      settings: jest.fn(async () => ({ enabled: true })),
    } as unknown as CoachControlService,
    schedules as unknown as ScheduledSessionService,
  );
  jest.spyOn(service as never, 'options').mockResolvedValue(options as never);
  return { service, manager, row, db, schedules };
}

describe('coach reply to plan draft', () => {
  it('only accepts a complete reply owned by the user', async () => {
    const { service, db } = createService();
    await expect(
      service.fromMessage(7, 'foreign-message', confirmed('request-2')),
    ).rejects.toThrow(NotFoundException);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "c.user_id=$2 AND m.role='assistant' AND m.status='complete'",
      ),
      ['foreign-message', 7],
    );
  });

  it('passes the selected four-day reply and paired question into draft generation', async () => {
    const { service, db } = createService();
    db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('JOIN coach_conversation'))
        return [
          {
            content: '自定义4天循环：上肢、下肢、上肢、下肢',
            conversation_id: 'c1',
            request_id: 'q1',
            sequence: 5,
          },
        ];
      if (sql.includes("role='user'")) return [{ content: '帮我安排四天训练' }];
      if (sql.includes("status='complete'"))
        return [
          {
            role: 'assistant',
            content: '自定义4天循环：上肢、下肢、上肢、下肢',
          },
          { role: 'user', content: '帮我安排四天训练' },
          { role: 'user', content: '我只有哑铃，每次只能练30分钟' },
        ];
      return [{ weekly_goal: 3 }];
    });
    const generate = jest
      .spyOn(service, 'generate')
      .mockResolvedValue({ id: 'draft-2' } as never);
    await service.fromMessage(7, 'reply-1', {
      ...confirmed('request-2'),
      daysOfWeek: [0, 2, 4, 6],
    });
    expect(generate).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        requestId: 'request-2',
        goal: '提升力量',
        minutes: 30,
        equipment: '哑铃',
        daysOfWeek: [0, 2, 4, 6],
      }),
      {
        messageId: 'reply-1',
        startDate: today,
        expectedCount: 4,
        answer: expect.stringContaining('自定义4天循环'),
        question: '帮我安排四天训练',
        conversation: [
          { role: 'user', content: '我只有哑铃，每次只能练30分钟' },
          { role: 'user', content: '帮我安排四天训练' },
          {
            role: 'assistant',
            content: '自定义4天循环：上肢、下肢、上肢、下肢',
          },
        ],
      },
    );
    expect(generate.mock.calls[0][1].daysOfWeek).toHaveLength(4);
  });

  it('recognizes four training days followed by one rest day as a cycle', async () => {
    const { service, db } = createService();
    db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('JOIN coach_conversation'))
        return [
          {
            content: '安排四天训练',
            conversation_id: 'c1',
            request_id: 'q1',
            sequence: 5,
          },
        ];
      if (sql.includes("role='user'"))
        return [{ content: '练四天休息一天，帮我安排' }];
      if (sql.includes("status='complete'"))
        return [
          { role: 'assistant', content: '安排四天训练' },
          { role: 'user', content: '练四天休息一天，帮我安排' },
        ];
      return [{ weekly_goal: 4 }];
    });
    const generate = jest
      .spyOn(service, 'generate')
      .mockResolvedValue({ id: 'cycle' } as never);
    await service.fromMessage(
      7,
      'reply-2',
      confirmed('request-3', 'four_on_one_off'),
    );
    expect(generate.mock.calls[0][2]).toMatchObject({
      pattern: 'four_on_one_off',
      expectedCount: 4,
    });
  });

  it('passes five-on-one-off as a six-day cycle', async () => {
    const { service, db } = createService();
    db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('JOIN coach_conversation'))
        return [
          {
            content: '练五休一',
            conversation_id: 'c1',
            request_id: 'q1',
            sequence: 5,
          },
        ];
      if (sql.includes("role='user'")) return [{ content: '练五休一' }];
      if (sql.includes("status='complete'"))
        return [{ role: 'user', content: '练五休一' }];
      return [];
    });
    const generate = jest
      .spyOn(service, 'generate')
      .mockResolvedValue({ id: 'five-cycle' } as never);
    await service.fromMessage(
      7,
      'reply-5',
      confirmed('request-5', 'five_on_one_off'),
    );
    expect(generate.mock.calls[0][2]).toMatchObject({
      pattern: 'five_on_one_off',
      expectedCount: 5,
    });
  });

  it('lets a newer weekly request replace an older four-on-one-off request', async () => {
    const { service, db } = createService();
    db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('JOIN coach_conversation'))
        return [
          {
            content: '改成每周三次',
            conversation_id: 'c1',
            request_id: 'q2',
            sequence: 8,
          },
        ];
      if (sql.includes("role='user'")) return [{ content: '改成每周三次' }];
      if (sql.includes("status='complete'"))
        return [
          { role: 'assistant', content: '改成每周三次' },
          { role: 'user', content: '改成每周三次' },
          { role: 'user', content: '之前想练四天休息一天' },
        ];
      return [{ weekly_goal: 4 }];
    });
    const generate = jest
      .spyOn(service, 'generate')
      .mockResolvedValue({ id: 'weekly' } as never);
    await service.fromMessage(7, 'reply-3', confirmed('request-4'));
    expect(generate.mock.calls[0][2]?.pattern).toBeUndefined();
  });

  it('keeps confirmed chat dates fixed and expands the two-week cycle', async () => {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const tomorrow = new Date(`${today}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowDate = tomorrow.toISOString().slice(0, 10);
    const mondayIndex = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
    const generated = {
      summary: '按用户时间安排',
      days: [{ ...payload.days[0], date: tomorrowDate }],
    };
    const runner = {
      isTransactionActive: false,
      connect: jest.fn(async () => undefined),
      startTransaction: jest.fn(async () => {
        runner.isTransactionActive = true;
      }),
      commitTransaction: jest.fn(async () => {
        runner.isTransactionActive = false;
      }),
      rollbackTransaction: jest.fn(async () => {
        runner.isTransactionActive = false;
      }),
      release: jest.fn(async () => undefined),
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('pg_try_advisory_lock')) return [{ locked: true }];
        if (sql.startsWith('SELECT * FROM coach_plan_draft')) return [];
        if (sql.startsWith('INSERT INTO coach_usage')) return [{ requests: 1 }];
        if (sql.startsWith('SELECT ((SELECT')) return [{ total: 1 }];
        if (sql.startsWith('INSERT INTO coach_plan_draft'))
          return [
            {
              id: 'draft-2',
              status: 'pending',
              version: 1,
              payload: JSON.parse(params?.[4] as string),
              expires_at: '2099-01-01T00:00:00Z',
            },
          ];
        return [];
      }),
    };
    const ai = {
      assertConfigured: jest.fn(),
      planJson: jest.fn(async () => generated),
    };
    const service = new CoachPlanService(
      { createQueryRunner: () => runner } as unknown as DataSource,
      ai as unknown as BailianService,
      {
        trainingContext: jest.fn(async () => ({})),
        memories: jest.fn(async () => []),
      } as unknown as CoachService,
      {
        settings: jest.fn(async () => ({
          enabled: true,
          dailyUserLimit: 30,
          dailyTotalLimit: 1000,
        })),
      } as unknown as CoachControlService,
      {
        findForDateRange: jest.fn(async () => []),
      } as unknown as ScheduledSessionService,
    );
    jest.spyOn(service as never, 'options').mockResolvedValue(options as never);
    const input = {
      requestId: 'request-1',
      daysOfWeek: [mondayIndex],
      minutes: 45,
      goal: '安排训练',
      experience: 'unknown',
      equipment: '无',
      limitations: '',
    };
    await expect(
      service.generate(7, input, {
        messageId: 'reply-1',
        startDate: today,
        expectedCount: 1,
        answer: '明天练',
        question: '明天有空',
        conversation: [],
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    await expect(
      service.generate(7, { ...input, requestId: 'request-2' }),
    ).rejects.toThrow(ServiceUnavailableException);

    ai.planJson.mockResolvedValueOnce({
      ...generated,
      days: [{ ...payload.days[0], date: today }],
    });
    await expect(
      service.generate(
        7,
        { ...input, requestId: 'request-accepted' },
        {
          messageId: 'reply-1',
          startDate: today,
          expectedCount: 1,
          answer: '明天练',
          question: '明天有空',
          conversation: [],
        },
      ),
    ).resolves.toMatchObject({ id: 'draft-2' });

    const cycleTemplate = {
      summary: '四练一休',
      days: Array.from({ length: 4 }, (_, offset) => ({
        ...payload.days[0],
        date: new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86400000)
          .toISOString()
          .slice(0, 10),
      })),
    };
    ai.planJson.mockResolvedValueOnce(cycleTemplate);
    const cycle = await service.generate(
      7,
      {
        ...input,
        requestId: 'request-3',
        daysOfWeek: cycleTemplate.days.map(
          (day) => (new Date(`${day.date}T00:00:00Z`).getUTCDay() + 6) % 7,
        ),
      },
      {
        messageId: 'reply-2',
        startDate: today,
        pattern: 'four_on_one_off',
        expectedCount: 4,
        answer: '练四天休息一天',
        question: '未来两周练四休一',
        conversation: [],
      },
    );
    expect(cycle.payload.pattern).toBe('four_on_one_off');
    expect(cycle.payload.days).toHaveLength(12);
    const scheduled = cycle.payload.days.map((day) => day.date);
    for (const restOffset of [4, 9]) {
      const rest = new Date(
        Date.parse(`${today}T00:00:00Z`) + restOffset * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      expect(scheduled).not.toContain(rest);
    }

    const fiveTemplate = {
      summary: '五练一休',
      days: Array.from({ length: 5 }, (_, offset) => ({
        ...payload.days[0],
        date: new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86400000)
          .toISOString()
          .slice(0, 10),
      })),
    };
    ai.planJson.mockResolvedValueOnce(fiveTemplate);
    const fiveCycle = await service.generate(
      7,
      {
        ...input,
        requestId: 'request-5-cycle',
        daysOfWeek: fiveTemplate.days.map(
          (day) => (new Date(`${day.date}T00:00:00Z`).getUTCDay() + 6) % 7,
        ),
      },
      {
        messageId: 'reply-5',
        startDate: today,
        pattern: 'five_on_one_off',
        cycles: 2,
        expectedCount: 5,
        answer: '练五休一',
        question: '安排未来两周',
        conversation: [],
      },
    );
    expect(fiveCycle.payload.pattern).toBe('five_on_one_off');
    expect(fiveCycle.payload.cycles).toBe(2);
    expect(fiveCycle.payload.days).toHaveLength(10);
    expect(fiveCycle.payload.windowEnd).toBe(
      new Date(Date.parse(`${today}T00:00:00Z`) + 11 * 86400000)
        .toISOString()
        .slice(0, 10),
    );
    const fiveDates = fiveCycle.payload.days.map((day) => day.date);
    for (const restOffset of [5, 11]) {
      const rest = new Date(
        Date.parse(`${today}T00:00:00Z`) + restOffset * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      expect(fiveDates).not.toContain(rest);
    }
  });
});

describe('coach plan confirmation', () => {
  it('writes a five-on-one-off plan with rest on days 6 and 12', async () => {
    const { service, row, schedules } = createService();
    const start = new Date(`${future}T00:00:00Z`).getTime();
    const dateAt = (offset: number) =>
      new Date(start + offset * 86400000).toISOString().slice(0, 10);
    row.payload = {
      ...payload,
      pattern: 'five_on_one_off',
      cycles: 2,
      windowEnd: dateAt(11),
      days: Array.from({ length: 12 }, (_, offset) => offset)
        .filter((offset) => offset % 6 < 5)
        .map((offset) => ({ ...payload.days[0], date: dateAt(offset) })),
    };
    schedules.findForDateRange.mockResolvedValue([]);
    const result = (await service.apply(7, 'draft-1', {
      version: 1,
      allowConflictDates: [],
      skipDates: [],
    })) as { created: { date: string }[] };
    expect(result.created).toHaveLength(10);
    expect(result.created.map((item) => item.date)).not.toContain(dateAt(5));
    expect(result.created.map((item) => item.date)).not.toContain(dateAt(11));
  });

  it('writes all 12 training days of a two-week four-on-one-off plan', async () => {
    const { service, manager, row } = createService();
    const start = new Date(`${future}T00:00:00Z`).getTime();
    const dateAt = (offset: number) =>
      new Date(start + offset * 86400000).toISOString().slice(0, 10);
    row.payload = {
      ...payload,
      pattern: 'four_on_one_off',
      windowEnd: dateAt(13),
      days: Array.from({ length: 14 }, (_, offset) => offset)
        .filter((offset) => offset % 5 < 4)
        .map((offset) => ({
          ...payload.days[0],
          date: dateAt(offset),
          title: `训练${(offset % 5) + 1}`,
        })),
    };
    const result = (await service.apply(7, 'draft-1', {
      version: 1,
      allowConflictDates: [],
      skipDates: [],
    })) as { created: { date: string; workoutId: number }[] };
    expect(result.created).toHaveLength(12);
    expect(result.created.map((item) => item.date)).not.toContain(dateAt(4));
    expect(result.created.map((item) => item.date)).not.toContain(dateAt(9));
    expect(manager.save).toHaveBeenCalledTimes(20);
    expect(new Set(result.created.map((item) => item.workoutId)).size).toBe(4);
  });

  it('rejects inaccessible exercise IDs and duplicate exercises before writing', () => {
    const { service } = createService();
    const validate = (plan: unknown) =>
      (
        service as unknown as {
          validate: (
            value: unknown,
            available: ExerciseOption[],
            start: string,
            end: string,
          ) => PlanPayload;
        }
      ).validate(plan, options, payload.windowStart, payload.windowEnd);
    expect(() =>
      validate({
        ...payload,
        days: [
          {
            ...payload.days[0],
            exercises: [
              { ...payload.days[0].exercises[0], exerciseId: 99 },
              payload.days[0].exercises[1],
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validate({
        ...payload,
        days: [
          {
            ...payload.days[0],
            exercises: [
              payload.days[0].exercises[0],
              payload.days[0].exercises[0],
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validate({
        ...payload,
        days: [{ ...payload.days[0], date: '2099-01-12' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('requires a decision for an occupied day and writes nothing until then', async () => {
    const { service, manager } = createService(true);
    await expect(
      service.apply(7, 'draft-1', {
        version: 1,
        allowConflictDates: [],
        skipDates: [],
      }),
    ).rejects.toThrow(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('blocks confirmation when an existing workout falls on a cycle rest day', async () => {
    const { service, manager, row, schedules } = createService();
    const start = new Date(`${future}T00:00:00Z`).getTime();
    const dateAt = (offset: number) =>
      new Date(start + offset * 86400000).toISOString().slice(0, 10);
    row.payload = {
      ...payload,
      pattern: 'four_on_one_off',
      windowEnd: dateAt(13),
      days: Array.from({ length: 14 }, (_, offset) => offset)
        .filter((offset) => offset % 5 < 4)
        .map((offset) => ({ ...payload.days[0], date: dateAt(offset) })),
    };
    schedules.findForDateRange.mockResolvedValueOnce([
      { resolvedDate: dateAt(4), type: ScheduledSessionType.WORKOUT },
    ]);
    await expect(
      service.apply(7, 'draft-1', {
        version: 1,
        allowConflictDates: [],
        skipDates: [],
      }),
    ).rejects.toThrow(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('does not allow skipping one day of a four-on-one-off cycle', async () => {
    const { service, manager, row } = createService();
    const start = new Date(`${future}T00:00:00Z`).getTime();
    const dateAt = (offset: number) =>
      new Date(start + offset * 86400000).toISOString().slice(0, 10);
    row.payload = {
      ...payload,
      pattern: 'four_on_one_off',
      windowEnd: dateAt(13),
      days: Array.from({ length: 14 }, (_, offset) => offset)
        .filter((offset) => offset % 5 < 4)
        .map((offset) => ({ ...payload.days[0], date: dateAt(offset) })),
    };
    await expect(
      service.apply(7, 'draft-1', {
        version: 1,
        allowConflictDates: [],
        skipDates: [future],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('writes a workout, its exercises and calendar entry together after approval', async () => {
    const { service, manager } = createService(true);
    const result = await service.apply(7, 'draft-1', {
      version: 1,
      allowConflictDates: [future],
      skipDates: [],
    });
    expect(result).toMatchObject({ created: [{ date: future }] });
    expect(manager.save.mock.calls.map(([entity]) => entity)).toEqual([
      Workout,
      WorkoutExercise,
      ScheduledSession,
    ]);
    expect(manager.create.mock.calls[1][1]).toMatchObject({ weight: 0 });
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT * FROM coach_plan_draft WHERE id=$1 AND user_id=$2 FOR UPDATE',
      ['draft-1', 7],
    );
    expect(
      await service.apply(7, 'draft-1', {
        version: 1,
        allowConflictDates: [],
        skipDates: [],
      }),
    ).toEqual(result);
    expect(manager.save).toHaveBeenCalledTimes(3);
  });
});
