import { useState } from 'react'
import { Loader2, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RATING_REASONS, rateFeedback, type Feedback } from '../data/api'
import { errorText } from '../lib/error-text'

function Stars({
  value,
  onPick,
}: {
  value: number
  onPick?: (value: number) => void
}) {
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
            <Star
              className={`size-6 ${n <= value ? 'fill-primary text-primary' : 'text-muted-foreground/40'}`}
            />
          </button>
        ) : (
          <Star
            key={n}
            className={`size-5 ${n <= value ? 'fill-primary text-primary' : 'text-muted-foreground/40'}`}
          />
        )
      )}
    </div>
  )
}

export function RatingSummary({ report }: { report: Feedback }) {
  const { t } = useTranslation()
  return (
    <div className='space-y-2 text-sm'>
      <p className='font-medium'>{t('feedbackPage.yourRating')}</p>
      <div className='flex items-center gap-2'>
        <Stars value={report.rating} />
        <span className='text-muted-foreground'>
          {t('feedbackPage.ratingValue', { count: report.rating })}
        </span>
      </div>
      {(report.rating_reasons ?? []).length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {(report.rating_reasons ?? []).map((reason) => (
            <span
              key={reason}
              className='rounded-full bg-muted px-3 py-1 text-xs'
            >
              {t(`feedbackPage.ratingReasons.${reason}`, {
                defaultValue: reason,
              })}
            </span>
          ))}
        </div>
      )}
      {report.rating_comment && (
        <p className='whitespace-pre-wrap text-muted-foreground'>
          {report.rating_comment}
        </p>
      )}
    </div>
  )
}

export function RatingForm({
  report,
  onRated,
}: {
  report: Feedback
  onRated: (report: Feedback) => void
}) {
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
      const draft = {
        rating,
        rating_reasons: reasons,
        rating_comment: comment.trim(),
      }
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
        <p className='text-sm font-medium'>
          {t('feedbackPage.rateAdminReply')}
        </p>
        <p className='mt-1 text-xs text-muted-foreground'>
          {t('feedbackPage.ratingOptional')}
        </p>
      </div>
      <Stars value={rating} onPick={setRating} />
      {rating > 0 && (
        <>
          <div>
            <p className='text-xs font-medium text-muted-foreground'>
              {t('feedbackPage.ratingReasonsLabel')}
            </p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {RATING_REASONS.map((reason) => {
                const picked = reasons.includes(reason)
                return (
                  <button
                    key={reason}
                    type='button'
                    aria-pressed={picked}
                    onClick={() =>
                      setReasons((current) =>
                        picked
                          ? current.filter((r) => r !== reason)
                          : [...current, reason]
                      )
                    }
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
            <p
              className={`text-xs ${commentInvalid ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {t('feedbackPage.ratingCommentHint')}
            </p>
          </div>
          <Button
            size='sm'
            disabled={saving || commentInvalid}
            onClick={() => void save()}
          >
            {saving && <Loader2 className='size-4 animate-spin' />}
            {saving
              ? t('feedbackPage.savingRating')
              : t('feedbackPage.saveRating')}
          </Button>
        </>
      )}
    </div>
  )
}
