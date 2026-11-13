import { Fragment, useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CHAT_HISTORY_KEY } from '@/components/layout/nav-chats'
import { useTranslation } from 'react-i18next'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuthStore } from '@/stores/auth-store'
import { addTaskMessage, createTask, getTask, getTaskMessages, updateTask } from '@/features/tasks/data/api'
import { Main } from '@/components/layout/main'
import { PageLoading } from '@/components/layout/page-loading'
import { approveDesktopAction, denyDesktopAction, emergencyStopDesktop, getDesktopWindows, requestDesktopAction, RunnerRequestError, type DesktopAction } from '@/features/desktop-runtime/api'
import { type WindowInfo } from '@/features/desktop-runtime/approval-details'
import { DelegateDialog } from '@/features/delegation/delegate-dialog'
import type { ToolApproval } from '@/features/workspaces/data/api'
import { parseCloudToolCall, runCloudToolCall, type ApprovalDecision as WorkspaceDecision } from '@/features/workspaces/tool-runner'
import { WorkspaceApprovalDialog } from '@/features/workspaces/workspace-approval-dialog'
import { describeComboAnswer } from '@/features/combos/combo-answer'
import { getSkills } from '@/features/skills/data/api'
import { useReadyWorkspaces } from '@/features/workspaces/use-ready-workspaces'
import { WorkspaceSelector } from '@/features/workspaces/workspace-selector'
import { useDesktopRuntime } from '@/stores/desktop-runtime-store'
import { buildContextHints, firstToolMarker, shouldRunTools } from './tool-context'
import { buildDelegationContext } from '@/features/delegation/data/api'
import { ChatApprovalDialog, type ApprovalDecision } from '@/features/desktop-runtime/chat-approval-dialog'
import type { LocalRunnerApproval } from '@/features/desktop-runtime/local-runner-approval'
import { LocalRunnerApprovalDialog } from '@/features/desktop-runtime/local-runner-approval-dialog'
import { toast } from 'sonner'
import { DESKTOP_TOOLS, parseLocalAgentToolCall, READ_ONLY_DESKTOP_TOOLS, type LocalRunnerToolCall } from './tool-call'
import {
  AgentSelector,
  type Agent,
  type AgentModel,
} from './components/agent-selector'
import { activityCount, addActivity, describeArgs, outcomeOf, settleActivity, type ActivityRuns } from './components/activity'
import { ActivityList } from './components/activity-list'
import { Composer } from './components/composer'
import type { SkillOption } from './components/skill-command'
import { MessageItem, type ChatMessageView, type GeneratedFile } from './components/message-item'
import { RunProgress } from './components/run-progress'
import { extendTrail, type RunPhase } from './components/run-phase'
import { MAX_ATTACHMENTS, checkAttachment, isImageAttachment } from './components/attachments'
import { SessionBar, type SessionStatus } from './components/session-bar'
import { readChatReply, visibleDraft } from './chat-stream'
import { AUTO_MODEL_ID, describeAutoAnswer, isAutoModel } from './auto-model'
import { ThreadEmpty } from './components/thread-empty'


// ============================================================
// TYPES
// ============================================================

type Message = ChatMessageView

type ChatHistoryItem = {
  role: 'user' | 'assistant'
  content: string
}

type ChatResult = {
  message: string
  model: string
  modelId: number
  provider: string
  agentId: number
}


// ============================================================
// HELPERS
// ============================================================

// ============================================================
// COMPONENT
// ============================================================

export function AIAssistant() {
  const { t } = useTranslation()
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const queryClient = useQueryClient()

  // Ambil task ID langsung dari URL agar history tetap terbaca
  // walaupun route search schema tidak mengekspos field `task`.
  const location = useLocation()

  const rawTaskId = new URL(
    location.href,
    window.location.origin
  ).searchParams.get('task')

  const routeTaskId = rawTaskId
    ?.trim()
    .replace(/^["']+|["']+$/g, '')

  // ============================================================
  // STATE
  // ============================================================

  const [loading, setLoading] = useState(true)

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const [selectedModel, setSelectedModel] = useState<AgentModel | null>(null)

  const [message, setMessage] = useState('')

  const [messages, setMessages] = useState<Message[]>([])

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const [running, setRunning] = useState(false)

  // The tool calls of the current run, shown under the conversation so a person can
  // see what the agent really did. Not saved with the task: it describes this run.
  const { workspaces: readyWorkspaces } = useReadyWorkspaces()
  // One list per turn, keyed by the person's message that started it and drawn right under
  // that message, before the agent's reply. runId is the turn in progress.
  const [activityRuns, setActivityRuns] = useState<ActivityRuns>({})
  const runId = useRef<number | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)

  // The optional Desktop Runtime (Local Agent Runner). Its connection is made in
  // Settings -> Integrations and kept in a session-only store; the token is never persisted.
  const runnerURL = useDesktopRuntime((state) => state.url)
  const runnerToken = useDesktopRuntime((state) => state.token)
  const runnerConnected = useDesktopRuntime((state) => state.connected)
  const runnerWorkspaceID = useDesktopRuntime((state) => state.localWorkspaceId)
  const [pendingApproval, setPendingApproval] = useState<DesktopAction | null>(null)
  const [pendingApprovalSkill, setPendingApprovalSkill] = useState('Desktop Control')
  const [pendingWindows, setPendingWindows] = useState<WindowInfo[] | undefined>(undefined)
  const approvalResolver = useRef<((decision: ApprovalDecision) => void) | null>(null)

  // What the agent is doing now, the steps already done and when the run began: the progress
  // strip follows these real events instead of a fixed list of steps.
  const [phase, setPhase] = useState<RunPhase | null>(null)
  const [trail, setTrail] = useState<RunPhase[]>([])
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  const phaseRef = useRef<RunPhase | null>(null)
  const moveTo = (next: RunPhase) => {
    const previous = phaseRef.current
    phaseRef.current = next
    setTrail((current) => extendTrail(current, previous))
    setPhase(next)
  }
  const resetRun = () => {
    phaseRef.current = null
    setPhase(null)
    setTrail([])
    setRunStartedAt(null)
  }

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  // The conversation's task id as soon as it exists, so a request sent in the same tick that
  // created the task can already name it (state would still be one render behind).
  const activeTaskRef = useRef<string | null>(null)
  useEffect(() => {
    activeTaskRef.current = currentTaskId
  }, [currentTaskId])
  const [delegateOpen, setDelegateOpen] = useState(false)
  // The person's skills that a slash command can call (enabled and valid ones only).
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    getSkills()
      .then((list) => {
        if (cancelled) return
        setSkillOptions(
          list
            .filter((skill) => skill.is_enabled && (skill.validation_status ?? 'valid') === 'valid')
            .map((skill) => ({ slug: skill.slug, name: skill.name, description: skill.description }))
        )
      })
      .catch(() => {
        // Without the list the slash menu stays closed; typing a command still works.
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])
  // The cloud workspace this chat works in. Agents use it on the server, so no Local Agent Runner is needed.
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null)
  const [pendingWorkspaceApproval, setPendingWorkspaceApproval] = useState<ToolApproval | null>(null)
  const workspaceApprovalResolver = useRef<((decision: WorkspaceDecision) => void) | null>(null)
  // A Local Agent Runner write or command waiting for the person's decision.
  const [pendingRunnerApproval, setPendingRunnerApproval] = useState<LocalRunnerApproval | null>(null)
  const runnerApprovalResolver = useRef<((allowed: boolean) => void) | null>(null)
  const askRunnerApproval = (request: LocalRunnerApproval) =>
    new Promise<boolean>((resolve) => {
      runnerApprovalResolver.current = resolve
      setPendingRunnerApproval(request)
    })
  // The answer as the model writes it (shown under the conversation), and the way to stop the run.
  const [draft, setDraft] = useState('')
  const draftRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)
  const showDraft = (text: string) => {
    draftRef.current = text
    setDraft(text)
  }

  const [taskTitle, setTaskTitle] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const generatedUrlsRef = useRef<Set<string>>(new Set())

  // ============================================================
  // PAGE LOADING
  // ============================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // ============================================================
  // LOAD CHAT HISTORY FROM TASK
  // ============================================================

  useEffect(() => {
    const taskId = routeTaskId

    // New Chat.
    if (!taskId) {
      clearGeneratedUrls()
      setMessages([])
      setCurrentTaskId(null)
      setTaskTitle('')
      setSelectedAgent(null)
      setSelectedModel(null)
      setHistoryError(null)
      setHistoryLoading(false)
      return
    }

    if (!accessToken) {
      return
    }

    let cancelled = false

    const loadConversation = async () => {
      setHistoryLoading(true)
      setHistoryError(null)

      // Bersihkan tampilan lama terlebih dahulu supaya task A
      // tidak sempat terlihat ketika membuka task B.
      setMessages([])
      setSelectedAgent(null)
      setSelectedModel(null)

      try {
        console.log('[AI HISTORY] Opening task:', taskId)

        // ========================================================
        // 1. LOAD TASK
        // ========================================================

        const task = await getTask(taskId)

        if (cancelled) return

        console.log('[AI HISTORY] Task found:', task)

        // ========================================================
        // 2. LOAD ALL MESSAGES FOR TASK
        // ========================================================

        const storedMessages = await getTaskMessages(task.id)

        if (cancelled) return

        console.log(
          '[AI HISTORY] Messages loaded:',
          storedMessages.length
        )

        clearGeneratedUrls()

        setCurrentTaskId(String(task.id))
        setTaskTitle(task.title)
        setSelectedWorkspaceId(task.workspace_id ?? null)

        // Tampilkan isi history SECEPATNYA, tanpa menunggu
        // request Agent selesai.
        setMessages(
          storedMessages.map((item) => ({
            id: item.id,
            role: item.role === 'user' ? 'user' : 'agent',
            content: item.content,
            model: item.model || undefined,
            modelId: item.model_id ?? undefined,
            provider: item.provider || undefined,
            // Attachments kept with the message come back from the server when shown.
            images: (item.attachments ?? []).filter((file) => file.is_image).map((file) => ({ name: file.name, source: { taskId: task.id, id: file.id } })),
            files: (item.attachments ?? []).filter((file) => !file.is_image).map((file) => ({ name: file.name, source: { taskId: task.id, id: file.id } })),
          }))
        )

        // ========================================================
        // 3. LOAD AGENT + MODEL YANG DIGUNAKAN TASK
        // ========================================================

        if (task.agent_id) {
          try {
            const agentResponse = await fetch(
              `${API_BASE_URL}/api/agents/${task.agent_id}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            )

            const agentData = await agentResponse
              .json()
              .catch(() => ({}))

            if (
              cancelled ||
              !agentResponse.ok ||
              !agentData?.agent
            ) {
              console.warn(
                '[AI HISTORY] Agent tidak berhasil dipulihkan.'
              )
            } else {
              const agent = agentData.agent as Agent

              setSelectedAgent(agent)

              const restoredModel =
                task.model_id != null
                  ? agent.models?.find(
                      (item) => item.id === task.model_id
                    ) ?? null
                  : agent.models?.[0] ?? null

              setSelectedModel(restoredModel)

              // Normalisasi metadata model pada history berdasarkan
              // model yang benar-benar terhubung ke Task.
              setMessages((current) =>
                current.map((item) => {
                  if (item.role === 'user') {
                    return item
                  }

                  const linkedModel =
                    item.modelId != null
                      ? agent.models?.find(
                          (candidate) =>
                            candidate.id === item.modelId
                        )
                      : restoredModel

                  return {
                    ...item,
                    model:
                      linkedModel?.name ||
                      item.model ||
                      undefined,
                    provider:
                      linkedModel?.provider?.name ||
                      item.provider ||
                      undefined,
                  }
                })
              )

              console.log(
                '[AI HISTORY] Agent restored:',
                agent.name
              )

              console.log(
                '[AI HISTORY] Model restored:',
                restoredModel?.id,
                restoredModel?.name
              )
            }
          } catch (agentError) {
            // History tetap dianggap berhasil dimuat walaupun
            // metadata Agent gagal dipulihkan.
            console.warn(
              '[AI HISTORY] Gagal memuat Agent:',
              agentError
            )
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Gagal membuka riwayat chat.'

          console.error('[AI HISTORY ERROR]', error)

          setHistoryError(message)
          setMessages([])
          setCurrentTaskId(null)
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false)
        }
      }
    }

    void loadConversation()

    return () => {
      cancelled = true
    }
  }, [accessToken, routeTaskId])

  const ensureConversationTask = async (fallbackTitle: string) => {
    if (currentTaskId) return currentTaskId
    if (!selectedAgent) throw new Error('Agent belum dipilih.')

    const created = await createTask({
      title: (taskTitle.trim() || fallbackTitle.trim()).slice(0, 255) || 'New AI Chat',
      description: taskTitle.trim() || fallbackTitle.trim(),
      status: 'in progress',
      label: 'feature',
      priority: 'medium',
      agent_id: selectedAgent.id,
      // With Auto the model is chosen per message, so the task names none.
      model_id: isAutoModel(selectedModel) ? null : selectedModel?.id ?? null,
      workspace_id: selectedWorkspaceId,
    })

    const id = String(created.id)
    void queryClient.invalidateQueries({ queryKey: CHAT_HISTORY_KEY })
    activeTaskRef.current = id
    setCurrentTaskId(id)
    setTaskTitle(created.title)
    return id
  }

  const persistMessage = async (taskId: string, role: 'user' | 'assistant', content: string, options?: { model?: string; modelId?: number; provider?: string; attachments?: File[] }) => {
    await addTaskMessage(taskId, {
      role,
      content,
      model: options?.model ?? '',
      model_id: options?.modelId ?? null,
      provider: options?.provider ?? '',
    }, options?.attachments ?? [])
  }

  // ============================================================
  // CLEANUP GENERATED URL
  // ============================================================

  useEffect(() => {
    return () => {
      generatedUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [])

  // ============================================================
  // CLEAR GENERATED URL
  // ============================================================

  const clearGeneratedUrls = () => {
    generatedUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url)
    })

    generatedUrlsRef.current.clear()
  }

  // ============================================================
  // ADD AGENT MESSAGE
  // ============================================================

  const addAgentMessage = (
    content: string,
    options?: {
      file?: GeneratedFile
      model?: string
      modelId?: number
      provider?: string
    }
  ) => {
    showDraft('')
    setMessages((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),

        role: 'agent',

        content,

        file: options?.file,

        model: options?.model,

        modelId: options?.modelId,

        provider: options?.provider,
      },
    ])
  }

  // ============================================================
  // NEW CHAT
  // ============================================================

  const handleNewChat = () => {
    if (running) {
      return
    }

    clearGeneratedUrls()

    setMessages([])
    setActivityRuns({})
    runId.current = null
    setMessage('')
    setSelectedFiles([])

    resetRun()

    setCurrentTaskId(null)
    setTaskTitle('')

  }

  // ============================================================
  // SELECT FILES
  // ============================================================

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    const valid: File[] = []

    // A refused file is named, so the person knows why it is not attached.
    for (const file of files) {
      const check = checkAttachment(file)
      if (check === 'unsupported') {
        toast.error(t('agentic.composer.unsupportedFile', { name: file.name }))
        continue
      }
      if (check === 'tooLarge') {
        toast.error(t('agentic.composer.fileTooLarge', { name: file.name }))
        continue
      }
      valid.push(file)
    }

    const room = Math.max(0, MAX_ATTACHMENTS - selectedFiles.length)
    if (valid.length > room) {
      toast.error(t('agentic.composer.tooManyFiles', { count: MAX_ATTACHMENTS }))
    }

    setSelectedFiles((current) => [...current, ...valid.slice(0, room)])

    event.target.value = ''
  }

  // ============================================================
  // REMOVE FILE
  // ============================================================

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, i) => i !== index))
  }

  // ============================================================
  // AI PLANNER
  // ============================================================

  const planAgent = async (
    text: string,
    history: ChatHistoryItem[],
    hasImage: boolean
  ) => {
    const response = await fetch(`${API_BASE_URL}/api/agent/plan`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',

        ...(accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {}),
      },

      body: JSON.stringify({
        message: text,
        history,
        has_image: hasImage,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data?.error || data?.message || t('agentic.errors.planningFailed')
      )
    }

    // Backend dapat mengembalikan plan langsung atau
    // membungkusnya di dalam { plan: ... }.
    return data?.plan ?? data
  }

  // ============================================================
  // CHAT
  // ============================================================

  const sendChat = async (
    text: string,
    files: File[],
    history: ChatHistoryItem[],
    agentId: number,
    modelId?: number
  ): Promise<ChatResult> => {
    const formData = new FormData()
    formData.append('message', text)
    formData.append('history', JSON.stringify(history))
    formData.append('agent_id', String(agentId))

    if (modelId && modelId > 0) {
      formData.append('model_id', String(modelId))
    }
    // Auto: the backend picks the model that fits this message.
    if (modelId === AUTO_MODEL_ID) {
      formData.append('auto_model', '1')
    }

    if (selectedWorkspaceId) {
      formData.append('workspace_id', String(selectedWorkspaceId))
    }

    // A round-robin combo keeps one model for the whole conversation.
    if (activeTaskRef.current && /^\d+$/.test(activeTaskRef.current)) {
      formData.append('task_id', activeTaskRef.current)
    }

    // Images go to the model as images; documents are read as text by the backend.
    files.forEach((file) => formData.append(isImageAttachment(file) ? 'images' : 'files', file))

    const headers: HeadersInit = {}
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`

    // The answer streams in while the model writes it; combos and tool calls answer at once.
    const response = await fetch(`${API_BASE_URL}/api/chat?stream=1`, {
      method: 'POST',
      headers,
      body: formData,
      signal: abortRef.current?.signal,
    })

    let written = ''
    showDraft('')
    const reply = await readChatReply(response, (piece) => {
      written += piece
      showDraft(visibleDraft(written))
    })
    // Read like a parsed JSON reply, as before.
    const data = reply.data as ReturnType<typeof JSON.parse>

    if (!reply.ok) {
      const baseMessage = String(
        data?.error || data?.message || (data?.code === 'stream_incomplete' ? t('agentic.errors.streamIncomplete') : t('agentic.errors.chatFailed'))
      )
      const detail = typeof data?.detail === 'string' ? data.detail.trim() : ''
      const statusLabel = `HTTP ${reply.status}`
      throw new Error(
        [`[${statusLabel}] ${baseMessage}`, detail ? `Detail: ${detail}` : 'Backend tidak mengirim detail penyebab.']
          .filter(Boolean)
          .join('\n')
      )
    }

    if (!data?.message) {
      throw new Error(t('agentic.errors.emptyResponse'))
    }

    return {
      message: String(data.message),

      // UI memakai nama model yang dipilih user.
      // Backend/provider tetap menggunakan model_id API.
      // Untuk combo: nama combo, model yang benar-benar menjawab, dan model yang gagal lebih dulu.
      model: String(
        describeAutoAnswer(data.auto, String(data.model || ''), t) ||
        describeComboAnswer(data, t) ||
          selectedModel?.name ||
          data.model ||
          selectedModel?.model_id ||
          'unknown'
      ),

      modelId: Number(data.model_id || modelId || 0),

      provider: String(
        data.provider ||
          selectedModel?.provider?.name ||
          'Unknown Provider'
      ),

      agentId: Number(data.agent_id || agentId),
    }
  }

  // One row in the activity list per tool call: started now, finished when its result is known.
  const startActivity = (tool: string, detail: string) => {
    const id = Date.now() + Math.random()
    const run = runId.current
    if (run !== null) setActivityRuns((current) => addActivity(current, run, { id, tool, detail, state: 'running' }))
    return id
  }
  const finishActivity = (id: number, result: string) => {
    const state = outcomeOf(result)
    setActivityRuns((current) => settleActivity(current, id, state))
  }

  // ============================================================
  // LOCAL AGENT RUNNER TOOLS (optional Desktop Runtime)
  // ============================================================

  const runLocalTool = async (call: LocalRunnerToolCall): Promise<string> => {
    if (!runnerConnected || !runnerToken || !runnerWorkspaceID) {
      throw new Error('Local Agent Runner belum terhubung atau workspace belum dipilih.')
    }

    const allowedExecution = [
      'git-status',
      'go-test',
      'go-build',
      'npm-test',
      'npm-build',
      'npm-lint',
      'python-test',
    ]
    const allowedFileTools = ['list-files', 'read-file', 'write-file']
    if (!allowedExecution.includes(call.action) && !allowedFileTools.includes(call.action)) {
      throw new Error(`Tool tidak diizinkan: ${call.action}`)
    }

    const base = runnerURL.replace(/\/+$/, '')
    const workspace = encodeURIComponent(runnerWorkspaceID)
    const headers = {
      Authorization: `Bearer ${runnerToken}`,
      'Content-Type': 'application/json',
    }

    if (call.action === 'list-files') {
      const path = encodeURIComponent(call.path || '.')
      const response = await fetch(`${base}/api/workspaces/${workspace}/tree?path=${path}`, { headers })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Gagal membaca daftar file.')
      return JSON.stringify(data)
    }

    if (call.action === 'read-file') {
      if (!call.path) throw new Error('Tool read-file wajib menyertakan path relatif.')
      const path = encodeURIComponent(call.path)
      const response = await fetch(`${base}/api/workspaces/${workspace}/file?path=${path}`, { headers })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Gagal membaca file.')
      return JSON.stringify(data)
    }

    if (call.action === 'write-file') {
      if (!call.path || typeof call.content !== 'string') {
        throw new Error('Tool write-file wajib menyertakan path dan content.')
      }
      // Read the file as it is now, so the person approves the exact change, not just a path.
      let before: string | null | undefined
      const current = await fetch(`${base}/api/workspaces/${workspace}/file?path=${encodeURIComponent(call.path)}`, { headers }).catch(() => null)
      if (current?.status === 404) before = null
      else if (current?.ok) {
        const data = await current.json().catch(() => ({}))
        before = typeof data?.content === 'string' ? data.content : undefined
      }
      const approved = await askRunnerApproval({ kind: 'write', workspace: runnerWorkspaceID, path: call.path, before, after: call.content })
      if (!approved) return 'DIBATALKAN: pengguna menolak perubahan file.'
      const response = await fetch(`${base}/api/workspaces/${workspace}/file`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          path: call.path,
          content: call.content,
          create: Boolean(call.create),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Gagal menulis file.')
      return JSON.stringify(data)
    }

    const runtime = call.runtime === 'docker' ? 'docker' : 'native'
    const approved = await askRunnerApproval({ kind: 'execute', workspace: runnerWorkspaceID, action: call.action, runtime })
    if (!approved) return 'DIBATALKAN: pengguna menolak eksekusi perintah.'
    const response = await fetch(`${base}/api/workspaces/${workspace}/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: call.action, runtime }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || 'Eksekusi tool gagal.')
    return JSON.stringify(data)
  }

  const runDesktopTool = async (call: LocalRunnerToolCall, agentId: number): Promise<string> => {
    if (!runnerConnected || !runnerToken) throw new Error('Local Agent Runner belum terhubung.')
    const action = call.action
    const allowed: readonly string[] = DESKTOP_TOOLS
    if (!allowed.includes(action)) throw new Error(`Desktop tool tidak diizinkan: ${action}`)
    const mutating = !READ_ONLY_DESKTOP_TOOLS.includes(action)
    const base = runnerURL.replace(/\/+$/, '')
    const logActivity = async (approvalStatus: string, executionStatus: string, error?: string) => {
      await fetch(`${API_BASE_URL}/api/tool-activities`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: agentId, tool_name: action, arguments: { window: call.window, text: call.text ? '[redacted-by-client]' : undefined, keys: call.keys }, target_application: call.window || '', approval_status: approvalStatus, execution_status: executionStatus, error: error || '' }) }).catch(() => undefined)
    }
    if (!mutating) {
      const path = action === 'desktop.status' ? '/api/desktop/status' : action === 'desktop.screenshot' ? '/api/desktop/screenshot' : action === 'desktop.windows' ? '/api/desktop/windows' : '/api/desktop/inspect'
      const response = await fetch(`${base}${path}`, { method: action === 'desktop.inspect' ? 'POST' : 'GET', headers: { Authorization: `Bearer ${runnerToken}`, 'Content-Type': 'application/json' }, body: action === 'desktop.inspect' ? JSON.stringify({ window: call.window }) : undefined })
      const data = await response.json().catch(() => ({})); if (!response.ok) { await logActivity('not_required', 'failed', data?.error); throw new Error(data?.error || 'Desktop read failed.') }; await logActivity('not_required', 'completed')
      // Screenshot pixels stay on this machine: the model only receives metadata, never the image payload.
      const image = action === 'desktop.screenshot' ? data?.data : undefined
      if (image && typeof image.base64 === 'string') {
        const { base64, ...rest } = image
        return JSON.stringify({ ...data, data: { ...rest, base64_bytes: base64.length, image_withheld: 'Image data was captured successfully but is not sent to the model.' } })
      }
      return JSON.stringify(data)
    }
    const requested = await requestDesktopAction(base, runnerToken, { action, agent: `Agent ${agentId}`, reason: 'AI Agent requested this desktop action for the current user task.', window: call.window, target: call.target, arguments: { text: call.text, keys: call.keys, amount: call.amount, direction: call.direction } })
    // Window names are read-only metadata; they let the dialog show the application and not only a handle.
    setPendingWindows(await getDesktopWindows(base, runnerToken).then((response) => response.data?.windows, () => undefined))
    setPendingApproval(requested.action)
    setPendingApprovalSkill(call.skill || 'Desktop Control')
    const decision = await new Promise<ApprovalDecision>((resolve) => { approvalResolver.current = resolve })
    setPendingApproval(null)
    approvalResolver.current = null
    const expired = async () => {
      // The approval is gone. Say so, and never retry or approve it again on the user's behalf.
      toast.error(t('desktopRuntime.chatApproval.expired'))
      await logActivity('expired', 'cancelled')
      return 'TOOL_EXPIRED: persetujuan pengguna kedaluwarsa dan tindakan desktop tidak dijalankan. Jangan mengulang otomatis; tanyakan apakah pengguna ingin mengajukan permintaan baru.'
    }
    if (decision === 'expired') return expired()
    if (decision === 'deny' || decision === 'emergency') {
      // The runner may already have dropped the approval (for example after Emergency Stop). The action cannot run either way.
      await denyDesktopAction(base, runnerToken, requested.action.id).catch(() => undefined)
      await logActivity('denied', 'cancelled')
      // design-system-ignore: these TOOL_* results go to the AI model, not to the screen
      return decision === 'emergency' ? 'TOOL_DENIED: pengguna menghentikan desktop dengan Emergency Stop. Tidak ada tindakan yang dijalankan.' : 'TOOL_DENIED: pengguna menolak tindakan desktop.'
    }
    try {
      const result = await approveDesktopAction(base, runnerToken, requested.action.id, decision)
      await logActivity(`approved_${decision}`, 'completed')
      return JSON.stringify(result)
    } catch (error) {
      if (error instanceof RunnerRequestError && error.status === 410) return expired()
      throw error
    }
  }

  const runAgentToolLoop = async (
    initial: ChatResult,
    originalText: string,
    originalHistory: ChatHistoryItem[],
    files: File[],
    agentId: number,
    modelId: number
  ): Promise<ChatResult> => {
    let result = initial
    const toolHistory: ChatHistoryItem[] = [
      ...originalHistory,
      { role: 'user', content: originalText },
    ]

    const maxToolCalls = 8
    let toolCalls = 0
    let promptedForFirstTool = false

    while (toolCalls < maxToolCalls) {
      if (abortRef.current?.signal.aborted) throw new DOMException('Stopped', 'AbortError')
      const desktopMatch = result.message.match(/<AGENT_TOOL>([\s\S]*?)<\/AGENT_TOOL>/)
      const match = result.message.match(/<LOCAL_AGENT_TOOL>([\s\S]*?)<\/LOCAL_AGENT_TOOL>/)
      const toolMatch = desktopMatch || match
      if (!toolMatch) {
        const looksLikeWorkspaceTask =
          /\b(repository|repo|workspace|local agent runner|struktur|daftar file|list-files|baca file|membaca|package\.json|konfigurasi|inspect|periksa|pemeriksaan|pengujian|testing|test)\b/i.test(originalText)

        // Some models first narrate a plan instead of emitting a tool marker.
        // For an explicit repository-inspection request, nudge once to the
        // required tool protocol rather than falsely treating the plan as work.
        if (toolCalls === 0 && !promptedForFirstTool && looksLikeWorkspaceTask) {
          promptedForFirstTool = true
          toolHistory.push({ role: 'assistant', content: result.message })
          const toolRequestPrompt =
            `Permintaan pengguna ini membutuhkan pemeriksaan workspace. Jangan menjawab dengan rencana atau narasi. Segera panggil tool read-only pertama memakai marker persis berikut, tanpa Markdown fence atau teks di dalam marker selain JSON valid: ${firstToolMarker(selectedWorkspaceId !== null)}. Jangan mengubah file dan jangan menjalankan perintah terminal.`
          toolHistory.push({ role: 'user', content: toolRequestPrompt })
          result = await sendChat(
            toolRequestPrompt,
            files,
            toolHistory.slice(0, -1),
            agentId,
            modelId
          )
          continue
        }

        if (promptedForFirstTool && toolCalls === 0) {
          return {
            ...result,
            message:
              'Saya belum bisa memeriksa workspace karena model tidak menghasilkan marker tool yang valid setelah satu kali diminta ulang. Tidak ada file yang dibaca atau diubah. Coba ulangi permintaan atau pilih model lain yang lebih patuh pada format tool.',
          }
        }
        return result
      }

      // Cloud workspace tools run on the server and need no Local Agent Runner.
      let cloudCall: ReturnType<typeof parseCloudToolCall> = null
      let cloudError: string | null = null
      try {
        cloudCall = parseCloudToolCall(toolMatch[1], selectedWorkspaceId !== null)
      } catch (error) {
        cloudError = error instanceof Error ? error.message : 'format tidak dikenali'
      }
      if (cloudError !== null) {
        return { ...result, message: `Permintaan tool workspace tidak valid (${cloudError}). Tidak ada tindakan yang dijalankan.` }
      }
      if (cloudCall) {
        if (selectedWorkspaceId === null) {
          return { ...result, message: `${t('workspacePage.chat.needed')}\n\nPermintaan tool tidak dijalankan.` }
        }
        let toolResult: string
        const toolDetail = describeArgs(cloudCall.args)
        const toolName = cloudCall.tool
        const activityId = startActivity(toolName, toolDetail)
        moveTo({ kind: 'tool', tool: toolName, detail: toolDetail })
        try {
          toolResult = await runCloudToolCall(cloudCall, {
            workspaceId: selectedWorkspaceId,
            agentId,
            taskId: currentTaskId && /^\d+$/.test(currentTaskId) ? Number(currentTaskId) : null,
            requestApproval: (approval) => {
              moveTo({ kind: 'approval', tool: toolName, detail: toolDetail })
              return new Promise<WorkspaceDecision>((resolve) => {
                workspaceApprovalResolver.current = (decision) => {
                  moveTo({ kind: 'tool', tool: toolName, detail: toolDetail })
                  resolve(decision)
                }
                setPendingWorkspaceApproval(approval)
              })
            },
          })
        } catch (error) {
          toolResult = `TOOL_ERROR: ${error instanceof Error ? error.message : 'Kesalahan tool tidak diketahui'}`
        }
        finishActivity(activityId, toolResult)
        toolCalls += 1
        moveTo({ kind: 'thinking' })
        toolHistory.push({ role: 'assistant', content: result.message })
        const cloudFollowup = `Hasil tool ${cloudCall.tool} pada workspace cloud:\n\n${toolResult}\n\nGunakan hanya hasil tool di atas sebagai bukti. Jangan menyatakan pekerjaan berhasil jika hasil tool menunjukkan kegagalan, penolakan, atau kedaluwarsa. Jika perlu tindakan workspace berikutnya, panggil satu tool lagi; jika sudah cukup, berikan jawaban akhir.`
        toolHistory.push({ role: 'user', content: cloudFollowup })
        result = await sendChat(cloudFollowup, files, toolHistory.slice(0, -1), agentId, modelId)
        continue
      }

      // Desktop tools need the Desktop Runtime to be connected. The older local file and
      // terminal tools also need one of its project folders. Neither is needed for a Cloud Workspace.
      if (!runnerConnected) {
        return { ...result, message: t('desktopRuntime.chat.desktopNeedsRuntime') }
      }
      if (!desktopMatch && !runnerWorkspaceID) {
        return { ...result, message: t('desktopRuntime.chat.localNeedsFolder') }
      }

      let call: LocalRunnerToolCall
      try {
        call = parseLocalAgentToolCall(toolMatch[1])
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'format tidak dikenali'
        return {
          ...result,
          message: `Agent menghasilkan permintaan tool yang tidak valid (${detail}). Tidak ada tindakan yang dijalankan. Coba ulangi sekali dengan meminta format persis: <LOCAL_AGENT_TOOL>{"action":"list-files","path":"."}</LOCAL_AGENT_TOOL>.`,
        }
      }

      let toolResult: string
      const localActivityId = startActivity(call.action, '')
      moveTo({ kind: 'tool', tool: call.action })
      try {
        toolResult = desktopMatch ? await runDesktopTool(call, agentId) : await runLocalTool(call)
      } catch (error) {
        toolResult = `TOOL_ERROR: ${error instanceof Error ? error.message : 'Kesalahan tool tidak diketahui'}`
      }
      finishActivity(localActivityId, toolResult)
      toolCalls += 1

      moveTo({ kind: 'thinking' })
      const assistantToolCall = result.message
      toolHistory.push({ role: 'assistant', content: assistantToolCall })
      const followup = `Hasil Local Agent Runner untuk tool ${call.action}:\\n\\n${toolResult}\\n\\nGunakan hanya hasil tool di atas sebagai bukti. Jika perlu tindakan workspace, keluarkan <LOCAL_AGENT_TOOL>; jika perlu tindakan desktop dari skill aktif, keluarkan <AGENT_TOOL>. Jika sudah selesai, jawab pengguna tanpa marker.`
      toolHistory.push({ role: 'user', content: followup })
      result = await sendChat(followup, files, toolHistory.slice(0, -1), agentId, modelId)
    }

    if (/<LOCAL_AGENT_TOOL>|<AGENT_TOOL>/.test(result.message)) {
      moveTo({ kind: 'summarizing' })
      const finalPrompt = `Batas aman ${maxToolCalls} pemanggilan tool telah tercapai. JANGAN meminta atau mengeluarkan tool marker lagi. Buat jawaban akhir sekarang hanya berdasarkan output Local Agent Runner yang sudah ada di riwayat percakapan. Ringkas file yang benar-benar berhasil dibaca, temuan yang didukung output, dan hal yang belum dapat dipastikan. Jangan mengklaim file sudah dibaca atau perintah sudah dijalankan jika tidak ada hasilnya. Permintaan awal pengguna: ${originalText}`
      try {
        const finalResult = await sendChat(finalPrompt, files, toolHistory, agentId, modelId)
        if (!/<LOCAL_AGENT_TOOL>|<AGENT_TOOL>/.test(finalResult.message)) {
          return finalResult
        }
        return {
          ...finalResult,
          message: `Pemeriksaan mencapai batas ${maxToolCalls} pemanggilan tool. Ringkasan AI masih meminta tool tambahan, jadi saya tidak menjalankannya lagi. Minta agent merangkum bukti yang sudah terkumpul atau lanjutkan pemeriksaan dalam pesan baru.`,
        }
      } catch (error) {
        return {
          ...result,
          message: `Pemeriksaan mencapai batas ${maxToolCalls} pemanggilan tool dan ringkasan akhir gagal dibuat: ${error instanceof Error ? error.message : 'kesalahan tidak diketahui'}. Tidak ada tool tambahan yang dijalankan.`,
        }
      }
    }
    return result
  }

  // ============================================================
  // GENERATOR WEBSITE
  // ============================================================

  const sendGenerator = async (text: string, agent: Agent, files: File[]) => {
    setTaskTitle(text)

    // --------------------------------------------------------
    // GOAL
    // --------------------------------------------------------

    moveTo({ kind: 'site', stage: 'design' })

    const formData = new FormData()

    formData.append('prompt', text)

    // --------------------------------------------------------
    // AGENT
    // --------------------------------------------------------

    formData.append('agent_id', String(agent.id))

    // --------------------------------------------------------
    // MODEL
    // --------------------------------------------------------

    if (selectedModel?.id && !isAutoModel(selectedModel)) {
      formData.append('model_id', String(selectedModel.id))
    }

    // --------------------------------------------------------
    // IMAGES
    // --------------------------------------------------------

    files.filter(isImageAttachment).forEach((file) => {
      formData.append('images', file)
    })

    const headers: HeadersInit = {}

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    // --------------------------------------------------------
    // PLANNING
    // --------------------------------------------------------

    const response = await fetch(`${API_BASE_URL}/api/generator/landing-page`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      let errorMessage = t('agentic.errors.generatorFailed')

      try {
        const error = await response.json()

        errorMessage = error?.error || error?.message || errorMessage
      } catch {}

      throw new Error(errorMessage)
    }

    // --------------------------------------------------------
    // CODING
    // --------------------------------------------------------

    moveTo({ kind: 'site', stage: 'build' })

    const blob = await response.blob()

    if (blob.size === 0) {
      throw new Error(t('agentic.errors.emptyZip'))
    }

    // --------------------------------------------------------
    // TESTING
    // --------------------------------------------------------

    moveTo({ kind: 'site', stage: 'package' })

    const blobUrl = URL.createObjectURL(blob)

    generatedUrlsRef.current.add(blobUrl)

    const generatedFile: GeneratedFile = {
      id: Date.now(),

      name: 'landing-page.zip',

      size: blob.size,

      blobUrl,
    }

    // --------------------------------------------------------
    // DONE
    // --------------------------------------------------------

    moveTo({ kind: 'done' })

    return generatedFile
  }

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSend = async () => {
    const text = message.trim()

    if (!text || !selectedAgent || !selectedModel || running || historyLoading) return

    const files = [...selectedFiles]
    const history: ChatHistoryItem[] = messages.map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: item.content,
    }))

    const userMessageId = Date.now()
    const images = files
      .filter(isImageAttachment)
      .map((file) => ({ name: file.name, url: URL.createObjectURL(file) }))
    const documents = files.filter((file) => !isImageAttachment(file)).map((file) => ({ name: file.name }))
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: 'user', content: text, images, files: documents },
    ])
    setMessage('')
    setSelectedFiles([])
    runId.current = userMessageId
    setTaskTitle((current) => current || text)
    setRunning(true)
    const controller = new AbortController()
    abortRef.current = controller
    showDraft('')
    phaseRef.current = null
    setTrail([])
    setRunStartedAt(Date.now())
    moveTo({ kind: 'understanding' })

    let taskId: string | null = null

    try {
      taskId = await ensureConversationTask(text)

      await persistMessage(taskId, 'user', text, { attachments: files })

      const plan = await planAgent(text, history, files.length > 0)

      if (plan.intent === 'generator') {
        const generated = await sendGenerator(text, selectedAgent, files)
        const content = t('agentic.messages.websiteCreated')

        addAgentMessage(content, { file: generated })
        await persistMessage(taskId, 'assistant', content)
      } else {
        const agentSlug = selectedAgent.slug.toLowerCase()
        const isCodingAgent = agentSlug.includes('coding') || agentSlug.includes('code')
        const isTestingAgent = agentSlug.includes('testing') || agentSlug.includes('test')
        // Attachments are read with the first call; say so, then the model is thinking.
        const imageCount = images.length
        const documentCount = documents.length
        moveTo(imageCount > 0 ? { kind: 'images', count: imageCount } : documentCount > 0 ? { kind: 'files', count: documentCount } : { kind: 'thinking' })

        // A selected Cloud Workspace needs no mention of the Local Agent Runner at all.
        const contextHints = buildContextHints({ cloudWorkspaceSelected: selectedWorkspaceId !== null, runtimeConnected: runnerConnected, localFolderId: runnerWorkspaceID, runtimeUrl: runnerURL })
        const effectivePrompt = `${text}\n\n${contextHints.join('\n')}`

        let result = await sendChat(
          effectivePrompt,
          files,
          history,
          selectedAgent.id,
          selectedModel.id
        )

        // Tools run for a selected Cloud Workspace, or (as before) for a connected Desktop Runtime.
        if (shouldRunTools({ cloudWorkspaceSelected: selectedWorkspaceId !== null, runtimeConnected: runnerConnected, localFolderId: runnerWorkspaceID, codingOrTesting: isCodingAgent || isTestingAgent })) {
          moveTo({ kind: 'thinking' })
          result = await runAgentToolLoop(
            result,
            effectivePrompt,
            history,
            files,
            selectedAgent.id,
            selectedModel.id
          )
        }

        moveTo({ kind: 'done' })
        addAgentMessage(result.message, {
          model: result.model,
          modelId: result.modelId,
          provider: result.provider,
        })

        await persistMessage(taskId, 'assistant', result.message, {
          model: result.model,
          modelId: result.modelId,
          provider: result.provider,
        })
      }

      await updateTask(taskId, isAutoModel(selectedModel) ? { status: 'done' } : { status: 'done', model_id: selectedModel.id })
      void queryClient.invalidateQueries({ queryKey: CHAT_HISTORY_KEY })
      window.dispatchEvent(new Event('tasks:refresh'))
    } catch (error) {
      // Stopped by the person: keep what was written so far, marked as stopped.
      if (controller.signal.aborted) {
        const partial = draftRef.current
        const content = [partial, `_${t('agentic.messages.stopped')}_`].filter(Boolean).join('\n\n')
        moveTo({ kind: 'stopped' })
        addAgentMessage(content)
        if (taskId) {
          try {
            await persistMessage(taskId, 'assistant', content)
            await updateTask(taskId, { status: 'canceled' })
            window.dispatchEvent(new Event('tasks:refresh'))
          } catch (persistError) {
            console.error('[TASK ERROR]', persistError)
          }
        }
        return
      }
      const errorMessage = error instanceof Error ? error.message : t('agentic.errors.generic')
      addAgentMessage(`Maaf, terjadi kesalahan.\n\n${errorMessage}`)

      if (taskId) {
        try {
          await persistMessage(taskId, 'assistant', `Maaf, terjadi kesalahan.\n\n${errorMessage}`)
          await updateTask(taskId, { status: 'canceled' })
          window.dispatchEvent(new Event('tasks:refresh'))
        } catch (persistError) {
          console.error('[TASK ERROR]', persistError)
        }
      }
    } finally {
      setRunning(false)
      abortRef.current = null
      showDraft('')
      // The finished strip stays a moment, unless a new message has started a new run by then.
      const finishedRun = userMessageId
      setTimeout(() => {
        if (runId.current === finishedRun) resetRun()
      }, 4000)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    if (workspaceApprovalResolver.current) {
      const resolve = workspaceApprovalResolver.current
      workspaceApprovalResolver.current = null
      setPendingWorkspaceApproval(null)
      resolve('deny')
    }
    if (runnerApprovalResolver.current) {
      const resolve = runnerApprovalResolver.current
      runnerApprovalResolver.current = null
      setPendingRunnerApproval(null)
      resolve(false)
    }
    approvalResolver.current?.('deny')
  }

  // Keep the newest message, tool call or status in view, unless the person has
  // scrolled up to read: only follow when they were already at the bottom.
  const lastCount = useRef(0)
  useEffect(() => {
    const element = threadRef.current
    if (!element) return
    const total = messages.length + activityCount(activityRuns)
    const grew = total > lastCount.current
    lastCount.current = total
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 160
    if (grew && (nearBottom || total <= 2)) element.scrollTo({ top: element.scrollHeight })
  }, [messages, activityRuns])

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return <PageLoading />
  }

  // ============================================================
  // UI
  // ============================================================

  const selectedWorkspaceName = readyWorkspaces?.find((workspace) => workspace.id === selectedWorkspaceId)?.name ?? null

  const sessionStatus: SessionStatus = running
    ? 'working'
    : !selectedAgent
      ? 'chooseAgent'
      : !selectedModel
        ? 'chooseModel'
        : 'ready'

  return (
    <Main fixed className='agentic-workspace flex min-h-0 flex-1 flex-col overflow-hidden bg-background p-0'>
      <div className='flex min-h-0 flex-1 flex-col'>
        <SessionBar status={sessionStatus} onNewChat={handleNewChat} newChatDisabled={running}>
          <AgentSelector
            selectedAgent={selectedAgent}
            onSelect={setSelectedAgent}
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
          />

          <WorkspaceSelector
            variant='bar'
            value={selectedWorkspaceId}
            disabled={running}
            onChange={(workspace) => {
              setSelectedWorkspaceId(workspace?.id ?? null)
              // Keep the task pointing at the workspace the user is using.
              if (currentTaskId) {
                void updateTask(currentTaskId, { workspace_id: workspace?.id ?? 0 }).catch((error) => toast.error(error instanceof Error ? error.message : t('workspacePage.toast.failed')))
              }
            }}
          />
        </SessionBar>

        <div ref={threadRef} className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6' role='log' aria-label={t('agentic.thread.label')}>
          {/* Before the first message the empty state sits in the middle of the free space, so the space around it is placed, not left over. */}
          <div className={`mx-auto flex w-full max-w-4xl flex-col ${messages.length === 0 && !historyLoading && !historyError ? 'my-auto' : ''}`}>
            {historyLoading ? (
              <p className='max-w-[46rem] py-10 text-sm text-muted-foreground' role='status'>{t('agentic.thread.loading')}</p>
            ) : historyError ? (
              <div className='max-w-[46rem] py-10' role='alert'>
                <h2 className='text-lg font-semibold'>{t('agentic.thread.loadError')}</h2>
                <p className='mt-1 text-sm text-muted-foreground'>{historyError}</p>
              </div>
            ) : messages.length === 0 ? (
              <ThreadEmpty
                agent={selectedAgent}
                model={selectedModel}
                workspaceName={selectedWorkspaceName}
                onPick={setMessage}
              />
            ) : (
              <div className='flex flex-col gap-6'>
                {messages.map((item) => (
                  <Fragment key={item.id}>
                    <MessageItem message={item} agentName={selectedAgent?.name ?? 'Agent'} />
                    {activityRuns[item.id] && <ActivityList items={activityRuns[item.id]} />}
                  </Fragment>
                ))}
                {running && draft && (
                  <div data-testid='answer-draft' aria-live='polite'>
                    <MessageItem message={{ id: -1, role: 'agent', content: draft }} agentName={selectedAgent?.name ?? 'Agent'} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <RunProgress
          phase={phase}
          trail={trail}
          startedAt={runStartedAt}
          running={running}
          agentName={selectedAgent?.name}
          modelName={selectedModel?.name}
        />

        <Composer
          value={message}
          onChange={setMessage}
          onSend={handleSend}
          onStop={handleStop}
          ready={Boolean(selectedAgent && selectedModel)}
          running={running}
          modelName={selectedModel?.name}
          files={selectedFiles}
          onFiles={handleSelectFiles}
          onRemoveFile={handleRemoveFile}
          fileInputRef={fileInputRef}
          onDelegate={() => setDelegateOpen(true)}
          delegateDisabled={!selectedAgent || running}
          runtimeConnected={runnerConnected}
          skills={skillOptions}
        />
      </div>
      <DelegateDialog
        open={delegateOpen}
        onOpenChange={setDelegateOpen}
        currentAgentId={selectedAgent ? Number(selectedAgent.id) : null}
        taskId={currentTaskId && /^\d+$/.test(currentTaskId) ? Number(currentTaskId) : null}
        defaultInstruction={message.trim()}
        context={buildDelegationContext(messages)}
        onDelegated={({ agent, message: answer }) => {
          const content = [t('delegation.answerFrom', { name: agent.name }), answer].join('\n\n')
          addAgentMessage(content)
          if (currentTaskId) void persistMessage(currentTaskId, 'assistant', content).catch(() => undefined)
          toast.success(t('delegation.toast', { name: agent.name }))
          setDelegateOpen(false)
        }}
      />
      {pendingRunnerApproval && (
        <LocalRunnerApprovalDialog
          request={pendingRunnerApproval}
          agentName={selectedAgent?.name ?? 'Agent'}
          onDecision={(allowed) => {
            setPendingRunnerApproval(null)
            const resolve = runnerApprovalResolver.current
            runnerApprovalResolver.current = null
            resolve?.(allowed)
          }}
        />
      )}
      {pendingWorkspaceApproval && (
        <WorkspaceApprovalDialog
          key={pendingWorkspaceApproval.id}
          approval={pendingWorkspaceApproval}
          agentName={selectedAgent?.name ?? 'Agent'}
          onDecision={(decision) => {
            setPendingWorkspaceApproval(null)
            const resolve = workspaceApprovalResolver.current
            workspaceApprovalResolver.current = null
            resolve?.(decision)
          }}
        />
      )}
      {pendingApproval && (
        <ChatApprovalDialog
          key={pendingApproval.id}
          action={pendingApproval}
          agentName={pendingApproval.agent || selectedAgent?.name || 'Unknown agent'}
          skill={pendingApprovalSkill}
          windows={pendingWindows}
          onDecision={(decision) => approvalResolver.current?.(decision)}
          onEmergencyStop={() => void emergencyStopDesktop(runnerURL, runnerToken).catch(() => undefined)}
        />
      )}
    </Main>
  )
}

export default AIAssistant
