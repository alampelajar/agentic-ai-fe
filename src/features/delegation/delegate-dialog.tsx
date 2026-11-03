import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DELEGATION_INSTRUCTION_MAX, delegateToAgent, getDelegationAgents, type DelegationAgent } from './data/api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The agent the user is talking to now. It is not offered as a target. */
  currentAgentId: number | null
  taskId: number | null
  defaultInstruction: string
  /** The conversation excerpt to send, or '' when there is none. */
  context: string
  onDelegated: (result: { agent: DelegationAgent; message: string }) => void
}

const selectClass = 'h-9 rounded-md border bg-background px-3 text-sm'

export function DelegateDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <DelegateForm onCancel={() => onOpenChange(false)} {...rest} />}
    </Dialog>
  )
}

function DelegateForm({ currentAgentId, taskId, defaultInstruction, context, onDelegated, onCancel }: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const { t } = useTranslation()
  const [agents, setAgents] = useState<DelegationAgent[] | null>(null)
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [target, setTarget] = useState('')
  const [instruction, setInstruction] = useState(defaultInstruction)
  const [withContext, setWithContext] = useState(context !== '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getDelegationAgents()
      .then((loaded) => {
        if (!cancelled) setAgents(loaded.filter((agent) => agent.id !== currentAgentId))
      })
      .catch((failure) => {
        if (!cancelled) setAgentsError(failure instanceof Error ? failure.message : t('delegation.agentsFailed'))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAgentId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const chosen = agents?.find((agent) => String(agent.id) === target)
    if (!chosen) {
      setError(t('delegation.errors.chooseAgent'))
      return
    }
    if (!instruction.trim()) {
      setError(t('delegation.errors.instructionRequired'))
      return
    }
    if (instruction.trim().length > DELEGATION_INSTRUCTION_MAX) {
      setError(t('delegation.errors.instructionTooLong', { max: DELEGATION_INSTRUCTION_MAX }))
      return
    }
    setSending(true)
    setError(null)
    try {
      const result = await delegateToAgent({
        to_agent_id: chosen.id,
        from_agent_id: currentAgentId,
        task_id: taskId,
        instruction: instruction.trim(),
        context: withContext ? context : '',
      })
      onDelegated({ agent: chosen, message: result.message })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('delegation.errors.failed'))
      setSending(false)
    }
  }

  return (
    <DialogContent className='sm:max-w-lg'>
      <form onSubmit={submit} className='space-y-4' noValidate>
        <DialogHeader>
          <DialogTitle>{t('delegation.title')}</DialogTitle>
          <DialogDescription>{t('delegation.description')}</DialogDescription>
        </DialogHeader>

        <div className='grid gap-2'>
          <Label htmlFor='delegation-agent'>{t('delegation.agent')}</Label>
          {agents === null && !agentsError ? (
            <p className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' />{t('delegation.loadingAgents')}</p>
          ) : agentsError ? (
            <p role='alert' className='text-sm text-destructive'>{agentsError}</p>
          ) : agents && agents.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{t('delegation.noOtherAgents')}</p>
          ) : (
            <select id='delegation-agent' className={selectClass} value={target} onChange={(event) => setTarget(event.target.value)}>
              <option value=''>{t('delegation.chooseAgent')}</option>
              {agents?.map((agent) => <option key={agent.id} value={String(agent.id)}>{agent.name}</option>)}
            </select>
          )}
        </div>

        <div className='grid gap-2'>
          <Label htmlFor='delegation-instruction'>{t('delegation.instruction')}</Label>
          <Textarea id='delegation-instruction' className='min-h-28' value={instruction} placeholder={t('delegation.instructionPlaceholder')} onChange={(event) => setInstruction(event.target.value)} />
          <p className='text-right text-xs text-muted-foreground'>{instruction.trim().length}/{DELEGATION_INSTRUCTION_MAX}</p>
        </div>

        <label className='flex items-start gap-2 text-sm'>
          <input type='checkbox' className='mt-1' checked={withContext} disabled={context === ''} onChange={(event) => setWithContext(event.target.checked)} />
          <span>
            {t('delegation.includeContext')}
            <span className='block text-xs text-muted-foreground'>{context === '' ? t('delegation.noContext') : t('delegation.contextHint')}</span>
          </span>
        </label>

        <p className='text-xs text-muted-foreground'>{t('delegation.safety')}</p>
        {error && <p role='alert' className='text-sm text-destructive'>{error}</p>}

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onCancel} disabled={sending}>{t('delegation.cancel')}</Button>
          <Button type='submit' disabled={sending || (agents !== null && agents.length === 0)}>
            {sending && <Loader2 className='mr-2 size-4 animate-spin' />}
            {sending ? t('delegation.sending') : t('delegation.send')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
