import en from '@/i18n/locales/en.json'
import id from '@/i18n/locales/id.json'
import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import { SiteRequestError } from '../data/api'
import { isForbiddenWebsite, siteErrorText } from './errors'

// A t() that looks keys up in one language file, returning the key when it is missing.
const tFor = (texts: Record<string, unknown>) =>
  ((key: string) => {
    const value = key
      .split('.')
      .reduce<unknown>(
        (node, part) => (node as Record<string, unknown> | undefined)?.[part],
        texts
      )
    return typeof value === 'string' ? value : key
  }) as unknown as TFunction

// Every code the backend's Website Builder answers with (handlers/sites.go).
const SERVER_CODES = [
  'unauthorized',
  'not_found',
  'invalid',
  'description_length',
  'site_limit',
  'workspace_limit',
  'storage',
  'run_active',
  'run_limit',
  'run_failed',
  'builder_disabled',
  'brief_required',
  'no_version',
  'request_required',
  'request_length',
  'direction_required',
  'plan_failed',
  'image_limit',
  'image_size',
  'image_type',
  'slug_taken',
  'slug_format',
  'slug_reserved',
  'restore_failed',
  'delete_failed',
  'invalid_name',
  'forbidden_topic',
]

describe('siteErrorText', () => {
  it('translates every server error code in both languages', () => {
    for (const texts of [en, id]) {
      const t = tFor(texts)
      for (const code of SERVER_CODES) {
        const text = siteErrorText(
          t,
          new SiteRequestError('server text', 409, code)
        )
        expect(text, code).not.toContain('siteBuilder.')
        expect(text, code).not.toBe('server text')
      }
    }
  })

  it('says which forbidden website was refused, and why', () => {
    const t = tFor(id)
    const refused = (topic: string) =>
      new SiteRequestError('x', 422, 'forbidden_topic', topic)
    expect(isForbiddenWebsite(refused('gambling'))).toBe(true)
    expect(isForbiddenWebsite(new SiteRequestError('x', 400, 'invalid'))).toBe(
      false
    )
    expect(siteErrorText(t, refused('gambling'))).toBe(
      id.siteBuilder.errors.forbidden_gambling
    )
    expect(siteErrorText(t, refused('adult'))).toBe(
      id.siteBuilder.errors.forbidden_adult
    )
    expect(siteErrorText(t, refused('something_new'))).toBe(
      id.siteBuilder.errors.forbidden_topic
    )
  })

  it('never shows a technical message for an unknown code or a network failure', () => {
    const t = tFor(id)
    expect(
      siteErrorText(
        t,
        new SiteRequestError('pq: duplicate key', 500, 'something_new')
      )
    ).toBe(id.siteBuilder.errors.unknown)
    expect(siteErrorText(t, new TypeError('Failed to fetch'))).toBe(
      id.siteBuilder.errors.unknown
    )
  })
})
