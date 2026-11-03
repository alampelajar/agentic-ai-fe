import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceRequestError, type ToolApproval } from './data/api'
import { parseCloudToolCall, runCloudToolCall } from './tool-runner'

const mocks = vi.hoisted(() => ({ runWorkspaceTool: vi.fn(), approveWorkspaceTool: vi.fn(), denyWorkspaceTool: vi.fn() }))
vi.mock('./data/api', async (importActual) => ({
  ...(await importActual<typeof import('./data/api')>()),
  runWorkspaceTool: mocks.runWorkspaceTool,
  approveWorkspaceTool: mocks.approveWorkspaceTool,
  denyWorkspaceTool: mocks.denyWorkspaceTool,
}))

const approval: ToolApproval = {
  id: 'wsa-1',
  tool: 'workspace.write_file',
  workspace_id: 3,
  workspace_name: 'App',
  summary: 'Write src/a.go (12 characters)',
  arguments: { path: 'src/a.go' },
  expires_at: '2030-01-01T00:00:00Z',
}

describe('parseCloudToolCall', () => {
  it('reads a workspace tool with nested or flat arguments', () => {
    expect(parseCloudToolCall('{"action":"workspace.read_file","arguments":{"path":"main.go"}}', true)).toEqual({ tool: 'workspace.read_file', args: { path: 'main.go' } })
    expect(parseCloudToolCall('{"action":"workspace.write_file","path":"a.go","content":"x"}', true)).toEqual({ tool: 'workspace.write_file', args: { path: 'a.go', content: 'x' } })
    expect(parseCloudToolCall('{"action":"workspace.run_test","arguments":"{\\"target\\":\\"go\\"}"}', true)).toEqual({ tool: 'workspace.run_test', args: { target: 'go' } })
    expect(parseCloudToolCall('```json\n{"action":"workspace.get_changes"}\n```', true)).toEqual({ tool: 'workspace.get_changes', args: {} })
  })

  it('accepts the provider spelling of a tool name', () => {
    expect(parseCloudToolCall('{"action":"workspace_list_files","arguments":{}}', true)?.tool).toBe('workspace.list_files')
    expect(parseCloudToolCall('{"action":"workspace.read-file","arguments":{"path":"a"}}', true)?.tool).toBe('workspace.read_file')
  })

  it('refuses a workspace tool that does not exist, and unreadable ones', () => {
    expect(() => parseCloudToolCall('{"action":"workspace.delete_everything"}', true)).toThrow()
    expect(() => parseCloudToolCall('{"action":"workspace.exec","arguments":{"cmd":"id"}}', true)).toThrow()
    expect(() => parseCloudToolCall("{'action': 'workspace.write_file', 'path': 'a'}", true)).toThrow()
  })

  it('maps the old Local Runner actions to the cloud only when a workspace is selected', () => {
    expect(parseCloudToolCall('{"action":"list-files","path":"src"}', true)).toEqual({ tool: 'workspace.list_files', args: { path: 'src' } })
    expect(parseCloudToolCall('{"action":"read-file","arguments":{"path":"a.go"}}', true)).toEqual({ tool: 'workspace.read_file', args: { path: 'a.go' } })
    expect(parseCloudToolCall('{"action":"write-file","path":"a.go","content":"x","runtime":"docker"}', true)).toEqual({ tool: 'workspace.write_file', args: { path: 'a.go', content: 'x' } })
    expect(parseCloudToolCall('{"action":"go-test","runtime":"docker"}', true)).toEqual({ tool: 'workspace.run_test', args: { target: 'go' } })
    expect(parseCloudToolCall('{"action":"npm-build"}', true)).toEqual({ tool: 'workspace.build', args: { target: 'node' } })
    expect(parseCloudToolCall('{"action":"git-status"}', true)).toEqual({ tool: 'workspace.get_changes', args: {} })
    // No workspace selected: the Local Agent Runner path is left alone.
    expect(parseCloudToolCall('{"action":"list-files"}', false)).toBeNull()
    expect(parseCloudToolCall('{"action":"go-test"}', false)).toBeNull()
  })

  it('refuses shells and Docker even when asked in the old format', () => {
    for (const action of ['bash', 'powershell', 'docker', 'npm-lint']) {
      expect(() => parseCloudToolCall(`{"action":"${action}","arguments":{"command":"id"}}`, true)).toThrow()
    }
  })

  it('leaves desktop tools to the existing code', () => {
    expect(parseCloudToolCall('{"action":"desktop.status","arguments":{}}', true)).toBeNull()
    expect(parseCloudToolCall('{"action":"desktop.click","window":"1"}', false)).toBeNull()
    expect(parseCloudToolCall('not json at all', true)).toBeNull()
  })
})

describe('runCloudToolCall', () => {
  beforeEach(() => vi.resetAllMocks())
  const context = (decision?: 'allow' | 'deny' | 'expired') => ({
    workspaceId: 3,
    agentId: 9,
    taskId: 5,
    requestApproval: vi.fn().mockResolvedValue(decision),
  })

  it('returns a read result straight away', async () => {
    mocks.runWorkspaceTool.mockResolvedValueOnce({ kind: 'result', tool: 'workspace.read_file', result: { ok: true, content: 'package main' } })
    const ctx = context()
    const text = await runCloudToolCall({ tool: 'workspace.read_file', args: { path: 'main.go' } }, ctx)
    expect(JSON.parse(text)).toEqual({ ok: true, content: 'package main' })
    expect(mocks.runWorkspaceTool).toHaveBeenCalledWith({ workspaceId: 3, agentId: 9, taskId: 5, tool: 'workspace.read_file', args: { path: 'main.go' } })
    expect(ctx.requestApproval).not.toHaveBeenCalled()
    expect(mocks.approveWorkspaceTool).not.toHaveBeenCalled()
  })

  it('approves only after the user allows, and returns the result', async () => {
    mocks.runWorkspaceTool.mockResolvedValueOnce({ kind: 'approval', approval })
    mocks.approveWorkspaceTool.mockResolvedValueOnce({ tool: 'workspace.write_file', result: { ok: true, path: 'src/a.go' } })
    const ctx = context('allow')
    const text = await runCloudToolCall({ tool: 'workspace.write_file', args: { path: 'src/a.go', content: 'x' } }, ctx)
    expect(ctx.requestApproval).toHaveBeenCalledWith(approval)
    expect(mocks.approveWorkspaceTool).toHaveBeenCalledExactlyOnceWith('wsa-1')
    expect(JSON.parse(text).path).toBe('src/a.go')
  })

  it('a refused approval is denied on the server, never approved, and never reported as done', async () => {
    mocks.runWorkspaceTool.mockResolvedValueOnce({ kind: 'approval', approval })
    mocks.denyWorkspaceTool.mockResolvedValueOnce(undefined)
    const text = await runCloudToolCall({ tool: 'workspace.write_file', args: {} }, context('deny'))
    expect(text).toMatch(/^TOOL_DENIED/)
    expect(mocks.denyWorkspaceTool).toHaveBeenCalledExactlyOnceWith('wsa-1')
    expect(mocks.approveWorkspaceTool).not.toHaveBeenCalled()
  })

  it('a denial still counts when the server cannot be told', async () => {
    mocks.runWorkspaceTool.mockResolvedValueOnce({ kind: 'approval', approval })
    mocks.denyWorkspaceTool.mockRejectedValueOnce(new Error('network down'))
    expect(await runCloudToolCall({ tool: 'workspace.write_file', args: {} }, context('deny'))).toMatch(/^TOOL_DENIED/)
    expect(mocks.approveWorkspaceTool).not.toHaveBeenCalled()
  })

  it('an expired approval sends nothing and tells the model not to retry', async () => {
    mocks.runWorkspaceTool.mockResolvedValueOnce({ kind: 'approval', approval })
    const text = await runCloudToolCall({ tool: 'workspace.write_file', args: {} }, context('expired'))
    expect(text).toMatch(/^TOOL_EXPIRED/)
    expect(text).toContain('Jangan mengulang otomatis')
    expect(mocks.approveWorkspaceTool).not.toHaveBeenCalled()
    expect(mocks.denyWorkspaceTool).not.toHaveBeenCalled()
  })

  it('a 410 from the server is an expiry and is not retried', async () => {
    mocks.runWorkspaceTool.mockResolvedValueOnce({ kind: 'approval', approval })
    mocks.approveWorkspaceTool.mockRejectedValueOnce(new WorkspaceRequestError('kedaluwarsa', 410))
    const ctx = context('allow')
    expect(await runCloudToolCall({ tool: 'workspace.write_file', args: {} }, ctx)).toMatch(/^TOOL_EXPIRED/)
    expect(mocks.approveWorkspaceTool).toHaveBeenCalledTimes(1)
    expect(mocks.runWorkspaceTool).toHaveBeenCalledTimes(1)
  })

  it('a 409 (already used or cancelled) is not reported as success', async () => {
    mocks.runWorkspaceTool.mockResolvedValueOnce({ kind: 'approval', approval })
    mocks.approveWorkspaceTool.mockRejectedValueOnce(new WorkspaceRequestError('sudah digunakan', 409))
    expect(await runCloudToolCall({ tool: 'workspace.write_file', args: {} }, context('allow'))).toMatch(/^TOOL_DENIED/)
  })

  it('other failures reach the caller instead of being hidden', async () => {
    mocks.runWorkspaceTool.mockRejectedValueOnce(new WorkspaceRequestError('Agent ini tidak diizinkan memakai tool tersebut.', 403))
    await expect(runCloudToolCall({ tool: 'workspace.write_file', args: {} }, context())).rejects.toThrow('tidak diizinkan')
    mocks.runWorkspaceTool.mockResolvedValueOnce({ kind: 'approval', approval })
    mocks.approveWorkspaceTool.mockRejectedValueOnce(new Error('Failed to fetch'))
    await expect(runCloudToolCall({ tool: 'workspace.write_file', args: {} }, context('allow'))).rejects.toThrow('Failed to fetch')
  })
})
