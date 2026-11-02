import { describe, expect, it } from 'vitest'
import type { DesktopAction } from '@/features/desktop-runtime/api'
import { describeDesktopAction } from './approval-details'

const base: DesktopAction = {
  id: 'desktop-1',
  action: 'desktop.type',
  agent: 'Agent 19',
  reason: 'test',
  window: '131406',
  expires_at: '2026-11-02T00:00:00Z',
}

describe('describeDesktopAction', () => {
  it('shows the exact text that will be typed', () => {
    const details = describeDesktopAction({ ...base, arguments: { text: 'hello world' } })
    expect(details).toEqual([{ label: 'Teks yang akan diketik', value: 'hello world' }])
  })

  it('joins hotkey arrays', () => {
    const details = describeDesktopAction({ ...base, action: 'desktop.hotkey', arguments: { keys: ['ctrl', 'a'] } })
    expect(details).toEqual([{ label: 'Tombol / hotkey', value: 'ctrl+a' }])
  })

  it('shows the target element and extra arguments', () => {
    const details = describeDesktopAction({
      ...base,
      action: 'desktop.click',
      target: { type: 'name', value: 'Save' },
      arguments: { direction: 'down' },
    })
    expect(details.map((d) => d.label)).toEqual(['Argumen: direction', 'Target elemen'])
    expect(details[1].value).toBe('{"type":"name","value":"Save"}')
  })

  it('truncates very long values and flags it', () => {
    const [detail] = describeDesktopAction({ ...base, arguments: { text: 'a'.repeat(900) } })
    expect(detail.truncated).toBe(true)
    expect(detail.value.length).toBe(501)
  })

  it('states explicitly when there are no arguments', () => {
    expect(describeDesktopAction({ ...base, action: 'desktop.focus_window' })).toEqual([
      { label: 'Argumen', value: 'Tidak ada argumen tambahan' },
    ])
    expect(describeDesktopAction({ ...base, arguments: { text: '' } })[0].label).toBe('Argumen')
  })
})
