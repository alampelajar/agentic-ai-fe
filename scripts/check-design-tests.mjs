// Run with: node --test scripts/check-design-tests.mjs (outside Vitest, which runs in a browser)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkSource } from './check-design.mjs'

const locales = {
  en: new Map([['common.save', 'Save']]),
  id: new Map([['common.save', 'Simpan']]),
}

function rules(source, file = 'src/features/demo/page.tsx') {
  const problems = []
  checkSource(file, source, 'all', locales, problems)
  return problems.map((p) => p.rule)
}

test('theme classes and translated text pass', () => {
  assert.deepEqual(rules(`<Button className='bg-primary p-3 text-sm'>{t('common.save')}</Button>`), [])
})

test('hex, palette and arbitrary values fail', () => {
  assert.deepEqual(rules(`<div style={{ color: '#ff0000' }} />`), ['no-hex'])
  assert.deepEqual(rules(`<div className='bg-blue-500 dark:text-slate-300' />`), ['no-palette', 'no-palette'])
  assert.deepEqual(rules(`<div className='p-[13px] text-[11px]' />`), ['no-arbitrary', 'no-arbitrary'])
})

test('the status color pairs from DESIGN.md are allowed', () => {
  assert.deepEqual(rules(`<p className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' />`), [])
})

test('browser dialogs fail, but other confirm functions do not', () => {
  assert.deepEqual(rules(`if (window.confirm('Delete?')) remove()`, 'src/a.ts'), ['no-browser-dialog'])
  assert.deepEqual(rules(`dialog.confirm(); onConfirm()`, 'src/a.ts'), [])
})

test('fixed interface text fails in tsx', () => {
  assert.deepEqual(rules(`<h1>Welcome back</h1>`), ['i18n-hardcoded'])
  assert.deepEqual(rules(`<Input placeholder='Search agents' />`), ['i18n-hardcoded'])
  assert.deepEqual(rules(`<p>\n  Nothing here yet\n</p>`), ['i18n-hardcoded'])
  assert.deepEqual(rules(`toast.success('Saved')`), ['i18n-hardcoded'])
  assert.deepEqual(rules(`{isIndonesian ? 'Simpan' : 'Save'}`), ['i18n-hardcoded'])
  assert.deepEqual(rules(`{busy ? 'Saving...' : 'Save'}`), ['i18n-hardcoded'])
  assert.deepEqual(rules(`className={on ? 'bg-primary' : 'bg-muted'}`), [])
  assert.deepEqual(rules(`<Input placeholder='••••••••' />`), [])
  assert.deepEqual(rules(`type Props = {\n  title?: string\n}`), [])
})

test('keys must exist in both en.json and id.json', () => {
  assert.deepEqual(rules(`t('common.missing')`), ['i18n-missing', 'i18n-missing'])
  assert.deepEqual(rules("t(`status.${value}`)"), [])
})

test('a design-system-ignore comment allows the next line', () => {
  assert.deepEqual(rules(`// design-system-ignore: brand logo colors\n<path fill='#3157D5' />`), [])
})

test('only the requested lines are checked', () => {
  const problems = []
  checkSource('src/a.tsx', `<h1>Old title</h1>\n<h1>{t('common.save')}</h1>`, new Set([2]), locales, problems)
  assert.equal(problems.length, 0)
})
