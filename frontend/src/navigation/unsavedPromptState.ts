import { reactive } from 'vue'

export const unsavedPromptState = reactive({
  open: false,
  saving: false,
  error: '',
})
