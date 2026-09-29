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

import { DataSource } from 'typeorm';
import { MuscleGroup } from '../../muscleGroup/muscleGroup.entity';
import { muscleGroupsToSeed } from '../data/muscleGroups.data';

/** 将旧的存储名称（瑞典语或旧版 i18nKey 格式）映射为新的简单英文名称。 */
const NAME_MIGRATION_MAP: Record<string, string> = {
// 旧瑞典语名称
  Bröst: 'chest',
  Rygg: 'back',
  Axlar: 'shoulders',
  Biceps: 'biceps',
  Triceps: 'triceps',
  Ben: 'legs',
  Mage: 'abs',
  Underarmar: 'forearms',
  Säte: 'glutes',
  'Baksida lår': 'hamstrings',
  'Framsida lår': 'quads',
  Vader: 'calves',
  'Bakre axlar': 'rearDelts',
  Bål: 'core',
  Trapezius: 'traps',
  Ländrygg: 'lowerBack',
  'Övre bröst': 'upperChest',
  Höftböjare: 'hipFlexors',
// 旧版将 i18nKey 直接作为名称的格式
  'muscleGroups.chest': 'chest',
  'muscleGroups.back': 'back',
  'muscleGroups.shoulders': 'shoulders',
  'muscleGroups.biceps': 'biceps',
  'muscleGroups.triceps': 'triceps',
  'muscleGroups.legs': 'legs',
  'muscleGroups.abs': 'abs',
  'muscleGroups.forearms': 'forearms',
  'muscleGroups.glutes': 'glutes',
  'muscleGroups.hamstrings': 'hamstrings',
  'muscleGroups.quads': 'quads',
  'muscleGroups.calves': 'calves',
  'muscleGroups.rearDelts': 'rearDelts',
  'muscleGroups.core': 'core',
  'muscleGroups.traps': 'traps',
  'muscleGroups.lowerBack': 'lowerBack',
  'muscleGroups.upperChest': 'upperChest',
  'muscleGroups.hipFlexors': 'hipFlexors',
};

export async function seedMuscleGroups(
  dataSource: DataSource,
): Promise<Map<string, MuscleGroup>> {
  const mgRepo = dataSource.getRepository(MuscleGroup);

// 将使用旧名称的现有记录迁移为新的简单英文名称
  for (const [oldName, newName] of Object.entries(NAME_MIGRATION_MAP)) {
    const existing = await mgRepo.findOne({ where: { name: oldName } });
    if (existing) {
      existing.name = newName;
      await mgRepo.save(existing);
    }
  }

// 插入尚不存在的肌群
  for (const mg of muscleGroupsToSeed) {
    const existing = await mgRepo.findOne({ where: { name: mg.name } });
    if (!existing) {
      await mgRepo.save(mg);
    }
  }

  const allMGs = await mgRepo.find();
  const mgMap = new Map<string, MuscleGroup>();
  allMGs.forEach((mg) => mgMap.set(mg.name, mg));

  console.log(`💪 Seeded/updated ${allMGs.length} muscle group(s)`);
  return mgMap;
}
