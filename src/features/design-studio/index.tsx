import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, Palette, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { StoreApi } from 'zustand'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EditorShell } from './components/editor-shell'
import { createDesignProject, deleteDesignProject, getDesignProject, listDesignProjects, type DesignProjectSummary } from './data/api'
import { createDocument, normalizeDocument } from './model/document'
import { createEditorStore, type EditorState } from './model/store'
import { clearDraft, readDraft } from './use-auto-save'

const message = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback)

export function DesignProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<DesignProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<DesignProjectSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    listDesignProjects()
      .then(setProjects)
      .catch((reason: unknown) => setError(message(reason, t('designStudio.loadError'))))
      .finally(() => setLoading(false))
  }, [t])

  const create = async () => {
    setCreating(true)
    try {
      const project = await createDesignProject(t('designStudio.untitled'), createDocument())
      await navigate({ to: '/design-studio/$projectId', params: { projectId: String(project.id) } })
    } catch (reason) {
      toast.error(message(reason, t('designStudio.createError')))
      setCreating(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteDesignProject(toDelete.id)
      clearDraft(toDelete.id)
      setProjects((current) => current.filter((project) => project.id !== toDelete.id))
      setToDelete(null)
    } catch (reason) {
      toast.error(message(reason, t('designStudio.deleteError')))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Main>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('designStudio.title')}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>{t('designStudio.subtitle')}</p>
        </div>
        <Button disabled={creating} onClick={() => void create()}>
          {creating ? <Loader2 className='animate-spin' /> : <Plus />}
          {t('designStudio.newProject')}
        </Button>
      </div>

      {loading ? (
        <p className='flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin' />
          {t('designStudio.loading')}
        </p>
      ) : error ? (
        <p role='alert' className='rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive'>
          {error}
        </p>
      ) : projects.length === 0 ? (
        <div className='flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center'>
          <Palette className='mb-4 size-8 text-muted-foreground' />
          <h2 className='font-medium'>{t('designStudio.emptyTitle')}</h2>
          <p className='mt-1 max-w-sm text-sm text-muted-foreground'>{t('designStudio.emptyDescription')}</p>
        </div>
      ) : (
        <ul className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {projects.map((project) => (
            <li key={project.id}>
              <Card className='group relative gap-0 overflow-hidden py-0 transition-colors hover:border-primary/50'>
                <Link to='/design-studio/$projectId' params={{ projectId: String(project.id) }} className='block focus-visible:outline-2 focus-visible:outline-primary'>
                  <div className='flex h-32 items-center justify-center bg-muted/50'>
                    <Palette className='size-8 text-muted-foreground/50' />
                  </div>
                  <CardContent className='p-3'>
                    <p className='truncate text-sm font-medium'>{project.name}</p>
                    <p className='mt-0.5 text-xs text-muted-foreground'>{t('designStudio.editedAt', { date: new Date(project.updated_at).toLocaleString() })}</p>
                  </CardContent>
                </Link>
                <Button
                  variant='secondary'
                  size='icon'
                  aria-label={t('designStudio.deleteProjectNamed', { name: project.name })}
                  className='absolute right-2 top-2 size-8 opacity-0 focus-visible:opacity-100 group-hover:opacity-100'
                  onClick={() => setToDelete(project)}
                >
                  <Trash2 />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && !deleting && setToDelete(null)}
        title={t('designStudio.deleteProjectTitle')}
        desc={t('designStudio.deleteProjectDescription', { name: toDelete?.name ?? '' })}
        confirmText={t('designStudio.delete')}
        cancelBtnText={t('designStudio.cancel')}
        destructive
        isLoading={deleting}
        handleConfirm={() => void confirmDelete()}
      />
    </Main>
  )
}

type Loaded = { store: StoreApi<EditorState>; name: string; revision: number; startDirty: boolean }

export function DesignEditorPage({ projectId }: { projectId: number }) {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => {
    // The newest copy is on the server; this tab's unsaved copy gives way to it.
    clearDraft(projectId)
    setLoaded(null)
    setAttempt((value) => value + 1)
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    getDesignProject(projectId)
      .then((project) => {
        if (cancelled) return
        // Work kept in this browser after a failed save comes back automatically.
        const draft = readDraft(projectId)
        const recovered = draft?.revision === project.revision ? draft : null
        if (draft && !recovered) clearDraft(projectId)
        if (recovered) toast.info(t('designStudio.draftRestored'))
        setLoaded({
          store: createEditorStore(normalizeDocument(recovered ? recovered.document : project.document)),
          name: recovered?.name || project.name,
          revision: project.revision,
          startDirty: !!recovered,
        })
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(message(reason, t('designStudio.loadError')))
      })
    return () => {
      cancelled = true
    }
  }, [projectId, attempt, t])

  if (error) {
    return (
      <Main>
        <div role='alert' className='mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center'>
          <p className='text-sm text-muted-foreground'>{error}</p>
          <Button asChild variant='outline'>
            <Link to='/design-studio'>{t('designStudio.backToProjects')}</Link>
          </Button>
        </div>
      </Main>
    )
  }
  if (!loaded) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center gap-2 bg-background text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        {t('designStudio.loading')}
      </div>
    )
  }
  return <EditorShell key={attempt} store={loaded.store} projectId={projectId} initialName={loaded.name} revision={loaded.revision} startDirty={loaded.startDirty} onReload={reload} />
}
