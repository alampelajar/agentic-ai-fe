import { useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApprovalCountdown } from '@/features/desktop-runtime/approval-countdown'
import { isExpired } from '@/features/desktop-runtime/approval-details'
import type { ToolApproval } from './data/api'
import type { ApprovalDecision } from './tool-runner'

type Props = {
  approval: ToolApproval
  agentName: string
  onDecision: (decision: ApprovalDecision) => void
}

/**
 * Asks the user to allow a workspace tool that changes files or runs a command.
 * It reports exactly one decision. Past the deadline, Allow reports an expiry and
 * nothing is sent to approve.
 */
export function WorkspaceApprovalDialog({ approval, agentName, onDecision }: Props) {
  const { t, i18n } = useTranslation()
  const decided = useRef(false)
  const [settled, setSettled] = useState(false)

  const decide = (decision: ApprovalDecision) => {
    if (decided.current) return
    decided.current = true
    setSettled(true)
    onDecision(decision)
  }
  const preview = typeof approval.arguments.content_preview === 'string' ? approval.arguments.content_preview : null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) decide('deny') }}>
      <DialogContent role='dialog' aria-label={t('workspacePage.approval.title')} className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'><ShieldCheck className='size-5' />{t('workspacePage.approval.title')}</DialogTitle>
          <DialogDescription>{t('workspacePage.approval.description', { agent: agentName, workspace: approval.workspace_name })}</DialogDescription>
        </DialogHeader>
        <div className='space-y-3 text-sm'>
          <p className='font-medium'>{approval.summary}</p>
          {typeof approval.arguments.path === 'string' && <p className='text-muted-foreground'>{t('workspacePage.approval.file')}: <code>{approval.arguments.path}</code></p>}
          {preview !== null && <pre className='max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 text-xs whitespace-pre-wrap'>{preview}</pre>}
          <ApprovalCountdown expiresAt={approval.expires_at} lang={i18n.language === 'id' ? 'id' : 'en'} onExpire={() => decide('expired')} />
        </div>
        <DialogFooter>
          <Button variant='outline' disabled={settled} onClick={() => decide('deny')}>{t('workspacePage.approval.deny')}</Button>
          <Button disabled={settled} onClick={() => decide(isExpired(approval.expires_at) ? 'expired' : 'allow')}>{t('workspacePage.approval.allow')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
