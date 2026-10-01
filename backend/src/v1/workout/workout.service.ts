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

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { In, Like, Repository } from 'typeorm';
import { Workout, WorkoutType } from './workout.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { WorkoutResponseDto } from './dto/workoutResponse.dto';
import { CreateWorkoutDto } from './dto/createWorkout.dto';
import { UpdateWorkoutDto } from './dto/updateWorkout.dto';
import { WorkoutSession } from '../workoutSession/workoutSession.entity';
import { AddRemoveExercisesDto } from './dto/addRemoveExercises.dto';
import { WorkoutExercise } from './workoutExercise.entity';
import { Exercise } from '../exercise/exercise.entity';
import { MuscleGroup } from '../muscleGroup/muscleGroup.entity';
import { UpdateWorkoutExerciseDto } from './dto/updateWorkoutExercise.dto';
import { DataSource } from 'typeorm';
import { CreateGlobalWorkoutDto, UpdateGlobalWorkoutDto } from './dto/globalWorkout.dto';

@Injectable()
export class WorkoutService {
  constructor(
    @InjectRepository(Workout)
    private workoutRepo: Repository<Workout>,
    @InjectRepository(WorkoutExercise)
    private workoutExerciseRepo: Repository<WorkoutExercise>,
    @InjectRepository(WorkoutSession)
    private readonly workoutSessionRepository: Repository<WorkoutSession>,
    @InjectRepository(MuscleGroup)
    private readonly muscleGroupRepo: Repository<MuscleGroup>,
    private readonly dataSource: DataSource,
  ) {}

  private async findWorkoutForUser(
    workoutId: number,
    userId: number,
  ): Promise<Workout> {
    const workout = await this.workoutRepo.findOne({
      where: { id: workoutId, createdBy: { id: userId }, isGlobal: false },
      relations: ['exercises'],
    });
    if (!workout) {
      throw new NotFoundException('Workout not found');
    }
    return workout;
  }

  async addExercisesToWorkout(
    workoutId: number,
    dto: AddRemoveExercisesDto,
    userId: number,
  ): Promise<WorkoutResponseDto> {
    const workout = await this.findWorkoutForUser(workoutId, userId);
    const newExercises = (dto.exerciseIds ?? []).map((exerciseId, index) =>
      this.workoutExerciseRepo.create({
        workout,
        exercise: { id: exerciseId } as Exercise,
        order: workout.exercises.length + index + 1,
        sets: 3,
        reps: 10,
        weight: 10,
        pauseSeconds: 60,
      }),
    );
    await this.workoutExerciseRepo.save(newExercises);
    // 重新加载训练，以获取完整的更新后实体
    const updatedWorkout = await this.getWorkout(workoutId, userId);
    return updatedWorkout;
  }

  async removeExercisesFromWorkout(
    workoutId: number,
    dto: AddRemoveExercisesDto,
    userId: number,
  ): Promise<{ message: string }> {
    const workout = await this.findWorkoutForUser(workoutId, userId);

    const workoutExercisesToRemove = await this.workoutExerciseRepo.find({
      where: {
        workout: { id: workout.id },
        exercise: { id: In(dto.exerciseIds ?? []) },
      },
    });

    if (workoutExercisesToRemove.length === 0) {
      throw new NotFoundException(
        'None of the specified exercises were found in this workout.',
      );
    }

    const idsToRemove = workoutExercisesToRemove.map((we) => we.id);
    await this.workoutExerciseRepo.delete(idsToRemove);
    return { message: 'Exercises removed successfully' };
  }

  async reorderExercises(
    workoutId: number,
    exercises: Array<{ workoutExerciseId: number; order: number }>,
    userId: number,
  ): Promise<WorkoutResponseDto> {
    const workout = await this.findWorkoutForUser(workoutId, userId);

    // 更新每个训练动作的顺序
    for (const exerciseOrder of exercises) {
      await this.workoutExerciseRepo.update(
        {
          id: exerciseOrder.workoutExerciseId,
          workout: { id: workout.id },
        },
        { order: exerciseOrder.order },
      );
    }

    return this.getWorkout(workoutId, userId);
  }

  async updateExerciseInWorkout(
    workoutId: number,
    workoutExerciseId: number,
    dto: UpdateWorkoutExerciseDto,
    userId: number,
  ): Promise<WorkoutResponseDto> {
    await this.findWorkoutForUser(workoutId, userId);

    const workoutExercise = await this.workoutExerciseRepo.findOne({
      where: {
        id: workoutExerciseId,
        workout: { id: workoutId },
      },
    });

    if (!workoutExercise) {
      throw new NotFoundException('Exercise not found in this workout');
    }

    Object.assign(workoutExercise, dto);

    // 提供 setWeights 时，使 `weight` 与第一组的重量保持同步
    if (dto.setWeights && dto.setWeights.length > 0) {
      workoutExercise.weight = dto.setWeights[0];
    }

    await this.workoutExerciseRepo.save(workoutExercise);

    return this.getWorkout(workoutId, userId);
  }

  async getWorkout(id: number, userId: number): Promise<WorkoutResponseDto> {
    const workout = await this.workoutRepo.findOne({
      where: [
        { id, createdBy: { id: userId }, isGlobal: false },
        { id, isGlobal: true, status: 'published' },
      ],
      relations: [
        'exercises',
        'exercises.exercise',
        'exercises.exercise.muscleGroups',
        'exercises.exercise.primaryMuscleGroups',
        'targetMuscleGroups',
        'createdBy',
      ],
    });

    if (!workout) throw new NotFoundException('Workout not found');
    return this.toResponseDto(workout);
  }
    // ……服务代码的其余部分
  async getWorkoutList(userId: number): Promise<WorkoutResponseDto[]> {
    const workouts = await this.workoutRepo.find({
      where: { createdBy: { id: userId }, isGlobal: false },
      relations: [
        'exercises',
        'exercises.exercise',
        'exercises.exercise.muscleGroups',
        'exercises.exercise.primaryMuscleGroups',
        'targetMuscleGroups',
        'createdBy',
      ],
    });

    return workouts.map((w) => this.toResponseDto(w));
  }

  async getGlobalWorkoutList(includeUnpublished = false): Promise<WorkoutResponseDto[]> {
    const workouts = await this.workoutRepo.find({
      where: includeUnpublished ? { isGlobal: true } : { isGlobal: true, status: 'published' },
      relations: [
        'exercises', 'exercises.exercise', 'exercises.exercise.muscleGroups',
        'exercises.exercise.primaryMuscleGroups', 'targetMuscleGroups',
      ],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return workouts.map((workout) => this.toResponseDto(workout));
  }

  async getGlobalWorkout(id: number): Promise<WorkoutResponseDto> {
    const workout = await this.workoutRepo.findOne({
      where: { id, isGlobal: true },
      relations: [
        'exercises', 'exercises.exercise', 'exercises.exercise.muscleGroups',
        'exercises.exercise.primaryMuscleGroups', 'targetMuscleGroups',
      ],
    });
    if (!workout) throw new NotFoundException('Public workout not found');
    return this.toResponseDto(workout);
  }

  async createGlobalWorkout(dto: CreateGlobalWorkoutDto): Promise<WorkoutResponseDto> {
    const id = await this.dataSource.transaction(async (manager) => {
      const workout = manager.create(Workout, {
        title: dto.title,
        description: dto.description,
        titleI18n: dto.titleI18n,
        descriptionI18n: dto.descriptionI18n,
        time: dto.time,
        type: dto.type,
        defaultWeightAndReps: dto.defaultWeightAndReps ?? 'default',
        isGlobal: true,
        createdBy: null,
        status: dto.status ?? 'published',
        difficulty: dto.difficulty,
        goal: dto.goal,
        equipment: dto.equipment,
        sortOrder: dto.sortOrder ?? 0,
        targetMuscleGroups: dto.targetMuscleGroupIds?.length
          ? await manager.findBy(MuscleGroup, { id: In(dto.targetMuscleGroupIds) })
          : [],
      });
      const saved = await manager.save(Workout, workout);
      await this.replaceGlobalExercises(manager, saved, dto.exercises);
      return saved.id;
    });
    return this.getGlobalWorkout(id);
  }

  async updateGlobalWorkout(id: number, dto: UpdateGlobalWorkoutDto): Promise<WorkoutResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const workout = await manager.findOne(Workout, {
        where: { id, isGlobal: true }, relations: ['targetMuscleGroups'],
      });
      if (!workout) throw new NotFoundException('Public workout not found');
      for (const field of ['title', 'description', 'titleI18n', 'descriptionI18n', 'time', 'type', 'defaultWeightAndReps', 'status', 'difficulty', 'goal', 'equipment', 'sortOrder'] as const) {
        if (dto[field] !== undefined) (workout as any)[field] = dto[field];
      }
      if (dto.targetMuscleGroupIds !== undefined) {
        workout.targetMuscleGroups = dto.targetMuscleGroupIds.length
          ? await manager.findBy(MuscleGroup, { id: In(dto.targetMuscleGroupIds) })
          : [];
      }
      await manager.save(Workout, workout);
      if (dto.exercises !== undefined) await this.replaceGlobalExercises(manager, workout, dto.exercises);
    });
    return this.getGlobalWorkout(id);
  }

  async deleteGlobalWorkout(id: number): Promise<void> {
    const workout = await this.workoutRepo.findOne({ where: { id, isGlobal: true } });
    if (!workout) throw new NotFoundException('Public workout not found');
    await this.workoutRepo.softDelete(id);
  }

  private async replaceGlobalExercises(
    manager: import('typeorm').EntityManager,
    workout: Workout,
    exercises: CreateGlobalWorkoutDto['exercises'],
  ): Promise<void> {
    if (!exercises.length) throw new BadRequestException('A public workout needs exercises');
    const ids = exercises.map((item) => item.exerciseId);
    if (new Set(ids).size !== ids.length || new Set(exercises.map((item) => item.order)).size !== exercises.length) {
      throw new BadRequestException('Exercise IDs and order values must be unique');
    }
    const available = await manager.find(Exercise, { where: { id: In(ids), isGlobal: true } });
    if (available.length !== ids.length) throw new BadRequestException('All template exercises must be public');
    for (const item of exercises) {
      if (item.setWeights && item.setWeights.length !== item.sets) {
        throw new BadRequestException('setWeights length must match sets');
      }
    }
    await manager.delete(WorkoutExercise, { workout: { id: workout.id } });
    await manager.save(WorkoutExercise, exercises.map((item) => manager.create(WorkoutExercise, {
      workout,
      exercise: available.find((exercise) => exercise.id === item.exerciseId)!,
      order: item.order,
      sets: item.sets,
      reps: item.reps,
      weight: item.weight,
      setWeights: item.setWeights ?? Array(item.sets).fill(item.weight),
      pauseSeconds: item.pauseSeconds,
      distance: item.distance,
    })));
  }

  async createWorkout(
    dto: CreateWorkoutDto,
    userId: number,
  ): Promise<WorkoutResponseDto> {
    const { targetMuscleGroupIds, type, ...workoutData } = dto;
    const workout = this.workoutRepo.create({
      ...workoutData,
      ...(type ? { type: type as WorkoutType } : {}),
      createdBy: { id: userId } as User,
    });

    if (targetMuscleGroupIds?.length) {
      workout.targetMuscleGroups = await this.muscleGroupRepo.findBy({
        id: In(targetMuscleGroupIds),
      });
    }

    const saved = (await this.workoutRepo.save(workout)) as Workout;
    return this.getWorkout(saved.id, userId);
  }
  async updateWorkout(
    id: number,
    dto: UpdateWorkoutDto,
    userId: number,
  ): Promise<WorkoutResponseDto> {
    const workout = await this.workoutRepo.findOne({
      where: { id, createdBy: { id: userId } },
      relations: ['targetMuscleGroups'],
    });
    if (!workout) throw new NotFoundException('Workout not found');

    const { targetMuscleGroupIds, type, ...workoutData } = dto;
    Object.assign(workout, workoutData);
    if (dto.title !== undefined) workout.titleI18n = null;
    if (dto.description !== undefined) workout.descriptionI18n = null;
    if (type !== undefined) {
      workout.type = type as WorkoutType;
    }

    if (targetMuscleGroupIds !== undefined) {
      if (targetMuscleGroupIds.length) {
        workout.targetMuscleGroups = await this.muscleGroupRepo.findBy({
          id: In(targetMuscleGroupIds),
        });
      } else {
        workout.targetMuscleGroups = [];
      }
    }

    await this.workoutRepo.save(workout);
    return this.getWorkout(id, userId);
  }

  async deleteWorkout(
    id: number,
    userId: number,
  ): Promise<{ message: string }> {
    const workout = await this.workoutRepo.findOne({
      where: { id, createdBy: { id: userId }, isGlobal: false },
    });
    if (!workout) throw new NotFoundException('Workout not found');

    await this.workoutRepo.softDelete(id);

    return { message: 'Workout deleted' };
  }

  async duplicateWorkout(
    id: number,
    userId: number,
  ): Promise<WorkoutResponseDto> {
    const original = await this.workoutRepo.findOne({
      where: [
        { id, createdBy: { id: userId }, isGlobal: false },
        { id, isGlobal: true, status: 'published' },
      ],
      relations: [
        'exercises',
        'exercises.exercise',
        'exercises.exercise.primaryMuscleGroups',
        'targetMuscleGroups',
        'createdBy',
      ],
    });

    if (!original) throw new NotFoundException('Workout not found');

    const baseTitle = original.title.replace(/\s\(\d+\)$/, '');
    const existingCopies = await this.workoutRepo.find({
      where: { createdBy: { id: userId }, title: Like(`${baseTitle}%`) },
    });

    let copyNumber = original.isGlobal && existingCopies.length === 0 ? 0 : 1;
    existingCopies.forEach((w) => {
      const match = w.title.match(/\((\d+)\)$/);
      const number = match ? parseInt(match[1], 10) : 0;
      copyNumber = Math.max(copyNumber, number > 0 ? number + 1 : 2);
    });

    const suffix = copyNumber ? ` (${copyNumber})` : '';
    const localizedTitle = original.titleI18n
      ? Object.fromEntries(Object.entries(original.titleI18n).map(([language, title]) => [
          language,
          title ? `${title.replace(/\s\(\d+\)$/, '')}${suffix}` : title,
        ]))
      : null;

    return await this.dataSource.transaction(async (manager) => {
      const newWorkout = manager.create(Workout, {
        title: `${baseTitle}${suffix}`,
        description: original.description,
        titleI18n: localizedTitle,
        descriptionI18n: original.descriptionI18n,
        time: original.time,
        type: original.type,
        defaultWeightAndReps: original.defaultWeightAndReps,
        isGlobal: false,
        sourceTemplateId: original.isGlobal ? original.id : original.sourceTemplateId,
        createdBy: { id: userId } as User,
        targetMuscleGroups: original.targetMuscleGroups,
      });

      const savedWorkout = await manager.save(Workout, newWorkout);

      const newWorkoutExercises = (original.exercises ?? [])
        .sort((a, b) => a.order - b.order)
        .map((we, idx) =>
          manager.create(WorkoutExercise, {
            workout: savedWorkout,
            exercise: we.exercise,
            order: we.order ?? idx + 1,
            sets: we.sets,
            reps: we.reps,
            weight: we.weight,
            setWeights: we.setWeights ?? null,
            pauseSeconds: we.pauseSeconds,
            distance: we.distance,
          }),
        );

      if (newWorkoutExercises.length) {
        await manager.save(WorkoutExercise, newWorkoutExercises);
      }

      const reloaded = await manager.findOneOrFail(Workout, {
        where: { id: savedWorkout.id },
        relations: [
          'exercises',
          'exercises.exercise',
          'exercises.exercise.muscleGroups',
          'exercises.exercise.primaryMuscleGroups',
          'targetMuscleGroups',
          'createdBy',
        ],
      });

      return this.toResponseDto(reloaded);
    });
  }

  private toResponseDto(workout: Workout): WorkoutResponseDto {
    return {
      id: workout.id,
      title: workout.title,
      description: workout.description,
      titleI18n: workout.titleI18n,
      descriptionI18n: workout.descriptionI18n,
      isGlobal: workout.isGlobal,
      sourceTemplateId: workout.sourceTemplateId,
      templateKey: workout.templateKey,
      status: workout.status,
      difficulty: workout.difficulty,
      goal: workout.goal,
      equipment: workout.equipment,
      time: workout.time,
      type: workout.type ?? undefined,
      defaultWeightAndReps: workout.defaultWeightAndReps,
      targetMuscleGroups:
        workout.targetMuscleGroups?.map((mg) => ({
          id: mg.id,
          name: mg.name,
          nameI18n: mg.nameI18n,
          descriptionI18n: mg.descriptionI18n,
          createdAt: mg.createdAt,
          updatedAt: mg.updatedAt,
        })) ?? [],
      exercises:
        workout.exercises
          ?.map((e) => ({
            id: e.id,
            order: e.order,
            sets: e.sets,
            reps: e.reps,
            weight: Number(e.weight),
            setWeights: e.setWeights ?? null,
            pauseSeconds: e.pauseSeconds,
            distance: e.distance == null ? null : Number(e.distance),
            exercise: {
              id: e.exercise.id,
              title: e.exercise.title,
              description: e.exercise.descriptionI18n ?? null,
              isGlobal: e.exercise.isGlobal,
              personalizedFromGlobalId: e.exercise.personalizedFromGlobalId ?? null,
              primaryMuscleGroups:
                e.exercise.primaryMuscleGroups?.map((mg) => ({
                  id: mg.id,
                  name: mg.name,
                })) ?? [],
              deletedAt: e.exercise.deletedAt,
              muscleGroups:
                e.exercise.muscleGroups?.map((mg) => ({
                  id: mg.id,
                  name: mg.name,
                  nameI18n: mg.nameI18n,
                  descriptionI18n: mg.descriptionI18n,
                  createdAt: mg.createdAt,
                  updatedAt: mg.updatedAt,
                })) ?? [],
            },
          }))
          .sort((a, b) => a.order - b.order) || [],
      createdAt: workout.createdAt,
    };
  }
}
