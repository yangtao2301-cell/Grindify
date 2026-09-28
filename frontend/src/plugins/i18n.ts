/*
 * Copyright (c) 2026 FalkenDev
 *
 * This file is part of Grindify.
 *
 * Grindify is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with Grindify. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import { createI18n } from 'vue-i18n';

import en from '@/locales/en';
import sv from '@/locales/sv';
import zh from '@/locales/zh';

export type AppLocale = 'en' | 'sv' | 'zh-CN';

const STORAGE_KEY = 'app';

function readPersistedLocale(): AppLocale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { locale?: unknown };
    if (parsed?.locale === 'en' || parsed?.locale === 'sv' || parsed?.locale === 'zh-CN') {
      return parsed.locale;
    }
    return null;
  } catch {
    return null;
  }
}

function defaultLocale(): AppLocale {
  const persisted = typeof window !== 'undefined' ? readPersistedLocale() : null;
  if (persisted) return persisted;

  const browser = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const normalized = browser.toLowerCase();
  if (normalized.startsWith('sv')) return 'sv';
  if (normalized.startsWith('zh')) return 'zh-CN';
  return 'en';
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: defaultLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    sv,
    'zh-CN': zh,
  },
});

export default i18n;
