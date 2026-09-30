<!--
  - Copyright (c) 2026 FalkenDev
  -
  - This file is part of Grindify.
  -
  - Grindify is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of
  - the License, or (at your option) any later version.
  -
  - You should have received a copy of the GNU Affero General Public
  - License along with Grindify. If not, see
  - <https://www.gnu.org/licenses/>.
  -->

<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="bg-background">
      <BackHeader :title="$t('settings.imprint')" @click="$emit('update:modelValue', false)" />
      <v-card-text class="pa-6">
        <p class="text-caption text-textSecondary mb-6">{{ $t('legal.lastUpdated') }}</p>

        <h3 class="text-h6 mb-2">{{ $t('legal.imprint.operatorTitle') }}</h3>
        <p class="text-body-2 mb-4">
          <strong>{{ operatorName }}</strong><br />
          {{ $t('legal.imprint.address') }} <strong>{{ operatorAddress }}, {{ operatorCity }}, {{ operatorCountry }}</strong><br />
          {{ $t('legal.imprint.operatorEmail') }} <strong>{{ contactEmail }}</strong><br />
          {{ $t('legal.imprint.operatorPhone') }} <strong>{{ operatorPhone }}</strong>
        </p>

        <h3 class="text-h6 mb-2">{{ $t('legal.imprint.aboutTitle') }}</h3>
        <p class="text-body-2 mb-4">{{ $t('legal.imprint.aboutText', { operatorName }) }}</p>

        <h3 class="text-h6 mb-2">{{ $t('legal.imprint.authorityTitle') }}</h3>
        <p class="text-body-2 mb-4">
          {{ $t('legal.imprint.authorityText') }}<br /><br />
          <a href="https://www.12377.cn/jbzn.html?tab=4" target="_blank" rel="noopener noreferrer">
            {{ $t('legal.imprint.website') }}12377.cn
          </a>
        </p>

        <h3 class="text-h6 mb-2">{{ $t('legal.imprint.licenseTitle') }}</h3>
        <p class="text-body-2 mb-4">{{ $t('legal.imprint.licenseText') }}</p>

        <h3 class="text-h6 mb-2">{{ $t('legal.imprint.contactTitle') }}</h3>
        <p class="text-body-2 mb-4">
          {{ $t('legal.imprint.contactText', { operatorName, email: contactEmail, phone: operatorPhone }) }}
        </p>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-btn
          block
          color="primary"
          rounded="lg"
          size="large"
          @click="$emit('update:modelValue', false)"
        >
          {{ $t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()

const contactEmail = import.meta.env.VITE_CONTACT_EMAIL ?? '3405351711@qq.com'
const operatorName = import.meta.env.VITE_OPERATOR_NAME ?? 'Yang'
const operatorAddress = import.meta.env.VITE_OPERATOR_ADDRESS ?? '天津科技大学'
const operatorCity = import.meta.env.VITE_OPERATOR_CITY ?? '天津'
const operatorCountry = import.meta.env.VITE_OPERATOR_COUNTRY ?? '中国'
const operatorPhone = import.meta.env.VITE_OPERATOR_PHONE ?? '+86 18340012138'
</script>
