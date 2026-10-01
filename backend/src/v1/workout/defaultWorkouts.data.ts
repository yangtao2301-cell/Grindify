export interface DefaultWorkoutTemplate {
  key: string;
  title: { default: string; eng: string; zho: string; swe: string };
  description: { default: string; eng: string; zho: string; swe: string };
  time: number;
  muscles: string[];
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    weight: number;
    pauseSeconds: number;
  }>;
}

export const defaultWorkouts: DefaultWorkoutTemplate[] = [
  {
    key: 'starter-full-body-a',
    title: { default: 'Beginner Full Body A', eng: 'Beginner Full Body A', zho: '新手全身 A', swe: 'Nybörjare helkropp A' },
    description: { default: 'A short machine-based full-body workout.', eng: 'A short machine-based full-body workout.', zho: '使用常见器械完成的全身基础训练。', swe: 'Ett kort helkroppspass med maskiner.' },
    time: 35,
    muscles: ['quads', 'chest', 'back', 'hamstrings', 'abs'],
    exercises: [
      { name: 'Leg Press', sets: 2, reps: 10, weight: 20, pauseSeconds: 90 },
      { name: 'Machine Chest Press', sets: 2, reps: 10, weight: 10, pauseSeconds: 90 },
      { name: 'Lat Pulldown', sets: 2, reps: 10, weight: 10, pauseSeconds: 90 },
      { name: 'Seated Leg Curl', sets: 2, reps: 12, weight: 10, pauseSeconds: 60 },
      { name: 'Ab Crunch Machine', sets: 2, reps: 12, weight: 5, pauseSeconds: 60 },
    ],
  },
  {
    key: 'starter-full-body-b',
    title: { default: 'Beginner Full Body B', eng: 'Beginner Full Body B', zho: '新手全身 B', swe: 'Nybörjare helkropp B' },
    description: { default: 'An alternative machine-based full-body workout.', eng: 'An alternative machine-based full-body workout.', zho: '另一套器械全身训练，重点覆盖背部与肩部。', swe: 'Ett alternativt helkroppspass med maskiner.' },
    time: 35,
    muscles: ['quads', 'back', 'shoulders', 'chest', 'lowerBack'],
    exercises: [
      { name: 'Leg Press', sets: 2, reps: 12, weight: 20, pauseSeconds: 90 },
      { name: 'Chest-supported Machine Row', sets: 2, reps: 10, weight: 10, pauseSeconds: 90 },
      { name: 'Machine Shoulder Press', sets: 2, reps: 10, weight: 5, pauseSeconds: 90 },
      { name: 'Pec Deck', sets: 2, reps: 12, weight: 5, pauseSeconds: 60 },
      { name: 'Back Extension', sets: 2, reps: 12, weight: 0, pauseSeconds: 60 },
    ],
  },
  {
    key: 'basic-upper-body',
    title: { default: 'Upper Body Basics', eng: 'Upper Body Basics', zho: '上肢基础', swe: 'Överkropp grund' },
    description: { default: 'Chest, back, shoulders and arms with machines and cables.', eng: 'Chest, back, shoulders and arms with machines and cables.', zho: '使用器械和绳索训练胸、背、肩及手臂。', swe: 'Bröst, rygg, axlar och armar med maskiner och kabel.' },
    time: 45,
    muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    exercises: [
      { name: 'Machine Chest Press', sets: 3, reps: 10, weight: 15, pauseSeconds: 90 },
      { name: 'Lat Pulldown', sets: 3, reps: 10, weight: 15, pauseSeconds: 90 },
      { name: 'Machine Shoulder Press', sets: 2, reps: 10, weight: 5, pauseSeconds: 90 },
      { name: 'Seated Cable Row', sets: 2, reps: 10, weight: 10, pauseSeconds: 90 },
      { name: 'Cable Triceps Pushdown', sets: 2, reps: 12, weight: 5, pauseSeconds: 60 },
      { name: 'Cable Curl', sets: 2, reps: 12, weight: 5, pauseSeconds: 60 },
    ],
  },
  {
    key: 'basic-lower-body',
    title: { default: 'Lower Body Basics', eng: 'Lower Body Basics', zho: '下肢基础', swe: 'Underkropp grund' },
    description: { default: 'A machine-based leg and core workout.', eng: 'A machine-based leg and core workout.', zho: '使用器械训练大腿、臀部、小腿和核心。', swe: 'Ett maskinbaserat pass för ben och bål.' },
    time: 45,
    muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
    exercises: [
      { name: 'Leg Press', sets: 3, reps: 10, weight: 30, pauseSeconds: 90 },
      { name: 'Seated Leg Curl', sets: 3, reps: 12, weight: 10, pauseSeconds: 75 },
      { name: 'Leg Extension', sets: 2, reps: 12, weight: 10, pauseSeconds: 60 },
      { name: 'Hip Thrust Machine', sets: 2, reps: 10, weight: 10, pauseSeconds: 90 },
      { name: 'Calf Raise (Machine/Leg Press)', sets: 2, reps: 15, weight: 10, pauseSeconds: 60 },
      { name: 'Ab Crunch Machine', sets: 2, reps: 12, weight: 5, pauseSeconds: 60 },
    ],
  },
];
