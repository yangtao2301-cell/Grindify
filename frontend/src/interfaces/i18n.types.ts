export interface I18nString {
  default: string | null
  eng?: string
  swe?: string
  zho?: string
}

export interface I18nStringArray {
  default?: string[]
  eng?: string[]
  swe?: string[]
  zho?: string[]
}

export type SupportedLanguage = 'default' | 'eng' | 'swe' | 'zho'
