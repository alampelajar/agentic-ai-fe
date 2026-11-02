import { describe, expect, it } from 'vitest'
import type { DesktopAction } from './api'
import {
  ALLOWED_HOTKEYS,
  buildDesktopActionRequest,
  describeDesktopAction,
  isSensitiveWindowTitle,
  maskSensitiveText,
  normalizeHotkey,
  resolveWindow,
  type DesktopActionForm,
  type WindowInfo,
} from './approval-details'

const windows: WindowInfo[] = [
  { handle: 131406, title: 'agentic-ai-be' },
  { handle: 65708, title: 'Taskbar' },
  { handle: 900, title: 'Password Manager' },
  { handle: 901, title: 'Twin' },
  { handle: 902, title: 'Twin' },
]

const base: DesktopAction = {
  id: 'desktop-1',
  action: 'desktop.focus_window',
  agent: 'Agent 19',
  reason: 'test',
  window: '131406',
  expires_at: '2026-11-02T00:00:00Z',
}
const describe_ = (overrides: Partial<DesktopAction>, lang: 'id' | 'en' = 'en') =>
  describeDesktopAction({ ...base, ...overrides }, { windows, lang })
const byKey = (details: ReturnType<typeof describe_>) => Object.fromEntries(details.map((d) => [d.key, d]))

describe('resolveWindow', () => {
  it('finds a window by handle or by an exact, unique title', () => {
    expect(resolveWindow('131406', windows)?.title).toBe('agentic-ai-be')
    expect(resolveWindow('agentic-ai-be', windows)?.handle).toBe(131406)
    expect(resolveWindow(' 65708 ', windows)?.title).toBe('Taskbar')
  })
  it('does not guess when it cannot be sure', () => {
    expect(resolveWindow('Twin', windows)).toBeNull()
    expect(resolveWindow('999999999', windows)).toBeNull()
    expect(resolveWindow('agentic', windows)).toBeNull()
    expect(resolveWindow(undefined, windows)).toBeNull()
    expect(resolveWindow('131406', undefined)).toBeNull()
  })
})

describe('window row', () => {
  it('shows the application name and the handle', () => {
    expect(byKey(describe_({})).window.value).toBe('agentic-ai-be (handle 131406)')
    expect(byKey(describe_({ window: 'agentic-ai-be' })).window.value).toBe('agentic-ai-be (handle 131406)')
  })
  it('flags a window that is not in the list, and one that is missing', () => {
    const unknown = byKey(describe_({ window: '999999999' })).window
    expect(unknown.value).toBe('999999999 (not in the current window list)')
    expect(unknown.warning).toBe(true)
    expect(byKey(describe_({ window: undefined })).window.warning).toBe(true)
  })
  it('shows the raw reference when no window list is available', () => {
    const [row] = describeDesktopAction({ ...base, window: '131406' }, { lang: 'en' })
    expect(row.value).toBe('131406')
    expect(row.warning).toBeUndefined()
  })
  it('warns that credential windows block interaction, but only for interactive actions', () => {
    const typed = describe_({ action: 'desktop.type', window: '900', arguments: { text: 'x' } })
    expect(typed.some((d) => d.key === 'window-sensitive' && d.warning)).toBe(true)
    expect(describe_({ action: 'desktop.focus_window', window: '900' }).some((d) => d.key === 'window-sensitive')).toBe(false)
    expect(describe_({ action: 'desktop.scroll', window: '900' }).some((d) => d.key === 'window-sensitive')).toBe(false)
    expect(isSensitiveWindowTitle('Enter your OTP')).toBe(true)
    expect(isSensitiveWindowTitle('Untitled - Notepad')).toBe(false)
  })
})

describe('click and double click', () => {
  it('shows the control that will be clicked', () => {
    const details = describe_({ action: 'desktop.click', target: { type: 'name', value: 'Save' } })
    expect(details.map((d) => [d.key, d.value])).toEqual([
      ['window', 'agentic-ai-be (handle 131406)'],
      ['control', 'Name: "Save"'],
    ])
    expect(byKey(describe_({ action: 'desktop.double_click', target: { type: 'automation_id', value: '15' } })).control.value).toBe('Automation ID: "15"')
    expect(byKey(describe_({ action: 'desktop.double_click', target: { type: 'control_type', value: 'Edit' } })).control.value).toBe('Control type: "Edit"')
  })
  it('shows the window and the coordinates', () => {
    const details = describe_({
      action: 'desktop.double_click',
      target: { type: 'coordinate', x: 617, y: 152, screenshot_age_ms: 300, screen_size: [1920, 1080] },
    })
    expect(details.map((d) => [d.key, d.value])).toEqual([
      ['window', 'agentic-ai-be (handle 131406)'],
      ['coordinates', '(617, 152)'],
      ['screen', '1920 × 1080'],
      ['age', '300 ms'],
    ])
  })
  it('says so when there is no valid target', () => {
    expect(byKey(describe_({ action: 'desktop.click' })).control.warning).toBe(true)
    expect(byKey(describe_({ action: 'desktop.click', target: { type: 'xpath', value: '//a' } })).control.warning).toBe(true)
  })
})

describe('focus window', () => {
  it('is only the application and its handle', () => {
    expect(describe_({}).map((d) => d.key)).toEqual(['window'])
  })
})

describe('scroll', () => {
  it('shows the control, direction and amount', () => {
    const details = describe_({ action: 'desktop.scroll', target: { type: 'control_type', value: 'Edit' }, arguments: { direction: 'up', amount: 5 } })
    expect(details.map((d) => [d.key, d.value])).toEqual([
      ['window', 'agentic-ai-be (handle 131406)'],
      ['scroll-control', 'Control type: "Edit"'],
      ['direction', 'up'],
      ['amount', '5 lines'],
    ])
  })
  it('shows what the sidecar does by default', () => {
    const details = byKey(describe_({ action: 'desktop.scroll' }))
    expect(details['scroll-control'].value).toBe('The window itself (no specific control)')
    expect(details.direction.value).toBe('down')
    expect(details.amount.value).toBe('1 lines')
  })
})

describe('type', () => {
  it('shows the exact text and its length', () => {
    const details = byKey(describe_({ action: 'desktop.type', arguments: { text: 'hello world' } }))
    expect(details.text).toMatchObject({ label: 'Text to type', value: 'hello world' })
    expect(details.text.fullValue).toBeUndefined()
    expect(details.length.value).toBe('11 characters')
  })
  it('never truncates a long text that will really be typed', () => {
    const text = 'a'.repeat(4000)
    const details = byKey(describe_({ action: 'desktop.type', arguments: { text } }))
    expect(details.text.value).toBe(text)
    expect(details.length.value).toBe('4000 characters')
  })
  it('masks what looks like a credential but keeps the exact text for the reveal', () => {
    const text = 'login with password=hunter2 now'
    const { text: row } = byKey(describe_({ action: 'desktop.type', arguments: { text } }))
    expect(row.value).toBe('login with password=•••••• now')
    expect(row.fullValue).toBe(text)
    expect(row.warning).toBe(true)
    expect(row.label).toContain('masked')
  })
  it('shows a control target when there is one', () => {
    const details = byKey(describe_({ action: 'desktop.type', arguments: { text: 'x' }, target: { type: 'name', value: 'Search' } }))
    expect(details.control.value).toBe('Name: "Search"')
  })
})

describe('hotkey', () => {
  it('shows the combination in the sidecar form', () => {
    expect(byKey(describe_({ action: 'desktop.hotkey', arguments: { keys: ['ctrl', 'a'] } })).hotkey.value).toBe('CTRL+A')
    expect(byKey(describe_({ action: 'desktop.hotkey', arguments: { keys: 'esc' } })).hotkey.value).toBe('ESC')
    expect(byKey(describe_({ action: 'desktop.hotkey', arguments: { keys: ' ctrl + s ' } })).hotkey.value).toBe('CTRL+S')
  })
  it('warns when the sidecar will refuse it', () => {
    const refused = byKey(describe_({ action: 'desktop.hotkey', arguments: { keys: ['alt', 'f4'] } })).hotkey
    expect(refused.warning).toBe(true)
    expect(refused.value).toContain('ALT+F4')
    expect(byKey(describe_({ action: 'desktop.hotkey' })).hotkey.warning).toBe(true)
  })
  it('keeps the allowlist identical to the sidecar', () => {
    expect([...ALLOWED_HOTKEYS]).toEqual(['CTRL+A', 'CTRL+C', 'CTRL+V', 'CTRL+S', 'ALT+TAB', 'ESC'])
    expect(normalizeHotkey(['ctrl', 'a'])).toEqual({ combo: 'CTRL+A', allowed: true })
    expect(normalizeHotkey('win+r')).toEqual({ combo: 'WIN+R', allowed: false })
    for (const invalid of [[], '', null, 5, ['ctrl', 1], ['ctrl', '']]) expect(normalizeHotkey(invalid)).toBeNull()
  })
})

describe('nothing is hidden', () => {
  it('lists arguments and targets it does not know', () => {
    const details = byKey(describe_({ action: 'desktop.focus_window', arguments: { extra: 'value' }, target: { type: 'name', value: 'x' } }))
    expect(details['arg-extra'].value).toBe('value')
    expect(details.target.value).toBe('{"type":"name","value":"x"}')
  })
  it('uses Indonesian labels for the chat dialog', () => {
    const details = byKey(describe_({ action: 'desktop.scroll', arguments: { direction: 'up', amount: 2 } }, 'id'))
    expect(details.direction.label).toBe('Arah scroll')
    expect(details.amount.value).toBe('2 baris')
    expect(details.window.label).toBe('Aplikasi / window')
  })
})

describe('maskSensitiveText', () => {
  it.each([
    ['Authorization: Bearer abcdef1234567890', 'abcdef1234567890'],
    ['token=FAKE-TOKEN-VALUE', 'FAKE-TOKEN-VALUE'],
    ['password: "hunter two"', 'hunter two'],
    ['key sk-abcdefghijklmnopqrstuvwx', 'sk-abcdefghijklmnopqrstuvwx'],
    ['jwt eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyM30.c2lnbmF0dXJl', 'eyJhbGciOiJIUzI1NiJ9'],
    ['aws AKIAABCDEFGHIJKLMNOP', 'AKIAABCDEFGHIJKLMNOP'],
  ])('masks %s', (input, secret) => {
    const { masked, changed } = maskSensitiveText(input)
    expect(changed).toBe(true)
    expect(masked).not.toContain(secret)
  })
  it('leaves ordinary text alone', () => {
    for (const text of ['hello world', 'Untitled - Notepad', 'token expired, please sign in again', '']) {
      expect(maskSensitiveText(text)).toEqual({ masked: text, changed: false })
    }
  })
})

describe('buildDesktopActionRequest', () => {
  const form: DesktopActionForm = {
    action: 'desktop.focus_window',
    agent: 'Manual Desktop Agent',
    reason: 'User requested a desktop interaction.',
    window: ' 131406 ',
    text: '',
    targetKind: 'none',
    targetValue: '',
    direction: 'down',
    amount: '1',
  }
  const build = (changes: Partial<DesktopActionForm>) => buildDesktopActionRequest({ ...form, ...changes })

  it('focus window sends only the window', () => {
    expect(build({})).toEqual({ action: 'desktop.focus_window', agent: form.agent, reason: form.reason, window: '131406' })
  })
  it('click and double click send the control as the target', () => {
    for (const action of ['desktop.click', 'desktop.double_click']) {
      expect(build({ action, targetKind: 'name', targetValue: ' Save ' }).target).toEqual({ type: 'name', value: 'Save' })
    }
    expect(build({ action: 'desktop.click' }).target).toBeUndefined()
  })
  it('scroll sends direction and a numeric amount, with an optional control', () => {
    const request = build({ action: 'desktop.scroll', direction: 'up', amount: '5', targetKind: 'control_type', targetValue: 'Edit' })
    expect(request.arguments).toEqual({ direction: 'up', amount: 5 })
    expect(request.target).toEqual({ type: 'control_type', value: 'Edit' })
    expect(build({ action: 'desktop.scroll' }).target).toBeUndefined()
  })
  it('type sends the text, hotkey sends keys (not text)', () => {
    expect(build({ action: 'desktop.type', text: 'hello' }).arguments).toEqual({ text: 'hello' })
    expect(build({ action: 'desktop.hotkey', text: ' ctrl+a ' }).arguments).toEqual({ keys: 'ctrl+a' })
    expect(build({ action: 'desktop.type', text: '' }).arguments).toBeUndefined()
  })
  it('an empty window is not sent', () => {
    expect(build({ window: '   ' }).window).toBeUndefined()
  })

  it('what the dialog shows is exactly what was requested', () => {
    // The runner stores the request and returns it; the dialog renders that copy.
    const echo = (request: ReturnType<typeof build>): DesktopAction => ({ ...request, id: 'desktop-9', expires_at: '2026-11-02T00:00:00Z' })
    const click = describeDesktopAction(echo(build({ action: 'desktop.double_click', targetKind: 'automation_id', targetValue: '15' })), { windows, lang: 'en' })
    expect(click.find((d) => d.key === 'control')?.value).toBe('Automation ID: "15"')
    const scroll = describeDesktopAction(echo(build({ action: 'desktop.scroll', direction: 'left', amount: '7' })), { windows, lang: 'en' })
    expect(scroll.find((d) => d.key === 'direction')?.value).toBe('left')
    expect(scroll.find((d) => d.key === 'amount')?.value).toBe('7 lines')
    const hotkey = describeDesktopAction(echo(build({ action: 'desktop.hotkey', text: 'alt+tab' })), { windows, lang: 'en' })
    expect(hotkey.find((d) => d.key === 'hotkey')?.value).toBe('ALT+TAB')
    const typed = describeDesktopAction(echo(build({ action: 'desktop.type', text: 'exact text' })), { windows, lang: 'en' })
    expect(typed.find((d) => d.key === 'text')?.value).toBe('exact text')
  })
})
