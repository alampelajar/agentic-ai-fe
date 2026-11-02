import { describe, expect, it } from 'vitest'
import { DESKTOP_TOOLS, normalizeToolAction, parseLocalAgentToolCall, READ_ONLY_DESKTOP_TOOLS } from './tool-call'

describe('normalizeToolAction', () => {
  it('keeps workspace tools in kebab-case as before', () => {
    expect(normalizeToolAction('list-files')).toBe('list-files')
    expect(normalizeToolAction('List Files')).toBe('list-files')
    expect(normalizeToolAction('readFile')).toBe('read-file')
    expect(normalizeToolAction('read_file')).toBe('read-file')
    expect(normalizeToolAction('  npm-test ')).toBe('npm-test')
  })

  it('keeps desktop tools in canonical snake_case', () => {
    expect(normalizeToolAction('desktop.double_click')).toBe('desktop.double_click')
    expect(normalizeToolAction('desktop.focus_window')).toBe('desktop.focus_window')
    expect(normalizeToolAction('desktop.status')).toBe('desktop.status')
  })

  it('maps other spellings of desktop tools to the canonical name', () => {
    expect(normalizeToolAction('desktop.focus-window')).toBe('desktop.focus_window')
    expect(normalizeToolAction('desktop.focusWindow')).toBe('desktop.focus_window')
    expect(normalizeToolAction('Desktop.Double_Click')).toBe('desktop.double_click')
    expect(normalizeToolAction('desktop.double click')).toBe('desktop.double_click')
  })

  it('does not turn a desktop name into a different tool', () => {
    expect(normalizeToolAction('desktop.type')).not.toBe('desktop.hotkey')
    expect(normalizeToolAction('desktop-type')).toBe('desktop-type')
  })
})

describe('desktop tool names match what the component can run', () => {
  it('lists every backend registry tool exactly once', () => {
    // Mirrors ToolRegistry in the backend (services/tool_registry.go).
    expect([...DESKTOP_TOOLS].sort()).toEqual(
      [
        'desktop.click',
        'desktop.double_click',
        'desktop.focus_window',
        'desktop.hotkey',
        'desktop.inspect',
        'desktop.screenshot',
        'desktop.scroll',
        'desktop.status',
        'desktop.type',
        'desktop.windows',
      ].sort()
    )
    for (const name of READ_ONLY_DESKTOP_TOOLS) expect(DESKTOP_TOOLS).toContain(name)
  })

  it.each([...DESKTOP_TOOLS])('%s survives parsing unchanged', (name) => {
    expect(parseLocalAgentToolCall(JSON.stringify({ action: name })).action).toBe(name)
    expect(parseLocalAgentToolCall(JSON.stringify({ function: { name, arguments: '{}' } })).action).toBe(name)
    expect(parseLocalAgentToolCall(JSON.stringify({ arguments: { tool: name } })).action).toBe(name)
  })
})

describe('parseLocalAgentToolCall forwards desktop arguments', () => {
  it('passes the click target through', () => {
    const call = parseLocalAgentToolCall(
      JSON.stringify({ action: 'desktop.double_click', arguments: { window: 131406, target: { type: 'name', value: 'Save' } } })
    )
    expect(call).toEqual({ action: 'desktop.double_click', window: '131406', target: { type: 'name', value: 'Save' } })
  })

  it('passes a coordinate target and rejects a non-object target', () => {
    const target = { type: 'coordinate', x: 10, y: 20, screenshot_age_ms: 100, screen_size: [1920, 1080] }
    expect(parseLocalAgentToolCall(JSON.stringify({ action: 'desktop.click', target, window: '5' })).target).toEqual(target)
    expect(parseLocalAgentToolCall(JSON.stringify({ action: 'desktop.click', target: 'name:Save' })).target).toBeUndefined()
    expect(parseLocalAgentToolCall(JSON.stringify({ action: 'desktop.click', target: ['a'] })).target).toBeUndefined()
  })

  it('passes scroll amount and direction', () => {
    const call = parseLocalAgentToolCall(JSON.stringify({ action: 'desktop.scroll', arguments: { window: '9', amount: '3', direction: 'up' } }))
    expect(call).toMatchObject({ action: 'desktop.scroll', window: '9', amount: 3, direction: 'up' })
    expect(parseLocalAgentToolCall(JSON.stringify({ action: 'desktop.scroll', amount: 2.5 })).amount).toBeUndefined()
    expect(parseLocalAgentToolCall(JSON.stringify({ action: 'desktop.scroll', amount: 'many' })).amount).toBeUndefined()
  })

  it('still reads window handles, text and keys as before', () => {
    expect(parseLocalAgentToolCall('{"action":"desktop.inspect","window":131406}').window).toBe('131406')
    expect(parseLocalAgentToolCall('{"action":"desktop.type","arguments":{"text":"hi"}}').text).toBe('hi')
    expect(parseLocalAgentToolCall('{"action":"desktop.hotkey","keys":["ctrl","a"]}').keys).toEqual(['ctrl', 'a'])
  })
})

describe('parseLocalAgentToolCall keeps its existing workspace behaviour', () => {
  it('parses list-files and read-file envelopes', () => {
    expect(parseLocalAgentToolCall('{"action":"list-files","path":"."}')).toEqual({ action: 'list-files', path: '.' })
    expect(parseLocalAgentToolCall('```json\n{"tool":"read_file","path":"package.json"}\n```')).toEqual({ action: 'read-file', path: 'package.json' })
  })

  it('recovers only read-only tools from malformed JSON', () => {
    expect(parseLocalAgentToolCall("{'action': 'list-files', 'path': '.'}")).toEqual({ action: 'list-files', path: '.' })
    // A desktop action can never be recovered from malformed JSON.
    expect(() => parseLocalAgentToolCall("{'action': 'desktop.type', 'text': 'x'}")).toThrow()
    expect(() => parseLocalAgentToolCall("{'action': 'write-file', 'path': 'a'}")).toThrow(/read-only/)
  })

  it('rejects payloads without an explicit action', () => {
    expect(() => parseLocalAgentToolCall('{"path":"."}')).toThrow(/explicit action/)
    expect(() => parseLocalAgentToolCall('[]')).toThrow()
  })
})
