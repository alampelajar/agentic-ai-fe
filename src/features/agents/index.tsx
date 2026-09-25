import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  Cpu,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { PageLoading } from '@/components/layout/page-loading'

// ============================================================
// CONSTANT
// ============================================================

const API_URL = 'http://localhost:8080'

// ============================================================
// TYPES
// ============================================================

type AgentModel = {
  id: number
  name: string
  model_id: string
  description: string
  is_system: boolean
  is_active: boolean
  provider: {
    id: number
    name: string
    type: string
    base_url: string
    is_system: boolean
  }
}

type BackendAgent = {
  id: number
  slug: string
  name: string
  description: string
  status: string
  is_active: boolean
  tasks?: number
  completed?: number
  progress?: number
  models: AgentModel[]
}

type BackendTask = {
  id: number
  title: string
  description?: string
  status: string
  label?: string
  priority?: string
  agent_id?: number | null
  model_id?: number | null
  created_at?: string
  updated_at?: string
}

type AgentStatus = 'Running' | 'Thinking' | 'Idle' | 'Offline'

type DisplayAgent = {
  id: number
  name: string
  description: string
  type: string
  status: AgentStatus
  tasks: number
  completed: number
  progress: number
  models: AgentModel[]
}

type AddModelForm = {
  providerName: string
  providerType: string
  baseURL: string
  apiKey: string
  modelID: string
  modelName: string
  description: string
}

type EditModelForm = {
  modelID: string
  modelName: string
  description: string
}

type APIResponseData = Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readResponseData(response: Response): Promise<APIResponseData> {
  const text = await response.text()

  if (!text) return {}

  try {
    const data: unknown = JSON.parse(text)
    return isRecord(data) ? data : {}
  } catch {
    return {}
  }
}

function getResponseError(data: APIResponseData, fallback: string) {
  if (typeof data.details === 'string' && data.details) return data.details
  if (typeof data.error === 'string' && data.error) return data.error
  if (typeof data.message === 'string' && data.message) return data.message

  return fallback
}

// ============================================================
// STATUS NORMALIZER
// ============================================================

function normalizeStatus(status: string): AgentStatus {
  const value = status.toLowerCase()

  if (value === 'running' || value === 'working') {
    return 'Running'
  }

  if (value === 'thinking' || value === 'processing') {
    return 'Thinking'
  }

  if (value === 'offline' || value === 'inactive') {
    return 'Offline'
  }

  return 'Idle'
}

// ============================================================
// TYPE FROM SLUG
// ============================================================

function getAgentType(agent: BackendAgent) {
  const slug = agent.slug.toLowerCase()

  if (slug.includes('coding') || slug.includes('code')) {
    return 'Development'
  }

  if (slug.includes('testing') || slug.includes('test')) {
    return 'Testing'
  }

  if (slug.includes('review')) {
    return 'Code Review'
  }

  if (slug.includes('planning') || slug.includes('plan')) {
    return 'Planning'
  }

  if (slug.includes('debug')) {
    return 'Debugging'
  }

  return 'AI Agent'
}

// ============================================================
// CONVERTER
// ============================================================

function convertAgent(agent: BackendAgent): DisplayAgent {
  const status = normalizeStatus(agent.status)

  // Statistik task berasal langsung dari endpoint /api/agents.
  // Backend menghitungnya dari tabel `tasks`.
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    type: getAgentType(agent),
    status,
    tasks: Number(agent.tasks ?? 0),
    completed: Number(agent.completed ?? 0),
    progress: Number(agent.progress ?? 0),
    models: Array.isArray(agent.models) ? agent.models : [],
  }
}

// ============================================================
// DEFAULT FORM
// ============================================================

const emptyForm: AddModelForm = {
  providerName: '',
  providerType: 'openai-compatible',
  baseURL: '',
  apiKey: '',
  modelID: '',
  modelName: '',
  description: '',
}

// ============================================================
// PAGE
// ============================================================

export function Agents() {
  const { t } = useTranslation()

  const accessToken = useAuthStore((state) => state.auth.accessToken)

  const [agents, setAgents] = useState<DisplayAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // ==========================================================
  // ADD MODEL MODAL
  // ==========================================================

  const [addModelOpen, setAddModelOpen] = useState(false)
  const [selectedAgentForModel, setSelectedAgentForModel] =
    useState<DisplayAgent | null>(null)
  const [form, setForm] = useState<AddModelForm>(emptyForm)

  const [testingConnection, setTestingConnection] = useState(false)
  const [savingModel, setSavingModel] = useState(false)

  const [connectionSuccess, setConnectionSuccess] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState('')

  const [formError, setFormError] = useState('')

  // ==========================================================
  // MODEL MANAGEMENT
  // ==========================================================

  const [editModelOpen, setEditModelOpen] = useState(false)
  const [selectedModelForEdit, setSelectedModelForEdit] =
    useState<AgentModel | null>(null)
  const [editForm, setEditForm] = useState<EditModelForm>({
    modelID: '',
    modelName: '',
    description: '',
  })
  const [savingEditModel, setSavingEditModel] = useState(false)
  const [editModelError, setEditModelError] = useState('')

  const [removeModelOpen, setRemoveModelOpen] = useState(false)
  const [selectedModelForRemove, setSelectedModelForRemove] =
    useState<AgentModel | null>(null)
  const [selectedAgentForRemove, setSelectedAgentForRemove] =
    useState<DisplayAgent | null>(null)
  const [removingModel, setRemovingModel] = useState(false)
  const [removeModelError, setRemoveModelError] = useState('')

  const [deleteModelOpen, setDeleteModelOpen] = useState(false)
  const [selectedModelForDelete, setSelectedModelForDelete] =
    useState<AgentModel | null>(null)
  const [deletingModel, setDeletingModel] = useState(false)
  const [deleteModelError, setDeleteModelError] = useState('')

  // ============================================================
  // LOAD AGENTS
  // ============================================================

  const loadAgents = async () => {
    setLoading(true)
    setError(null)

    try {
      const headers = {
        ...(accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {}),
      }

      // Statistik task sudah dihitung oleh backend.
      // Frontend hanya membaca tasks, completed, dan progress
      // dari response /api/agents.
      const response = await fetch(`${API_URL}/api/agents`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      })

      const data = await readResponseData(response)

      if (!response.ok) {
        throw new Error(
          getResponseError(data, 'Gagal mengambil Agent.')
        )
      }

      const backendAgents: BackendAgent[] = Array.isArray(data.agents)
        ? (data.agents as BackendAgent[])
        : []

      setAgents(
        backendAgents.map((agent) => convertAgent(agent))
      )
    } catch (err) {
      setAgents([])

      setError(
        err instanceof Error ? err.message : 'Gagal mengambil Agent.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
  }, [accessToken])

  // ============================================================
  // OPEN ADD MODEL
  // ============================================================

  const openAddModel = (agent: DisplayAgent) => {
    setSelectedAgentForModel(agent)
    setForm({
      ...emptyForm,
    })

    setConnectionSuccess(false)
    setConnectionMessage('')
    setFormError('')

    setAddModelOpen(true)
  }

  // ============================================================
  // CLOSE ADD MODEL
  // ============================================================

  const closeAddModel = () => {
    if (testingConnection || savingModel) {
      return
    }

    setAddModelOpen(false)
    setSelectedAgentForModel(null)
    setForm({
      ...emptyForm,
    })

    setConnectionSuccess(false)
    setConnectionMessage('')
    setFormError('')
  }

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const updateForm = <K extends keyof AddModelForm>(
    key: K,
    value: AddModelForm[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))

    setConnectionSuccess(false)
    setConnectionMessage('')
    setFormError('')
  }

  // ============================================================
  // TEST CONNECTION
  // ============================================================

  const handleTestConnection = async () => {
    setFormError('')
    setConnectionSuccess(false)
    setConnectionMessage('')

    if (!form.providerName.trim()) {
      setFormError('Nama provider wajib diisi.')
      return
    }

    if (!form.providerType.trim()) {
      setFormError('Tipe provider wajib diisi.')
      return
    }

    if (!form.baseURL.trim()) {
      setFormError('Base URL wajib diisi.')
      return
    }

    if (!form.apiKey.trim()) {
      setFormError('API Key wajib diisi.')
      return
    }

    if (!form.modelID.trim()) {
      setFormError('Model ID wajib diisi.')
      return
    }

    setTestingConnection(true)

    try {
      const response = await fetch(`${API_URL}/api/ai/providers/test`, {
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
          name: form.providerName.trim(),
          type: form.providerType,
          base_url: form.baseURL.trim(),
          api_key: form.apiKey.trim(),
          model_id: form.modelID.trim(),
        }),
      })

      const data = await readResponseData(response)

      if (!response.ok) {
        throw new Error(getResponseError(data, 'Connection ke provider gagal.'))
      }

      setConnectionSuccess(true)
      setConnectionMessage(
        typeof data.message === 'string' ? data.message : 'Connection berhasil.'
      )
    } catch (err) {
      setConnectionSuccess(false)

      setFormError(
        err instanceof Error ? err.message : 'Gagal melakukan Test Connection.'
      )
    } finally {
      setTestingConnection(false)
    }
  }

  // ============================================================
  // SAVE MODEL
  // ============================================================

  const handleSaveModel = async () => {
    setFormError('')

    if (!selectedAgentForModel) {
      setFormError('Agent belum dipilih.')
      return
    }

    if (!form.providerName.trim()) {
      setFormError('Nama provider wajib diisi.')
      return
    }

    if (!form.providerType.trim()) {
      setFormError('Tipe provider wajib diisi.')
      return
    }

    if (!form.baseURL.trim()) {
      setFormError('Base URL wajib diisi.')
      return
    }

    if (!form.apiKey.trim()) {
      setFormError('API Key wajib diisi.')
      return
    }

    if (!form.modelID.trim()) {
      setFormError('Model ID wajib diisi.')
      return
    }

    if (!form.modelName.trim()) {
      setFormError('Nama model wajib diisi.')
      return
    }

    setSavingModel(true)

    try {
      const modelResponse = await fetch(`${API_URL}/api/ai/models`, {
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
          provider_id: 0,
          provider_name: form.providerName.trim(),
          provider_type: form.providerType.trim(),
          base_url: form.baseURL.trim(),
          api_key: form.apiKey.trim(),
          name: form.modelName.trim(),
          model_id: form.modelID.trim(),
          description: form.description.trim(),
          agent_ids: [selectedAgentForModel.id],
        }),
      })

      const modelData = await readResponseData(modelResponse)

      if (!modelResponse.ok) {
        throw new Error(
          getResponseError(modelData, 'Gagal menyimpan model AI.')
        )
      }

      // ========================================================
      // STEP 3: REFRESH AGENTS
      // ========================================================

      await loadAgents()

      // ========================================================
      // SUCCESS
      // ========================================================

      setAddModelOpen(false)
      setSelectedAgentForModel(null)
        setForm({
        ...emptyForm,
      })

      setConnectionSuccess(false)
      setConnectionMessage('')
      setFormError('')
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan model AI.'
      )
    } finally {
      setSavingModel(false)
    }
  }

  // ============================================================
  // OPEN EDIT MODEL
  // ============================================================

  const openEditModel = (model: AgentModel) => {
    setSelectedModelForEdit(model)
    setEditForm({
      modelID: model.model_id,
      modelName: model.name,
      description: model.description || '',
    })
    setEditModelError('')
    setEditModelOpen(true)
  }

  // ============================================================
  // CLOSE EDIT MODEL
  // ============================================================

  const closeEditModel = () => {
    if (savingEditModel) return

    setEditModelOpen(false)
    setSelectedModelForEdit(null)
    setEditForm({
      modelID: '',
      modelName: '',
      description: '',
    })
    setEditModelError('')
  }

  // ============================================================
  // SAVE EDIT MODEL
  // ============================================================

  const handleSaveEditModel = async () => {
    setEditModelError('')

    if (!selectedModelForEdit) {
      setEditModelError('Model belum dipilih.')
      return
    }

    if (!editForm.modelID.trim()) {
      setEditModelError('Model ID wajib diisi.')
      return
    }

    if (!editForm.modelName.trim()) {
      setEditModelError('Nama model wajib diisi.')
      return
    }

    setSavingEditModel(true)

    try {
      const response = await fetch(
        `${API_URL}/api/ai/models/${selectedModelForEdit.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken
              ? {
                  Authorization: `Bearer ${accessToken}`,
                }
              : {}),
          },
          body: JSON.stringify({
            name: editForm.modelName.trim(),
            model_id: editForm.modelID.trim(),
            description: editForm.description.trim(),
          }),
        }
      )

      const data = await readResponseData(response)

      if (!response.ok) {
        throw new Error(getResponseError(data, 'Gagal memperbarui model.'))
      }

      await loadAgents()
      closeEditModel()
    } catch (err) {
      setEditModelError(
        err instanceof Error ? err.message : 'Gagal memperbarui model.'
      )
    } finally {
      setSavingEditModel(false)
    }
  }

  // ============================================================
  // OPEN REMOVE MODEL
  // ============================================================

  const openRemoveModel = (agent: DisplayAgent, model: AgentModel) => {
    if (model.is_system) return

    setSelectedAgentForRemove(agent)
    setSelectedModelForRemove(model)
    setRemoveModelError('')
    setRemoveModelOpen(true)
  }

  // ============================================================
  // CLOSE REMOVE MODEL
  // ============================================================

  const closeRemoveModel = () => {
    if (removingModel) return

    setRemoveModelOpen(false)
    setSelectedAgentForRemove(null)
    setSelectedModelForRemove(null)
    setRemoveModelError('')
  }

  // ============================================================
  // REMOVE MODEL FROM AGENT
  // ============================================================

  const handleRemoveModel = async () => {
    if (!selectedAgentForRemove || !selectedModelForRemove) {
      setRemoveModelError('Agent atau model belum dipilih.')
      return
    }

    setRemoveModelError('')
    setRemovingModel(true)

    try {
      const response = await fetch(
        `${API_URL}/api/ai/models/${selectedModelForRemove.id}/agents`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken
              ? {
                  Authorization: `Bearer ${accessToken}`,
                }
              : {}),
          },
          body: JSON.stringify({
            agent_id: selectedAgentForRemove.id,
          }),
        }
      )

      const data = await readResponseData(response)

      if (!response.ok) {
        throw new Error(
          getResponseError(data, 'Gagal melepas model dari Agent.')
        )
      }

      await loadAgents()
      closeRemoveModel()
    } catch (err) {
      setRemoveModelError(
        err instanceof Error ? err.message : 'Gagal melepas model dari Agent.'
      )
    } finally {
      setRemovingModel(false)
    }
  }

  // ============================================================
  // OPEN DELETE MODEL
  // ============================================================

  const openDeleteModel = (model: AgentModel) => {
    if (model.is_system) return

    setSelectedModelForDelete(model)
    setDeleteModelError('')
    setDeleteModelOpen(true)
  }

  // ============================================================
  // CLOSE DELETE MODEL
  // ============================================================

  const closeDeleteModel = () => {
    if (deletingModel) return

    setDeleteModelOpen(false)
    setSelectedModelForDelete(null)
    setDeleteModelError('')
  }

  // ============================================================
  // DELETE MODEL PERMANENTLY
  // ============================================================

  const handleDeleteModel = async () => {
    if (!selectedModelForDelete) {
      setDeleteModelError('Model belum dipilih.')
      return
    }

    setDeleteModelError('')
    setDeletingModel(true)

    try {
      const response = await fetch(
        `${API_URL}/api/ai/models/${selectedModelForDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            ...(accessToken
              ? {
                  Authorization: `Bearer ${accessToken}`,
                }
              : {}),
          },
        }
      )

      const data = await readResponseData(response)

      if (!response.ok) {
        throw new Error(getResponseError(data, 'Gagal menghapus model.'))
      }

      await loadAgents()
      closeDeleteModel()
    } catch (err) {
      setDeleteModelError(
        err instanceof Error ? err.message : 'Gagal menghapus model.'
      )
    } finally {
      setDeletingModel(false)
    }
  }

  // ============================================================
  // FILTER
  // ============================================================

  const filteredAgents = useMemo(() => {
    const value = search.toLowerCase()

    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(value) ||
        agent.description.toLowerCase().includes(value) ||
        agent.type.toLowerCase().includes(value)

      const matchesStatus =
        statusFilter === 'all' || agent.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [agents, search, statusFilter])

  // ============================================================
  // STATISTICS
  // ============================================================

  const totalAgents = agents.length

  const runningAgents = agents.filter(
    (agent) => agent.status === 'Running'
  ).length

  const thinkingAgents = agents.filter(
    (agent) => agent.status === 'Thinking'
  ).length

  const totalModels = agents.reduce(
    (total, agent) => total + agent.models.length,
    0
  )

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return <PageLoading />
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <>
      <Main>
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className='relative mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-500/10 via-blue-500/5 to-cyan-500/10 p-6 md:p-8'>
          <div className='pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-violet-500/10 blur-3xl' />

          <div className='pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-blue-500/10 blur-3xl' />

          <div className='relative flex flex-col justify-between gap-6 md:flex-row md:items-center'>
            <div>
              <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400'>
                <Sparkles className='size-3.5' />
                Agentic AI
              </div>

              <h1 className='text-3xl font-bold tracking-tight'>
                {t('agentPage.title')}
              </h1>

              <p className='mt-2 max-w-2xl text-muted-foreground'>
                {t('agentPage.subtitle')}
              </p>
            </div>

            <Button
              asChild
              className='shrink-0 bg-gradient-to-r from-violet-600 to-blue-600 shadow-lg shadow-violet-500/20 transition-all hover:from-violet-700 hover:to-blue-700'
            >
              <Link to='/ai/agents/create'>
                <Plus className='me-2 size-4' />
                {t('agentPage.create')}
              </Link>
            </Button>
          </div>
        </div>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <Card className='mb-6 border-destructive/30'>
            <CardContent className='flex items-center justify-between gap-4 p-4'>
              <div>
                <p className='font-medium text-destructive'>
                  Gagal memuat Agent
                </p>

                <p className='mt-1 text-sm text-muted-foreground'>{error}</p>
              </div>

              <Button variant='outline' onClick={loadAgents}>
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ======================================================
            STATISTICS
        ====================================================== */}

        <div className='mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <AgentStat
            title={t('agentPage.total')}
            value={totalAgents}
            description={t('agentPage.totalDescription')}
            icon={Bot}
            color='violet'
          />

          <AgentStat
            title={t('agentPage.running')}
            value={runningAgents}
            description={t('agentPage.runningDescription')}
            icon={Zap}
            color='emerald'
          />

          <AgentStat
            title={t('agentPage.thinking')}
            value={thinkingAgents}
            description={t('agentPage.thinkingDescription')}
            icon={Activity}
            color='amber'
          />

          <AgentStat
            title={t('agentPage.availableModelsStat')}
            value={totalModels}
            description={t('agentPage.availableModelsDescription')}
            icon={Cpu}
            color='blue'
          />
        </div>

        {/* ======================================================
            SEARCH
        ====================================================== */}

        <Card className='mb-6 overflow-hidden'>
          <CardContent className='p-4'>
            <div className='flex flex-col gap-3 md:flex-row'>
              <div className='relative flex-1'>
                <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />

                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('agentPage.search')}
                  className='border-muted bg-muted/20 pl-9'
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-full border-muted bg-muted/20 md:w-[180px]'>
                  <Filter className='me-2 size-4 text-muted-foreground' />

                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value='all'>
                    {t('agentPage.allStatus')}
                  </SelectItem>

                  <SelectItem value='Running'>
                    {t('agentPage.running')}
                  </SelectItem>

                  <SelectItem value='Thinking'>
                    {t('agentPage.thinking')}
                  </SelectItem>

                  <SelectItem value='Idle'>{t('agentPage.idle')}</SelectItem>

                  <SelectItem value='Offline'>
                    {t('agentPage.offline')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ======================================================
            AGENT CARDS
        ====================================================== */}

        {filteredAgents.length > 0 ? (
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onAddModel={openAddModel}
                onEditModel={openEditModel}
                onRemoveModel={openRemoveModel}
                onDeleteModel={openDeleteModel}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-16 text-center'>
              <div className='mb-4 flex size-12 items-center justify-center rounded-xl bg-muted'>
                <Search className='size-5 text-muted-foreground' />
              </div>

              <h3 className='font-medium'>
                {error ? 'Tidak dapat memuat Agent' : t('agentPage.noAgents')}
              </h3>

              <p className='mt-1 text-sm text-muted-foreground'>
                {error
                  ? 'Periksa koneksi backend.'
                  : t('agentPage.noAgentsDescription')}
              </p>
            </CardContent>
          </Card>
        )}
      </Main>

      {/* ========================================================
          ADD MODEL DIALOG
      ======================================================== */}

      {addModelOpen && selectedAgentForModel && (
        <div
          className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddModel()
            }
          }}
        >
          <div className='flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl'>
            {/* HEADER */}

            <div className='flex items-center justify-between border-b px-6 py-5'>
              <div>
                <div className='flex items-center gap-2'>
                  <div className='flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                    <Cpu className='size-4' />
                  </div>

                  <div>
                    <h2 className='text-lg font-semibold'>{t('agentPage.addModel.title')}</h2>

                    <p className='text-xs text-muted-foreground'>
                      Untuk Agent: {selectedAgentForModel.name}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant='ghost'
                size='icon'
                onClick={closeAddModel}
                disabled={testingConnection || savingModel}
              >
                <X className='size-4' />
              </Button>
            </div>

            {/* BODY */}

            <div className='overflow-y-auto p-6'>
              <div className='space-y-5'>
                {/* CUSTOM PROVIDER */}
                <div className='grid gap-5 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>Nama Provider</label>
                    <Input
                      value={form.providerName}
                      onChange={(event) =>
                        updateForm('providerName', event.target.value)
                      }
                      placeholder='Contoh: My AI Provider'
                      autoComplete='off'
                      disabled={testingConnection || savingModel}
                    />
                  </div>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>Tipe Provider</label>
                    <Input
                      value={form.providerType}
                      onChange={(event) =>
                        updateForm('providerType', event.target.value)
                      }
                      placeholder='Contoh: openai-compatible'
                      autoComplete='off'
                      disabled={testingConnection || savingModel}
                    />
                  </div>
                </div>

                {/* CUSTOM BASE URL */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Base URL</label>
                  <Input
                    type='url'
                    value={form.baseURL}
                    onChange={(event) =>
                      updateForm('baseURL', event.target.value)
                    }
                    placeholder='https://your-provider.com/v1'
                    autoComplete='url'
                    disabled={testingConnection || savingModel}
                  />
                  <p className='text-xs text-muted-foreground'>
                    Masukkan URL API provider sendiri. URL ini digunakan untuk
                    Test Connection dan proses penyimpanan model.
                  </p>
                </div>

                {/* API KEY */}

                <div className='space-y-2'>
                  <label className='text-sm font-medium'>{t('agentPage.addModel.apiKey')}</label>

                  <Input
                    type='password'
                    value={form.apiKey}
                    onChange={(event) =>
                      updateForm('apiKey', event.target.value)
                    }
                    placeholder='Masukkan API key'
                    autoComplete='new-password'
                    disabled={testingConnection || savingModel}
                  />

                  <p className='text-[11px] text-muted-foreground'>
                    API key hanya digunakan untuk test dan proses penyimpanan.
                    Tidak disimpan di localStorage.
                  </p>
                </div>

                {/* MODEL ID */}

                <div className='grid gap-5 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>{t('agentPage.addModel.modelId')}</label>

                    <Input
                      value={form.modelID}
                      onChange={(event) =>
                        updateForm('modelID', event.target.value)
                      }
                      placeholder='Contoh: gpt-4o-mini'
                      disabled={testingConnection || savingModel}
                    />
                  </div>

                  {/* MODEL NAME */}

                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>{t('agentPage.addModel.modelName')}</label>

                    <Input
                      value={form.modelName}
                      onChange={(event) =>
                        updateForm('modelName', event.target.value)
                      }
                      placeholder='Contoh: GPT-4o Mini'
                      disabled={testingConnection || savingModel}
                    />
                  </div>
                </div>

                {/* DESCRIPTION */}

                <div className='space-y-2'>
                  <label className='text-sm font-medium'>{t('agentPage.addModel.description')}</label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm('description', event.target.value)
                    }
                    rows={3}
                    placeholder='Deskripsi model...'
                    disabled={testingConnection || savingModel}
                    className='flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                  />
                </div>

                {/* TARGET AGENT */}

                <div className='rounded-xl border bg-muted/20 p-4'>
                  <div className='flex items-center gap-3'>
                    <div className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                      <Bot className='size-4' />
                    </div>

                    <div className='min-w-0'>
                      <p className='text-xs text-muted-foreground'>
                        Model akan ditambahkan ke
                      </p>

                      <p className='truncate text-sm font-semibold'>
                        {selectedAgentForModel.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SUCCESS */}

                {connectionSuccess && (
                  <div className='flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4'>
                    <div className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white'>
                      <Check className='size-4' />
                    </div>

                    <div>
                      <p className='text-sm font-medium text-emerald-700 dark:text-emerald-400'>
                        Connection berhasil
                      </p>

                      <p className='mt-1 text-xs text-muted-foreground'>
                        {connectionMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* ERROR */}

                {formError && (
                  <div className='flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4'>
                    <div className='text-destructive-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive'>
                      <X className='size-4' />
                    </div>

                    <div>
                      <p className='text-sm font-medium text-destructive'>
                        Gagal
                      </p>

                      <p className='mt-1 text-xs text-muted-foreground'>
                        {formError}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER */}

            <div className='flex flex-col-reverse gap-2 border-t bg-muted/10 p-4 sm:flex-row sm:justify-end'>
              <Button
                variant='outline'
                onClick={closeAddModel}
                disabled={testingConnection || savingModel}
              >
                Batal
              </Button>

              <Button
                variant='outline'
                onClick={handleTestConnection}
                disabled={testingConnection || savingModel}
              >
                {testingConnection ? (
                  <>
                    <Loader2 className='me-2 size-4 animate-spin' />
                    Testing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='me-2 size-4' />
                    Test Connection
                  </>
                )}
              </Button>

              <Button
                onClick={handleSaveModel}
                disabled={testingConnection || savingModel}
              >
                {savingModel ? (
                  <>
                    <Loader2 className='me-2 size-4 animate-spin' />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className='me-2 size-4' />
                    Simpan Model
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT MODEL DIALOG
      ======================================================== */}

      {editModelOpen && selectedModelForEdit && (
        <div
          className='fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditModel()
            }
          }}
        >
          <div className='w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-background shadow-2xl'>
            <div className='flex items-center justify-between border-b px-6 py-5'>
              <div>
                <h2 className='text-lg font-semibold'>{t('agentPage.editModel.title')}</h2>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Perbarui konfigurasi model yang dipilih.
                </p>
              </div>

              <Button
                variant='ghost'
                size='icon'
                onClick={closeEditModel}
                disabled={savingEditModel}
              >
                <X className='size-4' />
              </Button>
            </div>

            <div className='space-y-5 p-6'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>{t('agentPage.addModel.modelId')}</label>

                <Input
                  value={editForm.modelID}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      modelID: event.target.value,
                    }))
                  }
                  placeholder='Contoh: openrouter/free'
                  disabled={savingEditModel}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>{t('agentPage.addModel.modelName')}</label>

                <Input
                  value={editForm.modelName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      modelName: event.target.value,
                    }))
                  }
                  placeholder='Contoh: Gemini 2.5 Flash'
                  disabled={savingEditModel}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>{t('agentPage.addModel.description')}</label>

                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder='Deskripsi model...'
                  disabled={savingEditModel}
                  className='flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                />
              </div>

              <div className='rounded-xl border bg-muted/20 p-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                    <Server className='size-4' />
                  </div>

                  <div className='min-w-0'>
                    <p className='text-xs text-muted-foreground'>{t('agentPage.addModel.provider')}</p>

                    <p className='truncate text-sm font-semibold'>
                      {selectedModelForEdit.provider?.name || 'Provider'}
                    </p>
                  </div>
                </div>

                <p className='mt-3 text-[11px] text-muted-foreground'>
                  Provider tidak diubah dari menu edit model.
                </p>
              </div>

              {editModelError && (
                <div className='rounded-xl border border-destructive/20 bg-destructive/10 p-4'>
                  <p className='text-sm font-medium text-destructive'>{t('agentPage.addModel.failed')}</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {editModelError}
                  </p>
                </div>
              )}
            </div>

            <div className='flex flex-col-reverse gap-2 border-t bg-muted/10 p-4 sm:flex-row sm:justify-end'>
              <Button
                variant='outline'
                onClick={closeEditModel}
                disabled={savingEditModel}
              >
                Batal
              </Button>

              <Button onClick={handleSaveEditModel} disabled={savingEditModel}>
                {savingEditModel ? (
                  <>
                    <Loader2 className='me-2 size-4 animate-spin' />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className='me-2 size-4' />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          REMOVE MODEL FROM AGENT DIALOG
      ======================================================== */}

      {removeModelOpen && selectedModelForRemove && selectedAgentForRemove && (
        <div
          className='fixed inset-0 z-[115] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRemoveModel()
            }
          }}
        >
          <div className='w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl'>
            <div className='border-b px-6 py-5'>
              <h2 className='text-lg font-semibold'>{t('agentPage.removeModel.title')}</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Model hanya akan dilepas dari Agent ini.
              </p>
            </div>

            <div className='space-y-4 p-6'>
              <div className='rounded-xl border bg-muted/20 p-4'>
                <p className='text-xs text-muted-foreground'>{t('agentPage.modelLabel')}</p>
                <p className='mt-1 font-medium'>
                  {selectedModelForRemove.name}
                </p>

                <p className='mt-3 text-xs text-muted-foreground'>{t('agentPage.agentId')}</p>
                <p className='mt-1 font-medium'>
                  {selectedAgentForRemove.name}
                </p>
              </div>

              <p className='text-sm text-muted-foreground'>
                Agent lain yang menggunakan model ini tidak akan terpengaruh.
              </p>

              {removeModelError && (
                <div className='rounded-xl border border-destructive/20 bg-destructive/10 p-4'>
                  <p className='text-sm font-medium text-destructive'>{t('agentPage.addModel.failed')}</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {removeModelError}
                  </p>
                </div>
              )}
            </div>

            <div className='flex flex-col-reverse gap-2 border-t bg-muted/10 p-4 sm:flex-row sm:justify-end'>
              <Button
                variant='outline'
                onClick={closeRemoveModel}
                disabled={removingModel}
              >
                Batal
              </Button>

              <Button
                variant='destructive'
                onClick={handleRemoveModel}
                disabled={removingModel}
              >
                {removingModel ? (
                  <>
                    <Loader2 className='me-2 size-4 animate-spin' />
                    Melepas...
                  </>
                ) : (
                  'Lepas dari Agent'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE MODEL DIALOG
      ======================================================== */}

      {deleteModelOpen && selectedModelForDelete && (
        <div
          className='fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModel()
            }
          }}
        >
          <div className='w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl'>
            <div className='border-b px-6 py-5'>
              <h2 className='text-lg font-semibold'>{t('agentPage.deleteModel.title')}</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Model akan dihapus secara permanen.
              </p>
            </div>

            <div className='space-y-4 p-6'>
              <div className='rounded-xl border border-destructive/20 bg-destructive/5 p-4'>
                <p className='text-xs text-muted-foreground'>{t('agentPage.modelLabel')}</p>
                <p className='mt-1 font-semibold'>
                  {selectedModelForDelete.name}
                </p>

                <p className='mt-2 text-xs text-muted-foreground'>
                  {selectedModelForDelete.model_id}
                </p>
              </div>

              <p className='text-sm text-muted-foreground'>
                Tindakan ini akan menghapus model dan seluruh relasinya dengan
                Agent lain. Tindakan ini tidak dapat dibatalkan.
              </p>

              {deleteModelError && (
                <div className='rounded-xl border border-destructive/20 bg-destructive/10 p-4'>
                  <p className='text-sm font-medium text-destructive'>{t('agentPage.addModel.failed')}</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {deleteModelError}
                  </p>
                </div>
              )}
            </div>

            <div className='flex flex-col-reverse gap-2 border-t bg-muted/10 p-4 sm:flex-row sm:justify-end'>
              <Button
                variant='outline'
                onClick={closeDeleteModel}
                disabled={deletingModel}
              >
                Batal
              </Button>

              <Button
                variant='destructive'
                onClick={handleDeleteModel}
                disabled={deletingModel}
              >
                {deletingModel ? (
                  <>
                    <Loader2 className='me-2 size-4 animate-spin' />
                    Menghapus...
                  </>
                ) : (
                  'Hapus Model'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// AGENT CARD
// ============================================================

function AgentCard({
  agent,
  onAddModel,
  onEditModel,
  onRemoveModel,
  onDeleteModel,
}: {
  agent: DisplayAgent
  onAddModel: (agent: DisplayAgent) => void
  onEditModel: (model: AgentModel) => void
  onRemoveModel: (agent: DisplayAgent, model: AgentModel) => void
  onDeleteModel: (model: AgentModel) => void
}) {
  const { t } = useTranslation()

  const statusStyles: Record<
    AgentStatus,
    {
      badge: string
      icon: string
      progress: string
    }
  > = {
    Running: {
      badge:
        'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      icon: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      progress: '[&>div]:bg-emerald-500',
    },

    Thinking: {
      badge:
        'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      icon: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      progress: '[&>div]:bg-amber-500',
    },

    Idle: {
      badge:
        'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400',
      icon: 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400',
      progress: '[&>div]:bg-slate-400',
    },

    Offline: {
      badge: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
      icon: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
      progress: '[&>div]:bg-red-500',
    },
  }

  const status = statusStyles[agent.status]

  const [openModelMenu, setOpenModelMenu] = useState<number | null>(null)

  return (
    <Card className='group overflow-hidden border-border/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg'>
      {/* ACCENT */}

      <div
        className={`h-1 w-full ${
          agent.status === 'Running'
            ? 'bg-emerald-500'
            : agent.status === 'Thinking'
              ? 'bg-amber-500'
              : agent.status === 'Offline'
                ? 'bg-red-500'
                : 'bg-slate-400'
        }`}
      />

      <CardHeader>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105 ${status.icon}`}
            >
              <Bot className='size-5' />
            </div>

            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <CardTitle className='truncate text-base'>
                  {agent.name}
                </CardTitle>

                <Badge
                  variant='outline'
                  className={`shrink-0 text-[10px] ${status.badge}`}
                >
                  {t(`status.${agent.status.toLowerCase()}`)}
                </Badge>
              </div>

              <p className='mt-1 text-xs text-muted-foreground'>{agent.type}</p>
            </div>
          </div>

          <Button
            variant='ghost'
            size='icon'
            className='shrink-0 text-muted-foreground'
          >
            <MoreHorizontal className='size-4' />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <CardDescription className='min-h-[40px] leading-5'>
          {agent.description}
        </CardDescription>

        {/* MODELS */}

        <div className='mt-4 rounded-xl border bg-muted/20 p-3'>
          <div className='mb-3 flex items-center gap-2'>
            <Cpu className='size-4 text-primary' />

            <span className='text-xs font-medium'>{t('agentPage.models')}</span>

            <span className='ml-auto text-xs text-muted-foreground'>
              {agent.models.length}
            </span>
          </div>

          {agent.models.length > 0 ? (
            <div className='space-y-1.5'>
              {agent.models.map((model) => (
                <div
                  key={model.id}
                  className='relative flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50'
                >
                  <span className='size-1.5 shrink-0 rounded-full bg-emerald-500' />

                  <span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>
                    {model.name}
                  </span>

                  <span className='hidden max-w-[100px] truncate text-[9px] text-muted-foreground sm:inline'>
                    {model.provider?.name}
                  </span>

                  {model.is_system && (
                    <span className='text-[9px] text-primary'>{t('agentPage.system')}</span>
                  )}

                  {!model.is_system && (
                    <div className='relative shrink-0'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='size-7 text-muted-foreground'
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenModelMenu((current) =>
                            current === model.id ? null : model.id
                          )
                        }}
                        aria-label={`Menu ${model.name}`}
                      >
                        <MoreHorizontal className='size-3.5' />
                      </Button>

                      {openModelMenu === model.id && (
                        <>
                          <button
                            type='button'
                            className='fixed inset-0 z-40 cursor-default'
                            aria-label='Tutup menu'
                            onClick={() => setOpenModelMenu(null)}
                          />

                          <div className='absolute top-8 right-0 z-50 w-44 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg'>
                            <button
                              type='button'
                              className='flex w-full items-center rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-muted'
                              onClick={() => {
                                setOpenModelMenu(null)
                                onEditModel(model)
                              }}
                            >
                              Edit Model
                            </button>

                            <button
                              type='button'
                              className='flex w-full items-center rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-muted'
                              onClick={() => {
                                setOpenModelMenu(null)
                                onRemoveModel(agent, model)
                              }}
                            >
                              Lepas dari Agent
                            </button>

                            <div className='my-1 h-px bg-border' />

                            <button
                              type='button'
                              className='flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-destructive transition-colors hover:bg-destructive/10'
                              onClick={() => {
                                setOpenModelMenu(null)
                                onDeleteModel(model)
                              }}
                            >
                              Hapus Model
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className='text-xs text-muted-foreground'>{t('agentPage.noModels')}</p>
          )}

          {/* ADD MODEL BUTTON */}

          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-3 w-full border-dashed'
            onClick={() => onAddModel(agent)}
          >
            <Plus className='me-2 size-3.5' />
            Tambah Model
          </Button>
        </div>

        {/* PROGRESS */}

        <div className='mt-5 space-y-3'>
          <div className='flex items-center justify-between text-xs'>
            <span className='text-muted-foreground'>
              {t('agentPage.currentProgress')}
            </span>

            <span className='font-semibold'>{agent.progress}%</span>
          </div>

          <Progress
            value={agent.progress}
            className={`h-2 bg-muted ${status.progress}`}
          />
        </div>

        {/* TASK */}

        <div className='mt-5 grid grid-cols-2 gap-3'>
          <div className='rounded-xl border border-blue-500/10 bg-blue-500/5 p-3'>
            <p className='text-xs text-muted-foreground'>
              {t('agentPage.activeTasks')}
            </p>

            <p className='mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400'>
              {agent.tasks}
            </p>
          </div>

          <div className='rounded-xl border border-violet-500/10 bg-violet-500/5 p-3'>
            <p className='text-xs text-muted-foreground'>
              {t('agentPage.completed')}
            </p>

            <p className='mt-1 text-lg font-semibold text-violet-600 dark:text-violet-400'>
              {agent.completed}
            </p>
          </div>
        </div>

        {/* FOOTER */}

        <div className='mt-5 flex items-center justify-between'>
          <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <Clock3 className='size-3.5' />
            {t('agentPage.agentId')}: {agent.id}
          </span>

          <Button
            variant='ghost'
            size='sm'
            asChild
            className='text-primary hover:bg-primary/10'
          >
            <Link to='/ai/agents/detail'>
              {t('agentPage.viewDetails')}

              <ArrowUpRight className='ms-1 size-3.5' />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// STAT CARD
// ============================================================

function AgentStat({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  description: string
  icon: React.ElementType
  color: 'violet' | 'emerald' | 'amber' | 'blue'
}) {
  const styles = {
    violet: {
      wrapper: 'border-violet-500/20 bg-violet-500/5',
      icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      value: 'text-violet-600 dark:text-violet-400',
    },

    emerald: {
      wrapper: 'border-emerald-500/20 bg-emerald-500/5',
      icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      value: 'text-emerald-600 dark:text-emerald-400',
    },

    amber: {
      wrapper: 'border-amber-500/20 bg-amber-500/5',
      icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      value: 'text-amber-600 dark:text-amber-400',
    },

    blue: {
      wrapper: 'border-blue-500/20 bg-blue-500/5',
      icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      value: 'text-blue-600 dark:text-blue-400',
    },
  }

  const style = styles[color]

  return (
    <Card
      className={`overflow-hidden border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${style.wrapper} `}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>

        <div
          className={`flex size-9 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon className='size-4' />
        </div>
      </CardHeader>

      <CardContent>
        <div className={`text-2xl font-bold ${style.value}`}>{value}</div>

        <p className='mt-1 text-xs text-muted-foreground'>{description}</p>
      </CardContent>
    </Card>
  )
}
