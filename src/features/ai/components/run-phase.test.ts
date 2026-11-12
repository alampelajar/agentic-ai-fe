import { describe, expect, it } from 'vitest'
import { describePhase, extendTrail, formatElapsed, shortToolName, toolKind, type RunPhase } from './run-phase'

describe('run phases', () => {
  it('gives each kind of work its own icon and words', () => {
    const phases: RunPhase[] = [
      { kind: 'understanding' },
      { kind: 'images', count: 1 },
      { kind: 'files', count: 2 },
      { kind: 'thinking' },
      { kind: 'tool', tool: 'workspace.read_file', detail: 'index.html' },
      { kind: 'tool', tool: 'workspace.edit_file', detail: 'index.html' },
      { kind: 'tool', tool: 'workspace.run_test' },
      { kind: 'approval', tool: 'workspace.edit_file', detail: 'index.html' },
      { kind: 'site', stage: 'design' },
      { kind: 'done' },
    ]
    const views = phases.map(describePhase)
    expect(new Set(views.map((view) => view.labelKey)).size).toBe(phases.length)
    expect(new Set(views.map((view) => view.icon)).size).toBe(phases.length)
  })

  it('names the file a tool works on, and the project when it lists the root', () => {
    expect(describePhase({ kind: 'tool', tool: 'workspace.edit_file', detail: 'src/app.ts' })).toMatchObject({ labelKey: 'tool.edit', values: { detail: 'src/app.ts' } })
    expect(describePhase({ kind: 'tool', tool: 'workspace.list_files' }).labelKey).toBe('tool.exploreRoot')
    expect(describePhase({ kind: 'tool', tool: 'workspace.list_files', detail: 'src' }).labelKey).toBe('tool.explore')
  })

  it('moves while working, holds while waiting for the person, and fills when done', () => {
    expect(describePhase({ kind: 'thinking' }).motion).toBe('working')
    expect(describePhase({ kind: 'approval', tool: 'workspace.run_test' })).toMatchObject({ motion: 'waiting', values: { detail: 'run test' } })
    expect(describePhase({ kind: 'done' }).motion).toBe('complete')
  })

  it('reads the Local Agent Runner action names too', () => {
    expect(toolKind('read-file')).toBe('read')
    expect(toolKind('write-file')).toBe('write')
    expect(toolKind('go-test')).toBe('test')
    expect(toolKind('npm-build')).toBe('build')
    expect(toolKind('git-status')).toBe('changes')
    expect(toolKind('desktop.click')).toBe('desktop')
    expect(toolKind('something-else')).toBe('other')
    expect(shortToolName('workspace.install_dependencies')).toBe('install dependencies')
  })

  it('keeps a short trail of real work, without thinking, approvals or repeats', () => {
    let trail: RunPhase[] = []
    const steps: RunPhase[] = [
      { kind: 'understanding' },
      { kind: 'thinking' },
      { kind: 'tool', tool: 'workspace.read_file', detail: 'a.html' },
      { kind: 'approval', tool: 'workspace.read_file', detail: 'a.html' },
      { kind: 'tool', tool: 'workspace.read_file', detail: 'a.html' },
      { kind: 'thinking' },
      { kind: 'tool', tool: 'workspace.edit_file', detail: 'a.html' },
      { kind: 'thinking' },
    ]
    let previous: RunPhase | null = null
    for (const step of steps) {
      trail = extendTrail(trail, previous)
      previous = step
    }
    expect(trail).toEqual([
      { kind: 'understanding' },
      { kind: 'tool', tool: 'workspace.read_file', detail: 'a.html' },
      { kind: 'tool', tool: 'workspace.edit_file', detail: 'a.html' },
    ])
    const many = Array.from({ length: 6 }, (_, index): RunPhase => ({ kind: 'tool', tool: 'workspace.read_file', detail: `f${index}` }))
    expect(many.reduce<RunPhase[]>((current, step) => extendTrail(current, step), [])).toHaveLength(4)
  })

  it('shows the time as minutes and seconds', () => {
    expect(formatElapsed(0)).toBe('0:00')
    expect(formatElapsed(9_400)).toBe('0:09')
    expect(formatElapsed(75_000)).toBe('1:15')
  })
})
