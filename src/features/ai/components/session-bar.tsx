import type { ReactNode } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export type SessionStatus = 'ready' | 'working' | 'chooseAgent' | 'chooseModel'

type Props = {
  status: SessionStatus
  onNewChat: () => void
  newChatDisabled?: boolean
  /** The controls that set up the session: agent, model and workspace. */
  children: ReactNode
}

/**
 * The one bar over the conversation, in two fixed rows so it reads the same at
 * every width: the screen's name with how the session stands and the way to start
 * over, then what the session is made of (agent, model, workspace) in one line.
 * Its left edge is the conversation's and the composer's: one column, one edge.
 */
export function SessionBar({ status, onNewChat, newChatDisabled, children }: Props) {
  const { t } = useTranslation()

  return (
    <header className='shrink-0 border-b border-border bg-background px-4 sm:px-6'>
      <div className='mx-auto w-full max-w-4xl py-2.5 sm:py-3'>
        <div className='flex items-center justify-between gap-3'>
          <h1 className='text-base font-semibold'>{t('agentic.title')}</h1>

          <div className='flex items-center gap-3'>
            <p role='status' className='flex items-center gap-2 text-xs text-muted-foreground' data-testid='session-status' data-status={status}>
              {status === 'working' ? (
                <Loader2 aria-hidden='true' className='size-3.5 animate-spin' />
              ) : (
                <span aria-hidden='true' className={`size-2 rounded-full ${status === 'ready' ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
              )}
              {t(`agentic.bar.${status}`)}
            </p>

            <Button type='button' variant='outline' size='sm' onClick={onNewChat} disabled={newChatDisabled}>
              <Plus aria-hidden='true' className='size-4' />
              {t('agentic.newChat')}
            </Button>
          </div>
        </div>

        <div className='mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center'>{children}</div>
      </div>
    </header>
  )
}
