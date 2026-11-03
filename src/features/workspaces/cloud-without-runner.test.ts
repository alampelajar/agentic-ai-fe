import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '@/lib/api-config'
import { useDesktopRuntime } from '@/stores/desktop-runtime-store'
import { parseCloudToolCall, runCloudToolCall } from './tool-runner'

// The source of every non-test file of the feature.
const sources = import.meta.glob('/src/features/workspaces/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('Cloud Workspace does not depend on the Desktop Runtime', () => {
  beforeEach(() => useDesktopRuntime.setState(useDesktopRuntime.getInitialState(), true))
  afterEach(() => vi.unstubAllGlobals())

  it('does not read the runtime connection, its address or its token anywhere', () => {
    const files = Object.entries(sources).filter(([path]) => !/\.test\.tsx?$/.test(path))
    expect(files.length).toBeGreaterThan(8)
    for (const [path, code] of files) {
      expect(code, path).not.toMatch(/desktop-runtime-store|useDesktopRuntime|runnerConnected|runnerToken|LOCAL_RUNNER|127\.0\.0\.1:8765|localhost:8765/)
    }
  })

  it('runs a workspace tool with the runtime disconnected, talking only to the Agentic AI API', async () => {
    const requested: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        requested.push(url)
        return { ok: true, status: 200, json: async () => ({ ok: true, tool: 'workspace.list_files', result: { ok: true, entries: [] } }) }
      })
    )
    expect(useDesktopRuntime.getState()).toMatchObject({ connected: false, token: '' })

    const call = parseCloudToolCall('{"action":"workspace.list_files","arguments":{}}', true)
    expect(call).not.toBeNull()
    const result = await runCloudToolCall(call!, { workspaceId: 3, agentId: 9, requestApproval: async () => 'deny' })

    expect(JSON.parse(result).ok).toBe(true)
    expect(requested).toEqual([`${API_BASE_URL}/api/workspace-tools/run`])
    expect(requested.join(' ')).not.toMatch(/8765|\/api\/desktop|\/health/)
  })

  it('maps an old local-style request to the cloud without the runtime too', () => {
    expect(parseCloudToolCall('{"action":"read-file","path":"main.go"}', true)).toEqual({ tool: 'workspace.read_file', args: { path: 'main.go' } })
  })
})
