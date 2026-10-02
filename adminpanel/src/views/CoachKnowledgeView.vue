<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { apiFetch } from "@/services/api";

interface Document {
  id: string;
  title: string;
  category: string;
  source: string;
  content: string;
  demo: boolean;
  state: string;
  enabled: boolean;
  active_revision: string | null;
  error: string | null;
}
interface SearchHit {
  id: string;
  title: string;
  excerpt: string;
  demo: boolean;
  score: number;
}
type Form = Pick<
  Document,
  "title" | "category" | "source" | "content" | "demo"
>;
const documents = ref<Document[]>([]);
const status = ref<{
  available: boolean;
  chatModel: string;
  embeddingModel: string;
  dimensions: number;
} | null>(null);
const selected = ref<string | null>(null);
const form = ref<Form>({
  title: "",
  category: "通用",
  source: "",
  content: "",
  demo: false,
});
const baseline = ref(JSON.stringify(form.value));
const dirty = computed(() => JSON.stringify(form.value) !== baseline.value);
const loading = ref(false);
const busy = ref(false);
const error = ref("");
const success = ref("");
const filter = ref("");
const question = ref("");
const searching = ref(false);
const searched = ref(false);
const hits = ref<SearchHit[]>([]);
const states: Record<string, string> = {
  draft: "草稿",
  queued: "等待处理",
  processing: "向量化中",
  ready: "已就绪",
  failed: "处理失败",
};
const filtered = computed(() =>
  documents.value.filter((d) =>
    `${d.title} ${d.category}`
      .toLowerCase()
      .includes(filter.value.toLowerCase()),
  ),
);
const published = computed(
  () => documents.value.filter((d) => d.enabled).length,
);
const current = computed(() =>
  documents.value.find((d) => d.id === selected.value),
);
let timer: ReturnType<typeof setInterval> | undefined;
let disposed = false;
const describe = (cause: unknown) =>
  cause instanceof Error ? cause.message : "操作失败，请重试。";
async function refresh() {
  const [docs, config] = await Promise.all([
    apiFetch<Document[]>("/admin/coach/documents"),
    apiFetch<NonNullable<typeof status.value>>("/admin/coach/status"),
  ]);
  if (!disposed) {
    documents.value = docs;
    status.value = config;
  }
}
function edit(doc?: Document) {
  if (dirty.value && !window.confirm("放弃尚未保存的修改？")) return;
  selected.value = doc?.id || null;
  form.value = doc
    ? {
        title: doc.title,
        category: doc.category,
        source: doc.source,
        content: doc.content,
        demo: doc.demo,
      }
    : { title: "", category: "通用", source: "", content: "", demo: false };
  baseline.value = JSON.stringify(form.value);
  error.value = "";
  success.value = "";
}
async function save() {
  busy.value = true;
  error.value = "";
  success.value = "";
  try {
    const saved = await apiFetch<Document>(
      `/admin/coach/documents${selected.value ? `/${selected.value}` : ""}`,
      {
        method: selected.value ? "PUT" : "POST",
        body: JSON.stringify(form.value),
      },
    );
    selected.value = saved.id;
    baseline.value = JSON.stringify(form.value);
    await refresh();
    success.value =
      "草稿已保存。点击「发布并建立索引」后，新内容才会进入知识库。";
  } catch (cause) {
    error.value = describe(cause);
  } finally {
    busy.value = false;
  }
}
async function action(kind: "publish" | "unpublish") {
  if (!selected.value) return;
  busy.value = true;
  error.value = "";
  success.value = "";
  try {
    await apiFetch(`/admin/coach/documents/${selected.value}/action`, {
      method: "POST",
      body: JSON.stringify({ action: kind }),
    });
    await refresh();
    success.value =
      kind === "publish"
        ? "已加入处理队列，新版本就绪后自动发布。"
        : "资料已下架，停止参与检索。";
  } catch (cause) {
    error.value = describe(cause);
  } finally {
    busy.value = false;
  }
}
async function remove() {
  if (
    !selected.value ||
    !window.confirm("删除此资料及其检索索引？此操作不可撤销。")
  )
    return;
  busy.value = true;
  try {
    await apiFetch(`/admin/coach/documents/${selected.value}`, {
      method: "DELETE",
    });
    baseline.value = JSON.stringify(form.value);
    edit();
    await refresh();
  } catch (cause) {
    error.value = describe(cause);
  } finally {
    busy.value = false;
  }
}
async function seed() {
  busy.value = true;
  error.value = "";
  success.value = "";
  try {
    const result = await apiFetch<{ added: number }>("/admin/coach/demo", {
      method: "POST",
    });
    await refresh();
    success.value = `已添加 ${result.added} 篇演示草稿，请审阅后逐篇发布。重复添加不会覆盖已有资料。`;
  } catch (cause) {
    error.value = describe(cause);
  } finally {
    busy.value = false;
  }
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 400000)
      throw new Error("请选择不超过 400 KB 的 UTF-8 TXT 或 Markdown 文件。");
    const content = await file.text();
    if (content.length > 100000) throw new Error("正文不能超过 100000 字符。");
    if (form.value.content && !window.confirm("用导入内容替换当前正文？"))
      return;
    form.value.content = content;
    if (!form.value.title)
      form.value.title = file.name.replace(/\.[^.]+$/, "").slice(0, 160);
  } catch (cause) {
    error.value = describe(cause);
  } finally {
    input.value = "";
  }
}
async function search() {
  if (!question.value.trim()) return;
  searching.value = true;
  error.value = "";
  try {
    hits.value = await apiFetch<SearchHit[]>("/admin/coach/search", {
      method: "POST",
      body: JSON.stringify({ query: question.value }),
    });
    searched.value = true;
  } catch (cause) {
    error.value = describe(cause);
  } finally {
    searching.value = false;
  }
}
function warnUnsaved(event: BeforeUnloadEvent) {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}
onBeforeRouteLeave(
  () => !dirty.value || window.confirm("放弃尚未保存的知识库修改并离开？"),
);
onMounted(async () => {
  loading.value = true;
  try {
    await refresh();
  } catch (cause) {
    error.value = describe(cause);
  } finally {
    loading.value = false;
  }
  timer = setInterval(() => {
    if (documents.value.some((d) => ["processing", "queued"].includes(d.state)))
      void refresh().catch(() => undefined);
  }, 4000);
  window.addEventListener("beforeunload", warnUnsaved);
});
onBeforeUnmount(() => {
  disposed = true;
  clearInterval(timer);
  window.removeEventListener("beforeunload", warnUnsaved);
});
</script>

<template>
  <div class="coach-admin">
    <div class="page-head">
      <div class="titles">
        <h1>教练知识库</h1>
        <p>维护教练的参考资料，让每次回答有据可查。</p>
      </div>
      <div class="actions">
        <button :disabled="busy" @click="seed">添加演示资料</button
        ><button class="primary" :disabled="busy" @click="edit()">
          ＋ 新建资料
        </button>
      </div>
    </div>
    <div class="overview">
      <div>
        <span>资料总数</span><strong>{{ documents.length }}</strong>
      </div>
      <div>
        <span>参与检索</span><strong>{{ published }}</strong>
      </div>
      <div>
        <span>百炼连接配置</span
        ><strong class="config-value" :class="{ online: status?.available }">{{
          status?.available ? "已配置" : "待配置"
        }}</strong
        ><small v-if="status"
          >{{ status.chatModel }} · {{ status.embeddingModel }} /
          {{ status.dimensions }}维</small
        >
      </div>
    </div>
    <p v-if="status && !status.available" class="notice">
      资料可以先保存为草稿。请在服务端配置百炼 API
      Key、接入地址并启用教练后，再发布资料或测试检索。
    </p>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-if="success" class="feedback online" role="status">{{ success }}</p>
    <div class="workspace">
      <section class="library">
        <label for="knowledge-filter" class="sr-only">搜索资料</label
        ><input
          id="knowledge-filter"
          v-model="filter"
          placeholder="搜索标题或分类…"
        />
        <p v-if="loading" class="empty">正在加载资料…</p>
        <p v-else-if="!filtered.length" class="empty">
          还没有资料。可以先添加演示数据，体验发布和检索流程。
        </p>
        <button
          v-for="doc in filtered"
          :key="doc.id"
          class="document"
          :class="{ selected: selected === doc.id }"
          :disabled="busy"
          @click="edit(doc)"
        >
          <strong>{{ doc.title }}</strong
          ><span>{{ doc.category }} <i v-if="doc.demo">演示</i></span
          ><small :class="{ online: doc.enabled }"
            >{{ states[doc.state] || doc.state
            }}{{
              doc.enabled && doc.state !== "ready" ? " · 旧版仍可检索" : ""
            }}</small
          >
        </button>
      </section>
      <section class="editor">
        <div class="editor-head">
          <h2>{{ selected ? "编辑资料" : "新建资料" }}</h2>
          <span v-if="dirty">有未保存的修改</span>
        </div>
        <form @submit.prevent="save">
          <label
            >标题<input
              v-model="form.title"
              required
              maxlength="160"
              placeholder="例如：如何阅读训练记录"
          /></label>
          <div class="fields">
            <label
              >分类<input
                v-model="form.category"
                required
                maxlength="60" /></label
            ><label
              >来源<input
                v-model="form.source"
                maxlength="500"
                placeholder="作者、书名或资料网址"
            /></label>
          </div>
          <div class="content-heading">
            <label for="knowledge-content">正文</label
            ><label class="import"
              >导入 TXT / Markdown<input
                type="file"
                accept=".txt,.md"
                @change="importFile"
            /></label>
          </div>
          <textarea
            id="knowledge-content"
            v-model="form.content"
            required
            minlength="20"
            maxlength="100000"
            rows="16"
            placeholder="填写完整资料，发布后系统会自动切分并建立检索索引。"
          ></textarea>
          <label class="demo-toggle"
            ><input v-model="form.demo" type="checkbox" />
            演示资料（回答引用时会标注未经审核）</label
          >
          <p v-if="current?.error" class="error">{{ current.error }}</p>
          <div class="editor-actions">
            <button type="submit" :disabled="busy" class="primary">
              {{ busy ? "处理中…" : "保存草稿" }}</button
            ><button
              type="button"
              :disabled="
                busy ||
                dirty ||
                !selected ||
                !status?.available ||
                ['queued', 'processing'].includes(current?.state || '')
              "
              @click="action('publish')"
            >
              发布并建立索引</button
            ><button
              v-if="
                current?.enabled ||
                ['queued', 'processing'].includes(current?.state || '')
              "
              type="button"
              :disabled="busy"
              @click="action('unpublish')"
            >
              下架 / 取消发布</button
            ><button
              v-if="selected"
              type="button"
              class="danger"
              :disabled="busy"
              @click="remove"
            >
              删除
            </button>
          </div>
          <p class="hint">
            保存草稿不会替换线上版本。新索引完成后自动切换，下架立即停止检索。更换向量模型或维度后，需要重新发布资料。
          </p>
        </form>
      </section>
    </div>
    <section class="retrieval">
      <h2>检索测试</h2>
      <p>输入一个用户可能提出的问题，检查实际命中的已发布资料。</p>
      <form @submit.prevent="search">
        <input
          v-model="question"
          aria-label="测试问题"
          maxlength="1000"
          placeholder="例如：我每周可以练三次，应该怎么安排？"
        /><button
          class="primary"
          :disabled="searching || !question.trim() || !status?.available"
        >
          {{ searching ? "检索中…" : "测试检索" }}
        </button>
      </form>
      <p v-if="searched && !hits.length" class="empty">
        未找到相关片段。请检查资料是否已发布，或调整问题和资料内容。
      </p>
      <article v-for="hit in hits" :key="hit.id">
        <div>
          <strong>{{ hit.title }}</strong
          ><span
            >{{ hit.demo ? "演示 · " : "" }}相似度
            {{ hit.score.toFixed(3) }}</span
          >
        </div>
        <p>{{ hit.excerpt }}</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.coach-admin button:not(.document) {
  padding: 9px 13px;
  border: 1px solid var(--border-2);
  border-radius: 9px;
  font-size: 12px;
}
.coach-admin button.primary {
  background: var(--lime);
  color: var(--lime-ink);
  border-color: var(--lime);
  font-weight: 600;
}
.coach-admin button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.coach-admin input:not([type="checkbox"]):not([type="file"]),
.coach-admin textarea {
  background: var(--bg-2);
  border: 1px solid var(--border-2);
  border-radius: 8px;
  padding: 10px 12px;
  width: 100%;
  outline: none;
  font-size: 13px;
}
.coach-admin input:focus,
.coach-admin textarea:focus {
  border-color: var(--lime) !important;
}
.overview {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 14px;
  margin-bottom: 20px;
}
.overview > div {
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
}
.overview span,
.overview small {
  display: block;
  font-size: 12px;
  color: var(--mute);
}
.overview strong {
  display: block;
  font-size: 27px;
  margin-top: 5px;
}
.overview .config-value {
  font-size: 18px;
  margin-bottom: 6px;
}
.online {
  color: var(--emerald) !important;
}
.notice,
.feedback {
  padding: 12px 16px;
  border: 1px solid var(--border-2);
  background: var(--surface);
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
}
.error,
.danger {
  color: var(--red);
}
.workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
}
.library,
.editor,
.retrieval {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 18px;
}
.library {
  max-height: 900px;
  overflow: auto;
}
.document {
  display: block;
  text-align: left;
  width: 100%;
  padding: 14px 10px;
  margin-top: 8px;
  border-radius: 10px;
  border: 1px solid transparent;
}
.document.selected {
  background: var(--lime-soft);
  border-color: var(--lime-deep);
}
.document strong {
  font-size: 13px;
  display: block;
}
.document span,
.document small {
  display: block;
  font-size: 11px;
  color: var(--mute);
  margin-top: 7px;
}
.document i {
  font-style: normal;
  color: var(--amber);
  margin-left: 6px;
}
.editor-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
}
.editor-head h2,
.retrieval h2 {
  font-size: 16px;
}
.editor-head span {
  font-size: 11px;
  color: var(--amber);
}
.editor label {
  font-size: 12px;
  color: var(--text-2);
  display: block;
}
.editor label input {
  margin-top: 6px;
}
.fields {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
  margin: 14px 0;
}
.content-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.import {
  cursor: pointer;
  color: var(--lime) !important;
}
.import input {
  display: none;
}
.editor textarea {
  line-height: 1.8;
  resize: vertical;
}
.demo-toggle {
  display: flex !important;
  align-items: center;
  gap: 8px;
  margin: 14px 0;
}
.demo-toggle input {
  margin: 0 !important;
}
.editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hint {
  font-size: 11px;
  color: var(--dim);
  line-height: 1.8;
  margin-top: 12px;
}
.empty {
  font-size: 12px;
  color: var(--mute);
  padding: 25px 8px;
  line-height: 1.8;
}
.retrieval {
  margin-top: 20px;
}
.retrieval > p {
  color: var(--mute);
  font-size: 12px;
  margin: 8px 0 14px;
}
.retrieval form {
  display: flex;
  gap: 10px;
}
.retrieval form input {
  flex: 1;
  min-width: 0;
}
.retrieval article {
  padding: 15px 0;
  border-bottom: 1px solid var(--border);
}
.retrieval article > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}
.retrieval article span {
  font-size: 11px;
  color: var(--amber);
}
.retrieval article p {
  font-size: 12px;
  color: var(--mute);
  line-height: 1.8;
  white-space: pre-wrap;
  margin-top: 8px;
}
@media (max-width: 1000px) {
  .workspace {
    grid-template-columns: 1fr;
  }
  .library {
    max-height: 320px;
  }
  .overview {
    grid-template-columns: 1fr 1fr;
  }
  .overview > div:last-child {
    grid-column: span 2;
  }
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
