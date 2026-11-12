import { useEffect, useState } from 'react'
import { Download, FileText, ImageOff, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getTaskAttachment } from '@/features/tasks/data/api'

/** Where a stored attachment lives: its task and its id. */
export type AttachmentSource = { taskId: string | number; id: number }

/**
 * A photo kept with an earlier message. An <img> cannot send the person's login, so the file is
 * fetched with it and shown from a local URL, which is released when the photo leaves the page.
 */
export function StoredImage({ name, source }: { name: string; source: AttachmentSource }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    getTaskAttachment(source.taskId, source.id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [source.taskId, source.id])

  if (failed) {
    return (
      <span className='flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground' role='img' aria-label={t('agentic.thread.imageUnavailable', { name })}>
        <ImageOff aria-hidden='true' className='size-4 shrink-0' />
        {t('agentic.thread.imageUnavailable', { name })}
      </span>
    )
  }
  if (!url) {
    return (
      <span className='flex size-24 items-center justify-center rounded-md border border-border bg-muted' role='img' aria-label={t('agentic.thread.imageLoading', { name })}>
        <Loader2 aria-hidden='true' className='size-4 animate-spin text-muted-foreground' />
      </span>
    )
  }
  return <img src={url} alt={name} className='max-h-48 max-w-full rounded-md border border-border object-cover' />
}

/** A file kept with an earlier message, downloaded with the person's login when they ask for it. */
export function StoredFileButton({ name, source }: { name: string; source: AttachmentSource }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const blob = await getTaskAttachment(source.taskId, source.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      toast.error(t('agentic.thread.downloadFailed', { name }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type='button'
      onClick={() => void download()}
      disabled={busy}
      aria-label={t('agentic.thread.downloadFile', { name })}
      className='flex max-w-full items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'
    >
      <FileText aria-hidden='true' className='size-4 shrink-0 text-muted-foreground' />
      <span className='truncate'>{name}</span>
      {busy ? <Loader2 aria-hidden='true' className='size-3.5 shrink-0 animate-spin' /> : <Download aria-hidden='true' className='size-3.5 shrink-0 text-muted-foreground' />}
    </button>
  )
}
