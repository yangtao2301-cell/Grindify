import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Exercise } from '../exercise/exercise.entity';
import { MuscleGroup } from '../muscleGroup/muscleGroup.entity';
import { defaultWorkouts } from './defaultWorkouts.data';
import { Workout, WorkoutType } from './workout.entity';
import { WorkoutExercise } from './workoutExercise.entity';

@Injectable()
export class WorkoutSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkoutSeedService.name);

  constructor(
    @InjectRepository(Workout) private readonly workoutRepo: Repository<Workout>,
    @InjectRepository(Exercise) private readonly exerciseRepo: Repository<Exercise>,
    @InjectRepository(MuscleGroup) private readonly muscleGroupRepo: Repository<MuscleGroup>,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const exercises = await this.exerciseRepo.find({ where: { isGlobal: true } });
    const byName = new Map(exercises.map((exercise) => [exercise.title.default, exercise]));
    const muscles = await this.muscleGroupRepo.find();
    const byMuscle = new Map(muscles.map((muscle) => [muscle.name, muscle]));

    for (const [index, template] of defaultWorkouts.entries()) {
      const existing = await this.workoutRepo.findOne({
        where: { templateKey: template.key },
        withDeleted: true,
      });
      if (existing) continue;

      const missing = template.exercises.filter((item) => !byName.has(item.name));
      if (missing.length) {
        this.logger.warn(`Skipping ${template.key}; missing public exercises: ${missing.map((item) => item.name).join(', ')}`);
        continue;
      }

      await this.dataSource.transaction(async (manager) => {
        const workout = await manager.save(Workout, manager.create(Workout, {
          title: template.title.default,
          titleI18n: template.title,
          description: template.description.default,
          descriptionI18n: template.description,
          time: template.time,
          type: WorkoutType.STRENGTH,
          defaultWeightAndReps: 'default',
          isGlobal: true,
          status: 'published',
          templateKey: template.key,
          difficulty: 'beginner',
          goal: 'general_fitness',
          equipment: ['gym_machines'],
          sortOrder: index,
          createdBy: null,
          targetMuscleGroups: template.muscles.map((name) => byMuscle.get(name)).filter((muscle): muscle is MuscleGroup => !!muscle),
        }));
        await manager.save(WorkoutExercise, template.exercises.map((item, exerciseIndex) => manager.create(WorkoutExercise, {
          workout,
          exercise: byName.get(item.name)!,
          order: exerciseIndex + 1,
          sets: item.sets,
          reps: item.reps,
          weight: item.weight,
          setWeights: Array(item.sets).fill(item.weight),
          pauseSeconds: item.pauseSeconds,
        })));
      });
      this.logger.log(`Seeded public workout ${template.key}`);
    }
  }
}
