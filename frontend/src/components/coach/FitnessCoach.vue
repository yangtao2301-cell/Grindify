<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import CoachFeedback from './CoachFeedback.vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import {
  coachApi,
  type CoachConversation,
  type CoachMemory,
  type CoachMessage,
} from '@/services/coach.service'

const props = defineProps<{ userId: number; bottomOffset: number }>()
const { smAndDown } = useDisplay()
const open = ref(false)
const tab = ref<'chat' | 'history' | 'memory'>('chat')
const loading = ref(false)
const sending = ref(false)
const available = ref(false)
const error = ref('')
const notice = ref('')
const draft = ref('')
const conversation = ref<CoachConversation | null>(null)
const conversations = ref<CoachConversation[]>([])
const messages = ref<CoachMessage[]>([])
const memories = ref<CoachMemory[]>([])
const memoryDrafts = ref<Record<string, string>>({})
const deleteTarget = ref<string | null>(null)
const feed = ref<HTMLElement | null>(null)
const launcher = ref<HTMLButtonElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
const quickQuestions = ref(['分析我最近的训练', '今天适合练什么？', '如何安排每周训练？'])
const coachName = ref('健身教练')
const welcome = ref('我可以结合你的训练记录，帮你复盘、解答疑问，找到下一步的方向。')
const memoryLabels: Record<string, string> = {
  goal: '训练目标',
  experience: '训练经验',
  schedule: '可用时间',
  equipment: '可用器械',
  preference: '训练偏好',
}
let abort: AbortController | undefined
let disposed = false
let initialized = false
let suppressClick = false
let drag:
  | { id: number; x: number; y: number; originX: number; originY: number; moved: boolean }
  | undefined
const x = ref(0)
const y = ref(0)
let side: 'left' | 'right' = 'right'
let ratio = 0.82
const positionKey = computed(() => `grindify-coach-position-${props.userId}`)
const style = computed(() => ({ left: `${x.value}px`, top: `${y.value}px` }))
const render = (text: string) =>
  DOMPurify.sanitize(marked.parse(text, { async: false }) as string, {
    FORBID_TAGS: ['img', 'iframe', 'style'],
    FORBID_ATTR: ['style'],
  })

function bounds() {
  return {
    width: window.innerWidth,
    maxY: Math.max(16, window.innerHeight - 48 - props.bottomOffset - 16),
  }
}
function reposition() {
  const b = bounds()
  x.value = side === 'left' ? 16 : Math.max(16, b.width - 64)
  y.value = Math.max(16, Math.min(b.maxY, ratio * b.maxY))
}
function pointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  suppressClick = false
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    originX: x.value,
    originY: y.value,
    moved: false,
  }
  launcher.value?.setPointerCapture(event.pointerId)
}
function pointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const dx = event.clientX - drag.x,
    dy = event.clientY - drag.y
  if (Math.hypot(dx, dy) > 6) drag.moved = true
  if (!drag.moved) return
  const b = bounds()
  x.value = Math.max(8, Math.min(b.width - 56, drag.originX + dx))
  y.value = Math.max(16, Math.min(b.maxY, drag.originY + dy))
}
function pointerUp(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  suppressClick = drag.moved
  side = x.value + 24 < window.innerWidth / 2 ? 'left' : 'right'
  ratio = y.value / bounds().maxY
  drag = undefined
  if (launcher.value?.hasPointerCapture(event.pointerId))
    launcher.value.releasePointerCapture(event.pointerId)
  reposition()
  try {
    localStorage.setItem(positionKey.value, JSON.stringify({ side, ratio }))
  } catch {
    /* Storage can be unavailable. */
  }
}
function launcherClick(event: MouseEvent) {
  if (event.detail === 0 || !suppressClick) open.value = true
  suppressClick = false
}
function inputKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !smAndDown.value) {
    event.preventDefault()
    void send()
  }
}
async function scroll(force = false) {
  const el = feed.value
  const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 100
  await nextTick()
  if (feed.value && !messages.value.length) {
    feed.value.scrollTop = 0
    return
  }
  if (feed.value && (force || nearBottom)) feed.value.scrollTop = feed.value.scrollHeight
}
async function initialize() {
  loading.value = true
  error.value = ''
  try {
    const [status, history] = await Promise.all([coachApi.status(), coachApi.conversations()])
    if (disposed) return
    available.value = status.available
    coachName.value = status.name
    welcome.value = status.welcome
    quickQuestions.value = status.quickQuestions
    conversations.value = history
    if (history[0]) {
      conversation.value = history[0]
      messages.value = await coachApi.history(history[0].id)
    }
    initialized = true
    if (!status.available) notice.value = '教练服务正在准备中，管理员配置完成后即可对话。'
    await scroll(true)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败，请重试。'
  } finally {
    loading.value = false
  }
}
watch(open, async value => {
  if (!value) return
  if (!initialized) await initialize()
  else {
    try {
      const status=await coachApi.status()
      available.value=status.available
      coachName.value=status.name
      welcome.value=status.welcome
      quickQuestions.value=status.quickQuestions
      if (available.value) notice.value = ''
    } catch {
      /* Sending will surface connection errors. */
    }
    await scroll(true)
  }
})
watch(tab, async value => {
  if (sending.value) return
  loading.value = true
  error.value = ''
  try {
    if (value === 'history') conversations.value = await coachApi.conversations()
    if (value === 'memory') {
      memories.value = await coachApi.memories()
      memoryDrafts.value = Object.fromEntries(memories.value.map(m => [m.id, m.content]))
    }
    if (value === 'chat') await scroll(true)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败。'
  } finally {
    loading.value = false
  }
})
async function choose(item: CoachConversation) {
  if (sending.value) return
  loading.value = true
  try {
    const history = await coachApi.history(item.id)
    conversation.value = item
    messages.value = history
    draft.value = ''
    tab.value = 'chat'
    error.value = ''
    await scroll(true)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败。'
  } finally {
    loading.value = false
  }
}
function newConversation() {
  if (sending.value) return
  conversation.value = null
  messages.value = []
  draft.value = ''
  error.value = ''
  notice.value = ''
  tab.value = 'chat'
  nextTick(() => input.value?.focus())
}
async function deleteConversation(id: string) {
  try {
    await coachApi.delete(id)
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (conversation.value?.id === id) {
      conversation.value = null
      messages.value = []
      draft.value = ''
    }
    deleteTarget.value = null
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '删除失败。'
  }
}
async function memoryAction(memory: CoachMemory, action: 'save' | 'delete') {
  loading.value = true
  try {
    if (action === 'delete') await coachApi.deleteMemory(memory.id)
    else await coachApi.updateMemory(memory.id, memoryDrafts.value[memory.id] || '')
    memories.value = await coachApi.memories()
    error.value = ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败。'
  } finally {
    loading.value = false
  }
}
function retry() {
  const last = [...messages.value].reverse().find(m => m.role === 'user')
  if (last) void send(last.content, last.request_id)
}
async function send(text = draft.value, retryId?: string) {
  const content = text.trim()
  if (!content || sending.value || loading.value || !available.value) return
  error.value = ''
  notice.value = ''
  sending.value = true
  tab.value = 'chat'
  abort = new AbortController()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  const requestId =
    retryId ||
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  let assistant: CoachMessage | undefined
  try {
    if (!conversation.value) conversation.value = await coachApi.create()
    if (disposed) return
    if (retryId)
      messages.value = messages.value.filter(
        m => !(m.request_id === retryId && m.role === 'assistant')
      )
    else
      messages.value.push({
        id: requestId,
        request_id: requestId,
        role: 'user',
        content,
        status: 'complete',
        sources: [],
      })
    assistant = {
      id: `${requestId}-answer`,
      request_id: requestId,
      role: 'assistant',
      content: '',
      status: 'pending',
      sources: [],
    }
    messages.value.push(assistant)
    // Work through the reactive proxy so streamed deltas render immediately.
    assistant = messages.value[messages.value.length - 1]!
    draft.value = ''
    await scroll(true)
    await coachApi.send(conversation.value.id, content, requestId, abort.signal, event => {
      if (disposed || !assistant) return
      if (event.type === 'start') {
        assistant.id = event.assistantId
        const user = messages.value.find(m => m.request_id === requestId && m.role === 'user')
        if (user) user.id = event.userMessageId
      }
      if (event.type === 'delta') assistant.content += event.text
      if (event.type === 'done') Object.assign(assistant, event.message)
      if (event.type === 'notice') notice.value = event.message
      void scroll()
    })
    if (conversation.value.title === '新对话') conversation.value.title = content.slice(0, 40)
  } catch (cause) {
    if (assistant) assistant.status = abort.signal.aborted ? 'stopped' : 'failed'
    if (!abort.signal.aborted)
      error.value = cause instanceof Error ? cause.message : '发送失败，请重试。'
  } finally {
    sending.value = false
    abort = undefined
  }
}
watch(() => props.bottomOffset, reposition)
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(positionKey.value) || '{}')
    if (saved.side === 'left' || saved.side === 'right') side = saved.side
    if (typeof saved.ratio === 'number' && Number.isFinite(saved.ratio))
      ratio = Math.max(0, Math.min(1, saved.ratio))
  } catch {
    /* Use the default position. */
  }
  reposition()
  window.addEventListener('resize', reposition)
})
onBeforeUnmount(() => {
  disposed = true
  abort?.abort()
  window.removeEventListener('resize', reposition)
})
</script>

<template>
  <button
    ref="launcher"
    class="coach-launcher"
    :style="style"
    aria-label="打开健身教练，可拖动调整位置"
    title="健身教练 · 可拖动"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="pointerUp"
    @pointercancel="pointerUp"
    @click="launcherClick"
  >
    <v-icon size="25">mdi-chat-processing-outline</v-icon>
    <span class="coach-launcher-dot" aria-hidden="true"></span>
  </button>
  <v-dialog
    v-model="open"
    class="coach-dialog"
    :fullscreen="smAndDown"
    max-width="440"
    scrollable
    aria-labelledby="coach-title"
  >
    <v-card class="coach-panel" rounded="xl">
      <header class="coach-header">
        <div class="coach-avatar"><v-icon>mdi-dumbbell</v-icon></div>
        <div class="flex-grow-1">
          <h2 id="coach-title">{{ coachName }}</h2>
          <p>聊训练，也聊你的进步</p>
        </div>
        <v-btn
          variant="text"
          icon="mdi-plus"
          size="small"
          title="新建对话"
          aria-label="新建对话"
          :disabled="sending || loading"
          @click="newConversation"
        />
        <v-btn
          variant="text"
          icon="mdi-close"
          size="small"
          aria-label="收起教练"
          @click="open = false"
        />
      </header>
      <nav class="coach-tabs" aria-label="教练功能">
        <button
          v-for="item in [
            ['chat', '对话'],
            ['history', '历史'],
            ['memory', '教练记忆'],
          ] as const"
          :key="item[0]"
          :class="{ active: tab === item[0] }"
          :disabled="sending || loading"
          :aria-pressed="tab === item[0]"
          @click="tab = item[0]"
        >
          {{ item[1] }}
        </button>
      </nav>
      <v-progress-linear v-if="loading" indeterminate color="primary" />
      <div v-if="error" class="coach-alert" role="alert">
        {{ error }} <button v-if="!initialized" @click="initialize">重新加载</button>
      </div>
      <div v-if="notice && tab === 'chat'" class="coach-notice">{{ notice }}</div>
      <div v-if="tab === 'chat'" ref="feed" class="coach-feed">
        <div v-if="!messages.length" class="coach-welcome">
          <div class="coach-welcome-icon"><v-icon size="32">mdi-dumbbell</v-icon></div>
          <h3>今天想聊点什么？</h3>
          <p>{{ welcome }}</p>
          <button
            v-for="question in quickQuestions"
            :key="question"
            :disabled="!available || loading"
            @click="send(question)"
          >
            {{ question }}<v-icon size="17">mdi-arrow-top-right</v-icon>
          </button>
          <small
            >对话及相关训练信息将发送至阿里云百炼。教练会自动记住目标和偏好，你可以在「教练记忆」中管理。</small
          >
        </div>
        <article
          v-for="(message, index) in messages"
          :key="message.id"
          class="coach-message"
          :class="message.role"
        >
          <div class="coach-message-label">{{ message.role === 'user' ? '你' : coachName }}</div>
          <div v-if="message.role === 'user'" class="coach-bubble coach-user-text">
            {{ message.content }}
          </div>
          <div v-else class="coach-bubble">
            <div
              v-if="message.content"
              class="coach-markdown"
              v-html="render(message.content)"
            ></div>
            <span v-else>{{
              message.status === 'pending' && sending ? '正在整理你的训练信息…' : '暂无回答'
            }}</span>
            <span
              v-if="message.status === 'pending' && sending"
              class="coach-caret"
              aria-label="正在生成"
              >▍</span
            >
            <small
              v-if="['failed', 'stopped', 'pending'].includes(message.status) && !sending"
              class="d-block mt-2"
              >{{ message.status === 'stopped' ? '已停止生成' : '回答未完成' }}</small
            >
          </div>
          <CoachFeedback v-if="message.role === 'assistant' && message.status === 'complete'" :message="message" :question="messages.find(m => m.request_id === message.request_id && m.role === 'user')?.content || ''" />
          <details v-if="message.sources.length" class="coach-sources">
            <summary>参考资料 · {{ message.sources.length }}</summary>
            <div v-for="source in message.sources" :key="source.id">
              <strong>[{{ source.citation }}] {{ source.title }}</strong
              ><span v-if="source.demo" class="coach-demo">演示资料</span>
              <p>{{ source.excerpt }}</p>
              <small>{{ source.source }}</small>
            </div>
          </details>
          <button
            v-if="
              index === messages.length - 1 &&
              message.role === 'assistant' &&
              message.status !== 'complete' &&
              !sending
            "
            class="coach-retry"
            @click="retry"
          >
            重新回答
          </button>
        </article>
      </div>
      <div v-else-if="tab === 'history'" class="coach-feed">
        <p v-if="!conversations.length && !loading" class="coach-empty">还没有历史对话。</p>
        <div v-for="item in conversations" :key="item.id" class="coach-history-row">
          <button class="coach-history-title" @click="choose(item)">
            {{ item.title }}<small>{{ new Date(item.updated_at).toLocaleDateString() }}</small>
          </button>
          <template v-if="deleteTarget === item.id"
            ><button class="coach-danger" @click="deleteConversation(item.id)">确认删除</button
            ><button @click="deleteTarget = null">取消</button></template
          >
          <v-btn
            v-else
            variant="text"
            icon="mdi-delete-outline"
            size="small"
            aria-label="删除对话"
            @click="deleteTarget = item.id"
          />
        </div>
      </div>
      <div v-else class="coach-feed">
        <p class="coach-memory-help">
          这里记录你的长期目标和偏好。手动修改后会固定该条记忆；删除后，该类信息将停止自动记忆。删除对话不会同时删除这些记忆。
        </p>
        <p v-if="!memories.length && !loading" class="coach-empty">
          还没有记忆，聊聊你的训练目标吧。
        </p>
        <section v-for="memory in memories" :key="memory.id" class="coach-memory-card">
          <label :for="`memory-${memory.id}`"
            >{{ memoryLabels[memory.kind] || memory.kind }}
            <small v-if="memory.locked">· 已固定</small></label
          >
          <textarea
            :id="`memory-${memory.id}`"
            v-model="memoryDrafts[memory.id]"
            maxlength="500"
            rows="3"
          ></textarea>
          <small v-if="memory.evidence">来自你的描述：{{ memory.evidence }}</small>
          <div>
            <button
              :disabled="loading"
              class="coach-danger"
              @click="memoryAction(memory, 'delete')"
            >
              删除</button
            ><button
              :disabled="loading || !memoryDrafts[memory.id]?.trim()"
              @click="memoryAction(memory, 'save')"
            >
              保存修改
            </button>
          </div>
        </section>
      </div>
      <footer v-if="tab === 'chat'" class="coach-composer">
        <form @submit.prevent="send()">
          <textarea
            ref="input"
            v-model="draft"
            aria-label="给健身教练发消息"
            placeholder="聊聊你的训练…"
            rows="2"
            maxlength="3000"
            :disabled="!available || loading"
            @keydown="inputKey"
          ></textarea>
          <v-btn
            v-if="sending"
            icon="mdi-stop"
            color="primary"
            size="small"
            aria-label="停止生成"
            @click="abort?.abort()"
          />
          <v-btn
            v-else
            type="submit"
            icon="mdi-arrow-up"
            color="primary"
            size="small"
            aria-label="发送消息"
            :disabled="!draft.trim() || !available || loading"
          />
        </form>
        <small>AI 建议仅供训练参考 · {{ draft.length }}/3000</small>
      </footer>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.coach-composer :deep(.v-btn) {
  flex: 0 0 36px;
  width: 36px;
  min-width: 36px;
  height: 36px;
}
.coach-launcher {
  position: fixed;
  z-index: 1200;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  box-shadow: 0 5px 20px #0003;
  touch-action: none;
  user-select: none;
  display: grid;
  place-items: center;
  cursor: grab;
  border: 2px solid rgba(255, 255, 255, 0.5);
}
.coach-launcher:active {
  cursor: grabbing;
}
.coach-launcher:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
.coach-launcher-dot {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 10px;
  height: 10px;
  border: 2px solid rgb(var(--v-theme-surface));
  border-radius: 50%;
  background: #50bd87;
}
.coach-panel {
  height: min(720px, 85dvh);
  display: flex !important;
  flex-direction: column;
  background: rgb(var(--v-theme-background));
  overflow: hidden !important;
}
.coach-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 14px 12px;
  flex-shrink: 0;
}
.coach-header h2 {
  font-size: 17px;
  font-weight: 700;
}
.coach-header p {
  font-size: 11px;
  opacity: 0.65;
  margin-top: 3px;
}
.coach-avatar,
.coach-welcome-icon {
  display: grid;
  place-items: center;
  background: rgba(var(--v-theme-primary), 0.13);
  color: rgb(var(--v-theme-primary));
  border-radius: 14px;
  width: 42px;
  height: 42px;
}
.coach-tabs {
  display: flex;
  gap: 4px;
  padding: 0 16px 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}
.coach-tabs button {
  font-size: 12px;
  padding: 7px 12px;
  border-radius: 20px;
  opacity: 0.65;
}
.coach-tabs button.active {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  opacity: 1;
  font-weight: 600;
}
.coach-feed {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 16px;
  overscroll-behavior: contain;
}
.coach-welcome {
  padding: 18px 5px;
}
.coach-welcome-icon {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  margin-bottom: 18px;
}
.coach-welcome h3 {
  font-size: 22px;
}
.coach-welcome p {
  font-size: 13px;
  line-height: 1.8;
  opacity: 0.7;
  margin: 10px 0 24px;
}
.coach-welcome > button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 13px 14px;
  margin-bottom: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  text-align: left;
  font-size: 13px;
}
.coach-welcome small {
  display: block;
  font-size: 11px;
  opacity: 0.6;
  line-height: 1.8;
  margin-top: 22px;
}
.coach-message {
  margin-bottom: 22px;
}
.coach-message-label {
  font-size: 10px;
  opacity: 0.55;
  margin-bottom: 6px;
}
.coach-message.user {
  margin-left: 35px;
}
.coach-message.user .coach-message-label {
  text-align: right;
}
.coach-bubble {
  font-size: 13px;
  line-height: 1.85;
  background: rgb(var(--v-theme-surface));
  padding: 13px 15px;
  border-radius: 4px 16px 16px 16px;
  overflow-wrap: anywhere;
}
.coach-user-text {
  background: rgba(var(--v-theme-primary), 0.15);
  white-space: pre-wrap;
  border-radius: 16px 4px 16px 16px;
}
.coach-markdown :deep(p) {
  margin-bottom: 8px;
}
.coach-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.coach-markdown :deep(ul),
.coach-markdown :deep(ol) {
  padding-left: 20px;
}
.coach-markdown :deep(pre) {
  white-space: pre-wrap;
}
.coach-markdown :deep(table) {
  display: block;
  overflow: auto;
}
.coach-markdown :deep(a) {
  color: rgb(var(--v-theme-primary));
}
.coach-caret {
  color: rgb(var(--v-theme-primary));
}
.coach-composer {
  flex-shrink: 0;
  padding: 12px 16px max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.coach-composer form {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}
.coach-composer textarea {
  flex: 1;
  min-width: 0;
  resize: none;
  font-size: 13px;
  outline: none;
  color: inherit;
}
.coach-composer small {
  display: block;
  text-align: center;
  font-size: 10px;
  opacity: 0.5;
  padding-top: 9px;
}
.coach-alert,
.coach-notice {
  padding: 10px 16px;
  font-size: 12px;
  flex-shrink: 0;
}
.coach-alert {
  background: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
}
.coach-notice {
  background: rgba(var(--v-theme-primary), 0.08);
}
.coach-alert button,
.coach-retry {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
.coach-retry {
  font-size: 12px;
  margin-top: 6px;
}
.coach-sources {
  font-size: 11px;
  margin-top: 9px;
  opacity: 0.85;
}
.coach-sources summary {
  cursor: pointer;
}
.coach-sources > div {
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.coach-sources p {
  margin: 5px 0;
  line-height: 1.7;
}
.coach-demo {
  padding: 2px 5px;
  margin-left: 5px;
  border-radius: 4px;
  background: rgba(var(--v-theme-warning), 0.15);
}
.coach-empty {
  font-size: 13px;
  opacity: 0.6;
  text-align: center;
  padding: 40px 0;
}
.coach-history-row {
  display: flex;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: 12px 0;
  font-size: 12px;
}
.coach-history-title {
  flex: 1;
  text-align: left;
  overflow-wrap: anywhere;
}
.coach-history-title small {
  display: block;
  opacity: 0.5;
  margin-top: 5px;
}
.coach-danger {
  color: rgb(var(--v-theme-error));
}
.coach-memory-help {
  font-size: 12px;
  opacity: 0.7;
  line-height: 1.8;
  margin-bottom: 18px;
}
.coach-memory-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 12px;
  font-size: 12px;
}
.coach-memory-card label {
  font-weight: 600;
}
.coach-memory-card textarea {
  display: block;
  width: 100%;
  padding: 8px 0;
  color: inherit;
  resize: vertical;
}
.coach-memory-card > small {
  opacity: 0.65;
}
.coach-memory-card > div {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}
button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
@media (max-width: 959px) {
  .coach-panel {
    height: 100dvh !important;
    border-radius: 0 !important;
  }
  .coach-header {
    padding-top: max(18px, env(safe-area-inset-top));
  }
}
</style>
<style>
@media (min-width: 960px) {
  .coach-dialog > .v-overlay__content {
    position: fixed;
    right: 24px;
    bottom: 24px;
    margin: 0 !important;
  }
}
</style>
