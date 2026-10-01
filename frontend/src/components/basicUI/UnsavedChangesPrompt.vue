<template>
  <v-dialog :model-value="state.open" persistent max-width="440">
    <v-card class="bg-cardBg rounded-lg" style="border: 1px solid rgb(var(--v-theme-borderColor))">
      <v-card-title>{{ $t('navigation.unsavedChangesTitle') }}</v-card-title>
      <v-card-text>{{ $t('navigation.unsavedChangesMessage') }}</v-card-text>
      <v-card-text v-if="state.error" class="text-error pt-0">{{ state.error }}</v-card-text>
      <v-card-actions class="flex-wrap justify-end ga-2 px-4 pb-4">
        <v-btn variant="text" :disabled="state.saving" @click="stayOnPage">
          {{ $t('navigation.keepEditing') }}
        </v-btn>
        <v-btn color="error" variant="text" :disabled="state.saving" @click="discardChangesAndContinue">
          {{ $t('navigation.discardChanges') }}
        </v-btn>
        <v-btn color="primary" variant="flat" :loading="state.saving" @click="saveChangesAndContinue">
          {{ $t('navigation.saveAndContinue') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import {
  discardChangesAndContinue,
  saveChangesAndContinue,
  stayOnPage,
  unsavedPromptState,
} from '@/navigation/unsavedChanges'

const state = unsavedPromptState
</script>
