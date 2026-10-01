import type { RouteLocationRaw } from 'vue-router'

/** The destination of an in-app close action for each history-backed dialog. */
export type HistoryLayerBackTarget =
  | { kind: 'route'; to: RouteLocationRaw }
  | { kind: 'current-route' }
  | { kind: 'layer'; key: string; fallback: RouteLocationRaw }
  | { kind: 'previous-layer' }

export const historyLayerBackTargets: Record<string, HistoryLayerBackTarget> = {
  'home:weight-log': { kind: 'route', to: '/' },
  'home:weight-log-entry': { kind: 'layer', key: 'home:weight-log', fallback: '/' },
  // MyWorkouts is mounted on both / and /workout.
  'home:workout-list': { kind: 'current-route' },
  'home:workout-create': { kind: 'current-route' },

  'progress-photos:viewer': { kind: 'layer', key: 'home:weight-log', fallback: '/' },
  'progress-photos:compare': { kind: 'layer', key: 'home:weight-log', fallback: '/' },

  'settings:account': { kind: 'route', to: '/settings' },
  'settings:exercise-list': { kind: 'route', to: '/settings' },
  'settings:activity-list': { kind: 'route', to: '/settings' },
  'settings:session-list': { kind: 'route', to: '/settings' },
  'settings:workout-list': { kind: 'route', to: '/settings' },
  'settings:appearance': { kind: 'route', to: '/settings' },
  'settings:language': { kind: 'route', to: '/settings' },
  'settings:version-history': { kind: 'route', to: '/settings' },
  'settings:goals': { kind: 'route', to: '/settings' },
  'account:edit-personal-info': { kind: 'layer', key: 'settings:account', fallback: '/settings' },
  'settings:exercise-create': { kind: 'layer', key: 'settings:exercise-list', fallback: '/settings' },
  'settings:exercise-details': { kind: 'layer', key: 'settings:exercise-list', fallback: '/settings' },
  'settings:activity-create': { kind: 'layer', key: 'settings:activity-list', fallback: '/settings' },
  'settings:activity-details': { kind: 'layer', key: 'settings:activity-list', fallback: '/settings' },
  'settings:session-detail': { kind: 'layer', key: 'settings:session-list', fallback: '/settings' },
  // WorkoutList is also mounted below home:workout-list.
  'settings:workout-create': { kind: 'previous-layer' },
  'settings:workout-details': { kind: 'previous-layer' },
  'activity:edit': { kind: 'layer', key: 'settings:activity-details', fallback: '/settings' },
  'activity:edit-log': { kind: 'layer', key: 'settings:activity-details', fallback: '/settings' },

  'calendar:schedule-session': { kind: 'route', to: '/calendar' },
  'calendar:add-past-session': { kind: 'route', to: '/calendar' },
  'statistics:exercise-detail': { kind: 'route', to: '/statistics' },
  'statistics:workout-detail': { kind: 'route', to: '/statistics' },
  'workout:create': { kind: 'route', to: '/workout' },
  'activity:log-form': { kind: 'route', to: '/log-activity' },
  'activity:log-create': { kind: 'previous-layer' },

  // These page components also appear inside full-screen dialogs.
  'workout-details:edit': { kind: 'previous-layer' },
  'workout-details:weight-reps': { kind: 'previous-layer' },
  'workout-details:exercise': { kind: 'previous-layer' },
  'session:add-exercises': { kind: 'current-route' },
  'session:exercise-details': { kind: 'current-route' },
  'session:timer': { kind: 'current-route' },
  'session:edit-set': { kind: 'current-route' },
  'session-detail:exercise': { kind: 'previous-layer' },
  'session-detail:edit-activity': { kind: 'previous-layer' },
  'session-detail:edit-workout': { kind: 'previous-layer' },
  'session-detail:edit-exercise-sets': { kind: 'previous-layer' },
  'session-detail:save-as-workout': { kind: 'previous-layer' },
  'session-summary:save-as-workout': { kind: 'route', to: '/session-summary' },

  'workout:add-exercises': { kind: 'previous-layer' },
  'exercise-picker:details': { kind: 'previous-layer' },
  'exercise-picker:create': { kind: 'previous-layer' },
  'exercise:edit': { kind: 'previous-layer' },
  'create-exercise:muscle-groups': { kind: 'previous-layer' },
  'create-exercise:primary-muscles': { kind: 'previous-layer' },
  'edit-exercise:muscle-groups': { kind: 'layer', key: 'exercise:edit', fallback: '/settings' },
  'edit-exercise:primary-muscles': { kind: 'layer', key: 'exercise:edit', fallback: '/settings' },

  'legal:privacy': { kind: 'current-route' },
  'legal:terms': { kind: 'current-route' },
  'legal:imprint': { kind: 'current-route' },
  'form:fullscreen-select': { kind: 'previous-layer' },
}
