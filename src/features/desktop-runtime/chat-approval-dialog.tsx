import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DesktopAction } from './api'
import { ApprovalCountdown } from './approval-countdown'
import { ApprovalDetailList } from './approval-detail-list'
import { describeDesktopAction, isExpired, type WindowInfo } from './approval-details'

/** How the user (or the clock) settled an approval. Exactly one is reported per dialog. */
export type ApprovalDecision = 'once' | 'deny' | 'expired' | 'emergency'

/**
 * The approval dialog the AI Chat shows before a desktop action runs. It reports
 * one decision and then locks, whatever happens next: a second click, the
 * countdown reaching zero right after Allow Once, or Emergency Stop pressed twice
 * cannot report again. Mount it with a key that changes per approval.
 */
export function ChatApprovalDialog({
  action,
  agentName,
  skill,
  windows,
  onDecision,
  onEmergencyStop,
}: {
  action: DesktopAction
  agentName: string
  skill: string
  windows?: WindowInfo[]
  onDecision: (decision: ApprovalDecision) => void
  onEmergencyStop: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'id').startsWith('en') ? 'en' : 'id'
  const decided = useRef(false)
  const [settled, setSettled] = useState(false)
  const decide = (decision: ApprovalDecision) => {
    if (decided.current) return false
    decided.current = true
    setSettled(true)
    onDecision(decision)
    return true
  }
  // Allow Once after the deadline is an expiry, never an approval: nothing is sent to the runner.
  const allow = () => decide(isExpired(action.expires_at) ? 'expired' : 'once')
  const emergencyStop = () => {
    if (decided.current) return
    onEmergencyStop()
    decide('emergency')
  }

  return (
    // design-system-ignore: the dimmed backdrop matches the dialog overlay in components/ui
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4' role='dialog' aria-modal='true' aria-label={t('desktopRuntime.chatApproval.label')}>
      <div className='w-full max-w-lg rounded-xl border bg-background p-5 shadow-xl'>
        <div className='mb-4 flex items-start justify-between gap-4'>
          <div><h2 className='text-lg font-semibold'>{t('desktopRuntime.chatApproval.title')}</h2><p className='text-sm text-muted-foreground'>{t('desktopRuntime.chatApproval.description')}</p></div>
          <span className='rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-400'>{t('desktopRuntime.chatApproval.waiting')}</span>
        </div>
        <dl className='grid gap-2 rounded-lg bg-muted/40 p-3 text-sm'>
          <div><dt className='text-muted-foreground'>{t('desktopRuntime.chatApproval.agent')}</dt><dd className='font-medium'>{agentName}</dd></div>
          <div><dt className='text-muted-foreground'>{t('desktopRuntime.chatApproval.skill')}</dt><dd className='font-medium'>{skill}</dd></div>
          <div><dt className='text-muted-foreground'>{t('desktopRuntime.chatApproval.tool')}</dt><dd className='font-medium'>{action.action}</dd></div>
          <div><dt className='text-muted-foreground'>{t('desktopRuntime.chatApproval.reason')}</dt><dd>{action.reason}</dd></div>
        </dl>
        <div className='mt-2'>
          <ApprovalDetailList key={action.id} lang={lang} details={describeDesktopAction(action, { windows, lang })} />
        </div>
        <ApprovalCountdown expiresAt={action.expires_at} lang={lang} onExpire={() => decide('expired')} />
        <p className='mt-4 text-xs text-muted-foreground'>{t('desktopRuntime.chatApproval.note')}</p>
        <div className='mt-5 flex flex-wrap justify-end gap-2'>
          <button type='button' disabled={settled} className='rounded-md border px-3 py-2 text-sm disabled:opacity-50' onClick={() => decide('deny')}>{t('desktopRuntime.chatApproval.deny')}</button>
          <button type='button' disabled={settled} className='rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50' onClick={allow}>{t('desktopRuntime.chatApproval.allowOnce')}</button>
        </div>
        <button type='button' disabled={settled} className='mt-3 w-full rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive disabled:opacity-50' onClick={emergencyStop}>{t('desktopRuntime.chatApproval.emergencyStop')}</button>
      </div>
    </div>
  )
}
