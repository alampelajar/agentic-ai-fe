import { describe, expect, it } from 'vitest'
import { activityCount, addActivity, describeArgs, outcomeOf, settleActivity, toolKey, type ActivityItem, type ActivityRuns } from './activity'

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

describe('activity per turn', () => {
  const item = (id: number, tool = 'workspace.write_file'): ActivityItem => ({ id, tool, detail: `file-${id}`, state: 'running' })

  it('keeps each turn under the message that started it, and does not touch the others', () => {
    let runs: ActivityRuns = {}
    runs = addActivity(runs, 100, item(1))
    runs = addActivity(runs, 100, item(2))
    const afterFirst = runs
    runs = addActivity(runs, 200, item(3))
    expect(Object.keys(runs)).toEqual(['100', '200'])
    expect(runs[100].map((entry) => entry.id)).toEqual([1, 2])
    expect(runs[200].map((entry) => entry.id)).toEqual([3])
    // The earlier turn is the very same list: starting a new turn did not clear or rebuild it.
    expect(runs[100]).toBe(afterFirst[100])
  })

  it('settles a call in whichever turn it belongs to, without mutating what was there', () => {
    const before: ActivityRuns = { 100: [item(1), item(2)], 200: [item(3)] }
    const after = settleActivity(before, 2, 'denied')
    expect(after[100].map((entry) => entry.state)).toEqual(['running', 'denied'])
    expect(after[200].map((entry) => entry.state)).toEqual(['running'])
    expect(before[100][1].state).toBe('running')
    // An id that is not there changes nothing.
    expect(settleActivity(before, 999, 'done')[100].map((entry) => entry.state)).toEqual(['running', 'running'])
  })

  it('counts every call in the conversation', () => {
    expect(activityCount({})).toBe(0)
    expect(activityCount({ 1: [item(1), item(2)], 2: [item(3)] })).toBe(3)
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
