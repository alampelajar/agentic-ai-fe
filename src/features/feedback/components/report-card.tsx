import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  getFeedbackAttachment,
  hasStoredAttachment,
  isFinished,
  type Feedback,
} from '../data/api'
import { RatingForm, RatingSummary } from './rating'

function StatusBadge({ status }: { status: Feedback['status'] }) {
  const { t } = useTranslation()
  const tone =
    status === 'completed'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : status === 'rejected'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  const Icon =
    status === 'completed'
      ? CheckCircle2
      : status === 'rejected'
        ? AlertCircle
        : Clock3
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      <Icon className='size-3.5' />
      {t(`feedbackPage.statuses.${status}`)}
    </span>
  )
}

/** The report's screenshot, fetched with the login and shown from memory. */
function ReportImage({ id }: { id: number }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false
    getFeedbackAttachment(id)
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
  }, [id])

  if (failed) {
    return (
      <p
        role='alert'
        className='mt-4 flex items-center gap-2 text-xs text-destructive'
      >
        <AlertCircle className='size-4' />
        {t('feedbackPage.attachmentLoadFailed')}
      </p>
    )
  }
  if (!url) {
    return (
      <p className='mt-4 flex items-center gap-2 text-xs text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        {t('feedbackPage.attachmentLoading')}
      </p>
    )
  }
  return (
    <a
      href={url}
      target='_blank'
      rel='noreferrer'
      className='mt-4 inline-block'
      title={t('feedbackPage.openAttachment')}
    >
      <img
        src={url}
        alt={t('feedbackPage.attachment')}
        className='max-h-48 max-w-full rounded-lg border object-contain'
      />
    </a>
  )
}

export function ReportCard({
  report,
  onRated,
  onDelete,
}: {
  report: Feedback
  onRated: (report: Feedback) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const replies = report.replies ?? []
  return (
    <article className='rounded-xl border p-4 sm:p-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0 space-y-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='rounded-md bg-muted px-2 py-1 text-xs font-medium'>
              #{report.id}
            </span>
            <span className='text-xs text-muted-foreground'>
              {t(`feedbackPage.categories.${report.category}`)}
            </span>
          </div>
          {report.subject && (
            <h3 className='font-semibold'>{report.subject}</h3>
          )}
          <p className='text-sm whitespace-pre-wrap text-muted-foreground'>
            {report.description}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-2 self-start'>
          <StatusBadge status={report.status} />
          {isFinished(report.status) && (
            <Button
              variant='ghost'
              size='icon'
              className='text-destructive hover:text-destructive'
              aria-label={t('feedbackPage.delete')}
              title={t('feedbackPage.delete')}
              onClick={onDelete}
            >
              <Trash2 className='size-4' />
            </Button>
          )}
        </div>
      </div>

      {hasStoredAttachment(report.attachment) && <ReportImage id={report.id} />}

      <div className='mt-4 flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground'>
        <span>{new Date(report.created_at).toLocaleString()}</span>
        {report.related_page && (
          <span>
            {t('feedbackPage.relatedPage')}: {report.related_page}
          </span>
        )}
      </div>

      <div className='mt-4 space-y-2 rounded-lg bg-muted/50 p-3 text-sm'>
        <p className='font-medium'>{t('feedbackPage.adminReply')}</p>
        {replies.length === 0 ? (
          <p className='text-muted-foreground'>
            {t('feedbackPage.noReplyYet')}
          </p>
        ) : (
          replies.map((reply) => (
            <div key={reply.id}>
              <p className='whitespace-pre-wrap'>{reply.message}</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {new Date(reply.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      {report.status === 'completed' && (
        <div className='mt-4 border-t pt-4'>
          {report.rating > 0 ? (
            <RatingSummary report={report} />
          ) : (
            <RatingForm report={report} onRated={onRated} />
          )}
        </div>
      )}
    </article>
  )
}
