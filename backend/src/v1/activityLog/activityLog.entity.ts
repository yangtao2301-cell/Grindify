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
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Activity } from '../activity/activity.entity';
import { ScheduledSession } from '../scheduledSession/scheduledSession.entity';

@Entity()
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Activity, {
    eager: true,
    onDelete: 'SET NULL',
    nullable: true,
  })
  activity: Activity | null;

  @ManyToOne(() => ScheduledSession, { onDelete: 'SET NULL', nullable: true })
  scheduledSession: ScheduledSession | null;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  duration: number; // 单位：分钟

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  distance?: number; // 单位：千米

  @Column({ nullable: true })
  pace?: string; // 格式为“5:30/km”

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  elevationGain?: number; // 单位：米

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  maxElevation?: number; // 单位：米

  @Column({ nullable: true })
  calories?: number;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}
