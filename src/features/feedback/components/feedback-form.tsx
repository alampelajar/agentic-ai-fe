import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, Loader2, Paperclip, Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ATTACHMENT_TYPES,
  FEEDBACK_CATEGORIES,
  MAX_ATTACHMENT_BYTES,
  createFeedback,
  type Feedback,
  type FeedbackCategory,
} from '../data/api'
import { errorText } from '../lib/error-text'

export function FeedbackForm({
  onCreated,
}: {
  onCreated: (report: Feedback) => void
}) {
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
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview]
  )

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
    if (description.trim().length < 10)
      return setError(t('feedbackPage.descriptionTooShort'))
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
                onChange={(e) =>
                  setCategory(e.target.value as FeedbackCategory)
                }
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
              <Input
                id='fb-page'
                value={page}
                onChange={(e) => setPage(e.target.value)}
                maxLength={255}
                placeholder={t('feedbackPage.relatedPagePlaceholder')}
                required
              />
            </div>
          </div>
          <div className='space-y-2'>
            <label htmlFor='fb-subject' className='text-sm font-medium'>
              {t('feedbackPage.subject')}
            </label>
            <Input
              id='fb-subject'
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              placeholder={t('feedbackPage.subjectPlaceholder')}
            />
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
            <p className='text-right text-xs text-muted-foreground'>
              {description.length}/5000
            </p>
          </div>
          <div className='space-y-2'>
            <label htmlFor='fb-file' className='text-sm font-medium'>
              {t('feedbackPage.attachment')}
            </label>
            {attachment && preview ? (
              <div className='flex items-start gap-3 rounded-lg border p-3'>
                <img
                  src={preview}
                  alt={attachment.name}
                  className='size-20 rounded-md border object-cover'
                />
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>
                    {attachment.name}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {(attachment.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label={t('feedbackPage.removeAttachment')}
                  onClick={() => setFile(null)}
                >
                  <X className='size-4' />
                </Button>
              </div>
            ) : (
              <label
                htmlFor='fb-file'
                className='flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 hover:bg-muted/50'
              >
                <span className='flex size-10 items-center justify-center rounded-lg bg-muted'>
                  <Paperclip className='size-5' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-medium'>
                    {t('feedbackPage.attachmentPrompt')}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {t('feedbackPage.attachmentHelp')}
                  </span>
                </span>
                <span className='text-sm font-medium text-primary'>
                  {t('feedbackPage.browse')}
                </span>
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
            {fileError && (
              <p className='text-xs text-destructive'>{fileError}</p>
            )}
          </div>
          {error && (
            <div
              role='alert'
              className='flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'
            >
              <AlertCircle className='mt-0.5 size-4 shrink-0' />
              <p>{error}</p>
            </div>
          )}
          <div className='flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-xs text-muted-foreground'>
              {t('feedbackPage.requiredFields')}
            </p>
            <Button type='submit' className='gap-2' disabled={submitting}>
              {submitting ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Send className='size-4' />
              )}
              {submitting
                ? t('feedbackPage.submitting')
                : t('feedbackPage.submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
