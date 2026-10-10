import { resolveRequestUrl } from '@/utils/fetchWrapper'

const base = `${import.meta.env.VITE_API_URL || 'http://localhost:1337/v1'}/coach`
export interface CoachSource {
  id: string
  title: string
  source: string
  excerpt: string
  demo: boolean
  citation?: number
}
export interface CoachMessage {
  id: string
  request_id: string
  role: 'user' | 'assistant'
  content: string
  status: string
  sources: CoachSource[]
}
export interface CoachConversation {
  id: string
  title: string
  updated_at: string
}
export interface CoachMemory {
  id: string
  kind: string
  content: string
  evidence: string
  locked: boolean
}
export interface CoachPlanExercise {
  exerciseId: number
  sets: number
  reps: number
  pauseSeconds: number
}
export interface CoachPlanDay {
  date: string
  title: string
  minutes: number
  note: string
  exercises: CoachPlanExercise[]
}
export interface CoachPlanPayload {
  windowStart: string
  windowEnd: string
  summary: string
  pattern?: 'four_on_one_off' | 'five_on_one_off'
  cycles?: number
  days: CoachPlanDay[]
}
export interface CoachPlanDraft {
  id: string
  status: 'pending' | 'applied'
  version: number
  expiresAt: string
  payload: CoachPlanPayload
  conflicts: string[]
  restConflicts: string[]
  exerciseOptions: { id: number; name: string; equipment: string[] }[]
}
export interface CoachPlanRequest {
  requestId: string
  daysOfWeek: number[]
  minutes: number
  goal: string
  experience: 'beginner' | 'intermediate' | 'advanced'
  equipment: string
  limitations: string
}
export interface CoachPlanFromMessageRequest extends CoachPlanRequest {
  pattern: 'weekly' | 'four_on_one_off' | 'five_on_one_off'
  startDate: string
  cycles?: number
}
export type CoachEvent =
  | { type: 'start'; assistantId: string; userMessageId: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; message: CoachMessage }
  | { type: 'error' | 'notice'; message: string }

async function request(path: string, init: RequestInit = {}) {
  const res = await fetch(resolveRequestUrl(`${base}${path}`), {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(
      res.status === 401
        ? '登录已过期，请重新登录。'
        : typeof error.message === 'string'
          ? error.message
          : '请求失败，请稍后重试。'
    )
  }
  return res
}
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  return (await request(path, init)).json() as Promise<T>
}
export const coachApi = {
  latestPlan: () => json<CoachPlanDraft | null>('/plan-drafts/latest'),
  generatePlan: (input: CoachPlanRequest) => json<CoachPlanDraft>('/plan-drafts', {
    method: 'POST', body: JSON.stringify(input),
  }),
  generatePlanFromMessage: (messageId: string, input: CoachPlanFromMessageRequest) =>
    json<CoachPlanDraft>(`/messages/${messageId}/plan-draft`, {
      method: 'POST', body: JSON.stringify(input),
    }),
  updatePlan: (id: string, version: number, payload: CoachPlanPayload) =>
    json<CoachPlanDraft>(`/plan-drafts/${id}`, {
      method: 'PUT', body: JSON.stringify({ version, payload: JSON.stringify(payload) }),
    }),
  applyPlan: (id: string, version: number, allowConflictDates: string[], skipDates: string[]) =>
    json<{ created: { date: string; workoutId: number; scheduledSessionId: number }[]; skipped: string[] }>(`/plan-drafts/${id}/apply`, {
      method: 'POST', body: JSON.stringify({ version, allowConflictDates, skipDates }),
    }),
  feedback: (id: string, data: {rating: 'up'|'down';comment: string;shareContext: boolean}) => json(`/messages/${id}/feedback`, {method:'POST',body:JSON.stringify(data)}),
  status: () => json<{ available: boolean; dailyLimit: number; name: string; welcome: string; quickQuestions: string[] }>('/status'),
  conversations: () => json<CoachConversation[]>('/conversations'),
  create: () => json<CoachConversation>('/conversations', { method: 'POST' }),
  history: (id: string) => json<CoachMessage[]>(`/conversations/${id}/messages`),
  delete: (id: string) => json(`/conversations/${id}`, { method: 'DELETE' }),
  memories: () => json<CoachMemory[]>('/memories'),
  updateMemory: (id: string, content: string) =>
    json(`/memories/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  deleteMemory: (id: string) => json(`/memories/${id}`, { method: 'DELETE' }),
  async send(
    id: string,
    content: string,
    requestId: string,
    signal: AbortSignal,
    onEvent: (event: CoachEvent) => void
  ) {
    const response = await request(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, requestId }),
      signal,
    })
    if (!response.body) throw new Error('连接未返回内容，请重试。')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let completed = false
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let end: number
        while ((end = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, end).trim()
          buffer = buffer.slice(end + 1)
          if (!line.startsWith('data:')) continue
          const event = JSON.parse(line.slice(5)) as CoachEvent
          if (event.type === 'error') throw new Error(event.message)
          if (event.type === 'done') completed = true
          onEvent(event)
        }
      }
      if (!completed && !signal.aborted) throw new Error('回答连接中断，可以重试刚才的问题。')
    } finally {
      await reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }
  },
}
