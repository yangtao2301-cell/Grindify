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
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { WorkoutExercise } from './workoutExercise.entity';
import { MuscleGroup } from '../muscleGroup/muscleGroup.entity';
import { I18nString } from '../common/types/i18n.types';

export enum WorkoutType {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  HIIT = 'hiit',
  FLEXIBILITY = 'flexibility',
  ENDURANCE = 'endurance',
}

@Entity()
export class Workout {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  titleI18n?: I18nString | null;

  @Column({ type: 'jsonb', nullable: true })
  descriptionI18n?: I18nString | null;

  @Column({ default: false })
  isGlobal: boolean;

  @Column({ type: 'varchar', nullable: true, unique: true })
  templateKey?: string;

  @Column({ type: 'varchar', default: 'published' })
  status: 'draft' | 'published' | 'archived';

  @Column({ type: 'varchar', nullable: true })
  difficulty?: string;

  @Column({ type: 'varchar', nullable: true })
  goal?: string;

  @Column({ type: 'jsonb', nullable: true })
  equipment?: string[];

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'int', nullable: true })
  sourceTemplateId?: number;

  @Column()
  time: number;

  @Column({ type: 'enum', enum: WorkoutType, nullable: true })
  type?: WorkoutType;

  @Column({
    type: 'enum',
    enum: ['default', 'latest'],
    default: 'default',
  })
  defaultWeightAndReps: 'default' | 'latest';

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  createdBy: User | null;

  @ManyToMany(() => MuscleGroup, { eager: false })
  @JoinTable({ name: 'workout_target_muscle_groups' })
  targetMuscleGroups: MuscleGroup[];

  @OneToMany(() => WorkoutExercise, (we) => we.workout, {
    cascade: true,
    eager: true,
  })
  exercises: WorkoutExercise[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
