import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Clock3, FileText, Loader2, MessageSquareText, Paperclip, Send, Star, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ATTACHMENT_TYPES,
  FEEDBACK_CATEGORIES,
  MAX_ATTACHMENT_BYTES,
  RATING_REASONS,
  getFeedbackAttachment,
  hasStoredAttachment,
  createFeedback,
  deleteFeedback,
  getMyFeedback,
  isFinished,
  rateFeedback,
  type Feedback,
  type FeedbackCategory,
} from './data/api'

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback)

export function FeedbackPage() {
  const { t } = useTranslation()
  const [reports, setReports] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<'form' | 'history'>('form')
  const [toDelete, setToDelete] = useState<Feedback | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchReports = () =>
    getMyFeedback()
      .then(setReports)
      .catch((error: unknown) => setLoadError(errorText(error, t('feedbackPage.loadError'))))
      .finally(() => setLoading(false))

  function reload() {
    setLoading(true)
    setLoadError('')
    void fetchReports()
  }

  useEffect(() => {
    // Load once when the page opens.
    void fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteFeedback(toDelete.id)
      setReports((current) => current.filter((report) => report.id !== toDelete.id))
      toast.success(t('feedbackPage.deleteSuccess'))
      setToDelete(null)
    } catch (error) {
      toast.error(errorText(error, t('feedbackPage.deleteError')))
    } finally {
      setDeleting(false)
    }
  }

  const openCount = reports.filter((r) => r.status === 'new' || r.status === 'processing').length
  const doneCount = reports.filter((r) => r.status === 'completed').length
  const stats: [string, number][] = [
    ['feedbackPage.totalReports', reports.length],
    ['feedbackPage.inProgress', openCount],
    ['feedbackPage.completed', doneCount],
  ]

  return (
    <main className='mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6'>
      <header className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-2'>
          <div className='flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <MessageSquareText className='size-5' />
          </div>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('feedbackPage.title')}</h1>
          <p className='max-w-2xl text-sm text-muted-foreground'>{t('feedbackPage.subtitle')}</p>
        </div>
        <div className='grid grid-cols-3 gap-2 sm:min-w-72'>
          {stats.map(([label, value]) => (
            <Card key={label} className='gap-2 py-4'>
              <CardContent className='px-3'>
                <p className='text-xs text-muted-foreground'>{t(label)}</p>
                <p className='mt-1 text-2xl font-semibold'>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </header>

      <nav className='flex gap-2 border-b'>
        <TabButton active={tab === 'form'} onClick={() => setTab('form')}>
          {t('feedbackPage.newReport')}
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          {t('feedbackPage.history')} <span className='ms-1 rounded-full bg-muted px-2 py-0.5 text-xs'>{reports.length}</span>
        </TabButton>
      </nav>

      {tab === 'form' ? (
        <FeedbackForm
          onCreated={(report) => {
            setReports((current) => [report, ...current])
            setTab('history')
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('feedbackPage.historyTitle')}</CardTitle>
            <CardDescription>{t('feedbackPage.historyDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className='flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground'>
                <Loader2 className='size-4 animate-spin' />
                {t('feedbackPage.loading')}
              </p>
            ) : loadError ? (
              <div role='alert' className='flex flex-col items-center gap-3 rounded-xl border border-destructive/30 px-6 py-10 text-center text-sm'>
                <AlertCircle className='size-6 text-destructive' />
                <p>{loadError}</p>
                <Button variant='outline' onClick={reload}>
                  {t('feedbackPage.retry')}
                </Button>
              </div>
            ) : reports.length === 0 ? (
              <div className='flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center'>
                <FileText className='mb-4 size-8 text-muted-foreground' />
                <h3 className='font-medium'>{t('feedbackPage.emptyTitle')}</h3>
                <p className='mt-1 max-w-sm text-sm text-muted-foreground'>{t('feedbackPage.emptyDescription')}</p>
                <Button className='mt-5' onClick={() => setTab('form')}>
                  {t('feedbackPage.createFirst')}
                </Button>
              </div>
            ) : (
              <div className='space-y-4'>
                {reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onRated={(updated) => setReports((current) => current.map((r) => (r.id === updated.id ? updated : r)))}
                    onDelete={() => setToDelete(report)}
                  />
                ))}
                <p className='text-center text-xs text-muted-foreground'>{t('feedbackPage.deleteHint')}</p>
                <div className='text-center'>
                  <Button variant='outline' onClick={() => setTab('form')}>
                    {t('feedbackPage.sendAnother')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className='text-center text-xs text-muted-foreground'>{t('feedbackPage.footerNote')}</p>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && !deleting && setToDelete(null)}
        title={t('feedbackPage.deleteTitle')}
        desc={t('feedbackPage.deleteDescription', { id: toDelete?.id ?? '' })}
        confirmText={t('feedbackPage.deleteConfirm')}
        cancelBtnText={t('feedbackPage.cancel')}
        destructive
        isLoading={deleting}
        handleConfirm={() => void confirmDelete()}
      />
    </main>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={`border-b-2 px-4 py-3 text-sm font-medium ${active ? 'border-primary' : 'border-transparent text-muted-foreground'}`}
    >
      {children}
    </button>
  )
}

function FeedbackForm({ onCreated }: { onCreated: (report: Feedback) => void }) {
  const { t } = useTranslation()
  const [category, setCategory] = useState<FeedbackCategory | ''>('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [page, setPage] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [fileError, setFileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Free the preview's object URL when it is replaced or the form goes away.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  function setFile(file: File | null) {
    setAttachment(file)
    setPreview(file ? URL.createObjectURL(file) : '')
  }

  function pickFile(file: File | null) {
    setFileError('')
    if (!file) return setFile(null)
    if (!ATTACHMENT_TYPES.includes(file.type)) {
      setFile(null)
      return setFileError(t('feedbackPage.fileType'))
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFile(null)
      return setFileError(t('feedbackPage.fileTooLarge'))
    }
    setFile(file)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!category || !page.trim() || submitting) return
    if (description.trim().length < 10) return setError(t('feedbackPage.descriptionTooShort'))
    setSubmitting(true)
    setError('')
    try {
      const report = await createFeedback({
        category,
        subject: subject.trim(),
        description: description.trim(),
        related_page: page.trim(),
        attachment,
      })
      toast.success(t('feedbackPage.submitSuccess'))
      setCategory('')
      setSubject('')
      setDescription('')
      setPage('')
      setFile(null)
      onCreated({ ...report, replies: report.replies ?? [] })
    } catch (err) {
      setError(errorText(err, t('feedbackPage.submitError')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('feedbackPage.formTitle')}</CardTitle>
        <CardDescription>{t('feedbackPage.formDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className='space-y-6'>
          <div className='grid gap-5 md:grid-cols-2'>
            <div className='space-y-2'>
              <label htmlFor='fb-category' className='text-sm font-medium'>
                {t('feedbackPage.category')}
              </label>
              <select
                id='fb-category'
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                required
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
              >
                <option value='' disabled>
                  {t('feedbackPage.selectCategory')}
                </option>
                {FEEDBACK_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {t(`feedbackPage.categories.${item}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-2'>
              <label htmlFor='fb-page' className='text-sm font-medium'>
                {t('feedbackPage.relatedPage')}
              </label>
              <Input id='fb-page' value={page} onChange={(e) => setPage(e.target.value)} maxLength={255} placeholder={t('feedbackPage.relatedPagePlaceholder')} required />
            </div>
          </div>
          <div className='space-y-2'>
            <label htmlFor='fb-subject' className='text-sm font-medium'>
              {t('feedbackPage.subject')}
            </label>
            <Input id='fb-subject' value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder={t('feedbackPage.subjectPlaceholder')} />
          </div>
          <div className='space-y-2'>
            <label htmlFor='fb-description' className='text-sm font-medium'>
              {t('feedbackPage.description')}
            </label>
            <Textarea
              id='fb-description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minLength={10}
              rows={6}
              maxLength={5000}
              placeholder={t('feedbackPage.descriptionPlaceholder')}
              required
            />
            <p className='text-right text-xs text-muted-foreground'>{description.length}/5000</p>
          </div>
          <div className='space-y-2'>
            <label htmlFor='fb-file' className='text-sm font-medium'>
              {t('feedbackPage.attachment')}
            </label>
            {attachment && preview ? (
              <div className='flex items-start gap-3 rounded-lg border p-3'>
                <img src={preview} alt={attachment.name} className='size-20 rounded-md border object-cover' />
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>{attachment.name}</p>
                  <p className='text-xs text-muted-foreground'>{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button type='button' variant='ghost' size='icon' aria-label={t('feedbackPage.removeAttachment')} onClick={() => setFile(null)}>
                  <X className='size-4' />
                </Button>
              </div>
            ) : (
              <label htmlFor='fb-file' className='flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 hover:bg-muted/50'>
                <span className='flex size-10 items-center justify-center rounded-lg bg-muted'>
                  <Paperclip className='size-5' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-medium'>{t('feedbackPage.attachmentPrompt')}</span>
                  <span className='text-xs text-muted-foreground'>{t('feedbackPage.attachmentHelp')}</span>
                </span>
                <span className='text-sm font-medium text-primary'>{t('feedbackPage.browse')}</span>
              </label>
            )}
            <input
              id='fb-file'
              type='file'
              accept={ATTACHMENT_TYPES.join(',')}
              className='sr-only'
              onChange={(e) => {
                pickFile(e.target.files?.[0] || null)
                e.target.value = ''
              }}
            />
            {fileError && <p className='text-xs text-destructive'>{fileError}</p>}
          </div>
          {error && (
            <div role='alert' className='flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'>
              <AlertCircle className='mt-0.5 size-4 shrink-0' />
              <p>{error}</p>
            </div>
          )}
          <div className='flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-xs text-muted-foreground'>{t('feedbackPage.requiredFields')}</p>
            <Button type='submit' className='gap-2' disabled={submitting}>
              {submitting ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
              {submitting ? t('feedbackPage.submitting') : t('feedbackPage.submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: Feedback['status'] }) {
  const { t } = useTranslation()
  const tone =
    status === 'completed'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : status === 'rejected'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  const Icon = status === 'completed' ? CheckCircle2 : status === 'rejected' ? AlertCircle : Clock3
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
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
      <p role='alert' className='mt-4 flex items-center gap-2 text-xs text-destructive'>
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
    <a href={url} target='_blank' rel='noreferrer' className='mt-4 inline-block' title={t('feedbackPage.openAttachment')}>
      <img src={url} alt={t('feedbackPage.attachment')} className='max-h-48 max-w-full rounded-lg border object-contain' />
    </a>
  )
}

function ReportCard({ report, onRated, onDelete }: { report: Feedback; onRated: (report: Feedback) => void; onDelete: () => void }) {
  const { t } = useTranslation()
  const replies = report.replies ?? []
  return (
    <article className='rounded-xl border p-4 sm:p-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0 space-y-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='rounded-md bg-muted px-2 py-1 text-xs font-medium'>#{report.id}</span>
            <span className='text-xs text-muted-foreground'>{t(`feedbackPage.categories.${report.category}`)}</span>
          </div>
          {report.subject && <h3 className='font-semibold'>{report.subject}</h3>}
          <p className='whitespace-pre-wrap text-sm text-muted-foreground'>{report.description}</p>
        </div>
        <div className='flex shrink-0 items-center gap-2 self-start'>
          <StatusBadge status={report.status} />
          {isFinished(report.status) && (
            <Button variant='ghost' size='icon' className='text-destructive hover:text-destructive' aria-label={t('feedbackPage.delete')} title={t('feedbackPage.delete')} onClick={onDelete}>
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
          <p className='text-muted-foreground'>{t('feedbackPage.noReplyYet')}</p>
        ) : (
          replies.map((reply) => (
            <div key={reply.id}>
              <p className='whitespace-pre-wrap'>{reply.message}</p>
              <p className='mt-1 text-[11px] text-muted-foreground'>{new Date(reply.created_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>

      {report.status === 'completed' && (
        <div className='mt-4 border-t pt-4'>
          {report.rating > 0 ? <RatingSummary report={report} /> : <RatingForm report={report} onRated={onRated} />}
        </div>
      )}
    </article>
  )
}

function Stars({ value, onPick }: { value: number; onPick?: (value: number) => void }) {
  const { t } = useTranslation()
  return (
    <div className='flex items-center gap-1'>
      {[1, 2, 3, 4, 5].map((n) =>
        onPick ? (
          <button
            key={n}
            type='button'
            aria-label={t('feedbackPage.starRating', { count: n })}
            aria-pressed={value === n}
            onClick={() => onPick(n)}
            className='rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring'
          >
            <Star className={`size-6 ${n <= value ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/40'}`} />
          </button>
        ) : (
          <Star key={n} className={`size-5 ${n <= value ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/40'}`} />
        ),
      )}
    </div>
  )
}

function RatingSummary({ report }: { report: Feedback }) {
  const { t } = useTranslation()
  return (
    <div className='space-y-2 text-sm'>
      <p className='font-medium'>{t('feedbackPage.yourRating')}</p>
      <div className='flex items-center gap-2'>
        <Stars value={report.rating} />
        <span className='text-muted-foreground'>{t('feedbackPage.ratingValue', { count: report.rating })}</span>
      </div>
      {(report.rating_reasons ?? []).length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {(report.rating_reasons ?? []).map((reason) => (
            <span key={reason} className='rounded-full bg-muted px-3 py-1 text-xs'>
              {t(`feedbackPage.ratingReasons.${reason}`, { defaultValue: reason })}
            </span>
          ))}
        </div>
      )}
      {report.rating_comment && <p className='whitespace-pre-wrap text-muted-foreground'>{report.rating_comment}</p>}
    </div>
  )
}

function RatingForm({ report, onRated }: { report: Feedback; onRated: (report: Feedback) => void }) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [reasons, setReasons] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const commentLength = comment.trim().length
  const commentInvalid = commentLength > 0 && commentLength < 10

  async function save() {
    if (rating < 1 || commentInvalid || saving) return
    setSaving(true)
    try {
      const draft = { rating, rating_reasons: reasons, rating_comment: comment.trim() }
      await rateFeedback(report.id, draft)
      toast.success(t('feedbackPage.ratingSaved'))
      onRated({ ...report, ...draft })
    } catch (error) {
      toast.error(errorText(error, t('feedbackPage.ratingError')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-3'>
      <div>
        <p className='text-sm font-medium'>{t('feedbackPage.rateAdminReply')}</p>
        <p className='mt-1 text-xs text-muted-foreground'>{t('feedbackPage.ratingOptional')}</p>
      </div>
      <Stars value={rating} onPick={setRating} />
      {rating > 0 && (
        <>
          <div>
            <p className='text-xs font-medium text-muted-foreground'>{t('feedbackPage.ratingReasonsLabel')}</p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {RATING_REASONS.map((reason) => {
                const picked = reasons.includes(reason)
                return (
                  <button
                    key={reason}
                    type='button'
                    aria-pressed={picked}
                    onClick={() => setReasons((current) => (picked ? current.filter((r) => r !== reason) : [...current, reason]))}
                    className={`rounded-full border px-3 py-1 text-xs ${picked ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {t(`feedbackPage.ratingReasons.${reason}`)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className='space-y-1'>
            <Textarea
              aria-label={t('feedbackPage.ratingComment')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={t('feedbackPage.ratingCommentPlaceholder')}
            />
            <p className={`text-xs ${commentInvalid ? 'text-destructive' : 'text-muted-foreground'}`}>{t('feedbackPage.ratingCommentHint')}</p>
          </div>
          <Button size='sm' disabled={saving || commentInvalid} onClick={() => void save()}>
            {saving && <Loader2 className='size-4 animate-spin' />}
            {saving ? t('feedbackPage.savingRating') : t('feedbackPage.saveRating')}
          </Button>
        </>
      )}
    </div>
  )
}
