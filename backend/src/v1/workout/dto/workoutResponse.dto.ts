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

import { ApiProperty } from '@nestjs/swagger';
import { WorkoutExerciseSnapshotDto } from './workoutExerciseSnapshot.dto';
import { MuscleGroupResponseDto } from 'src/v1/muscleGroup/dto/muscleGroupResponse.dto';
import { I18nString } from '../../common/types/i18n.types';

export class WorkoutResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  titleI18n?: I18nString | null;

  @ApiProperty({ required: false })
  descriptionI18n?: I18nString | null;

  @ApiProperty()
  isGlobal: boolean;

  @ApiProperty({ required: false })
  sourceTemplateId?: number;

  @ApiProperty({ required: false })
  templateKey?: string;

  @ApiProperty({ required: false })
  status?: string;

  @ApiProperty({ required: false })
  difficulty?: string;

  @ApiProperty({ required: false })
  goal?: string;

  @ApiProperty({ required: false, type: [String] })
  equipment?: string[];

  @ApiProperty({ required: false })
  time?: number;

  @ApiProperty({
    required: false,
    enum: ['strength', 'cardio', 'hiit', 'flexibility', 'endurance'],
  })
  type?: string;

  @ApiProperty()
  defaultWeightAndReps: 'default' | 'latest';

  @ApiProperty({ type: [WorkoutExerciseSnapshotDto], required: false })
  exercises?: WorkoutExerciseSnapshotDto[];

  @ApiProperty({ type: [MuscleGroupResponseDto], required: false })
  targetMuscleGroups?: MuscleGroupResponseDto[];

  @ApiProperty()
  createdAt: Date;
}
