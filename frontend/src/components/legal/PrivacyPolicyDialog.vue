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
      <BackHeader
        :title="$t('auth.privacyPolicyTitle')"
        @click="$emit('update:modelValue', false)"
      />
      <v-card-text class="pa-6">
        <p class="text-caption text-textSecondary mb-6">{{ $t('legal.lastUpdated') }}</p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.dataControllerTitle') }}</h3>
        <p class="text-body-2 mb-4">
          {{ $t('legal.privacy.dataControllerText', { email: contactEmail }) }}
        </p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.collectTitle') }}</h3>
        <p class="text-body-2 mb-2">{{ $t('legal.privacy.collectIntro') }}</p>
        <ul class="text-body-2 mb-4 pl-4">
          <li>{{ $t('legal.privacy.accountData') }}</li>
          <li>{{ $t('legal.privacy.profileData') }}</li>
          <li>{{ $t('legal.privacy.fitnessData') }}</li>
          <li>{{ $t('legal.privacy.usageData') }}</li>
          <li>{{ $t('legal.privacy.consentRecords') }}</li>
        </ul>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.legalBasisTitle') }}</h3>
        <p class="text-body-2 mb-2">{{ $t('legal.privacy.legalBasisIntro') }}</p>
        <ul class="text-body-2 mb-4 pl-4">
          <li>{{ $t('legal.privacy.contractPerformance') }}</li>
          <li>{{ $t('legal.privacy.consent') }}</li>
          <li>{{ $t('legal.privacy.legitimateInterests') }}</li>
        </ul>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.purposeTitle') }}</h3>
        <p class="text-body-2 mb-2">{{ $t('legal.privacy.purposeIntro') }}</p>
        <ul class="text-body-2 mb-4 pl-4">
          <li>{{ $t('legal.privacy.purposeAccount') }}</li>
          <li>{{ $t('legal.privacy.purposeFeatures') }}</li>
          <li>{{ $t('legal.privacy.purposeProgress') }}</li>
          <li>{{ $t('legal.privacy.purposeSecurity') }}</li>
          <li>{{ $t('legal.privacy.purposeLegal') }}</li>
        </ul>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.retentionTitle') }}</h3>
        <p class="text-body-2 mb-4">{{ $t('legal.privacy.retentionText') }}</p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.rightsTitle') }}</h3>
        <p class="text-body-2 mb-2">{{ $t('legal.privacy.rightsIntro') }}</p>
        <ul class="text-body-2 mb-4 pl-4">
          <li>{{ $t('legal.privacy.access') }}</li>
          <li>{{ $t('legal.privacy.rectification') }}</li>
          <li>{{ $t('legal.privacy.erasure') }}</li>
          <li>{{ $t('legal.privacy.restriction') }}</li>
          <li>{{ $t('legal.privacy.portability') }}</li>
          <li>{{ $t('legal.privacy.object') }}</li>
          <li>{{ $t('legal.privacy.withdraw') }}</li>
        </ul>
        <p class="text-body-2 mb-4">
          {{ $t('legal.privacy.rightsContact', { email: contactEmail }) }}
        </p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.sharingTitle') }}</h3>
        <p class="text-body-2 mb-4">{{ $t('legal.privacy.sharingText') }}</p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.complaintTitle') }}</h3>
        <p class="text-body-2 mb-4">
          {{ $t('legal.privacy.complaintText') }}<br /><br />
          <strong>Integritetsskyddsmyndigheten (IMY)</strong><br />
          {{ $t('legal.imprint.website') }} <strong>imy.se</strong><br />
          {{ $t('legal.imprint.phone') }} +46 8 657 61 00
        </p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.contactTitle') }}</h3>
        <p class="text-body-2 mb-4">
          {{ $t('legal.privacy.contactText', { email: contactEmail }) }}
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

const contactEmail = import.meta.env.VITE_CONTACT_EMAIL ?? 'contact@example.com'
</script>
