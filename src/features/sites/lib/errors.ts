import type { TFunction } from 'i18next'
import { SiteRequestError } from '../data/api'

/** True when the server refused a website it never makes (gambling, pornography). */
export function isForbiddenWebsite(error: unknown): error is SiteRequestError {
  return error instanceof SiteRequestError && error.code === 'forbidden_topic'
}

/** A sentence for the person: the translation of the server's error code, never a technical message. */
export function siteErrorText(t: TFunction, error: unknown): string {
  if (isForbiddenWebsite(error)) {
    const key = `siteBuilder.errors.forbidden_${error.topic}`
    const text = t(key)
    return text !== key ? text : t('siteBuilder.errors.forbidden_topic')
  }
  if (error instanceof SiteRequestError) {
    const key = `siteBuilder.errors.${error.code}`
    const text = t(key)
    if (text !== key) return text
  }
  return t('siteBuilder.errors.unknown')
}
