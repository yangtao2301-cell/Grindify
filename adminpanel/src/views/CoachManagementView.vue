<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from "vue-router";
import { apiFetch } from "@/services/api";
import CoachHealth from "@/components/CoachHealth.vue";

interface Settings {
  enabled: boolean;
  name: string;
  welcome: string;
  quickQuestions: string[];
  style: string;
  dailyUserLimit: number;
  dailyTotalLimit: number;
  maxOutputTokens: number;
}
interface Source {
  id: string;
  title: string;
  excerpt: string;
  score: number;
  demo: boolean;
  citation?: number;
}
interface TestResult {
  answer: string;
  sources: Source[];
  citations: Source[];
  durationMs: number;
}
interface Feedback {
  id: string;
  rating: string;
  comment: string;
  shared: boolean;
  state: string;
  resolution: string;
  document_id: string | null;
  created_at: string;
  question?: string;
  answer?: string;
  sources?: Source[];
}
interface Operation {
  id: string;
  kind: string;
  model: string;
  status: string;
  duration_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  created_at: string;
}
interface Monitor {
  summary: {
    requests: number;
    succeeded: number;
    failed: number;
    avg_ms: number | null;
    input_tokens: string;
    output_tokens: string;
    unknown_usage: number;
  };
  recent: Operation[];
  daily: { day: string; requests: number; failed: number }[];
  queues: { state: string; count: number }[];
  audit: {
    id: string;
    action: string;
    actor_id: number;
    target: string;
    created_at: string;
  }[];
}
const route = useRoute();
const mode = computed(() => route.path.split("-").at(-1) || "settings");
const headings: Record<string, [string, string]> = {
  settings: ["Coach Settings", "Manage the coach experience and daily limits"],
  playground: [
    "Test Playground",
    "Check answers against published knowledge before sharing with users",
  ],
  monitor: ["Operations", "Provider calls, latency and reported token usage"],
  feedback: [
    "User Feedback",
    "Review ratings and context that users explicitly chose to share",
  ],
};
const heading = computed(() => headings[mode.value] || headings.settings!);
const settings = ref<Settings | null>(null);
const baseline = ref("");
const dirty = computed(
  () => !!settings.value && JSON.stringify(settings.value) !== baseline.value,
);
const question = ref("");
const result = ref<TestResult | null>(null);
const monitor = ref<Monitor | null>(null);
const feedback = ref<Feedback[]>([]);
const selected = ref<Feedback | null>(null);
const docs = ref<{ id: string; title: string }[]>([]);
const filter = ref("all");
const rows = computed(() =>
  feedback.value.filter(
    (f) => filter.value === "all" || f.state === filter.value,
  ),
);
const loading = ref(false),
  busy = ref(false),
  error = ref(""),
  success = ref("");
const date = (v: string) => new Date(v).toLocaleString();
const describe = (e: unknown) =>
  e instanceof Error ? e.message : "Request failed. Please retry.";
let generation = 0;
async function load() {
  const current = ++generation;
  loading.value = true;
  error.value = "";
  success.value = "";
  selected.value = null;
  result.value = null;
  try {
    if (mode.value === "settings") {
      const value = await apiFetch<Settings>("/admin/coach/settings");
      if (current !== generation) return;
      settings.value = value;
      baseline.value = JSON.stringify(value);
    } else if (mode.value === "monitor") {
      const value = await apiFetch<Monitor>("/admin/coach/monitor");
      if (current === generation) monitor.value = value;
    } else if (mode.value === "feedback") {
      const [items, documents] = await Promise.all([
        apiFetch<Feedback[]>("/admin/coach/feedback"),
        apiFetch<{ id: string; title: string }[]>("/admin/coach/documents"),
      ]);
      if (current !== generation) return;
      feedback.value = items;
      docs.value = documents;
    }
  } catch (e) {
    if (current === generation) error.value = describe(e);
  } finally {
    if (current === generation) loading.value = false;
  }
}
async function saveSettings() {
  busy.value = true;
  error.value = "";
  success.value = "";
  try {
    const value = await apiFetch<Settings>("/admin/coach/settings", {
      method: "PUT",
      body: JSON.stringify(settings.value),
    });
    settings.value = value;
    baseline.value = JSON.stringify(value);
    success.value =
      "Settings saved. New requests use these settings immediately.";
  } catch (e) {
    error.value = describe(e);
  } finally {
    busy.value = false;
  }
}
async function test() {
  busy.value = true;
  error.value = "";
  result.value = null;
  try {
    result.value = await apiFetch<TestResult>("/admin/coach/test", {
      method: "POST",
      body: JSON.stringify({ query: question.value }),
    });
  } catch (e) {
    error.value = describe(e);
  } finally {
    busy.value = false;
  }
}
async function detail(item: Feedback) {
  busy.value = true;
  error.value = "";
  try {
    selected.value = {
      ...item,
      ...(await apiFetch<Feedback>(`/admin/coach/feedback/${item.id}`)),
    };
  } catch (e) {
    error.value = describe(e);
  } finally {
    busy.value = false;
  }
}
async function resolve() {
  if (!selected.value) return;
  busy.value = true;
  error.value = "";
  try {
    const f = selected.value;
    await apiFetch(`/admin/coach/feedback/${f.id}`, {
      method: "PUT",
      body: JSON.stringify({
        state: f.state,
        resolution: f.resolution,
        documentId: f.document_id || null,
      }),
    });
    const row = feedback.value.find((r) => r.id === f.id);
    if (row) Object.assign(row, f);
    success.value = "Feedback updated.";
  } catch (e) {
    error.value = describe(e);
  } finally {
    busy.value = false;
  }
}
const canLeave = () =>
  !busy.value &&
  (!dirty.value || window.confirm("Discard unsaved coach settings?"));
onBeforeRouteLeave(() => canLeave());
onBeforeRouteUpdate(() => canLeave());
const unload = (event: BeforeUnloadEvent) => {
  if (dirty.value || busy.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};
onMounted(() => {
  void load();
  window.addEventListener("beforeunload", unload);
});
onBeforeUnmount(() => {
  generation++;
  window.removeEventListener("beforeunload", unload);
});
watch(mode, () => {
  settings.value = null;
  baseline.value = "";
  void load();
});
</script>

<template>
  <section class="coach-admin">
    <div class="page-head">
      <div class="titles">
        <h1>{{ heading[0] }}</h1>
        <p>{{ heading[1] }}</p>
      </div>
      <button
        v-if="mode === 'monitor' || mode === 'feedback'"
        class="ca-button"
        :disabled="loading || busy"
        @click="load"
      >
        Refresh
      </button>
    </div>
    <p v-if="error" class="ca-alert" role="alert">{{ error }}</p>
    <p v-if="success" class="ca-success" role="status">{{ success }}</p>
    <p v-if="loading" role="status">Loading…</p>
    <form
      v-if="mode === 'settings' && settings"
      class="ca-grid"
      @submit.prevent="saveSettings"
    >
      <fieldset class="ca-card" :disabled="busy">
        <h2>Coach experience</h2>
        <p class="ca-muted">Visible to users in the floating chat.</p>
        <label class="ca-check"
          ><input type="checkbox" v-model="settings.enabled" /> Enable coach
          conversations</label
        >
        <label
          >Display name<input v-model="settings.name" required maxlength="40"
        /></label>
        <label
          >Welcome message<textarea
            v-model="settings.welcome"
            required
            maxlength="500"
            rows="3"
          ></textarea>
        </label>
        <label
          >Answer style<select v-model="settings.style">
            <option value="concise">
              Concise — short, actionable guidance
            </option>
            <option value="balanced">Balanced — findings and next steps</option>
            <option value="detailed">
              Detailed — explanations and examples
            </option>
          </select></label
        >
        <label
          >Quick questions <span class="ca-muted">1–6 suggestions</span></label
        >
        <div
          v-for="(_, i) in settings.quickQuestions"
          :key="i"
          class="ca-inline"
        >
          <input
            v-model="settings.quickQuestions[i]"
            :aria-label="`Quick question ${i + 1}`"
            required
            maxlength="100"
          /><button
            type="button"
            :disabled="settings.quickQuestions.length === 1"
            @click="settings.quickQuestions.splice(i, 1)"
          >
            Remove
          </button>
        </div>
        <button
          type="button"
          class="ca-button"
          :disabled="settings.quickQuestions.length >= 6"
          @click="settings.quickQuestions.push('')"
        >
          Add question
        </button>
      </fieldset>
      <div>
        <fieldset class="ca-card" :disabled="busy">
          <h2>Usage limits</h2>
          <p class="ca-muted">
            Daily limits reset at midnight, Asia/Shanghai. Failed and cancelled
            attempts count toward limits.
          </p>
          <label
            >Reply requests per user / day<input
              v-model.number="settings.dailyUserLimit"
              type="number"
              min="1"
              max="500"
              required
          /></label>
          <label
            >Requests across the site / day<input
              v-model.number="settings.dailyTotalLimit"
              type="number"
              min="1"
              max="50000"
              required
          /></label>
          <label
            >Maximum answer tokens<input
              v-model.number="settings.maxOutputTokens"
              type="number"
              min="256"
              max="4000"
              required
          /></label>
          <p class="ca-muted">
            Site requests include user replies and administrator tests. Indexing
            and memory calls appear in Operations but do not use conversation
            quotas.
          </p>
          <p class="ca-muted">
            Provider credentials and model IDs are managed through the server
            environment. The server switch must also be enabled.
          </p>
          <button
            class="ca-button primary"
            type="submit"
            :disabled="busy || !dirty"
          >
            {{ busy ? "Saving…" : "Save settings" }}</button
          ><span v-if="dirty" class="ca-muted"> Unsaved changes</span>
        </fieldset>
        <div class="ca-card ca-preview">
          <small>CHAT PREVIEW</small>
          <h2>{{ settings.name }}</h2>
          <p>{{ settings.welcome }}</p>
          <div
            v-for="q in settings.quickQuestions"
            :key="q"
            class="ca-suggestion"
          >
            {{ q || "Your quick question" }} ↗
          </div>
        </div>
      </div>
    </form>
    <template v-if="mode === 'playground'">
      <div class="ca-grid">
        <form class="ca-card" @submit.prevent="test">
          <h2>Ask a test question</h2>
          <p class="ca-muted">
            Uses published knowledge and the saved answer style. No user
            training records or memories are included. Test questions and
            answers are not saved.
          </p>
          <label
            >Question<textarea
              v-model="question"
              rows="7"
              required
              maxlength="1000"
              placeholder="How can a beginner plan three training sessions a week?"
            ></textarea></label
          ><button
            class="ca-button primary"
            :disabled="busy || !question.trim()"
          >
            {{ busy ? "Generating…" : "Run test" }}
          </button>
          <p class="ca-muted">
            Makes real model calls. Tests and connection checks share a limit of
            20 per administrator per day.
          </p>
        </form>
        <div class="ca-card">
          <h2>
            Answer
            <small v-if="result"
              >{{ (result.durationMs / 1000).toFixed(1) }}s</small
            >
          </h2>
          <p v-if="!result" class="ca-muted">
            {{
              busy
                ? "Retrieving knowledge and generating an answer…"
                : "Run a question to inspect the answer and its sources."
            }}
          </p>
          <p v-else class="ca-pre">{{ result.answer }}</p>
        </div>
      </div>
      <div v-if="result" class="ca-card">
        <h2>Retrieved knowledge · {{ result.sources.length }}</h2>
        <p v-if="!result.sources.length" class="ca-muted">
          No matching published knowledge. The answer used general model
          knowledge.
        </p>
        <article v-for="(s, i) in result.sources" :key="s.id" class="ca-source">
          <strong>[{{ i + 1 }}] {{ s.title }}</strong
          ><small>
            Similarity {{ s.score.toFixed(3) }} ·
            {{
              result.citations.some((c) => c.id === s.id)
                ? "Cited"
                : "Not cited"
            }}
            {{ s.demo ? "· Demo" : "" }}</small
          >
          <p class="ca-pre">{{ s.excerpt }}</p>
        </article>
      </div>
    </template>
    <template v-if="mode === 'monitor'">
      <CoachHealth />
      <template v-if="monitor"
        ><div class="ca-stats">
          <div class="ca-card">
            <small>PROVIDER CALLS TODAY</small
            ><strong>{{ monitor.summary.requests }}</strong>
          </div>
          <div class="ca-card">
            <small>SUCCESS RATE</small
            ><strong>{{
              monitor.summary.requests
                ? Math.round(
                    (monitor.summary.succeeded / monitor.summary.requests) *
                      100,
                  ) + "%"
                : "—"
            }}</strong>
          </div>
          <div class="ca-card">
            <small>FAILED CALLS</small
            ><strong>{{ monitor.summary.failed }}</strong>
          </div>
          <div class="ca-card">
            <small>AVERAGE LATENCY</small
            ><strong>{{
              monitor.summary.avg_ms === null
                ? "—"
                : (monitor.summary.avg_ms / 1000).toFixed(1) + "s"
            }}</strong>
          </div>
        </div>
        <div class="ca-card">
          <h2>Reported tokens today</h2>
          <p>
            {{ monitor.summary.input_tokens }} input ·
            {{ monitor.summary.output_tokens }} output
          </p>
          <p class="ca-muted">
            {{ monitor.summary.unknown_usage }} calls have no reported input
            usage. Token figures are provider-reported, not a billing estimate.
            Monitoring begins when this feature is installed; it includes chat,
            memory and embedding calls.
          </p>
          <div class="ca-inline">
            <span v-for="q in monitor.queues" :key="q.state" class="ca-tag"
              >Knowledge {{ q.state }} · {{ q.count }}</span
            >
          </div>
        </div>
        <div class="ca-card">
          <h2>Last 7 days</h2>
          <div v-for="d in monitor.daily" :key="d.day" class="ca-inline">
            <span>{{ d.day }}</span
            ><meter
              :value="d.requests"
              :max="Math.max(1, ...monitor.daily.map((x) => x.requests))"
            ></meter
            ><span>{{ d.requests }} calls · {{ d.failed }} failed</span>
          </div>
          <p v-if="!monitor.daily.length" class="ca-muted">
            No calls recorded yet.
          </p>
        </div>
        <div class="ca-card">
          <h2>Recent provider calls</h2>
          <p class="ca-muted">
            Latest 100. No prompts or private conversation content are stored
            here. Times use your browser timezone.
          </p>
          <div class="ca-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Kind / model</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Tokens in / out</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in monitor.recent" :key="r.id">
                  <td>{{ date(r.created_at) }}</td>
                  <td>
                    {{ r.kind }}<small>{{ r.model }}</small>
                  </td>
                  <td>{{ r.status }}</td>
                  <td>{{ r.duration_ms }}ms</td>
                  <td>
                    {{ r.input_tokens ?? "—" }} / {{ r.output_tokens ?? "—" }}
                  </td>
                  <td>{{ r.error || "—" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!monitor.recent.length" class="ca-muted">
            No provider calls yet.
          </p>
        </div>
        <div class="ca-card">
          <h2>Coach administration audit</h2>
          <p class="ca-muted">
            Latest 50 settings changes, knowledge actions, tests and feedback
            access events.
          </p>
          <div class="ca-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Admin ID</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in monitor.audit" :key="a.id">
                  <td>{{ date(a.created_at) }}</td>
                  <td>{{ a.actor_id ?? "Deleted account" }}</td>
                  <td>{{ a.action }}</td>
                  <td>{{ a.target || "—" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div></template
      >
    </template>
    <template v-if="mode === 'feedback'"
      ><div class="ca-grid">
        <div class="ca-card">
          <div class="ca-inline">
            <h2>Feedback inbox</h2>
            <select v-model="filter" aria-label="Filter feedback">
              <option value="all">All states</option>
              <option value="open">Open</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <p class="ca-muted">
            Latest 200 submissions. Opening details is recorded in the audit
            log.
          </p>
          <p v-if="!rows.length" class="ca-muted">No feedback in this state.</p>
          <button
            v-for="f in rows"
            :key="f.id"
            class="ca-feedback"
            :class="{ selected: selected?.id === f.id }"
            :disabled="busy"
            @click="detail(f)"
          >
            <strong
              >{{ f.rating === "up" ? "Helpful" : "Needs improvement" }}
              <span class="ca-tag">{{ f.state }}</span></strong
            >
            <p>{{ f.comment || "No comment provided" }}</p>
            <small
              >{{ date(f.created_at) }} ·
              {{ f.shared ? "Context shared" : "Rating / comment only" }}</small
            >
          </button>
        </div>
        <form v-if="selected" class="ca-card" @submit.prevent="resolve">
          <h2>Review feedback</h2>
          <p class="ca-pre">{{ selected.comment || "No comment provided" }}</p>
          <template v-if="selected.shared"
            ><h3>Shared question</h3>
            <p class="ca-pre">{{ selected.question }}</p>
            <h3>Shared answer</h3>
            <p class="ca-pre">{{ selected.answer }}</p>
            <details v-for="s in selected.sources" :key="s.id">
              <summary>{{ s.title }}</summary>
              <p>{{ s.excerpt }}</p>
            </details></template
          >
          <p v-else class="ca-muted">
            The user did not share conversation context.
          </p>
          <label
            >Status<select v-model="selected.state">
              <option value="open">Open</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
            </select></label
          ><label
            >Related knowledge document<select v-model="selected.document_id">
              <option :value="null">None</option>
              <option v-for="d in docs" :key="d.id" :value="d.id">
                {{ d.title }}
              </option>
            </select></label
          ><label
            >Internal resolution notes<textarea
              v-model="selected.resolution"
              maxlength="1000"
              rows="4"
            ></textarea></label
          ><button class="ca-button primary" :disabled="busy">
            Save review
          </button>
        </form>
        <div v-else class="ca-card">
          <h2>Select feedback</h2>
          <p class="ca-muted">
            Only an explicitly shared question and answer can appear here. Full
            conversation histories and user memories are unavailable.
          </p>
        </div>
      </div></template
    >
  </section>
</template>

<style scoped>
.coach-admin {
  max-width: 1500px;
}
.ca-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}
.ca-card {
  min-width: 0;
  background: var(--surface, #111113);
  border: 1px solid var(--border, #242428);
  border-radius: 18px;
  padding: 24px;
  margin: 0 0 20px;
}
.ca-card h2 {
  font-size: 17px;
  margin-bottom: 12px;
}
.ca-card h3 {
  font-size: 14px;
  margin-top: 18px;
}
.ca-card p {
  margin: 12px 0;
}
.ca-muted,
small {
  color: var(--mute, #98989f);
  font-size: 12px;
  line-height: 1.7;
}
.ca-card label {
  display: block;
  font-weight: 500;
  font-size: 13px;
  margin: 20px 0 10px;
}
.ca-card input:not([type="checkbox"]),
.ca-card textarea,
.ca-card select {
  display: block;
  width: 100%;
  padding: 11px 13px;
  background: var(--bg, #09090b);
  border: 1px solid var(--border, #303036);
  border-radius: 10px;
  margin-top: 8px;
}
.ca-card textarea {
  resize: vertical;
}
.ca-card input:focus,
.ca-card textarea:focus,
.ca-card select:focus {
  outline: 2px solid var(--lime, #c4f74a);
  outline-offset: 2px;
}
.ca-button {
  padding: 10px 16px;
  border: 1px solid var(--border, #303036);
  border-radius: 10px;
  background: var(--surface-2, #202024);
}
.ca-button.primary {
  background: var(--lime, #c4f74a);
  color: #172000;
  font-weight: 600;
}
.ca-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 12px 0;
}
.ca-inline input {
  flex: 1;
  min-width: 100px;
}
.ca-inline select {
  width: auto;
  margin: 0;
}
.ca-check {
  display: flex !important;
  align-items: center;
  gap: 10px;
}
.ca-alert,
.ca-success {
  padding: 14px;
  border-radius: 10px;
  margin: 16px 0;
}
.ca-alert {
  background: #36191d;
  color: #ffb9be;
}
.ca-success {
  background: #193321;
  color: #a6eebb;
}
.ca-pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.8;
}
.ca-source {
  border-top: 1px solid var(--border, #242428);
  padding: 18px 0;
}
.ca-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.ca-stats strong {
  display: block;
  font-size: 30px;
  margin-top: 10px;
}
.ca-tag {
  font-size: 11px;
  color: var(--mute, #a1a1aa);
  padding: 4px 8px;
  border: 1px solid var(--border, #303036);
  border-radius: 6px;
}
.ca-table {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 12px;
}
th,
td {
  padding: 12px;
  border-bottom: 1px solid var(--border, #242428);
  white-space: nowrap;
}
td small {
  display: block;
}
.ca-feedback {
  display: block;
  width: 100%;
  text-align: left;
  padding: 16px;
  border: 1px solid var(--border, #303036);
  border-radius: 12px;
  margin-top: 12px;
  overflow-wrap: anywhere;
}
.ca-feedback.selected {
  border-color: var(--lime, #c4f74a);
}
.ca-preview {
  border-top: 3px solid var(--lime, #c4f74a);
}
.ca-preview h2 {
  margin-top: 14px;
}
.ca-suggestion {
  padding: 12px;
  border: 1px solid var(--border, #303036);
  border-radius: 10px;
  margin-top: 12px;
  overflow-wrap: anywhere;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
meter {
  flex: 1;
  min-width: 80px;
  accent-color: var(--lime, #c4f74a);
}
@media (max-width: 1000px) {
  .ca-grid {
    grid-template-columns: 1fr;
  }
  .ca-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
