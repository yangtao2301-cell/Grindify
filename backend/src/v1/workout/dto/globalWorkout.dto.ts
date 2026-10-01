import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString,
  Min, ValidateNested,
} from 'class-validator';
import { I18nStringDto } from '../../exercise/dto/createGlobalExercise.dto';
import { WorkoutType } from '../workout.entity';

export class GlobalWorkoutExerciseDto {
  @IsInt()
  exerciseId!: number;

  @IsInt()
  @Min(1)
  order!: number;

  @IsInt()
  @Min(1)
  sets!: number;

  @IsInt()
  @Min(1)
  reps!: number;

  @IsNumber()
  @Min(0)
  weight!: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  setWeights?: number[];

  @IsInt()
  @Min(0)
  pauseSeconds!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;
}

export class CreateGlobalWorkoutDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => I18nStringDto)
  titleI18n?: I18nStringDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => I18nStringDto)
  descriptionI18n?: I18nStringDto;

  @IsInt()
  @Min(1)
  time!: number;

  @IsOptional()
  @IsIn(Object.values(WorkoutType))
  type?: WorkoutType;

  @IsOptional()
  @IsIn(['default', 'latest'])
  defaultWeightAndReps?: 'default' | 'latest';

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  targetMuscleGroupIds?: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GlobalWorkoutExerciseDto)
  exercises!: GlobalWorkoutExerciseDto[];
}

export class UpdateGlobalWorkoutDto extends PartialType(CreateGlobalWorkoutDto) {}
