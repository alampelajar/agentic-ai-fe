import { useState, type FormEvent } from 'react'
import { CheckCircle2, Clock, Loader2, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AppealError,
  sendDeletionAppeal,
  type AppealErrorCode,
  type PendingDeletion,
} from '../data/api'

const MIN_LENGTH = 10
const MAX_LENGTH = 2000

/**
 * Shown instead of the sign-in form when the right password (or Google) opens an
 * account that is waiting to be deleted: when it will be removed, and a form to ask
 * an admin to restore it.
 */
export function PendingDeletionNotice({
  pending,
  onBack,
}: {
  pending: PendingDeletion
  onBack: () => void
}) {
  const { t, i18n } = useTranslation()
  const [writing, setWriting] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<AppealErrorCode | null>(null)

  const date = new Date(pending.deletesAt).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const tooShort = message.trim().length < MIN_LENGTH

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (tooShort || sending) return
    setSending(true)
    setError(null)
    try {
      await sendDeletionAppeal(pending.appealToken, message.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof AppealError ? err.code : 'fallback')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className='space-y-5'>
      <div className='space-y-2 rounded-lg border bg-amber-500/10 p-4'>
        <p className='flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400'>
          <Clock className='size-4 shrink-0' />
          {t('authPage.pendingDeletion.title')}
        </p>
        <p className='text-sm'>
          {t('authPage.pendingDeletion.description', { date })}
        </p>
        {!sent && (
          <p className='text-sm text-muted-foreground'>
            {t('authPage.pendingDeletion.restoreHint')}
          </p>
        )}
      </div>

      {sent ? (
        <div
          role='status'
          className='space-y-1 rounded-lg border bg-emerald-500/10 p-4'
        >
          <p className='flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='size-4 shrink-0' />
            {t('authPage.pendingDeletion.sentTitle')}
          </p>
          <p className='text-sm text-muted-foreground'>
            {t('authPage.pendingDeletion.sentDescription')}
          </p>
        </div>
      ) : writing ? (
        <form onSubmit={handleSend} className='space-y-3'>
          <div className='space-y-2'>
            <Label htmlFor='appeal-message'>
              {t('authPage.pendingDeletion.messageLabel')}
            </Label>
            <Textarea
              id='appeal-message'
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t('authPage.pendingDeletion.messagePlaceholder')}
              maxLength={MAX_LENGTH}
              rows={5}
              disabled={sending}
              aria-describedby='appeal-message-help'
              autoFocus
            />
            <p
              id='appeal-message-help'
              className='text-xs text-muted-foreground'
            >
              {t('authPage.pendingDeletion.messageHelp')}
            </p>
          </div>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {t(`authPage.pendingDeletion.errors.${error}`)}
            </p>
          )}
          <div className='flex flex-col gap-2 sm:flex-row-reverse'>
            <Button
              type='submit'
              disabled={tooShort || sending}
              className='h-11 sm:flex-1'
            >
              {sending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Send className='size-4' />
              )}
              {sending
                ? t('authPage.pendingDeletion.sending')
                : t('authPage.pendingDeletion.send')}
            </Button>
            <Button
              type='button'
              variant='outline'
              disabled={sending}
              onClick={() => setWriting(false)}
              className='h-11 sm:flex-1'
            >
              {t('authPage.pendingDeletion.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type='button'
          onClick={() => setWriting(true)}
          className='h-11 w-full'
        >
          <Send className='size-4' />
          {t('authPage.pendingDeletion.writeMessage')}
        </Button>
      )}

      <Button type='button' variant='ghost' onClick={onBack} className='w-full'>
        {t('authPage.pendingDeletion.back')}
      </Button>
    </div>
  )
}
