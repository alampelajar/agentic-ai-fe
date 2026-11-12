import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Cpu,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { API_BASE_URL } from '@/lib/api-config'
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

const API_URL = API_BASE_URL

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
  agentID: string
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
  providerType: 'openai',
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
    agentID: '',
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

  const openEditModel = (agent: DisplayAgent, model: AgentModel) => {
    setSelectedModelForEdit(model)
    setEditForm({
      modelID: model.model_id,
      modelName: model.name,
      description: model.description || '',
      agentID: String(agent.id),
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
      agentID: '',
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

    if (!editForm.agentID) {
      setEditModelError('Pilih satu Agent tujuan model.')
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
            agent_ids: [Number(editForm.agentID)],
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

        <div className='mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end'>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              {t('agentPage.title')}
            </h1>

            <p className='mt-1 max-w-2xl text-muted-foreground'>
              {t('agentPage.subtitle')}
            </p>
          </div>

          <Button asChild className='shrink-0'>
            <Link to='/ai/agents/create'>
              <Plus className='me-2 size-4' />
              {t('agentPage.create')}
            </Link>
          </Button>
        </div>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <Card className='mb-6 border-destructive/30'>
            <CardContent className='flex items-center justify-between gap-4 p-4'>
              <div>
                <p className='font-medium text-destructive'>
                  {t('agentPage.loadErrorTitle')}
                </p>

                <p className='mt-1 text-sm text-muted-foreground'>{error}</p>
              </div>

              <Button variant='outline' onClick={loadAgents}>
                {t('agentPage.retry')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ======================================================
            STATISTICS
        ====================================================== */}

        <div className='mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border lg:grid-cols-4'>
          <AgentStat
            title={t('agentPage.total')}
            value={totalAgents}
            description={t('agentPage.totalDescription')}
          />

          <AgentStat
            title={t('agentPage.running')}
            value={runningAgents}
            description={t('agentPage.runningDescription')}
          />

          <AgentStat
            title={t('agentPage.thinking')}
            value={thinkingAgents}
            description={t('agentPage.thinkingDescription')}
          />

          <AgentStat
            title={t('agentPage.availableModelsStat')}
            value={totalModels}
            description={t('agentPage.availableModelsDescription')}
          />
        </div>

        {/* ======================================================
            SEARCH
        ====================================================== */}

        <div className='mb-6 flex flex-col gap-3 md:flex-row'>
          <div className='relative flex-1'>
            <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('agentPage.search')}
              className='pl-9'
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-full md:w-[180px]'>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value='all'>{t('agentPage.allStatus')}</SelectItem>

              <SelectItem value='Running'>{t('agentPage.running')}</SelectItem>

              <SelectItem value='Thinking'>
                {t('agentPage.thinking')}
              </SelectItem>

              <SelectItem value='Idle'>{t('agentPage.idle')}</SelectItem>

              <SelectItem value='Offline'>{t('agentPage.offline')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                    <label className='text-sm font-medium'>{t('agentPage.addModel.providerName')}</label>
                    <Input
                      value={form.providerName}
                      onChange={(event) =>
                        updateForm('providerName', event.target.value)
                      }
                      placeholder={t('agentPage.addModel.providerNamePlaceholder')}
                      autoComplete='off'
                      disabled={testingConnection || savingModel}
                    />
                  </div>

                <div className='space-y-2'>
                    <label className='text-sm font-medium'>{t('agentPage.addModel.providerType')}</label>
                    <Select
                      value={form.providerType}
                      onValueChange={(value) => updateForm('providerType', value)}
                      disabled={testingConnection || savingModel}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('agentPage.addModel.providerTypePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='openai'>openai</SelectItem>
                        <SelectItem value='google'>google</SelectItem>
                        <SelectItem value='openrouter'>openrouter</SelectItem>
                        <SelectItem value='deepseek'>deepseek</SelectItem>
                        <SelectItem value='nararouter'>nararouter</SelectItem>
                        <SelectItem value='custom'>custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CUSTOM BASE URL */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>{t('agentPage.addModel.baseUrl')}</label>
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
                    {t('agentPage.addModel.baseUrlHint')}
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
                    placeholder={t('agentPage.addModel.apiKeyPlaceholder')}
                    autoComplete='new-password'
                    disabled={testingConnection || savingModel}
                  />

                  <p className='text-[11px] text-muted-foreground'>
                    {t('agentPage.addModel.apiKeyNote')}{' '}
                    {t('agentPage.addModel.apiKeyStorageNote')}
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
                      placeholder={t('agentPage.addModel.modelIdPlaceholder')}
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
                      placeholder={t('agentPage.addModel.modelNamePlaceholder')}
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
                    placeholder={t('agentPage.addModel.descriptionPlaceholder')}
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
                        {t('agentPage.addModel.willBeAddedTo')}
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
                        {t('agentPage.addModel.connectionSuccess')}
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
                    {t('agentPage.addModel.testConnection')}
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
                    {t('agentPage.addModel.saveModel')}
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
                  {t('agentPage.editModel.description')}
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
                  placeholder={t('agentPage.editModel.modelIdPlaceholder')}
                  disabled={savingEditModel}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>{t('agentPage.editModel.targetAgent')}</label>
                <Select
                  value={editForm.agentID}
                  onValueChange={(value) =>
                    setEditForm((current) => ({
                      ...current,
                      agentID: value,
                    }))
                  }
                  disabled={savingEditModel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('agentPage.editModel.targetAgentPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={String(agent.id)}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className='text-xs text-muted-foreground'>
                  {t('agentPage.editModel.targetAgentHint')}
                </p>
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
                  placeholder={t('agentPage.editModel.modelNamePlaceholder')}
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
                  placeholder={t('agentPage.addModel.descriptionPlaceholder')}
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
                  {t('agentPage.editModel.providerNote')}
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
                    {t('agentPage.editModel.saveChanges')}
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
                {t('agentPage.removeModel.description')}
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
                {t('agentPage.removeModel.otherAgentsNote')}
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
                {t('agentPage.deleteModel.description')}
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
                {t('agentPage.deleteModel.warningPrefix')}{' '}
                {t('agentPage.deleteModel.warningSuffix')}
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
  onEditModel: (agent: DisplayAgent, model: AgentModel) => void
  onRemoveModel: (agent: DisplayAgent, model: AgentModel) => void
  onDeleteModel: (model: AgentModel) => void
}) {
  const { t } = useTranslation()

  const statusDot: Record<AgentStatus, string> = {
    Running: 'bg-emerald-500',
    Thinking: 'bg-amber-500',
    Idle: 'bg-muted-foreground',
    Offline: 'bg-destructive',
  }

  const [openModelMenu, setOpenModelMenu] = useState<number | null>(null)

  return (
    <Card className='flex flex-col gap-0 border-0 bg-muted/40 py-0 shadow-none'>
      <CardHeader className='px-5 pt-5 pb-0'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <CardTitle className='truncate text-base'>{agent.name}</CardTitle>

            <p className='mt-1 flex items-center gap-2 text-sm text-muted-foreground'>
              <span
                aria-hidden='true'
                className={`size-2 shrink-0 rounded-full ${statusDot[agent.status]}`}
              />
              {t(`status.${agent.status.toLowerCase()}`)}
              <span aria-hidden='true'>·</span>
              <span className='truncate'>{agent.type}</span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex flex-1 flex-col px-5 pt-3 pb-5'>
        <CardDescription className='min-h-[40px] leading-5'>
          {agent.description}
        </CardDescription>

        {/* MODELS */}

        <div className='mt-4'>
          <div className='mb-2 flex items-baseline justify-between'>
            <span className='text-sm font-medium'>{t('agentPage.models')}</span>

            <span className='text-sm text-muted-foreground'>
              {agent.models.length}
            </span>
          </div>

          {agent.models.length > 0 ? (
            <ul className='space-y-0.5'>
              {agent.models.map((model) => (
                <li
                  key={model.id}
                  className='relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted'
                >
                  <span className='min-w-0 flex-1 truncate'>{model.name}</span>

                  <span className='hidden max-w-[110px] truncate text-xs text-muted-foreground sm:inline'>
                    {model.provider?.name}
                  </span>

                  {model.is_system && (
                    <span className='text-xs text-muted-foreground'>
                      {t('agentPage.system')}
                    </span>
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
                            aria-label={t('agentPage.closeMenu')}
                            onClick={() => setOpenModelMenu(null)}
                          />

                          <div className='absolute top-8 right-0 z-50 w-44 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg'>
                            <button
                              type='button'
                              className='flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted'
                              onClick={() => {
                                setOpenModelMenu(null)
                                onEditModel(agent, model)
                              }}
                            >
                              {t('agentPage.modelMenu.edit')}
                            </button>

                            <button
                              type='button'
                              className='flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted'
                              onClick={() => {
                                setOpenModelMenu(null)
                                onRemoveModel(agent, model)
                              }}
                            >
                              {t('agentPage.removeModel.remove')}
                            </button>

                            <div className='my-1 h-px bg-border' />

                            <button
                              type='button'
                              className='flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10'
                              onClick={() => {
                                setOpenModelMenu(null)
                                onDeleteModel(model)
                              }}
                            >
                              {t('agentPage.deleteModel.delete')}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm text-muted-foreground'>
              {t('agentPage.noModels')}
            </p>
          )}

          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-3 w-full'
            onClick={() => onAddModel(agent)}
          >
            <Plus className='me-2 size-3.5' />
            {t('agentPage.addModel.button')}
          </Button>
        </div>

        {/* PROGRESS */}

        <div className='mt-5 space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>
              {t('agentPage.currentProgress')}
            </span>

            <span className='font-medium tabular-nums'>{agent.progress}%</span>
          </div>

          <Progress value={agent.progress} className='h-1.5 bg-border' />
        </div>

        {/* TASKS */}

        <dl className='mt-5 grid grid-cols-2 gap-4'>
          <div>
            <dt className='text-sm text-muted-foreground'>
              {t('agentPage.activeTasks')}
            </dt>

            <dd className='mt-0.5 text-xl font-semibold tabular-nums'>
              {agent.tasks}
            </dd>
          </div>

          <div>
            <dt className='text-sm text-muted-foreground'>
              {t('agentPage.completed')}
            </dt>

            <dd className='mt-0.5 text-xl font-semibold tabular-nums'>
              {agent.completed}
            </dd>
          </div>
        </dl>

        {/* FOOTER */}

        <div className='mt-auto flex items-center justify-between pt-5'>
          <span className='text-sm text-muted-foreground'>
            {t('agentPage.agentId')}: {agent.id}
          </span>

          <Button variant='ghost' size='sm' asChild>
            <Link to='/ai/agents/$id/skills' params={{ id: String(agent.id) }}>
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
// STAT
// ============================================================

function AgentStat({
  title,
  value,
  description,
}: {
  title: string
  value: number
  description: string
}) {
  return (
    <div className='bg-card p-5'>
      <p className='text-sm text-muted-foreground'>{title}</p>

      <p className='mt-2 text-3xl font-semibold tracking-tight tabular-nums'>
        {value}
      </p>

      <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
    </div>
  )
}
