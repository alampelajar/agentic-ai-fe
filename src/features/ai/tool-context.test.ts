import { describe, expect, it } from 'vitest'
import { buildContextHints, firstToolMarker, shouldRunTools } from './tool-context'

const base = { cloudWorkspaceSelected: false, runtimeConnected: false, localFolderId: '', codingOrTesting: true }

describe('shouldRunTools', () => {
  it('runs tools for a Cloud Workspace with no Desktop Runtime at all', () => {
    expect(shouldRunTools({ ...base, cloudWorkspaceSelected: true })).toBe(true)
    // ...for any kind of agent
    expect(shouldRunTools({ ...base, cloudWorkspaceSelected: true, codingOrTesting: false })).toBe(true)
  })

  it('runs nothing when there is neither a Cloud Workspace nor a connected Desktop Runtime', () => {
    expect(shouldRunTools(base)).toBe(false)
    expect(shouldRunTools({ ...base, localFolderId: 'conelo' })).toBe(false) // a folder id without a connection means nothing
  })

  it('runs desktop tools for a connected runtime that has no local folder', () => {
    expect(shouldRunTools({ ...base, runtimeConnected: true })).toBe(true)
    expect(shouldRunTools({ ...base, runtimeConnected: true, codingOrTesting: false })).toBe(true)
  })

  it('keeps the old behaviour for a local folder: only coding and testing agents', () => {
    expect(shouldRunTools({ ...base, runtimeConnected: true, localFolderId: 'conelo', codingOrTesting: true })).toBe(true)
    expect(shouldRunTools({ ...base, runtimeConnected: true, localFolderId: 'conelo', codingOrTesting: false })).toBe(false)
  })
})

describe('buildContextHints', () => {
  const hints = (overrides = {}) =>
    buildContextHints({ cloudWorkspaceSelected: false, runtimeConnected: false, localFolderId: '', runtimeUrl: 'http://127.0.0.1:8765', ...overrides }).join('\n')

  it('says nothing about needing the Local Agent Runner when a Cloud Workspace is selected', () => {
    const text = hints({ cloudWorkspaceSelected: true })
    expect(text).toContain('CLOUD WORKSPACE CONTEXT')
    expect(text).toContain('No Local Agent Runner is needed')
    expect(text).not.toContain('connected=false')
    expect(text).not.toContain('Explain the required manual steps')
  })

  it('tells the model the runtime is not available when nothing is selected', () => {
    expect(hints()).toContain('connected=false')
  })

  it('offers the local protocol only with a connected runtime and a folder', () => {
    const text = hints({ runtimeConnected: true, localFolderId: 'conelo' })
    expect(text).toContain('connected=true; workspace=conelo; base_url=http://127.0.0.1:8765')
    expect(text).toContain('<LOCAL_AGENT_TOOL>')
    expect(hints({ runtimeConnected: true })).toContain('connected=false') // connected but no folder
  })

  it('can describe both at once', () => {
    const text = hints({ cloudWorkspaceSelected: true, runtimeConnected: true, localFolderId: 'conelo' })
    expect(text).toContain('CLOUD WORKSPACE CONTEXT')
    expect(text).toContain('LOCAL RUNNER CONTEXT: connected=true')
  })
})

describe('firstToolMarker', () => {
  it('asks for a cloud tool when a workspace is selected, and the local tool otherwise', () => {
    expect(firstToolMarker(true)).toContain('workspace.list_files')
    expect(firstToolMarker(true)).not.toContain('LOCAL_AGENT_TOOL')
    expect(firstToolMarker(false)).toContain('<LOCAL_AGENT_TOOL>{"action":"list-files"')
  })
})
