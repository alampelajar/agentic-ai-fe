import { useRef, useState } from 'react'
import { ShieldCheck, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { diffLines } from '@/features/workspaces/line-diff'
import { compactDiff, runnerActionCommands, type LocalRunnerApproval } from './local-runner-approval'

const marker = { add: '+', del: '−', same: ' ' } as const

function WriteDetails({ request }: { request: Extract<LocalRunnerApproval, { kind: 'write' }> }) {
  const { t } = useTranslation()
  const isNew = request.before === null
  const diff = typeof request.before === 'string' ? diffLines(request.before, request.after) : null
  const added = diff?.filter((line) => line.type === 'add').length ?? 0
  const removed = diff?.filter((line) => line.type === 'del').length ?? 0

  let note: string
  if (isNew) note = t('localRunnerApproval.newFile')
  else if (request.before === undefined) note = t('localRunnerApproval.readFailed')
  else if (!diff) note = t('localRunnerApproval.tooLarge')
  else if (added === 0 && removed === 0) note = t('localRunnerApproval.unchanged')
  else note = t('localRunnerApproval.changedLines', { added, removed })

  return (
    <div className='space-y-2'>
      <p className='text-muted-foreground'>
        {t('localRunnerApproval.file')}: <code className='break-all'>{request.path}</code>
      </p>
      <p className='text-xs text-muted-foreground'>{note}</p>
      {diff && !isNew ? (
        <pre aria-label={t('localRunnerApproval.changes')} className='max-h-72 overflow-auto rounded-md border bg-muted/40 p-2 text-xs'>
          {compactDiff(diff).map((row, index) =>
            row.type === 'gap' ? (
              <div key={index} className='text-muted-foreground'>
                {t('localRunnerApproval.unchangedLines', { count: row.count })}
              </div>
            ) : (
              <div
                key={index}
                data-line={row.type}
                className={cn(
                  'break-all whitespace-pre-wrap',
                  row.type === 'add' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  row.type === 'del' && 'bg-destructive/10 text-destructive'
                )}
              >
                {marker[row.type]} {row.text}
              </div>
            )
          )}
        </pre>
      ) : (
        <pre aria-label={t('localRunnerApproval.content')} className='max-h-72 overflow-auto rounded-md border bg-muted/40 p-2 text-xs break-all whitespace-pre-wrap'>
          {request.after || t('localRunnerApproval.emptyFile')}
        </pre>
      )}
    </div>
  )
}

function ExecuteDetails({ request }: { request: Extract<LocalRunnerApproval, { kind: 'execute' }> }) {
  const { t } = useTranslation()
  const command = runnerActionCommands[request.action] ?? request.action
  return (
    <div className='space-y-2'>
      <p className='text-muted-foreground'>{t('localRunnerApproval.command')}:</p>
      <pre className='rounded-md border bg-muted/40 p-2 text-xs break-all whitespace-pre-wrap'>{command}</pre>
      <p className='text-muted-foreground'>
        {t('localRunnerApproval.runtime')}:{' '}
        {request.runtime === 'docker' ? t('localRunnerApproval.runtimeDocker') : t('localRunnerApproval.runtimeNative')}
      </p>
      {request.runtime === 'native' && (
        <p className='flex gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400'>
          <TriangleAlert className='mt-0.5 size-4 shrink-0' />
          <span>{t('localRunnerApproval.nativeWarning')}</span>
        </p>
      )}
    </div>
  )
}

type Props = {
  request: LocalRunnerApproval
  agentName: string
  onDecision: (allowed: boolean) => void
}

/**
 * Asks the person before the Local Agent Runner writes a file or runs a command on
 * their computer. A write shows exactly what changes; a command shows what runs and
 * where. It reports exactly one decision; closing the dialog denies.
 */
export function LocalRunnerApprovalDialog({ request, agentName, onDecision }: Props) {
  const { t } = useTranslation()
  const decided = useRef(false)
  const [settled, setSettled] = useState(false)

  const decide = (allowed: boolean) => {
    if (decided.current) return
    decided.current = true
    setSettled(true)
    onDecision(allowed)
  }

  const title = request.kind === 'write' ? t('localRunnerApproval.titleWrite') : t('localRunnerApproval.titleExecute')
  return (
    <Dialog open onOpenChange={(open) => { if (!open) decide(false) }}>
      <DialogContent aria-label={title} className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ShieldCheck className='size-5' />
            {title}
          </DialogTitle>
          <DialogDescription>
            {t('localRunnerApproval.description', { agent: agentName, workspace: request.workspace })}
          </DialogDescription>
        </DialogHeader>
        <div className='min-w-0 text-sm'>
          {request.kind === 'write' ? <WriteDetails request={request} /> : <ExecuteDetails request={request} />}
        </div>
        <DialogFooter>
          <Button variant='outline' disabled={settled} onClick={() => decide(false)}>
            {t('localRunnerApproval.deny')}
          </Button>
          <Button disabled={settled} onClick={() => decide(true)}>
            {t('localRunnerApproval.allow')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
