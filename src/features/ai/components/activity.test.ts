import { describe, expect, it } from 'vitest'
import { describeArgs, outcomeOf, toolKey } from './activity'

describe('outcomeOf', () => {
  it('reads how a tool call ended from the text that goes back to the model', () => {
    expect(outcomeOf('TOOL_DENIED: pengguna menolak permintaan ini.')).toBe('denied')
    expect(outcomeOf('TOOL_EXPIRED: persetujuan kedaluwarsa.')).toBe('expired')
    expect(outcomeOf('TOOL_ERROR: Kesalahan tool tidak diketahui')).toBe('failed')
    expect(outcomeOf('{"ok":false,"error":"File tidak ditemukan."}')).toBe('failed')
    expect(outcomeOf('{"ok":true,"entries":[]}')).toBe('done')
    expect(outcomeOf('{"ok":true,"status":"queued","job_id":4}')).toBe('done')
    // Plain text from a local tool is not an error.
    expect(outcomeOf('On branch main\nnothing to commit')).toBe('done')
  })

  it('does not take a refusal from the middle of a result', () => {
    expect(outcomeOf('{"ok":true,"content":"TOOL_DENIED is a word in this file"}')).toBe('done')
  })
})

describe('describeArgs and toolKey', () => {
  it('describes a file tool by its path and a run by its target', () => {
    expect(describeArgs({ path: 'src/main.go', content: 'x' })).toBe('src/main.go')
    expect(describeArgs({ target: 'node' })).toBe('node')
    expect(describeArgs({})).toBe('')
    expect(describeArgs({ path: 42 })).toBe('')
  })

  it('turns a tool name into an i18n key', () => {
    expect(toolKey('workspace.write_file')).toBe('workspace_write_file')
    expect(toolKey('go-test')).toBe('go-test')
  })
})
