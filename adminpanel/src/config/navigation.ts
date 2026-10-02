export interface NavSection {
  section: string
}

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  description: string
  badge?: number
}

export type NavEntry = NavSection | NavItem

export function isNavSection(entry: NavEntry): entry is NavSection {
  return 'section' in entry
}

export function isNavItem(entry: NavEntry): entry is NavItem {
  return 'id' in entry
}

export const ADMIN_NAV: NavEntry[] = [
  { section: 'Workspace' },
  {
    id: 'a-overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    path: '/',
    description: 'Instance overview and aggregate stats',
  },
  {
    id: 'a-users',
    label: 'Users',
    icon: 'Users',
    path: '/users',
    description: 'Manage user accounts, roles, and access',
  },
  { section: 'Content' },
  {
    id: 'a-exercises',
    label: 'Global Exercises',
    icon: 'Dumbbell',
    path: '/exercises',
    description: 'Manage the global exercise library',
  },
  {
    id: 'a-images',
    label: 'Exercise Images',
    icon: 'Image',
    path: '/exercise-images',
    description: 'Upload and manage exercise media',
  },
  {
    id: 'a-templates',
    label: 'Workout Templates',
    icon: 'Layers',
    path: '/templates',
    description: 'Curated workout templates for users',
  },
  {
    id: 'a-activities',
    label: 'Activity Types',
    icon: 'Activity',
    path: '/activities',
    description: 'Configure activity types and metrics',
  },
  {
    id: 'a-muscle-groups',
    label: 'Muscle Groups',
    icon: 'Layers',
    path: '/muscle-groups',
    description: 'Edit muscle group display names and translations',
  },
  { section: 'AI Coach' },
  {
    id: 'a-coach',
    label: '教练知识库',
    icon: 'BookOpen',
    path: '/coach-knowledge',
    description: '维护健身资料并测试检索',
  },
  {id:'a-coach-settings',label:'Coach Settings',icon:'Settings2',path:'/coach-settings',description:'Coach appearance and usage limits'},
  {id:'a-coach-playground',label:'Test Playground',icon:'FlaskConical',path:'/coach-playground',description:'Test answers with published knowledge'},
  {id:'a-coach-monitor',label:'Operations',icon:'Activity',path:'/coach-monitor',description:'Provider calls, tokens and health'},
  {id:'a-coach-feedback',label:'User Feedback',icon:'MessageSquare',path:'/coach-feedback',description:'Review shared feedback'},
  { section: 'Data' },
  {
    id: 'a-analytics',
    label: 'Analytics',
    icon: 'BarChart2',
    path: '/analytics',
    description: 'Instance-wide usage and engagement analytics',
  },
  {
    id: 'a-io',
    label: 'Import / Export',
    icon: 'Package',
    path: '/import-export',
    description: 'Bulk data import, export, and migrations',
  },
  {
    id: 'a-audit',
    label: 'Audit Logs',
    icon: 'ScrollText',
    path: '/audit-logs',
    description: 'Full event log for all admin actions',
  },
  { section: 'Instance' },
  {
    id: 'a-health',
    label: 'System Health',
    icon: 'ShieldCheck',
    path: '/system-health',
    description: 'Service status, uptime, and diagnostics',
  },
  {
    id: 'a-versions',
    label: 'Versions',
    icon: 'History',
    path: '/versions',
    description: 'Release history and update management',
  },
  {
    id: 'a-settings',
    label: 'Settings',
    icon: 'Settings2',
    path: '/settings',
    description: 'Instance configuration and preferences',
  },
]

export const NAV_ITEMS = ADMIN_NAV.filter(isNavItem) as NavItem[]
