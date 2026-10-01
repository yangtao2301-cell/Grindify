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
  <HistoryDialog
    :model-value="modelValue"
    history-key="legal:privacy"
    fullscreen
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="bg-background">
      <BackHeader
        :title="$t('auth.privacyPolicyTitle')"
        @close="$emit('update:modelValue', false)"
      />
      <v-card-text class="pa-6">
        <p class="text-caption text-textSecondary mb-6">{{ $t('legal.lastUpdated') }}</p>
        <p class="text-body-2 mb-4">{{ $t('legal.privacy.frameworkText') }}</p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.dataControllerTitle') }}</h3>
        <p class="text-body-2 mb-4">
          {{ $t('legal.privacy.dataControllerText', { operatorName, email: contactEmail, phone: operatorPhone }) }}
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

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.specialInfoTitle') }}</h3>
        <p class="text-body-2 mb-4">{{ $t('legal.privacy.specialInfoText') }}</p>

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
          {{ $t('legal.privacy.rightsContact', { email: contactEmail, phone: operatorPhone }) }}
        </p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.sharingTitle') }}</h3>
        <p class="text-body-2 mb-4">{{ $t('legal.privacy.sharingText') }}</p>
        <h4 class="text-subtitle-1 mb-2">{{ $t('legal.privacy.thirdPartyTitle') }}</h4>
        <p class="text-body-2 mb-2">{{ $t('legal.privacy.thirdPartyIntro') }}</p>
        <ul class="text-body-2 mb-4 pl-4">
          <li>
            {{ $t('legal.privacy.googleRecipient') }}
            (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">{{ $t('legal.privacy.googlePolicyLink') }}</a>)
          </li>
          <li>
            {{ $t('legal.privacy.githubRecipient') }}
            (<a href="https://docs.github.com/zh/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">{{ $t('legal.privacy.githubPolicyLink') }}</a>)
          </li>
          <li>
            {{ $t('legal.privacy.resendRecipient') }}
            (<a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">{{ $t('legal.privacy.resendPolicyLink') }}</a>)
          </li>
        </ul>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.locationTitle') }}</h3>
        <p class="text-body-2 mb-4">{{ $t('legal.privacy.locationText') }}</p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.complaintTitle') }}</h3>
        <p class="text-body-2 mb-4">
          {{ $t('legal.privacy.complaintText') }}<br /><br />
          <a href="https://www.12377.cn/jbzn.html?tab=4" target="_blank" rel="noopener noreferrer">
            {{ $t('legal.imprint.website') }}12377.cn
          </a>
        </p>

        <h3 class="text-h6 mb-2">{{ $t('legal.privacy.contactTitle') }}</h3>
        <p class="text-body-2 mb-4">
          {{ $t('legal.privacy.contactText', { operatorName, email: contactEmail, phone: operatorPhone }) }}
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
  </HistoryDialog>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()

const contactEmail = import.meta.env.VITE_CONTACT_EMAIL ?? '3405351711@qq.com'
const operatorName = import.meta.env.VITE_OPERATOR_NAME ?? 'Yang'
const operatorPhone = import.meta.env.VITE_OPERATOR_PHONE ?? '+86 18340012138'
</script>
