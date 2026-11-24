import en from '@/i18n/locales/en.json'
import id from '@/i18n/locales/id.json'
import { describe, expect, it } from 'vitest'

// WEBSITE-BUILDER.md, section 2 and R3: the Builder speaks to people who have never
// made a website. These words are design or technical jargon to them.
const BANNED = [
  'serif',
  'font',
  'typography',
  'tipografi',
  'editorial',
  'minimalis',
  'minimalist',
  'industrial',
  'nordic',
  'nordik',
  'palette',
  'palet',
  'layout',
  'template',
  'deploy',
  'build',
  'workspace',
  'repository',
  'container',
  'sandbox',
  'commit',
  'server',
  'render',
  'slug',
  'domain',
  'hosting',
  'database',
  'backend',
  'frontend',
]

function texts(node: unknown, path = 'siteBuilder'): [string, string][] {
  if (typeof node === 'string') return [[path, node]]
  if (node && typeof node === 'object')
    return Object.entries(node).flatMap(([key, value]) =>
      texts(value, `${path}.${key}`)
    )
  return []
}

describe('Website Builder texts', () => {
  for (const [language, file] of [
    ['en', en],
    ['id', id],
  ] as const) {
    it(`use no jargon (${language})`, () => {
      const found = texts(file.siteBuilder).flatMap(([path, text]) =>
        BANNED.filter((word) => new RegExp(`\\b${word}`, 'i').test(text)).map(
          (word) => `${path}: "${word}"`
        )
      )
      expect(found).toEqual([])
    })
  }

  it('keep buttons short', () => {
    const buttons = [
      'start',
      'open',
      'delete',
      'retry',
      'visit',
      'wizard.next',
      'wizard.back',
      'wizard.other',
      'look.seeExample',
      'look.useThis',
      'workspace.reviseSend',
      'workspace.publish',
      'workspace.changeLook',
      'publish.publish',
    ]
    for (const file of [en, id]) {
      for (const path of buttons) {
        const text = path
          .split('.')
          .reduce<unknown>(
            (node, key) => (node as Record<string, unknown>)[key],
            file.siteBuilder
          ) as string
        expect(
          text.split(/\s+/).length,
          `${path}: "${text}"`
        ).toBeLessThanOrEqual(3)
      }
    }
  })
})
