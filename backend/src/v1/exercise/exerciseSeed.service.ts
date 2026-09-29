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

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from './exercise.entity';
import { MuscleGroupService } from '../muscleGroup/muscleGroup.service';
import { exercisesToSeed } from '../seed/data/exercises.data';
import { chineseExerciseNames } from '../seed/data/chinese.data';

@Injectable()
export class ExerciseSeedService implements OnModuleInit {
  private readonly logger = new Logger(ExerciseSeedService.name);

  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepo: Repository<Exercise>,
    private readonly muscleGroupService: MuscleGroupService,
  ) {}

  /**
 * 如果全局训练动作目录尚不存在，则在应用启动时填充默认数据。
 * 全局训练动作由所有用户共享，并通过管理后台进行管理。
   */
  async onModuleInit(): Promise<void> {
    await this.seedGlobalExercises();
  }

  async seedGlobalExercises(): Promise<void> {
    const existing = await this.exerciseRepo.count({ where: { isGlobal: true } });
    if (existing > 0) {
      const exercises = await this.exerciseRepo.find({ where: { isGlobal: true } });
      const missingChinese = exercises.filter(
        (exercise) =>
          !exercise.title?.zho &&
          !!exercise.title?.default &&
          !!chineseExerciseNames[exercise.title.default],
      );
      for (const exercise of missingChinese) {
        exercise.title = {
          ...exercise.title,
          zho: chineseExerciseNames[exercise.title.default!],
        };
      }
      if (missingChinese.length > 0) {
        await this.exerciseRepo.save(missingChinese);
        this.logger.log(`Added Chinese names to ${missingChinese.length} global exercise(s)`);
      }
      return;
    }

    this.logger.log('No global exercises found – seeding defaults…');

    const allMuscleGroups = await this.muscleGroupService.findAll();
    const mgMap = new Map(allMuscleGroups.map((mg) => [mg.name, mg]));

    const exercises: Exercise[] = [];

    for (const def of exercisesToSeed) {
      const muscleGroups = def.muscleGroups
        .map((name) => mgMap.get(name))
        .filter((mg): mg is NonNullable<typeof mg> => !!mg);

      const primaryMuscleGroups = def.primaryMuscleGroup
        ? [mgMap.get(def.primaryMuscleGroup)].filter((mg): mg is NonNullable<typeof mg> => !!mg)
        : [];

      const exercise = this.exerciseRepo.create({
        title: {
          default: def.defaultName,
          eng: def.defaultName,
          swe: def.swedenName ?? def.defaultName,
          zho: chineseExerciseNames[def.defaultName] ?? def.defaultName,
        },
        descriptionI18n: {
          default: def.defaultDescription,
          eng: def.defaultDescription,
          swe: def.swedenDescription ?? def.defaultDescription,
        },
        isGlobal: true,
        createdBy: null,
        exerciseType: def.exerciseType,
        equipmentI18n: def.equipment ? { default: def.equipment, eng: def.equipment } : undefined,
        instructionsI18n: def.instructions?.length
          ? { default: def.instructions, eng: def.instructions }
          : undefined,
        proTipsI18n: def.proTips?.length
          ? { default: def.proTips, eng: def.proTips }
          : undefined,
        mistakesI18n: def.mistakes?.length
          ? { default: def.mistakes, eng: def.mistakes }
          : undefined,
        muscleGroups,
        primaryMuscleGroups,
      });

      exercises.push(exercise);
    }

    await this.exerciseRepo.save(exercises);
    this.logger.log(`Seeded ${exercises.length} global exercise(s)`);
  }
}
