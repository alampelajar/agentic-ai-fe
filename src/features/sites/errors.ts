import type { TFunction } from 'i18next'
import { SiteRequestError } from './data/api'

/** A sentence for the person: the translation of the server's error code, never a technical message. */
export function siteErrorText(t: TFunction, error: unknown): string {
  if (error instanceof SiteRequestError) {
    const key = `siteBuilder.errors.${error.code}`
    const text = t(key)
    if (text !== key) return text
  }
  return t('siteBuilder.errors.unknown')
}
