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
      <v-toolbar-title>{{ $t('auth.termsAndConditions') }}</v-toolbar-title>
    </v-toolbar>
    <v-card-text class="pa-6">
      <p class="text-caption text-textSecondary mb-6">{{ $t('legal.lastUpdated') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.acceptanceTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.acceptanceText') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.descriptionTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.descriptionText', { operatorName }) }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.accountTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.accountText') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.dataTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.dataText') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.prohibitedTitle') }}</h3>
      <p class="text-body-2 mb-2">{{ $t('legal.terms.prohibitedIntro') }}</p>
      <ul class="text-body-2 mb-4 pl-4">
        <li>{{ $t('legal.terms.unlawful') }}</li>
        <li>{{ $t('legal.terms.unauthorized') }}</li>
        <li>{{ $t('legal.terms.interfere') }}</li>
        <li>{{ $t('legal.terms.shareCredentials') }}</li>
        <li>{{ $t('legal.terms.scrape') }}</li>
      </ul>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.intellectualTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.intellectualText') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.disclaimerTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.disclaimerText') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.availabilityTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.availabilityText') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.terminationTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.terminationText') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.changesTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.changesText') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.governingTitle') }}</h3>
      <p class="text-body-2 mb-4">{{ $t('legal.terms.governingText') }}</p>

      <h3 class="text-h6 mb-2">{{ $t('legal.terms.contactTitle') }}</h3>
      <p class="text-body-2 mb-4">
        {{ $t('legal.terms.contactText', { operatorName, email: contactEmail, phone: operatorPhone }) }}
      </p>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL ?? '3405351711@qq.com'
const operatorName = import.meta.env.VITE_OPERATOR_NAME ?? 'Yang'
const operatorPhone = import.meta.env.VITE_OPERATOR_PHONE ?? '+86 18340012138'
</script>
