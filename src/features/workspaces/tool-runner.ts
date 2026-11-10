import {
  approveWorkspaceTool,
  denyWorkspaceTool,
  runWorkspaceTool,
  WorkspaceRequestError,
  type ToolApproval,
} from './data/api'

export type CloudToolCall = { tool: string; args: Record<string, unknown> }
export type ApprovalDecision = 'allow' | 'deny' | 'expired'

const CLOUD_TOOLS = new Set([
  'workspace.list_files',
  'workspace.read_file',
  'workspace.write_file',
  'workspace.get_changes',
  'workspace.run_test',
  'workspace.build',
  'workspace.install_dependencies',
  'workspace.get_execution',
  'workspace.publish',
])

/** The Local Agent Runner actions a model may still emit. With a cloud workspace selected they run in the cloud. */
const LEGACY_ACTIONS: Record<string, (args: Record<string, unknown>) => CloudToolCall> = {
  'list-files': (args) => ({ tool: 'workspace.list_files', args: pick(args, 'path') }),
  'read-file': (args) => ({ tool: 'workspace.read_file', args: pick(args, 'path') }),
  'write-file': (args) => ({ tool: 'workspace.write_file', args: pick(args, 'path', 'content') }),
  'git-status': () => ({ tool: 'workspace.get_changes', args: {} }),
  'go-test': () => ({ tool: 'workspace.run_test', args: { target: 'go' } }),
  'npm-test': () => ({ tool: 'workspace.run_test', args: { target: 'node' } }),
  'python-test': () => ({ tool: 'workspace.run_test', args: { target: 'python' } }),
  'go-build': () => ({ tool: 'workspace.build', args: { target: 'go' } }),
  'npm-build': () => ({ tool: 'workspace.build', args: { target: 'node' } }),
  // Installing is approval-gated like every other run, so a model that asks for it by its command name is routed to the tool.
  'npm-install': () => ({ tool: 'workspace.install_dependencies', args: { target: 'node' } }),
  'pip-install': () => ({ tool: 'workspace.install_dependencies', args: { target: 'python' } }),
  'go-deps': () => ({ tool: 'workspace.install_dependencies', args: { target: 'go' } }),
}

function pick(source: Record<string, unknown>, ...keys: string[]) {
  const result: Record<string, unknown> = {}
  for (const key of keys) if (source[key] !== undefined) result[key] = source[key]
  return result
}

const normalizeAction = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')

/**
 * Reads a tool marker body. It returns the cloud tool to run, or null when the
 * marker is not for the cloud workspace (a desktop tool, say) so the caller can
 * leave it to the existing code. A marker that names a cloud tool but cannot be
 * read throws, and nothing is run.
 */
export function parseCloudToolCall(raw: string, workspaceSelected: boolean): CloudToolCall | null {
  const cleaned = raw.trim().replace(/^`{3}(?:json)?\s*/i, '').replace(/\s*`{3}$/i, '').trim()
  let decoded: unknown
  try {
    decoded = JSON.parse(cleaned)
  } catch {
    if (/workspace[._]/i.test(cleaned)) throw new Error('Permintaan tool workspace bukan JSON yang valid.')
    return null
  }
  if (typeof decoded === 'string') decoded = JSON.parse(decoded)
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return null
  const envelope = decoded as Record<string, unknown>
  const rawAction = String(envelope.action ?? envelope.tool ?? envelope.name ?? '').trim()

  // Arguments may be nested ("arguments", "input") or sit next to the action.
  let args: unknown = envelope.arguments ?? envelope.input
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args)
    } catch {
      args = undefined
    }
  }
  const nested = args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : null
  const flat = { ...envelope }
  for (const key of ['action', 'tool', 'name', 'arguments', 'input', 'runtime']) delete flat[key]
  const values = nested ?? flat

  if (/^workspace[._]/i.test(rawAction)) {
    const tool = rawAction.toLowerCase().replace('workspace_', 'workspace.').replace(/-/g, '_')
    const canonical = `workspace.${normalizeAction(tool.slice('workspace.'.length))}`
    if (!CLOUD_TOOLS.has(canonical)) throw new Error(`Tool ${rawAction} tidak dikenal.`)
    return { tool: canonical, args: values }
  }
  const legacy = LEGACY_ACTIONS[rawAction.toLowerCase().replace(/[\s_]+/g, '-')]
  if (workspaceSelected && legacy) return legacy(values)
  if (workspaceSelected && /^(npm[-_]lint|docker|shell|bash|powershell)/i.test(rawAction)) {
    throw new Error(`Aksi ${rawAction} tidak tersedia pada workspace cloud.`)
  }
  return null
}

export type CloudToolContext = {
  workspaceId: number
  agentId: number
  taskId?: number | null
  /** Shows the approval to the user and resolves with what they chose. */
  requestApproval: (approval: ToolApproval) => Promise<ApprovalDecision>
}

const EXPIRED = 'TOOL_EXPIRED: persetujuan kedaluwarsa. Tidak ada perubahan yang dijalankan. Jangan mengulang otomatis; tanyakan kepada pengguna.'
const DENIED = 'TOOL_DENIED: pengguna menolak permintaan ini. Tidak ada perubahan yang dijalankan.'

/**
 * Runs one cloud tool for the model and returns what the model should read. A
 * tool that changes something is held for the user's approval; nothing is sent to
 * approve it unless the user allowed it, and an expired or refused approval is
 * never retried.
 */
export async function runCloudToolCall(call: CloudToolCall, context: CloudToolContext): Promise<string> {
  const outcome = await runWorkspaceTool({ workspaceId: context.workspaceId, agentId: context.agentId, taskId: context.taskId, tool: call.tool, args: call.args })
  if (outcome.kind === 'result') return JSON.stringify(outcome.result)

  const decision = await context.requestApproval(outcome.approval)
  if (decision === 'expired') return EXPIRED
  if (decision === 'deny') {
    await denyWorkspaceTool(outcome.approval.id).catch(() => undefined)
    return DENIED
  }
  try {
    const done = await approveWorkspaceTool(outcome.approval.id)
    return JSON.stringify(done.result)
  } catch (error) {
    if (error instanceof WorkspaceRequestError && error.status === 410) return EXPIRED
    if (error instanceof WorkspaceRequestError && error.status === 409) return DENIED
    throw error
  }
}
