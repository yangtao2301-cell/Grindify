<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiFetch } from "@/services/api";
const health = ref<{
  database: boolean;
  vector: boolean;
  configured: boolean;
  enabled: boolean;
  pending_documents: number;
  failed_documents: number;
  chatModel: string;
  embeddingModel: string;
} | null>(null);
const checking = ref(false),
  error = ref(""),
  verified = ref("");
async function refresh() {
  try {
    health.value = await apiFetch("/admin/coach/health");
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Health check failed";
  }
}
async function check() {
  checking.value = true;
  error.value = "";
  verified.value = "";
  try {
    const result = await apiFetch<{ checkedAt: string }>(
      "/admin/coach/health/check",
      { method: "POST" },
    );
    verified.value = new Date(result.checkedAt).toLocaleString();
    await refresh();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Connection failed";
  } finally {
    checking.value = false;
  }
}
onMounted(refresh);
</script>
<template>
  <section class="coach-health">
    <div class="health-heading">
      <h2>AI coach health</h2>
      <button :disabled="checking || !health?.configured" @click="check">
        {{ checking ? "Checking…" : "Test provider connection" }}
      </button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
    <div v-if="health" class="health-grid">
      <span
        >Database
        <b>{{ health.database ? "Connected" : "Unavailable" }}</b></span
      ><span
        >Vector extension <b>{{ health.vector ? "Ready" : "Missing" }}</b></span
      ><span
        >Provider configuration
        <b>{{ health.configured ? "Present" : "Incomplete" }}</b></span
      ><span
        >Coach switch <b>{{ health.enabled ? "Enabled" : "Disabled" }}</b></span
      >
    </div>
    <p v-if="health">
      Knowledge tasks: {{ health.pending_documents }} pending ·
      {{ health.failed_documents }} failed
    </p>
    <p>
      {{
        verified
          ? `Chat and embedding connection verified at ${verified}`
          : "Provider connection has not been tested in this view."
      }}
    </p>
    <small
      >Connection tests make real chat and embedding calls. Configuration
      presence alone does not confirm connectivity.</small
    >
  </section>
</template>
<style scoped>
.coach-health {
  background: var(--surface, #111113);
  border: 1px solid var(--border, #242428);
  border-radius: 18px;
  padding: 24px;
  margin-bottom: 20px;
}
.health-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
h2 {
  font-size: 17px;
}
button {
  padding: 9px 14px;
  border: 1px solid var(--border, #333);
  border-radius: 9px;
}
button:disabled {
  opacity: 0.5;
}
.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 18px;
  margin: 22px 0;
}
.health-grid b {
  display: block;
  color: var(--lime, #c4f74a);
  margin-top: 7px;
}
p,
small {
  color: var(--mute, #aaa);
  font-size: 12px;
  line-height: 1.8;
}
p[role="alert"] {
  color: #ffb9be;
}
</style>
