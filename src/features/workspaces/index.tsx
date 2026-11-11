import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { FolderGit2, FolderOpen, GitBranch, Loader2, Package, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteWorkspace, getWorkspaces, type Workspace } from './data/api'
import { CreateWorkspaceDialog } from './create-workspace-dialog'
import { formatBytes } from './format'

const sourceIcon = { empty: FolderOpen, zip: Package, github: GitBranch } as const

export function WorkspacesPage() {
  const { t, i18n } = useTranslation()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<Workspace | null>(null)
  const [busy, setBusy] = useState(false)

  // The list is reloaded only after an action that finished, never while another load runs
  // (the cards are not shown while loading), so loads cannot overtake each other.
  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setWorkspaces(await getWorkspaces())
    } catch (error) {
      const message = error instanceof Error ? error.message : t('workspacePage.error.title')
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remove = async (workspace: Workspace) => {
    setBusy(true)
    try {
      await deleteWorkspace(workspace.id)
      toast.success(t('workspacePage.toast.deleted'))
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('workspacePage.toast.failed'))
    } finally {
      setBusy(false)
    }
  }

  const date = (value: string | null) => (value ? new Date(value).toLocaleString(i18n.language) : t('workspacePage.card.never'))

  return (
    <Main className='space-y-6'>
      <div className='flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-sm text-muted-foreground'>{t('common.agenticWorkspace')}</p>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('workspacePage.title')}</h1>
          <p className='mt-1 max-w-2xl text-sm text-muted-foreground'>{t('workspacePage.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='mr-2 size-4' />
          {t('workspacePage.actions.create')}
        </Button>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {loading ? (
          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            {t('workspacePage.loading')}
          </p>
        ) : loadError ? (
          <Card className='lg:col-span-2' role='alert'>
            <CardContent className='py-12 text-center'>
              <p className='font-medium'>{t('workspacePage.error.title')}</p>
              <p className='mt-1 text-sm text-muted-foreground'>{loadError}</p>
              <Button className='mt-4' variant='outline' onClick={() => void load()}>{t('workspacePage.actions.retry')}</Button>
            </CardContent>
          </Card>
        ) : workspaces.length === 0 ? (
          <Card className='lg:col-span-2'>
            <CardContent className='py-12 text-center'>
              <FolderGit2 className='mx-auto mb-3 size-8 text-muted-foreground' />
              <p className='font-medium'>{t('workspacePage.empty.title')}</p>
              <p className='mt-1 text-sm text-muted-foreground'>{t('workspacePage.empty.description')}</p>
            </CardContent>
          </Card>
        ) : (
          workspaces.map((workspace) => {
            const Icon = sourceIcon[workspace.source_type] ?? FolderOpen
            return (
              <Card key={workspace.id} data-testid='workspace-card' className='gap-4 py-5'>
                <CardHeader className='gap-2 px-5'>
                  <div className='flex items-start justify-between gap-3'>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <Icon className='size-4 text-muted-foreground' />
                      {workspace.name}
                    </CardTitle>
                    <Badge variant={workspace.status === 'ready' ? 'default' : 'secondary'}>{t(`workspacePage.status.${workspace.status}`)}</Badge>
                  </div>
                  {workspace.description && <CardDescription>{workspace.description}</CardDescription>}
                </CardHeader>
                <CardContent className='space-y-4 px-5'>
                  <dl className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                    <dt>{t('workspacePage.card.files')}</dt>
                    <dd>{t('workspacePage.card.fileCount', { count: workspace.file_count })} · {formatBytes(workspace.size_bytes)}</dd>
                    <dt>{t('workspacePage.card.source')}</dt>
                    <dd>{t(`workspacePage.create.sources.${workspace.source_type}`)}{workspace.source_url && ` · ${workspace.source_url.replace('https://github.com/', '')}`}</dd>
                    <dt>{t('workspacePage.card.lastAccessed')}</dt>
                    <dd>{date(workspace.last_accessed_at)}</dd>
                  </dl>
                  <div className='flex flex-wrap gap-2 border-t pt-3'>
                    <Button size='sm' asChild>
                      <Link to='/workspaces/$workspaceId' params={{ workspaceId: String(workspace.id) }}>{t('workspacePage.actions.open')}</Link>
                    </Button>
                    <Button size='sm' variant='ghost' className='text-destructive' disabled={busy} onClick={() => setDeleting(workspace)}>
                      <Trash2 className='mr-1.5 size-4' />
                      {t('workspacePage.actions.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(workspace) => {
          setCreateOpen(false)
          toast.success(t('workspacePage.toast.created', { name: workspace.name }))
          void load()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        destructive
        title={t('workspacePage.delete.title')}
        desc={t('workspacePage.delete.description', { name: deleting?.name ?? '' })}
        confirmText={t('workspacePage.delete.confirm')}
        cancelBtnText={t('workspacePage.actions.cancel')}
        handleConfirm={() => {
          const target = deleting
          setDeleting(null)
          if (target) void remove(target)
        }}
      />
    </Main>
  )
}
