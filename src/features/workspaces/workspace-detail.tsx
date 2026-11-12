import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, ChevronDown, ChevronRight, Download, File as FileIcon, FilePlus2, Folder, Info, Loader2, Save, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GitHubPublishButton } from './github-publish-dialog'
import { exportWorkspace, getChanges, getTree, getWorkspace, readFile, writeFile, type FileChange, type TreeEntry, type Workspace } from './data/api'
import { ExecutionConsole } from './execution-console'
import { formatBytes } from './format'
import { diffLines } from './line-diff'

type OpenFile = { path: string; saved: string; isNew: boolean }

/** The page behind /workspaces/$workspaceId: reads the id from the address. */
export function WorkspaceDetailRoute() {
  const { workspaceId } = useParams({ from: '/_authenticated/workspaces/$workspaceId' })
  return <WorkspaceDetailPage workspaceId={Number(workspaceId)} />
}

export function WorkspaceDetailPage({ workspaceId }: { workspaceId: number }) {
  const { t } = useTranslation()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<TreeEntry[]>([])
  const [truncated, setTruncated] = useState(false)
  const [treeError, setTreeError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [changes, setChanges] = useState<FileChange[]>([])
  const [open, setOpen] = useState<OpenFile | null>(null)
  const [draft, setDraft] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const [tab, setTab] = useState('files')
  const fileRequest = useRef(0)

  const dirty = open !== null && draft !== open.saved

  const loadTree = useCallback(async () => {
    try {
      const tree = await getTree(workspaceId)
      setEntries(tree.entries)
      setTruncated(tree.truncated)
      setTreeError(null)
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : t('workspacePage.explorer.treeFailed'))
    }
  }, [workspaceId, t])

  const loadChanges = useCallback(async () => {
    try {
      setChanges(await getChanges(workspaceId))
    } catch {
      setChanges([])
    }
  }, [workspaceId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getWorkspace(workspaceId)
      .then(async (loaded) => {
        if (cancelled) return
        setWorkspace(loaded)
        setLoadError(null)
        await Promise.all([loadTree(), loadChanges()])
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : t('workspacePage.explorer.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  const visible = useMemo(() => {
    return entries.filter((entry) => {
      const parts = entry.path.split('/')
      for (let depth = 1; depth < parts.length; depth++) {
        if (!expanded.has(parts.slice(0, depth).join('/'))) return false
      }
      return true
    })
  }, [entries, expanded])

  // Unsaved changes are only dropped after the user agrees in the dialog below.
  const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(null)
  const afterDiscardCheck = (action: () => void) => {
    if (dirty) setPendingDiscard(() => action)
    else action()
  }

  const openFile = (path: string) => {
    if (open?.path === path) return
    afterDiscardCheck(() => void loadFile(path))
  }

  const loadFile = async (path: string) => {
    const request = ++fileRequest.current
    setFileLoading(true)
    setFileError(null)
    setShowDiff(false)
    try {
      const file = await readFile(workspaceId, path)
      if (request !== fileRequest.current) return
      setOpen({ path, saved: file.content, isNew: false })
      setDraft(file.content)
    } catch (error) {
      if (request !== fileRequest.current) return
      setOpen(null)
      setDraft('')
      setFileError(error instanceof Error ? error.message : t('workspacePage.explorer.readFailed'))
    } finally {
      if (request === fileRequest.current) setFileLoading(false)
    }
  }

  const startNewFile = () => {
    const path = newPath.trim().replace(/^\/+/, '')
    if (!path) return
    afterDiscardCheck(() => {
      fileRequest.current++
      setOpen({ path, saved: '', isNew: true })
      setDraft('')
      setFileError(null)
      setShowDiff(false)
      setNewPath('')
    })
  }

  const save = async () => {
    if (!open) return
    setSaving(true)
    setFileError(null)
    try {
      const result = await writeFile(workspaceId, open.path, draft)
      setOpen({ path: open.path, saved: draft, isNew: false })
      setWorkspace(result.workspace)
      toast.success(t('workspacePage.toast.saved', { path: open.path }))
      await Promise.all([loadTree(), loadChanges()])
    } catch (error) {
      setFileError(error instanceof Error ? error.message : t('workspacePage.explorer.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const download = async () => {
    setExporting(true)
    try {
      const blob = await exportWorkspace(workspaceId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${(workspace?.name ?? 'workspace').replace(/[^A-Za-z0-9._-]+/g, '-')}.zip`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('workspacePage.explorer.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  const toggle = (path: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  const diff = useMemo(() => (showDiff && open ? diffLines(open.saved, draft) : undefined), [showDiff, open, draft])
  const statusVariant = (status: FileChange['status']) => (status === 'deleted' ? 'destructive' : status === 'added' ? 'default' : 'secondary')

  if (loading) {
    return (
      <Main>
        <p className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' />{t('workspacePage.loading')}</p>
      </Main>
    )
  }
  if (loadError || !workspace) {
    return (
      <Main>
        <div role='alert' className='rounded-md border p-6 text-center'>
          <p className='font-medium'>{t('workspacePage.explorer.loadFailed')}</p>
          <p className='mt-1 text-sm text-muted-foreground'>{loadError}</p>
          <Button className='mt-4' variant='outline' asChild><Link to='/workspaces'>{t('workspacePage.explorer.back')}</Link></Button>
        </div>
      </Main>
    )
  }

  return (
    <Main className='space-y-4'>
      <div className='flex flex-wrap items-center gap-3'>
        <Button size='icon' variant='ghost' asChild aria-label={t('workspacePage.explorer.back')}><Link to='/workspaces'><ArrowLeft className='size-4' /></Link></Button>
        <div className='min-w-0'>
          <h1 className='truncate text-xl font-semibold'>{workspace.name}</h1>
          <p className='text-xs text-muted-foreground'>{t('workspacePage.card.fileCount', { count: workspace.file_count })} · {formatBytes(workspace.size_bytes)}{workspace.default_runtime && ` · ${workspace.default_runtime}`}</p>
        </div>
        <Badge variant={workspace.status === 'ready' ? 'default' : 'secondary'}>{t(`workspacePage.status.${workspace.status}`)}</Badge>
        <div className='ml-auto flex flex-wrap gap-2'>
          {workspace.github_owner && workspace.base_sha && <GitHubPublishButton workspace={workspace} />}
        <Button variant='outline' size='sm' disabled={exporting} onClick={() => void download()}>
          {exporting ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Download className='mr-2 size-4' />}
          {t('workspacePage.explorer.download')}
        </Button>
        </div>
      </div>
      {workspace.source_type === 'github' && !(workspace.github_owner && workspace.base_sha) && (
        <p className='flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground'>
          <Info className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
          {t('workspacePage.explorer.publishUnavailable')}
        </p>
      )}

      <Tabs value={tab} onValueChange={(value) => { setTab(value); if (value === 'changes') void loadChanges() }}>
        <TabsList>
          <TabsTrigger value='files'>{t('workspacePage.explorer.tabs.files')}</TabsTrigger>
          <TabsTrigger value='changes'>{t('workspacePage.explorer.tabs.changes')}{changes.length > 0 && ` (${changes.length})`}</TabsTrigger>
          <TabsTrigger value='console'>{t('workspacePage.explorer.tabs.console')}</TabsTrigger>
        </TabsList>

        <TabsContent value='files'>
          <div className='grid gap-4 lg:grid-cols-[18rem_1fr]'>
            <div className='space-y-2'>
              <div className='flex gap-2'>
                <Input aria-label={t('workspacePage.explorer.newFilePath')} value={newPath} placeholder='src/main.go' onChange={(event) => setNewPath(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && startNewFile()} />
                <Button size='icon' variant='outline' aria-label={t('workspacePage.explorer.newFile')} disabled={!newPath.trim()} onClick={startNewFile}><FilePlus2 className='size-4' /></Button>
              </div>
              {treeError ? (
                <div role='alert' className='rounded-md border p-3 text-sm'>
                  <p>{treeError}</p>
                  <Button className='mt-2' size='sm' variant='outline' onClick={() => void loadTree()}>{t('workspacePage.actions.retry')}</Button>
                </div>
              ) : entries.length === 0 ? (
                <p className='text-sm text-muted-foreground'>{t('workspacePage.explorer.emptyTree')}</p>
              ) : (
                <ul className='max-h-[32rem] overflow-auto rounded-md border p-1 text-sm' aria-label={t('workspacePage.explorer.tree')}>
                  {visible.map((entry) => {
                    const depth = entry.path.split('/').length - 1
                    return (
                      <li key={entry.path} style={{ paddingLeft: `${depth * 12}px` }}>
                        {entry.generated ? (
                          <div className='flex w-full items-center gap-1 px-1 py-0.5 text-muted-foreground' title={t('workspacePage.explorer.dependenciesHint')} data-testid='generated-folder'>
                            <Folder className='ml-4 size-3.5' />
                            <span className='truncate'>{entry.name}</span>
                            <Badge variant='outline' className='ml-auto text-[10px]'>{t('workspacePage.explorer.dependencies')}</Badge>
                          </div>
                        ) : entry.type === 'dir' ? (
                          <button type='button' className='flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-muted' onClick={() => toggle(entry.path)} aria-expanded={expanded.has(entry.path)}>
                            {expanded.has(entry.path) ? <ChevronDown className='size-3.5' /> : <ChevronRight className='size-3.5' />}
                            <Folder className='size-3.5 text-muted-foreground' />
                            {entry.name}
                          </button>
                        ) : (
                          <button type='button' className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-muted ${open?.path === entry.path ? 'bg-muted' : ''}`} onClick={() => void openFile(entry.path)}>
                            <FileIcon className='ml-4 size-3.5 text-muted-foreground' />
                            <span className='truncate'>{entry.name}</span>
                            {entry.sensitive && <Badge variant='outline' className='ml-auto text-[10px]'>{t('workspacePage.explorer.protected')}</Badge>}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              {truncated && <p className='text-xs text-muted-foreground'>{t('workspacePage.explorer.truncated')}</p>}
            </div>

            <div className='space-y-2' data-testid='editor-panel'>
              {fileLoading ? (
                <p className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' />{t('workspacePage.explorer.readingFile')}</p>
              ) : open ? (
                <>
                  <div className='flex flex-wrap items-center gap-2'>
                    <code className='truncate text-sm'>{open.path}</code>
                    {open.isNew && <Badge variant='secondary'>{t('workspacePage.explorer.newBadge')}</Badge>}
                    {dirty && <Badge variant='outline'>{t('workspacePage.explorer.unsaved')}</Badge>}
                    <div className='ml-auto flex gap-2'>
                      <Button size='sm' variant='outline' disabled={!dirty} onClick={() => setShowDiff((value) => !value)}>{showDiff ? t('workspacePage.explorer.hideDiff') : t('workspacePage.explorer.showDiff')}</Button>
                      <Button size='sm' variant='outline' disabled={!dirty} onClick={() => { setDraft(open.saved); setShowDiff(false) }}><Undo2 className='mr-1.5 size-3.5' />{t('workspacePage.explorer.revert')}</Button>
                      <Button size='sm' disabled={!dirty || saving} onClick={() => void save()}>
                        {saving ? <Loader2 className='mr-1.5 size-3.5 animate-spin' /> : <Save className='mr-1.5 size-3.5' />}
                        {t('workspacePage.explorer.save')}
                      </Button>
                    </div>
                  </div>
                  {showDiff && dirty && (
                    diff === null ? (
                      <p className='text-sm text-muted-foreground'>{t('workspacePage.explorer.diffTooLarge')}</p>
                    ) : (
                      <pre data-testid='diff-view' className='max-h-64 overflow-auto rounded-md border bg-muted/30 p-2 text-xs'>
                        {diff?.map((line, index) => (
                          <div key={index} data-diff={line.type} className={line.type === 'add' ? 'bg-green-500/15' : line.type === 'del' ? 'bg-red-500/15' : ''}>
                            {line.type === 'add' ? '+ ' : line.type === 'del' ? '- ' : '  '}{line.text}
                          </div>
                        ))}
                      </pre>
                    )
                  )}
                  <textarea aria-label={t('workspacePage.explorer.editor')} spellCheck={false} className='h-[28rem] w-full resize-y rounded-md border bg-background p-3 font-mono text-sm' value={draft} onChange={(event) => setDraft(event.target.value)} />
                </>
              ) : (
                <p className='text-sm text-muted-foreground'>{t('workspacePage.explorer.selectFile')}</p>
              )}
              {fileError && <p role='alert' className='text-sm text-destructive'>{fileError}</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value='changes'>
          {changes.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{t('workspacePage.explorer.noChanges')}</p>
          ) : (
            <ul className='divide-y rounded-md border text-sm' aria-label={t('workspacePage.explorer.tabs.changes')}>
              {changes.map((change) => (
                <li key={change.path} className='flex items-center gap-2 px-3 py-2'>
                  <Badge variant={statusVariant(change.status)}>{t(`workspacePage.explorer.changeStatus.${change.status}`)}</Badge>
                  <code className='truncate'>{change.path}</code>
                  {change.status !== 'deleted' && <Button size='sm' variant='ghost' className='ml-auto' onClick={() => { setTab('files'); void openFile(change.path) }}>{t('workspacePage.actions.open')}</Button>}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value='console'>
          <ExecutionConsole workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={pendingDiscard !== null}
        onOpenChange={(value) => { if (!value) setPendingDiscard(null) }}
        title={t('workspacePage.explorer.discardTitle')}
        desc={t('workspacePage.explorer.discardConfirm')}
        cancelBtnText={t('common.cancel')}
        confirmText={t('workspacePage.explorer.discard')}
        destructive
        handleConfirm={() => {
          const action = pendingDiscard
          setPendingDiscard(null)
          action?.()
        }}
      />
    </Main>
  )
}
