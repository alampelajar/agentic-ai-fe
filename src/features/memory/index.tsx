import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, ArchiveRestore, BrainCircuit, Globe2, Loader2, Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  createMemory,
  deleteMemory,
  getMemories,
  getMemoryAgents,
  getMemorySettings,
  MEMORY_CATEGORIES,
  setMemoryEnabled,
  updateMemory,
  type Memory,
  type MemoryAgent,
  type MemoryCategory,
  type MemoryDraft,
  type MemoryStatus,
} from './data/api'
import { MemoryFormDialog } from './memory-form-dialog'

const selectClass = 'h-9 rounded-md border bg-background px-3 text-sm'

export function MemoryPage() {
  const { t, i18n } = useTranslation()
  const [memories, setMemories] = useState<Memory[]>([])
  const [agents, setAgents] = useState<MemoryAgent[]>([])
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [settingsError, setSettingsError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<MemoryCategory | 'all'>('all')
  const [agent, setAgent] = useState('all')
  const [status, setStatus] = useState<MemoryStatus | 'all'>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Memory | null>(null)
  const [deleting, setDeleting] = useState<Memory | null>(null)

  // Only the newest request may update the list, so a slow answer to an older
  // filter cannot replace the result of a newer one.
  const latestRequest = useRef(0)
  // The filters as last chosen, for loads that run outside a render.
  const filtersRef = useRef({ search: '', category: 'all' as MemoryCategory | 'all', agent: 'all', status: 'all' as MemoryStatus | 'all' })

  const load = async (filters = filtersRef.current) => {
    const request = ++latestRequest.current
    setLoading(true)
    setLoadError(null)
    try {
      const loaded = await getMemories({ q: filters.search, category: filters.category, agent: filters.agent, status: filters.status })
      if (request === latestRequest.current) setMemories(loaded)
    } catch (error) {
      if (request !== latestRequest.current) return
      const message = error instanceof Error ? error.message : t('memoryPage.error.title')
      setLoadError(message)
      toast.error(message)
    } finally {
      if (request === latestRequest.current) setLoading(false)
    }
  }

  const loadSettings = async () => {
    setSettingsError(false)
    try {
      setEnabled((await getMemorySettings()).enabled)
    } catch {
      setSettingsError(true)
    }
  }

  useEffect(() => {
    void load()
    void loadSettings()
    getMemoryAgents().then(setAgents).catch(() => setAgents([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agentName = useMemo(() => {
    const names = new Map(agents.map((item) => [item.id, item.name]))
    return (id: number) => names.get(id) ?? t('memoryPage.scope.unknownAgent', { id })
  }, [agents, t])

  const changeFilter = (next: Partial<{ search: string; category: MemoryCategory | 'all'; agent: string; status: MemoryStatus | 'all' }>) => {
    const filters = { ...filtersRef.current, ...next }
    if (next.search !== undefined) setSearch(next.search)
    if (next.category !== undefined) setCategory(next.category)
    if (next.agent !== undefined) setAgent(next.agent)
    if (next.status !== undefined) setStatus(next.status)
    filtersRef.current = filters
    void load(filters)
  }

  const run = async (action: () => Promise<void>) => {
    setWorking(true)
    try {
      await action()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('memoryPage.toast.failed'))
    } finally {
      setWorking(false)
    }
  }

  const toggle = async (next: boolean) => {
    setWorking(true)
    try {
      const saved = await setMemoryEnabled(next)
      setEnabled(saved.enabled)
      setSettingsError(false)
      toast.success(saved.enabled ? t('memoryPage.toast.enabled') : t('memoryPage.toast.disabled'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('memoryPage.toast.failed'))
    } finally {
      setWorking(false)
    }
  }

  const save = async (draft: MemoryDraft) => {
    if (editing) {
      await updateMemory(editing.id, draft)
      toast.success(t('memoryPage.toast.updated'))
    } else {
      await createMemory(draft)
      toast.success(t('memoryPage.toast.created'))
    }
    setFormOpen(false)
    setEditing(null)
    await load()
  }

  const format = (value: string) => new Date(value).toLocaleDateString(i18n.language)
  const filtered = search.trim() !== '' || category !== 'all' || agent !== 'all' || status !== 'all'

  return (
    <Main className='space-y-6'>
      <div className='flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-sm text-muted-foreground'>Agentic workspace</p>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('memoryPage.title')}</h1>
          <p className='mt-1 max-w-2xl text-sm text-muted-foreground'>{t('memoryPage.subtitle')}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className='mr-2 size-4' />
          {t('memoryPage.actions.add')}
        </Button>
      </div>

      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2 text-base'>
              <BrainCircuit className='size-4' />
              {t('memoryPage.enable.title')}
            </CardTitle>
            <CardDescription className='mt-1 max-w-2xl'>{t('memoryPage.enable.description')}</CardDescription>
          </div>
          <Switch aria-label={t('memoryPage.enable.label')} checked={enabled === true} disabled={enabled === null || working} onCheckedChange={(next) => void toggle(next)} />
        </CardHeader>
        <CardContent className='space-y-2'>
          {settingsError && (
            <div role='alert' className='flex items-center justify-between gap-3 text-sm text-destructive'>
              <span>{t('memoryPage.error.settings')}</span>
              <Button size='sm' variant='outline' onClick={() => void loadSettings()}>{t('memoryPage.actions.retry')}</Button>
            </div>
          )}
          {enabled === false && <p data-testid='memory-disabled-notice' className='rounded-md border border-dashed p-3 text-sm text-muted-foreground'>{t('memoryPage.enable.notice')}</p>}
          <p className='text-xs text-muted-foreground'>{t('memoryPage.privacy')}</p>
        </CardContent>
      </Card>

      <div className='flex flex-wrap items-center gap-2'>
        <div className='flex min-w-56 flex-1 items-center gap-2 sm:max-w-sm'>
          <Search className='size-4 text-muted-foreground' />
          <Input aria-label={t('memoryPage.filters.searchLabel')} value={search} placeholder={t('memoryPage.filters.searchPlaceholder')} onChange={(event) => changeFilter({ search: event.target.value })} />
        </div>
        <select aria-label={t('memoryPage.filters.category')} className={selectClass} value={category} onChange={(event) => changeFilter({ category: event.target.value as MemoryCategory | 'all' })}>
          <option value='all'>{t('memoryPage.filters.allCategories')}</option>
          {MEMORY_CATEGORIES.map((value) => <option key={value} value={value}>{t(`memoryPage.categories.${value}`)}</option>)}
        </select>
        <select aria-label={t('memoryPage.filters.agent')} className={selectClass} value={agent} onChange={(event) => changeFilter({ agent: event.target.value })}>
          <option value='all'>{t('memoryPage.filters.allAgents')}</option>
          <option value='global'>{t('memoryPage.filters.globalOnly')}</option>
          {agents.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
        </select>
        <select aria-label={t('memoryPage.filters.status')} className={selectClass} value={status} onChange={(event) => changeFilter({ status: event.target.value as MemoryStatus | 'all' })}>
          <option value='all'>{t('memoryPage.filters.statusAll')}</option>
          <option value='active'>{t('memoryPage.filters.statusActive')}</option>
          <option value='archived'>{t('memoryPage.filters.statusArchived')}</option>
        </select>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {loading ? (
          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            {t('memoryPage.loading')}
          </p>
        ) : loadError ? (
          <Card className='lg:col-span-2' role='alert'>
            <CardContent className='py-12 text-center'>
              <p className='font-medium'>{t('memoryPage.error.title')}</p>
              <p className='mt-1 text-sm text-muted-foreground'>{loadError}</p>
              <Button className='mt-4' variant='outline' onClick={() => void load()}>{t('memoryPage.actions.retry')}</Button>
            </CardContent>
          </Card>
        ) : memories.length === 0 ? (
          <Card className='lg:col-span-2'>
            <CardContent className='py-12 text-center'>
              <BrainCircuit className='mx-auto mb-3 size-8 text-muted-foreground' />
              <p className='font-medium'>{filtered ? t('memoryPage.empty.filtered') : t('memoryPage.empty.title')}</p>
              {!filtered && <p className='mt-1 text-sm text-muted-foreground'>{t('memoryPage.empty.description')}</p>}
            </CardContent>
          </Card>
        ) : (
          memories.map((memory) => (
            <Card key={memory.id} data-testid='memory-card' className={memory.status === 'archived' ? 'gap-4 py-5 opacity-70' : 'gap-4 py-5'}>
              <CardHeader className='gap-2 px-5'>
                <div className='flex items-start justify-between gap-3'>
                  <CardTitle className='text-base'>{memory.title}</CardTitle>
                  <div className='flex shrink-0 flex-wrap justify-end gap-1.5'>
                    <Badge variant='secondary'>{t(`memoryPage.categories.${memory.category}`)}</Badge>
                    {memory.status === 'archived' && <Badge variant='outline'>{t('memoryPage.card.archived')}</Badge>}
                  </div>
                </div>
                <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                  {memory.agent_id === null ? (
                    <span className='flex items-center gap-1' title={t('memoryPage.scope.globalHint')}><Globe2 className='size-3.5' />{t('memoryPage.scope.global')}</span>
                  ) : (
                    <span className='flex items-center gap-1' title={t('memoryPage.scope.agentHint')}><UserRound className='size-3.5' />{t('memoryPage.scope.agent', { name: agentName(memory.agent_id) })}</span>
                  )}
                  <span>·</span>
                  <span>{t('memoryPage.card.importance', { value: memory.importance })}</span>
                </div>
              </CardHeader>
              <CardContent className='space-y-4 px-5'>
                <p className='whitespace-pre-wrap text-sm'>{memory.content}</p>
                <p className='text-xs text-muted-foreground'>
                  {t('memoryPage.card.updated', { date: format(memory.updated_at) })} · {memory.last_used_at ? t('memoryPage.card.lastUsed', { date: format(memory.last_used_at) }) : t('memoryPage.card.neverUsed')}
                </p>
                <div className='flex flex-wrap gap-2 border-t pt-3'>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={working}
                    onClick={() => {
                      setEditing(memory)
                      setFormOpen(true)
                    }}
                  >
                    <Pencil className='mr-1.5 size-4' />
                    {t('memoryPage.actions.edit')}
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    disabled={working}
                    onClick={() =>
                      void run(async () => {
                        const archive = memory.status === 'active'
                        await updateMemory(memory.id, { status: archive ? 'archived' : 'active' })
                        toast.success(archive ? t('memoryPage.toast.archived') : t('memoryPage.toast.restored'))
                      })
                    }
                  >
                    {memory.status === 'active' ? <Archive className='mr-1.5 size-4' /> : <ArchiveRestore className='mr-1.5 size-4' />}
                    {memory.status === 'active' ? t('memoryPage.actions.archive') : t('memoryPage.actions.restore')}
                  </Button>
                  <Button size='sm' variant='ghost' className='text-destructive' disabled={working} onClick={() => setDeleting(memory)}>
                    <Trash2 className='mr-1.5 size-4' />
                    {t('memoryPage.actions.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <MemoryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        memory={editing}
        agents={agents}
        onSave={save}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        destructive
        title={t('memoryPage.delete.title')}
        desc={t('memoryPage.delete.description', { title: deleting?.title ?? '' })}
        confirmText={t('memoryPage.delete.confirm')}
        cancelBtnText={t('memoryPage.actions.cancel')}
        handleConfirm={() => {
          const target = deleting
          setDeleting(null)
          if (!target) return
          void run(async () => {
            await deleteMemory(target.id)
            toast.success(t('memoryPage.toast.deleted'))
          })
        }}
      />
    </Main>
  )
}
