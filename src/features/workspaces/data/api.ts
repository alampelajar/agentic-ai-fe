import { apiFetch } from '@/lib/api'

export type WorkspaceSource = 'empty' | 'zip' | 'github'
export type WorkspaceStatus = 'creating' | 'ready' | 'unavailable' | 'deleting' | 'failed'
export type WorkspaceRuntime = '' | 'go' | 'node' | 'python'

export type Workspace = {
  id: number
  name: string
  description: string
  source_type: WorkspaceSource
  source_url: string
  // Set for a workspace imported from GitHub: where it came from and the commit it was taken at.
  github_owner?: string
  github_repo?: string
  base_branch?: string
  base_sha?: string
  source_private?: boolean
  status: WorkspaceStatus
  default_runtime: WorkspaceRuntime
  file_count: number
  size_bytes: number
  created_at: string
  updated_at: string
  last_accessed_at: string | null
}

export type TreeEntry = { path: string; name: string; type: 'file' | 'dir'; size: number; sensitive?: boolean; generated?: boolean }
export type FileChange = { path: string; status: 'added' | 'modified' | 'deleted' }

export type JobStatus = 'queued' | 'preparing' | 'running' | 'completed' | 'failed' | 'timed_out' | 'cancelled'
export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = ['queued', 'preparing', 'running']

export type ExecutionJob = {
  id: number
  workspace_id: number
  job_type: string
  command: string
  runtime: string
  status: JobStatus
  cancel_requested: boolean
  exit_code: number | null
  stdout: string
  stderr: string
  error: string
  timeout_seconds: number
  duration_ms: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export const JOB_TYPES = ['go-test', 'go-build', 'npm-test', 'npm-build', 'npm-lint', 'python-test', 'go-deps', 'npm-install', 'pip-install'] as const
/** Jobs that download packages. They run on a registry-only network and execute no project code. */
export const INSTALL_JOB_TYPES: readonly JobType[] = ['go-deps', 'npm-install', 'pip-install']
export type JobType = (typeof JOB_TYPES)[number]

export class WorkspaceRequestError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'WorkspaceRequestError'
    this.status = status
  }
}

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new WorkspaceRequestError(data?.error || data?.message || 'Permintaan workspace gagal.', response.status)
  return data as T
}

export async function getWorkspaces(): Promise<Workspace[]> {
  return (await parse<{ workspaces: Workspace[] }>(await apiFetch('/api/workspaces'))).workspaces || []
}

export async function getWorkspace(id: number): Promise<Workspace> {
  return (await parse<{ workspace: Workspace }>(await apiFetch(`/api/workspaces/${id}`))).workspace
}

export type CreateWorkspaceInput = {
  name: string
  description?: string
  default_runtime?: WorkspaceRuntime
} & ({ source: 'empty' } | { source: 'github'; url: string } | { source: 'zip'; file: File })

export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  if (input.source === 'zip') {
    const form = new FormData()
    form.append('name', input.name)
    form.append('description', input.description ?? '')
    form.append('default_runtime', input.default_runtime ?? '')
    form.append('file', input.file)
    // apiFetch sets the JSON content type only when there is no FormData body.
    return (await parse<{ workspace: Workspace }>(await apiFetch('/api/workspaces', { method: 'POST', body: form }))).workspace
  }
  const body = { name: input.name, description: input.description ?? '', default_runtime: input.default_runtime ?? '', source_type: input.source, source_url: input.source === 'github' ? input.url : '' }
  return (await parse<{ workspace: Workspace }>(await apiFetch('/api/workspaces', { method: 'POST', body: JSON.stringify(body) }))).workspace
}

export async function updateWorkspace(id: number, changes: Partial<Pick<Workspace, 'name' | 'description' | 'default_runtime'>>): Promise<Workspace> {
  return (await parse<{ workspace: Workspace }>(await apiFetch(`/api/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }))).workspace
}

export async function deleteWorkspace(id: number): Promise<void> {
  await parse(await apiFetch(`/api/workspaces/${id}`, { method: 'DELETE' }))
}

export async function getTree(id: number, path = ''): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
  const data = await parse<{ entries: TreeEntry[]; truncated: boolean }>(await apiFetch(`/api/workspaces/${id}/tree${path ? `?path=${encodeURIComponent(path)}` : ''}`))
  return { entries: data.entries || [], truncated: Boolean(data.truncated) }
}

export async function readFile(id: number, path: string): Promise<{ path: string; content: string; size: number }> {
  return parse(await apiFetch(`/api/workspaces/${id}/file?path=${encodeURIComponent(path)}`))
}

export async function writeFile(id: number, path: string, content: string): Promise<{ created: boolean; size: number; workspace: Workspace }> {
  return parse(await apiFetch(`/api/workspaces/${id}/file`, { method: 'PUT', body: JSON.stringify({ path, content }) }))
}

export async function getChanges(id: number): Promise<FileChange[]> {
  return (await parse<{ changes: FileChange[] }>(await apiFetch(`/api/workspaces/${id}/changes`))).changes || []
}

export type PublishInput = { branch: string; message: string; create_pr: boolean; pr_title: string; pr_body: string }
export type PublishOutcome = {
  repository: string
  file_count: number
  result: {
    branch: string
    commit_sha: string
    commit_url: string
    pull_request_url: string
    pull_request_error?: string
    base_moved: boolean
  }
}

/** Sends the changes since the import to GitHub: a new branch with one commit, and by default a pull request. */
export async function publishToGitHub(id: number, input: PublishInput): Promise<PublishOutcome> {
  return parse(await apiFetch(`/api/workspaces/${id}/github/publish`, { method: 'POST', body: JSON.stringify(input) }))
}

export async function exportWorkspace(id: number): Promise<Blob> {
  const response = await apiFetch(`/api/workspaces/${id}/export`, { method: 'POST' })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new WorkspaceRequestError(data?.error || 'Ekspor workspace gagal.', response.status)
  }
  return response.blob()
}

export async function getExecutions(id: number): Promise<{ jobs: ExecutionJob[]; executionEnabled: boolean }> {
  const data = await parse<{ jobs: ExecutionJob[]; execution_enabled: boolean }>(await apiFetch(`/api/workspaces/${id}/executions`))
  return { jobs: data.jobs || [], executionEnabled: Boolean(data.execution_enabled) }
}

export async function startExecution(id: number, jobType: JobType): Promise<ExecutionJob> {
  return (await parse<{ job: ExecutionJob }>(await apiFetch(`/api/workspaces/${id}/executions`, { method: 'POST', body: JSON.stringify({ job_type: jobType }) }))).job
}

export async function cancelExecution(jobId: number): Promise<ExecutionJob> {
  return (await parse<{ job: ExecutionJob }>(await apiFetch(`/api/executions/${jobId}/cancel`, { method: 'POST' }))).job
}

// ---------------------------------------------------------------- agent tools

export type ToolApproval = {
  id: string
  tool: string
  workspace_id: number
  workspace_name: string
  summary: string
  arguments: Record<string, unknown>
  expires_at: string
}

export type ToolOutcome =
  | { kind: 'result'; tool: string; result: Record<string, unknown> }
  | { kind: 'approval'; approval: ToolApproval }

export async function runWorkspaceTool(request: { workspaceId: number; agentId: number; taskId?: number | null; tool: string; args: Record<string, unknown> }): Promise<ToolOutcome> {
  const response = await apiFetch('/api/workspace-tools/run', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: request.workspaceId, agent_id: request.agentId, task_id: request.taskId ?? null, tool: request.tool, arguments: request.args }),
  })
  const data = await parse<{ approval_required?: boolean; approval?: ToolApproval; tool: string; result?: Record<string, unknown> }>(response)
  if (data.approval_required && data.approval) return { kind: 'approval', approval: data.approval }
  return { kind: 'result', tool: data.tool, result: data.result ?? {} }
}

export async function approveWorkspaceTool(approvalId: string): Promise<{ tool: string; result: Record<string, unknown> }> {
  const data = await parse<{ tool: string; result: Record<string, unknown> }>(await apiFetch(`/api/workspace-tools/approvals/${encodeURIComponent(approvalId)}/approve`, { method: 'POST' }))
  return { tool: data.tool, result: data.result ?? {} }
}

export async function denyWorkspaceTool(approvalId: string): Promise<void> {
  await parse(await apiFetch(`/api/workspace-tools/approvals/${encodeURIComponent(approvalId)}/deny`, { method: 'POST' }))
}
