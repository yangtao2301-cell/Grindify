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
  <v-card class="fill-height" rounded="0">
    <v-toolbar color="surface" flat>
      <v-btn icon @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-toolbar-title>{{ $t('auth.privacyPolicyTitle') }}</v-toolbar-title>
    </v-toolbar>
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
  </v-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL ?? 'contact@example.com'
</script>
