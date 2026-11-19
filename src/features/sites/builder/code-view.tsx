import { useEffect, useMemo, useState } from 'react'
import { FileCode, GitCompare, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { diffLines, type DiffLine } from '@/features/desktop-runtime/line-diff'
import { getVersionFile, getVersionFiles, type VersionFile } from '../data/api'
import { siteErrorText } from '../errors'

type CodeViewProps = {
  siteId: number
  /** The version whose files are shown. */
  version: number
  /** "code": every file of the version; "changes": what the version changed. */
  mode: 'code' | 'changes'
}

type Loaded<T> =
  | { state: 'loading' }
  | { state: 'error'; text: string }
  | { state: 'ready'; value: T }

/**
 * Loads something for a key, again when the key changes or on retry. A result that
 * belongs to an older key counts as still loading.
 */
function useLoaded<T>(key: string, load: () => Promise<T>) {
  const { t } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<(Loaded<T> & { key: string }) | null>(
    null
  )
  const wanted = `${key}#${attempt}`
  useEffect(() => {
    let current = true
    load()
      .then((value) => {
        if (current) setResult({ key: wanted, state: 'ready', value })
      })
      .catch((error: unknown) => {
        if (current)
          setResult({
            key: wanted,
            state: 'error',
            text: siteErrorText(t, error),
          })
      })
    return () => {
      current = false
    }
    // The key names everything load reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted])
  const state: Loaded<T> =
    result && result.key === wanted ? result : { state: 'loading' }
  return [state, () => setAttempt((count) => count + 1)] as const
}

// Pages first: they are what the owner recognises.
const FIRST_FILE = 'web/src/pages/Home.tsx'

/** The website's files, read only: all of them, or what the last change did. */
export function CodeView({ siteId, version, mode }: CodeViewProps) {
  const { t } = useTranslation()
  const [list, retryList] = useLoaded(`${siteId}/${version}`, async () => {
    const loaded = await getVersionFiles(siteId, version)
    return { files: loaded.files, hasPrevious: loaded.has_previous }
  })
  const [selected, setSelected] = useState<string | null>(null)

  const files = useMemo(() => {
    if (list.state !== 'ready') return []
    return (
      mode === 'code'
        ? list.value.files.filter((file) => file.change !== 'removed')
        : list.value.files.filter((file) => file.change)
    ).sort(
      (a, b) =>
        folderRank(a.path) - folderRank(b.path) || a.path.localeCompare(b.path)
    )
  }, [list, mode])

  const chosen =
    selected && files.some((file) => file.path === selected)
      ? selected
      : (files.find((file) => file.path === FIRST_FILE)?.path ??
        files[0]?.path ??
        null)

  if (list.state === 'loading') return <Loading />
  if (list.state === 'error')
    return <Problem text={list.text} onRetry={retryList} />
  if (files.length === 0)
    return (
      <div className='m-auto max-w-sm p-6'>
        <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center'>
          <GitCompare className='size-6 text-muted-foreground' />
          <p className='text-sm font-medium'>
            {mode === 'changes' && !list.value.hasPrevious
              ? t('siteBuilder.code.firstVersion')
              : t('siteBuilder.code.noChanges')}
          </p>
          <p className='text-xs text-muted-foreground'>
            {t('siteBuilder.code.changesHelp')}
          </p>
        </div>
      </div>
    )

  return (
    <div className='flex min-h-0 flex-1 flex-col md:flex-row lg:flex-col xl:flex-row'>
      <nav
        aria-label={t('siteBuilder.code.files')}
        className='max-h-48 shrink-0 overflow-y-auto border-b p-2 md:max-h-none md:w-64 md:border-r md:border-b-0 lg:max-h-48 lg:w-auto lg:border-r-0 lg:border-b xl:max-h-none xl:w-64 xl:border-r xl:border-b-0'
      >
        <ul className='space-y-1'>
          {files.map((file) => (
            <li key={file.path}>
              <button
                type='button'
                aria-current={file.path === chosen ? 'true' : undefined}
                onClick={() => setSelected(file.path)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  file.path === chosen && 'bg-accent text-accent-foreground'
                )}
              >
                <FileCode className='size-4 shrink-0 text-muted-foreground' />
                <span className='min-w-0 flex-1 truncate' title={file.path}>
                  {fileName(file.path)}
                  <span className='block truncate text-muted-foreground'>
                    {folderName(file.path)}
                  </span>
                </span>
                {mode === 'changes' && file.change ? (
                  <ChangeBadge change={file.change} />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className='flex min-h-64 min-w-0 flex-1 flex-col'>
        {chosen ? (
          <FileBody
            key={`${version}-${chosen}`}
            siteId={siteId}
            version={version}
            path={chosen}
            mode={mode}
          />
        ) : null}
      </div>
    </div>
  )
}

function FileBody({
  siteId,
  version,
  path,
  mode,
}: {
  siteId: number
  version: number
  path: string
  mode: CodeViewProps['mode']
}) {
  const [file, retryFile] = useLoaded(`${siteId}/${version}/${path}`, () =>
    getVersionFile(siteId, version, path)
  )

  return (
    <>
      <p className='truncate border-b px-3 py-2 text-xs text-muted-foreground'>
        {path}
      </p>
      {file.state === 'loading' ? (
        <Loading />
      ) : file.state === 'error' ? (
        <Problem text={file.text} onRetry={retryFile} />
      ) : mode === 'changes' ? (
        <Diff
          lines={diffLines(
            file.value.previous_content ?? '',
            file.value.exists ? file.value.content : ''
          )}
        />
      ) : (
        <pre className='min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed'>
          {file.value.content}
        </pre>
      )}
    </>
  )
}

// Runs of unchanged lines longer than this are folded, keeping a few lines around changes.
const CONTEXT = 3

function Diff({ lines }: { lines: DiffLine[] | null }) {
  const { t } = useTranslation()
  if (!lines)
    return (
      <p className='p-3 text-sm text-muted-foreground'>
        {t('siteBuilder.code.tooLarge')}
      </p>
    )
  const rows: (
    { kind: 'line'; line: DiffLine } | { kind: 'fold'; count: number }
  )[] = []
  let index = 0
  while (index < lines.length) {
    if (lines[index].type !== 'same') {
      rows.push({ kind: 'line', line: lines[index++] })
      continue
    }
    let end = index
    while (end < lines.length && lines[end].type === 'same') end++
    const keepStart = index === 0 ? 0 : CONTEXT
    const keepEnd = end === lines.length ? 0 : CONTEXT
    if (end - index > keepStart + keepEnd + 1) {
      for (let i = index; i < index + keepStart; i++)
        rows.push({ kind: 'line', line: lines[i] })
      rows.push({ kind: 'fold', count: end - index - keepStart - keepEnd })
      for (let i = end - keepEnd; i < end; i++)
        rows.push({ kind: 'line', line: lines[i] })
    } else {
      for (let i = index; i < end; i++)
        rows.push({ kind: 'line', line: lines[i] })
    }
    index = end
  }
  return (
    <div className='min-h-0 flex-1 overflow-auto py-2 font-mono text-xs leading-relaxed'>
      {rows.map((row, position) =>
        row.kind === 'fold' ? (
          <p
            key={position}
            className='bg-muted px-3 py-1 text-muted-foreground'
          >
            {t('siteBuilder.code.sameLines', { count: row.count })}
          </p>
        ) : (
          <div
            key={position}
            className={cn(
              'flex gap-2 px-3 whitespace-pre',
              row.line.type === 'add' &&
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              row.line.type === 'del' && 'bg-destructive/10 text-destructive'
            )}
          >
            <span aria-hidden className='w-3 shrink-0 select-none'>
              {row.line.type === 'add'
                ? '+'
                : row.line.type === 'del'
                  ? '-'
                  : ' '}
            </span>
            <span className='sr-only'>
              {row.line.type === 'add'
                ? t('siteBuilder.code.added')
                : row.line.type === 'del'
                  ? t('siteBuilder.code.removed')
                  : ''}
            </span>
            {row.line.text || ' '}
          </div>
        )
      )}
    </div>
  )
}

function ChangeBadge({
  change,
}: {
  change: NonNullable<VersionFile['change']>
}) {
  const { t } = useTranslation()
  const text = {
    added: t('siteBuilder.code.added'),
    changed: t('siteBuilder.code.changed'),
    removed: t('siteBuilder.code.removed'),
  }[change]
  return (
    <Badge
      variant='outline'
      className={cn(
        'shrink-0',
        change === 'added' && 'text-emerald-600 dark:text-emerald-400',
        change === 'removed' && 'text-destructive'
      )}
    >
      {text}
    </Badge>
  )
}

function Loading() {
  const { t } = useTranslation()
  return (
    <p className='m-auto flex items-center gap-2 p-6 text-sm text-muted-foreground'>
      <Loader2 className='size-4 animate-spin' />
      {t('siteBuilder.code.loading')}
    </p>
  )
}

function Problem({ text, onRetry }: { text: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role='alert' className='m-auto max-w-sm p-6 text-center'>
      <p className='text-sm'>{text}</p>
      <Button className='mt-3' variant='outline' size='sm' onClick={onRetry}>
        {t('siteBuilder.retry')}
      </Button>
    </div>
  )
}

// The pages and the parts the AI wrote come before the files every website shares.
const FOLDER_ORDER = [
  'web/src/pages/',
  'web/src/components/',
  'web/src/sections/',
  'server/routes/',
]

function folderRank(path: string) {
  const rank = FOLDER_ORDER.findIndex((folder) => path.startsWith(folder))
  return rank === -1 ? FOLDER_ORDER.length : rank
}

function fileName(path: string) {
  return path.slice(path.lastIndexOf('/') + 1)
}

function folderName(path: string) {
  const end = path.lastIndexOf('/')
  return end > 0 ? path.slice(0, end) : '/'
}
