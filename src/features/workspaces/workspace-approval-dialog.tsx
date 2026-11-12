import { useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApprovalCountdown } from '@/features/desktop-runtime/approval-countdown'
import { isExpired } from '@/features/desktop-runtime/approval-details'
import type { ToolApproval } from './data/api'
import type { ApprovalDecision } from './tool-runner'
import { PublishApprovalDetails } from './publish-approval-details'

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
  const text = (key: string) => (typeof approval.arguments[key] === 'string' ? (approval.arguments[key] as string) : null)
  const preview = text('content_preview')
  // An edit shows the text it replaces and what replaces it, so the person sees the exact change.
  const oldText = text('old_text_preview')
  const newText = text('new_text_preview')

  return (
    <Dialog open onOpenChange={(open) => { if (!open) decide('deny') }}>
      <DialogContent role='dialog' aria-label={t('workspacePage.approval.title')} className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'><ShieldCheck className='size-5' />{t('workspacePage.approval.title')}</DialogTitle>
          <DialogDescription>{t('workspacePage.approval.description', { agent: agentName, workspace: approval.workspace_name })}</DialogDescription>
        </DialogHeader>
        <div className='space-y-3 text-sm'>
          <p className='font-medium'>{approval.summary}</p>
          {approval.tool === 'workspace.publish' && <PublishApprovalDetails args={approval.arguments} />}
          {typeof approval.arguments.path === 'string' && <p className='text-muted-foreground'>{t('workspacePage.approval.file')}: <code>{approval.arguments.path}</code></p>}
          {preview !== null && <pre className='max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 text-xs whitespace-pre-wrap'>{preview}</pre>}
          {oldText !== null && (
            <div className='space-y-1' data-testid='edit-old'>
              <p className='text-xs font-medium text-muted-foreground'>{t('workspacePage.approval.replaces')}</p>
              <pre className='max-h-32 overflow-auto rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs whitespace-pre-wrap'>{oldText}</pre>
            </div>
          )}
          {newText !== null && (
            <div className='space-y-1' data-testid='edit-new'>
              <p className='text-xs font-medium text-muted-foreground'>{t('workspacePage.approval.replacesWith')}</p>
              {newText ? (
                <pre className='max-h-32 overflow-auto rounded-md border border-border bg-emerald-500/10 p-2 text-xs whitespace-pre-wrap'>{newText}</pre>
              ) : (
                <p className='text-xs text-muted-foreground'>{t('workspacePage.approval.removed')}</p>
              )}
            </div>
          )}
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
