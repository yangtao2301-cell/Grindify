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
import { Activity } from './activity.entity';
import { activitiesToSeed } from '../seed/data/activities.data';
import { chineseActivityNames } from '../seed/data/chinese.data';

@Injectable()
export class ActivitySeedService implements OnModuleInit {
  private readonly logger = new Logger(ActivitySeedService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
  ) {}

  /**
 * 如果全局活动目录尚不存在，则在应用启动时填充默认数据。
 * 全局活动由所有用户共享，并通过管理后台进行管理。
   */
  async onModuleInit(): Promise<void> {
    await this.seedGlobalActivities();
  }

  async seedGlobalActivities(): Promise<void> {
    const existing = await this.activityRepo.count({ where: { isGlobal: true } });
    if (existing > 0) {
      const activities = await this.activityRepo.find({ where: { isGlobal: true } });
      const missingChinese = activities.filter(
        (activity) =>
          !activity.title?.zho &&
          !!activity.title?.default &&
          !!chineseActivityNames[activity.title.default],
      );
      for (const activity of missingChinese) {
        activity.title = {
          ...activity.title,
          zho: chineseActivityNames[activity.title.default!],
        };
      }
      if (missingChinese.length > 0) {
        await this.activityRepo.save(missingChinese);
        this.logger.log(`Added Chinese names to ${missingChinese.length} global activity/activities`);
      }
      return;
    }

    this.logger.log('No global activities found – seeding defaults…');

    const activities: Activity[] = [];

    for (const def of activitiesToSeed) {
      const activity = this.activityRepo.create({
        title: {
          default: def.name,
          eng: def.name,
          swe: def.swedenName ?? def.name,
          zho: chineseActivityNames[def.name] ?? def.name,
        },
        descriptionI18n: def.description
          ? {
              default: def.description,
              eng: def.description,
              swe: def.swedenDescription ?? def.description,
            }
          : undefined,
        isGlobal: true,
        createdBy: null,
        icon: def.icon,
        trackDistance: def.trackDistance,
        trackPace: def.trackPace,
        trackElevation: def.trackElevation,
        trackCalories: def.trackCalories,
      });

      activities.push(activity);
    }

    await this.activityRepo.save(activities);
    this.logger.log(`Seeded ${activities.length} global activity(s)`);
  }
}
