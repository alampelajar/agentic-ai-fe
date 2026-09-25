import { useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Download,
  FileArchive,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { addTaskMessage, createTask, getTask, getTaskMessages, updateTask } from '@/features/tasks/data/api'
import { Main } from '@/components/layout/main'
import { PageLoading } from '@/components/layout/page-loading'
import {
  AgentSelector,
  type Agent,
  type AgentModel,
} from './components/agent-selector'

const API_URL = 'http://localhost:8080'


const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]

// ============================================================
// TYPES
// ============================================================

type GeneratedFile = {
  id: number
  name: string
  size: number
  blobUrl: string
}

type Message = {
  id: number
  role: 'user' | 'agent'
  content: string
  file?: GeneratedFile

  // Informasi model yang digunakan
  model?: string
  modelId?: number
  provider?: string
}

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

type WorkflowStep = 'goal' | 'planning' | 'coding' | 'testing' | 'done'

const workflowSteps: WorkflowStep[] = [
  'goal',
  'planning',
  'coding',
  'testing',
  'done',
]

// ============================================================
// HELPERS
// ============================================================

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// ============================================================
// COMPONENT
// ============================================================

export function AIAssistant() {
  const { t } = useTranslation()
  const accessToken = useAuthStore((state) => state.auth.accessToken)

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

  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null)

  const [progress, setProgress] = useState(0)

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

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
          }))
        )

        // ========================================================
        // 3. LOAD AGENT + MODEL YANG DIGUNAKAN TASK
        // ========================================================

        if (task.agent_id) {
          try {
            const agentResponse = await fetch(
              `${API_URL}/api/agents/${task.agent_id}`,
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
      model_id: selectedModel?.id ?? null,
    })

    const id = String(created.id)
    setCurrentTaskId(id)
    setTaskTitle(created.title)
    return id
  }

  const persistMessage = async (taskId: string, role: 'user' | 'assistant', content: string, options?: { model?: string; modelId?: number; provider?: string }) => {
    await addTaskMessage(taskId, {
      role,
      content,
      model: options?.model ?? '',
      model_id: options?.modelId ?? null,
      provider: options?.provider ?? '',
    })
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
    setMessage('')
    setSelectedFiles([])

    setCurrentStep(null)
    setProgress(0)

    setCurrentTaskId(null)
    setTaskTitle('')

  }

  // ============================================================
  // SELECT FILES
  // ============================================================

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    const valid: File[] = []

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        continue
      }

      valid.push(file)
    }

    setSelectedFiles((current) => [...current, ...valid])

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
    const response = await fetch(`${API_URL}/api/agent/plan`, {
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

    files.forEach((file) => formData.append('images', file))

    const headers: HeadersInit = {}
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`

    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: formData,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data?.error || data?.message || t('agentic.errors.chatFailed'))
    }

    if (!data?.message) {
      throw new Error(t('agentic.errors.emptyResponse'))
    }

    return {
      message: String(data.message),

      // UI memakai nama model yang dipilih user.
      // Backend/provider tetap menggunakan model_id API.
      model: String(
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

  // ============================================================
  // GENERATOR WEBSITE
  // ============================================================

  const sendGenerator = async (text: string, agent: Agent, files: File[]) => {
    setTaskTitle(text)

    // --------------------------------------------------------
    // GOAL
    // --------------------------------------------------------

    setCurrentStep('goal')
    setProgress(20)

    const formData = new FormData()

    formData.append('prompt', text)

    // --------------------------------------------------------
    // AGENT
    // --------------------------------------------------------

    formData.append('agent_id', String(agent.id))

    // --------------------------------------------------------
    // MODEL
    // --------------------------------------------------------

    if (selectedModel?.id) {
      formData.append('model_id', String(selectedModel.id))
    }

    // --------------------------------------------------------
    // IMAGES
    // --------------------------------------------------------

    files.forEach((file) => {
      formData.append('images', file)
    })

    const headers: HeadersInit = {}

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    // --------------------------------------------------------
    // PLANNING
    // --------------------------------------------------------

    setCurrentStep('planning')

    setProgress(35)

    const response = await fetch(`${API_URL}/api/generator/landing-page`, {
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

    setCurrentStep('coding')

    setProgress(70)

    const blob = await response.blob()

    if (blob.size === 0) {
      throw new Error(t('agentic.errors.emptyZip'))
    }

    // --------------------------------------------------------
    // TESTING
    // --------------------------------------------------------

    setCurrentStep('testing')

    setProgress(90)

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

    setCurrentStep('done')
    setProgress(100)

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

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', content: text },
    ])
    setMessage('')
    setSelectedFiles([])
    setTaskTitle((current) => current || text)
    setRunning(true)

    let taskId: string | null = null

    try {
      taskId = await ensureConversationTask(text)

      await persistMessage(taskId, 'user', text)

      const plan = await planAgent(text, history, files.length > 0)

      if (plan.intent === 'generator') {
        const generated = await sendGenerator(text, selectedAgent, files)
        const content = t('agentic.messages.websiteCreated')

        addAgentMessage(content, { file: generated })
        await persistMessage(taskId, 'assistant', content)
      } else {
        const result = await sendChat(
          text,
          files,
          history,
          selectedAgent.id,
          selectedModel.id
        )

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

      await updateTask(taskId, { status: 'done', model_id: selectedModel.id })
      window.dispatchEvent(new Event('tasks:refresh'))
    } catch (error) {
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
      setTimeout(() => {
        setCurrentStep(null)
        setProgress(0)
      }, 1000)
    }
  }

  // ============================================================
  // WORKFLOW INDEX
  // ============================================================

  const currentStepIndex =
    currentStep === null ? -1 : workflowSteps.indexOf(currentStep)

  const workflowLabels: Record<WorkflowStep, string> = {
    goal: t('agentic.workflow.goal'),
    planning: t('agentic.workflow.planning'),
    coding: t('agentic.workflow.coding'),
    testing: t('agentic.workflow.testing'),
    done: t('agentic.workflow.done'),
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return <PageLoading />
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <Main className='agentic-workspace flex min-h-0 flex-1 flex-col overflow-hidden bg-background p-0'>
      <div className='flex min-h-0 flex-1 flex-col'>
        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className='shrink-0 border-b border-border/70 bg-background'>
          <div className='mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6'>
            <div className='flex size-8 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-primary'>
              <Sparkles className='size-4' />
            </div>

            <div className='flex-1 min-w-0'>
              <div className='truncate text-sm font-medium'>{t('agentic.workspaceLabel')}</div>
              <div className='truncate text-xs text-muted-foreground'>{t('agentic.workspaceLabel')}</div>
            </div>

            <button
              type='button'
              onClick={handleNewChat}
              disabled={running}
              className='agentic-subtle-button flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors disabled:opacity-50'
            >
              <Plus className='size-4' />

              <span className='hidden sm:inline'>{t('agentic.newChat')}</span>
            </button>
          </div>
        </header>

        {/* ======================================================
            WORKFLOW PROGRESS
        ====================================================== */}

        {currentStep && (
          <div className='shrink-0 border-b border-border/70 bg-background'>
            <div className='mx-auto w-full max-w-4xl px-4 py-2.5'>
              <div className='mb-2 flex justify-between text-xs'>
                <span>{currentTaskId}</span>

                <span>{progress}%</span>
              </div>

              <div className='mb-3 h-1 overflow-hidden rounded-full bg-muted'>
                <div
                  className='h-full rounded-full bg-primary transition-all'
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className='flex justify-between'>
                {workflowSteps.map((step, index) => {
                  const done = index < currentStepIndex

                  const active = index === currentStepIndex

                  return (
                    <div key={step} className='flex items-center gap-2'>
                      <div
                        className={`flex size-7 items-center justify-center rounded-full border text-xs ${
                          done || active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : ''
                        }`}
                      >
                        {done ? <Check className='size-3' /> : index + 1}
                      </div>

                      <span className='hidden text-xs sm:block'>
                        {workflowLabels[step]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            CHAT AREA
        ====================================================== */}

        <div className='min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6'>
          <div className='mx-auto flex w-full max-w-4xl flex-col'>
            {historyLoading ? (
              <div className='flex min-h-[52vh] flex-col items-center justify-center px-4 text-center'>
                <div className='mb-5 flex size-10 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-primary'>
                  <Sparkles className='size-5 animate-pulse' />
                </div>

                <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>
                  Memuat riwayat chat...
                </h1>

                <p className='mt-2 max-w-lg text-sm text-muted-foreground'>
                  Tunggu sebentar, percakapan Task sedang dipulihkan.
                </p>
              </div>
            ) : historyError ? (
              <div className='flex min-h-[52vh] flex-col items-center justify-center px-4 text-center'>
                <div className='mb-5 flex size-10 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive'>
                  <X className='size-5' />
                </div>

                <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>
                  Gagal memuat riwayat
                </h1>

                <p className='mt-2 max-w-lg text-sm text-muted-foreground'>
                  {historyError}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className='flex min-h-[52vh] flex-col items-center justify-center px-4 text-center'>
                <div className='mb-5 flex size-10 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-primary'>
                  <Sparkles className='size-5' />
                </div>

                <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>
                  {t('agentic.questionTitle')}
                </h1>

                <p className='mt-2 max-w-lg text-sm text-muted-foreground'>
                  {t('agentic.questionDescription')}
                </p>

                {selectedAgent && selectedModel && (
                  <div className='mt-4 inline-flex rounded-md border border-border/70 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground'>
                    {selectedAgent.name}
                    {' · '}
                    {selectedModel.name}
                    {' · '}
                    {selectedModel.provider?.name}
                  </div>
                )}
              </div>
            ) : (
              <div className='flex flex-col gap-7'>
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`flex gap-3 ${
                      item.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* AI ICON */}

                    {item.role === 'agent' && (
                      <div className='flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-primary'>
                        <Sparkles className='size-4' />
                      </div>
                    )}

                    <div className='max-w-[min(80%,48rem)]'>
                      <div
                        className={`agentic-message rounded-lg border px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                          item.role === 'user'
                            ? 'agentic-message-user border-transparent'
                            : 'agentic-message-agent'
                        }`}
                      >
                        {item.content}

                        {/* ====================================
                              GENERATED ZIP
                          ==================================== */}

                        {item.file && (
                          <div className='mt-4 flex items-center gap-3 rounded-md border border-border/70 bg-background/60 p-3'>
                            <div className='flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/30 text-primary'>
                              <FileArchive className='size-5' />
                            </div>

                            <div className='min-w-0 flex-1'>
                              <p className='truncate font-medium text-foreground'>
                                {item.file.name}
                              </p>

                              <p className='text-xs text-muted-foreground'>
                                {formatFileSize(item.file.size)}
                              </p>
                            </div>

                            <a
                              href={item.file.blobUrl}
                              download={item.file.name}
                              className='flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90'
                            >
                              <Download className='size-4' />
                              {t('agentic.download')}
                            </a>
                          </div>
                        )}

                        {/* ====================================
                              MODEL INFO
                          ==================================== */}

                        {item.role === 'agent' && item.model && (
                          <div className='agentic-meta mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 text-[11px]'>
                            <span>{t('agentic.model')}:</span>

                            <span className='font-medium text-foreground'>
                              {item.model}
                            </span>

                            {item.provider && (
                              <>
                                <span>·</span>

                                <span>{item.provider}</span>
                              </>
                            )}

                            {item.modelId && item.modelId > 0 && (
                              <>
                                <span>·</span>

                                <span>ID {item.modelId}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* USER ICON */}

                    {item.role === 'user' && (
                      <div className='flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30'>
                        <User className='size-4' />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================
            INPUT
        ====================================================== */}

        <div className='shrink-0 border-t border-border/70 bg-background px-4 py-4 sm:px-6'>
          <div className='mx-auto w-full max-w-4xl'>
            {/* ==================================================
                SELECTED FILES
            ================================================== */}

            {selectedFiles.length > 0 && (
              <div className='mb-3 flex flex-wrap gap-2'>
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className='flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs'
                  >
                    <FileArchive className='size-4 text-primary' />

                    <span className='max-w-[150px] truncate'>{file.name}</span>

                    <button
                      onClick={() => handleRemoveFile(index)}
                      type='button'
                    >
                      <X className='size-3' />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ==================================================
                TEXTAREA
            ================================================== */}

            <div className='agentic-composer rounded-lg border bg-background transition-[border-color,box-shadow]'>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()

                    handleSend()
                  }
                }}
                disabled={!selectedAgent || !selectedModel || running}
                placeholder={
                  !selectedAgent
                    ? t('agentic.input.selectEmployee')
                    : !selectedModel
                      ? t('agentic.input.selectModel')
                      : running
                        ? t('agentic.input.processing')
                        : t('agentic.input.writeMessage', {
                            model: selectedModel.name,
                          })
                }
                className='min-h-[80px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm outline-none'
              />

              <div className='flex items-center justify-between px-3 pb-3'>
                {/* FILE INPUT */}

                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/png,image/jpeg,image/jpg,image/webp,image/gif'
                  multiple
                  onChange={handleSelectFiles}
                  className='hidden'
                />

                <button
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedAgent || !selectedModel || running}
                  className='flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40'
                >
                  <Paperclip className='size-4' />
                </button>

                {/* SEND */}

                <button
                  type='button'
                  onClick={handleSend}
                  disabled={
                    !selectedAgent ||
                    !selectedModel ||
                    !message.trim() ||
                    running
                  }
                  className='flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40'
                >
                  <Send className='size-4' />
                </button>
              </div>
            </div>

            {/* ==================================================
                AGENT + MODEL CONTROLS
                Deliberately placed below the composer, like modern
                agentic interfaces. Agent is the workspace context;
                model is a quick execution choice.
            ================================================== */}

            <div className='mt-2'>
              <AgentSelector
                selectedAgent={selectedAgent}
                onSelect={setSelectedAgent}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
              />
            </div>

            {/* ==================================================
                STATUS
            ================================================== */}

            <div className='mt-2 text-center text-xs text-muted-foreground'>
              {running && selectedAgent
                ? t('agentic.status.thinking', {
                    agent: selectedAgent.name,
                    model: selectedModel?.name,
                  })
                : selectedAgent && selectedModel
                  ? t('agentic.status.ready', {
                      agent: selectedAgent.name,
                      model: selectedModel.name,
                    })
                  : selectedAgent
                    ? t('agentic.status.selectModel', {
                        agent: selectedAgent.name,
                      })
                    : t('agentic.status.selectEmployee')}
            </div>
          </div>
        </div>
      </div>
    </Main>
  )
}

export default AIAssistant
