<script setup lang="ts">
import { ref } from 'vue'
import { coachApi, type CoachMessage } from '@/services/coach.service'
const props = defineProps<{ message: CoachMessage; question: string }>()
const editing = ref(false),
  busy = ref(false),
  saved = ref(false),
  share = ref(false)
const rating = ref<'up' | 'down'>('up'),
  comment = ref(''),
  error = ref('')
function start(value: 'up' | 'down') {
  rating.value = value
  editing.value = true
  saved.value = false
  error.value = ''
}
async function submit() {
  busy.value = true
  error.value = ''
  try {
    await coachApi.feedback(props.message.id, {
      rating: rating.value,
      comment: comment.value,
      shareContext: share.value,
    })
    saved.value = true
    editing.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : '反馈提交失败。'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div class="coach-feedback">
    <div class="feedback-actions">
      <button :disabled="busy" @click="start('up')">👍 有帮助</button
      ><button :disabled="busy" @click="start('down')">👎 需改进</button
      ><small v-if="saved" role="status">反馈已提交，谢谢。</small>
    </div>
    <form v-if="editing" @submit.prevent="submit">
      <strong>{{ rating === 'up' ? '这条回答有帮助' : '这条回答需要改进' }}</strong
      ><textarea
        v-model="comment"
        maxlength="1000"
        rows="3"
        aria-label="反馈说明"
        placeholder="可以补充具体原因（选填）"
      ></textarea
      ><label
        ><input v-model="share" type="checkbox" />允许管理员查看本轮问题、回答及引用资料</label
      >
      <p>默认仅提交评价和你填写的说明，不分享其他聊天记录或教练记忆。</p>
      <details v-if="share">
        <summary>预览将分享的问答和资料</summary>
        <strong>问题</strong>
        <p>{{ question }}</p>
        <strong>回答</strong>
        <p>{{ message.content }}</p>
        <div v-for="s in message.sources" :key="s.id">
          <strong>{{ s.title }}</strong>
          <p>{{ s.excerpt }}</p>
        </div>
      </details>
      <p v-if="error" role="alert">{{ error }}</p>
      <div class="feedback-actions">
        <button type="submit" :disabled="busy">{{ busy ? '提交中…' : '提交反馈' }}</button
        ><button type="button" :disabled="busy" @click="editing = false">取消</button>
      </div>
    </form>
  </div>
</template>
<style scoped>
.coach-feedback {
  margin: 10px 0;
  font-size: 12px;
}
.feedback-actions {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}
.feedback-actions button {
  font-size: 12px;
  padding: 5px 0;
}
.feedback-actions small {
  opacity: 0.65;
}
form {
  margin-top: 10px;
  padding: 14px;
  border: 1px solid rgba(127, 127, 127, 0.25);
  border-radius: 12px;
}
textarea {
  display: block;
  width: 100%;
  border: 1px solid rgba(127, 127, 127, 0.3);
  border-radius: 8px;
  padding: 10px;
  margin: 12px 0;
  color: inherit;
  resize: vertical;
}
label {
  display: flex;
  gap: 8px;
  align-items: start;
}
p {
  margin: 10px 0;
  opacity: 0.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
p[role='alert'] {
  color: #ff6f70;
}
details {
  margin: 12px 0;
  max-height: 240px;
  overflow: auto;
}
button:disabled {
  opacity: 0.5;
}
</style>
