/*
 * Copyright (c) 2026 FalkenDev
 *
 * This file is part of Grindify.
 *
 * Grindify is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with Grindify. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Exercise } from '../exercise/exercise.entity';
import { UserWithoutPasswordDto } from '../auth/dto/UserWithoutPassword.dto';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import { UpdateUserPreferencesDto } from './dto/UpdateUserPreferences.dto';
import { Workout } from '../workout/workout.entity';
import { WorkoutSession } from '../workoutSession/workoutSession.entity';
import { ActivityLog } from '../activityLog/activityLog.entity';
import { WeightLog } from '../weightLog/weightLog.entity';
import { ProgressPhoto } from '../progressPhoto/progressPhoto.entity';
import { ExerciseRecord } from '../statistics/exerciseRecord.entity';
import { UploadService } from '../upload/upload.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Exercise)
    private readonly exerciseRepo: Repository<Exercise>,

    @InjectRepository(Workout)
    private readonly workoutRepo: Repository<Workout>,

    @InjectRepository(WorkoutSession)
    private readonly sessionRepo: Repository<WorkoutSession>,

    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,

    @InjectRepository(WeightLog)
    private readonly weightLogRepo: Repository<WeightLog>,

    @InjectRepository(ProgressPhoto)
    private readonly progressPhotoRepo: Repository<ProgressPhoto>,

    @InjectRepository(ExerciseRecord)
    private readonly exerciseRecordRepo: Repository<ExerciseRecord>,

    private readonly uploadService: UploadService,
  ) {}

  async findOneById(userId: number): Promise<UserWithoutPasswordDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UserWithoutPasswordDto(user);
  }

  async updateUser(
    userId: number,
    dto: UpdateUserDto,
  ): Promise<UserWithoutPasswordDto> {
    const needsPassword = !!dto.newPassword;

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: needsPassword
        ? [
            'id',
            'email',
            'firstName',
            'lastName',
            'avatar',
            'showRpe',
            'password',
            'createdAt',
            'updatedAt',
          ]
        : [
            'id',
            'email',
            'firstName',
            'lastName',
            'avatar',
            'showRpe',
            'createdAt',
            'updatedAt',
          ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Email already in use');
      }
      user.email = dto.email;
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      if (!user.password) {
        throw new BadRequestException('Password not available for comparison');
      }
      const ok = await bcrypt.compare(dto.currentPassword, user.password);
      if (!ok) {
        throw new BadRequestException('Current password is incorrect');
      }
      user.password = await bcrypt.hash(dto.newPassword, 10);
    }

    // 解构时排除敏感字段，再保存数据
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { currentPassword, newPassword, email, dateOfBirth, ...safeDto } =
      dto;
    if (dateOfBirth !== undefined) {
      user.dateOfBirth = new Date(dateOfBirth);
    }
    Object.assign(user, safeDto);
    const updated = await this.userRepo.save(user);

    return new UserWithoutPasswordDto(updated);
  }

  async deleteUser(userId: number): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [progressPhotos, userExercises] = await Promise.all([
      this.progressPhotoRepo.find({ where: { user: { id: userId } } }),
      this.exerciseRepo.find({
        where: { createdBy: { id: userId } },
        relations: ['media'],
        withDeleted: true,
      }),
    ]);
    const uploadedFiles = new Set(
      [
        user.avatar,
        ...progressPhotos.map((photo) => photo.photoUrl),
        ...userExercises.flatMap((exercise) => [
          exercise.image,
          ...(exercise.media ?? []).map((media) => media.url),
        ]),
      ].filter(
        (url): url is string => Boolean(url?.startsWith('/uploads/')),
      ),
    );

    // 删除关联数据（先删除会话，避免 workout_session_exercise 产生外键冲突）
    await this.sessionRepo.delete({ user: { id: userId } });
    await this.exerciseRepo.delete({ createdBy: { id: userId } });
    await this.workoutRepo.delete({ createdBy: { id: userId } });

    await this.userRepo.remove(user);

    await Promise.all(
      [...uploadedFiles].map(async (fileUrl) => {
        const [avatarReferences, photoReferences] = await Promise.all([
          this.userRepo.count({ where: { avatar: fileUrl } }),
          this.progressPhotoRepo.count({ where: { photoUrl: fileUrl } }),
        ]);
        const exerciseReferences = await this.exerciseRepo
          .createQueryBuilder('exercise')
          .withDeleted()
          .leftJoin('exercise.media', 'media')
          .where('exercise.image = :fileUrl', { fileUrl })
          .orWhere('media.url = :fileUrl', { fileUrl })
          .getCount();

        if (avatarReferences === 0 && photoReferences === 0 && exerciseReferences === 0) {
          await this.uploadService.deleteImage(fileUrl);
        }
      }),
    );

    return { message: 'User and all related data deleted' };
  }

  async updateAvatar(
    userId: number,
    avatarUrl: string,
  ): Promise<UserWithoutPasswordDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 如果存在旧头像，则删除
    if (user.avatar) {
      await this.uploadService.deleteImage(user.avatar);
    }

    user.avatar = avatarUrl;
    const updated = await this.userRepo.save(user);

    return new UserWithoutPasswordDto(updated);
  }

  /**
 * 训练完成时更新连续打卡天数和本周训练次数。
 * 应在完成训练会话后调用。
   */
  async updateStreakOnWorkoutCompletion(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    const now = new Date();

    // 检查是否需要为新的一周重置数据
    await this.checkAndResetWeeklyProgress(user, now);

    // 增加本周训练次数
    user.currentWeekWorkouts += 1;

    // 每次训练都将连续打卡天数加 1
    user.currentStreak += 1;

    user.lastStreakCheckDate = now;
    await this.userRepo.save(user);
  }

  /**
 * 检查是否进入新的一周，并据此重置或更新连续打卡数据。
 * 训练会话和活动日志都会计入统计。
   */
  private async checkAndResetWeeklyProgress(
    user: User,
    now: Date,
  ): Promise<void> {
    if (!user.lastStreakCheckDate) {
    // 首次开始跟踪，重置计数器
      user.currentWeekWorkouts = 0;
      user.currentStreak = 0;
      return;
    }

    const lastCheck = new Date(user.lastStreakCheckDate);

    // 获取每周的周一（ISO 周从周一开始）
    const getMondayOfWeek = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 周日时进行调整
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const lastWeekMonday = getMondayOfWeek(lastCheck);
    const currentWeekMonday = getMondayOfWeek(now);

    // 如果进入了新的一周
    if (currentWeekMonday > lastWeekMonday) {
    // 计算经过了多少周
      const weeksPassed = Math.floor(
        (currentWeekMonday.getTime() - lastWeekMonday.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );

    // 统计上一周的总活动次数（训练会话或活动日志）
      const lastWeekSunday = new Date(currentWeekMonday);
      lastWeekSunday.setDate(lastWeekSunday.getDate() - 1);
      lastWeekSunday.setHours(23, 59, 59, 999);

      const workoutDays = await this.countTotalSessionsWithActivity(
        user.id,
        lastWeekMonday,
        lastWeekSunday,
      );

    // 获取上一周的 ISO 周键，用于检查冻结状态
      const prevWeekKey = this.getISOWeekKey(lastWeekMonday);

    // 检查用户是否完成了上一周的目标
      if (workoutDays < user.weeklyWorkoutGoal) {
    // 未完成目标——检查冻结机会是否能保护本周连续打卡
        if (user.streakFreezeUsedWeek === prevWeekKey) {
    // 冻结机会已使用，连续打卡得以保留
          user.streakFreezeUsedWeek = null;
        } else {
          user.currentStreak = 0;
        }
      } else if (weeksPassed > 1) {
    // 已经过了一周以上（表示期间完全没有训练）
    // 即使上一周完成了目标，中间仍有漏掉的周
        user.currentStreak = 0;
    // 清除过期的冻结机会
        user.streakFreezeUsedWeek = null;
      } else {
    // 恰好完成了上一周的目标——如果达到条件则奖励一次冻结机会
        user.completedGoalWeeksCount = (user.completedGoalWeeksCount || 0) + 1;
        if (
          user.completedGoalWeeksCount % 2 === 0 &&
          (user.streakFreezes || 0) < 2
        ) {
          user.streakFreezes = (user.streakFreezes || 0) + 1;
        }
      }
    // 如果完成了目标且恰好只经过 1 周，则连续打卡继续

    // 重置新一周的训练次数
      user.currentWeekWorkouts = 0;

    // 将 lastStreakCheckDate 更新为本周开始日期，避免重复调用（例如 getStreakInfo）
    // 再次执行周切换逻辑，导致 completedGoalWeeksCount 被错误地重复增加。
      user.lastStreakCheckDate = currentWeekMonday;
    }
  }

  /**
 * 返回指定日期对应的 ISO 周键，例如“2026-W18”。
   */
  private getISOWeekKey(date: Date): string {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  /**
 * 统计日期范围内的训练会话和活动日志总数。
   */
  private async countTotalSessionsWithActivity(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // 获取所有训练会话
    const sessions = await this.sessionRepo.find({
      where: {
        user: { id: userId },
        status: 'finished',
      },
      select: ['startedAt'],
    });

    // 获取所有活动日志
    const activityLogs = await this.activityLogRepo.find({
      where: {
        user: { id: userId },
      },
      select: ['date'],
    });

    let count = 0;

    sessions.forEach((session) => {
      const date = new Date(session.startedAt);
      if (date >= startDate && date <= endDate) {
        count++;
      }
    });

    activityLogs.forEach((log) => {
      const date = new Date(log.date);
      if (date >= startDate && date <= endDate) {
        count++;
      }
    });

    return count;
  }

  /**
 * 删除已完成的训练会话或活动日志时减少连续打卡天数。
   */
  async decrementStreakOnDeletion(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;
    if (user.currentStreak > 0) {
      user.currentStreak -= 1;
    }
    await this.userRepo.save(user);
  }

  /**
 * 创建活动日志时更新连续打卡天数和本周训练次数。
 * 应在记录活动后调用。
   */
  async updateStreakOnActivityLog(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    const now = new Date();

    // 检查是否需要为新的一周重置数据
    await this.checkAndResetWeeklyProgress(user, now);

    // 增加本周训练次数
    user.currentWeekWorkouts += 1;

    // 每次活动都将连续打卡天数加 1
    user.currentStreak += 1;

    user.lastStreakCheckDate = now;
    await this.userRepo.save(user);
  }

  /**
 * 使用连续打卡冻结机会，避免本周连续打卡被重置。
   */
  async useStreakFreeze(
    userId: number,
    date: string,
  ): Promise<{
    currentStreak: number;
    weeklyWorkoutGoal: number;
    currentWeekWorkouts: number;
    progressPercentage: number;
    streakFreezes: number;
    freezeUsedThisWeek: boolean;
    streakFreezeUsedWeek: string | null;
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if ((user.streakFreezes || 0) <= 0) {
      throw new BadRequestException('No streak freezes available');
    }

    const now = new Date();
    const currentWeekKey = this.getISOWeekKey(now);

    const targetDate = new Date(date + 'T12:00:00');
    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    const targetWeekKey = this.getISOWeekKey(targetDate);

    if (targetWeekKey !== currentWeekKey) {
      throw new BadRequestException('Can only freeze the current week');
    }

    if (user.streakFreezeUsedWeek === currentWeekKey) {
      throw new BadRequestException('A freeze is already active this week');
    }

    user.streakFreezeUsedWeek = currentWeekKey;
    user.streakFreezes = (user.streakFreezes || 0) - 1;
    await this.userRepo.save(user);

    return this.getStreakInfo(userId);
  }

  /**
 * 获取用户当前的连续打卡信息。
   */
  async getStreakInfo(userId: number): Promise<{
    currentStreak: number;
    weeklyWorkoutGoal: number;
    currentWeekWorkouts: number;
    progressPercentage: number;
    streakFreezes: number;
    freezeUsedThisWeek: boolean;
    streakFreezeUsedWeek: string | null;
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 检查是否需要为新的一周更新连续打卡数据
    const now = new Date();
    await this.checkAndResetWeeklyProgress(user, now);

    // 根据实际活动重新计算本周训练次数
    const getMondayOfWeek = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const currentWeekMonday = getMondayOfWeek(now);
    const currentWeekSunday = new Date(currentWeekMonday);
    currentWeekSunday.setDate(currentWeekSunday.getDate() + 6);
    currentWeekSunday.setHours(23, 59, 59, 999);

    user.currentWeekWorkouts = await this.countTotalSessionsWithActivity(
      userId,
      currentWeekMonday,
      currentWeekSunday,
    );

    await this.userRepo.save(user);

    const progressPercentage =
      user.weeklyWorkoutGoal > 0
        ? Math.min(
            (user.currentWeekWorkouts / user.weeklyWorkoutGoal) * 100,
            100,
          )
        : 0;

    const currentWeekKey = this.getISOWeekKey(now);

    return {
      currentStreak: user.currentStreak,
      weeklyWorkoutGoal: user.weeklyWorkoutGoal,
      currentWeekWorkouts: user.currentWeekWorkouts,
      progressPercentage: Math.round(progressPercentage),
      streakFreezes: user.streakFreezes ?? 1,
      freezeUsedThisWeek: user.streakFreezeUsedWeek === currentWeekKey,
      streakFreezeUsedWeek: user.streakFreezeUsedWeek ?? null,
    };
  }

  /**
 * 更新用户的每周训练目标。
   */
  async updateWeeklyWorkoutGoal(
    userId: number,
    weeklyWorkoutGoal: number,
  ): Promise<UserWithoutPasswordDto> {
    if (weeklyWorkoutGoal < 1 || weeklyWorkoutGoal > 7) {
      throw new BadRequestException(
        'Weekly workout goal must be between 1 and 7',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.weeklyWorkoutGoal = weeklyWorkoutGoal;
    const updated = await this.userRepo.save(user);

    return new UserWithoutPasswordDto(updated);
  }

  /**
 * 导出用户的账户资料、训练记录和相关数据。
   */
  async exportUserData(userId: number): Promise<object> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      exercises,
      workouts,
      sessions,
      activityLogs,
      weightLogs,
      progressPhotos,
      exerciseRecords,
    ] = await Promise.all([
      this.exerciseRepo.find({
        where: { createdBy: { id: userId } },
        relations: ['media'],
      }),
      this.workoutRepo.find({
        where: { createdBy: { id: userId } },
        relations: ['exercises'],
      }),
      this.sessionRepo.find({
        where: { user: { id: userId } },
        relations: ['workout', 'exercises', 'exercises.exercise', 'exercises.sets'],
      }),
      this.activityLogRepo.find({ where: { user: { id: userId } } }),
      this.weightLogRepo.find({ where: { user: { id: userId } } }),
      this.progressPhotoRepo.find({ where: { user: { id: userId } } }),
      this.exerciseRecordRepo.find({
        where: { user: { id: userId } },
        relations: ['exercise'],
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        weight: user.weight,
        height: user.height,
        unitScale: user.unitScale,
        primaryGoal: user.primaryGoal,
        weeklyWorkoutGoal: user.weeklyWorkoutGoal,
        currentStreak: user.currentStreak,
        termsAcceptedAt: user.termsAcceptedAt,
        termsVersion: user.termsVersion,
        createdAt: user.createdAt,
      },
      exercises,
      workouts,
      workoutSessions: sessions,
      activityLogs,
      weightLogs,
      progressPhotos,
      exerciseRecords,
    };
  }

  /**
 * 更新用户偏好设置（新手引导数据）。
   */
  async updateUserPreferences(
    userId: number,
    dto: UpdateUserPreferencesDto,
  ): Promise<UserWithoutPasswordDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 更新所有已提供的字段
    if (dto.unitScale !== undefined) user.unitScale = dto.unitScale;
    if (dto.weight !== undefined) user.weight = dto.weight;
    if (dto.height !== undefined) user.height = dto.height;
    if (dto.dateOfBirth !== undefined)
      user.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.primaryGoal !== undefined) user.primaryGoal = dto.primaryGoal;
    if (dto.weeklyWorkoutGoal !== undefined) {
      if (dto.weeklyWorkoutGoal < 1 || dto.weeklyWorkoutGoal > 7) {
        throw new BadRequestException(
          'Weekly workout goal must be between 1 and 7',
        );
      }
      user.weeklyWorkoutGoal = dto.weeklyWorkoutGoal;
    }
    if (dto.targetWeight !== undefined) user.targetWeight = dto.targetWeight;
    if (dto.goalTimeframe !== undefined) user.goalTimeframe = dto.goalTimeframe;
    if (dto.showRpe !== undefined) user.showRpe = dto.showRpe;
    if (dto.onboardingCompleted !== undefined)
      user.onboardingCompleted = dto.onboardingCompleted;
    if (dto.showWeightTracking !== undefined)
      user.showWeightTracking = dto.showWeightTracking;
    if (dto.weightGoalType !== undefined)
      user.weightGoalType = dto.weightGoalType;
    if (dto.startWeight !== undefined) user.startWeight = dto.startWeight;
    if (dto.language !== undefined) user.language = dto.language;

    const updated = await this.userRepo.save(user);
    return new UserWithoutPasswordDto(updated);
  }
}
