import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MEMORY_CATEGORIES, type Memory, type MemoryAgent, type MemoryCategory, type MemoryDraft } from './data/api'

// Same limits as the server, so the form can say so before sending.
export const MEMORY_TITLE_MAX = 120
export const MEMORY_CONTENT_MAX = 2000

const selectClass = 'h-9 rounded-md border bg-background px-3 text-sm'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The memory being edited; none when adding a new one. */
  memory?: Memory | null
  agents: MemoryAgent[]
  /** Saves the draft. Throw to keep the dialog open and show the message. */
  onSave: (draft: MemoryDraft) => Promise<void>
}

export function MemoryFormDialog({ open, onOpenChange, memory, agents, onSave }: Props) {
  // The form is mounted fresh for every open, so it starts from the right memory.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <MemoryForm key={memory?.id ?? 'new'} memory={memory} agents={agents} onSave={onSave} onCancel={() => onOpenChange(false)} />}
    </Dialog>
  )
}

function MemoryForm({ memory, agents, onSave, onCancel }: Pick<Props, 'memory' | 'agents' | 'onSave'> & { onCancel: () => void }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(memory?.title ?? '')
  const [content, setContent] = useState(memory?.content ?? '')
  const [category, setCategory] = useState<MemoryCategory>(memory?.category ?? 'project')
  const [importance, setImportance] = useState(memory?.importance ?? 3)
  const [agentId, setAgentId] = useState<string>(memory?.agent_id ? String(memory.agent_id) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = () => {
    if (!title.trim()) return t('memoryPage.form.errors.titleRequired')
    if (!content.trim()) return t('memoryPage.form.errors.contentRequired')
    if (title.trim().length > MEMORY_TITLE_MAX) return t('memoryPage.form.errors.titleTooLong', { max: MEMORY_TITLE_MAX })
    if (content.trim().length > MEMORY_CONTENT_MAX) return t('memoryPage.form.errors.contentTooLong', { max: MEMORY_CONTENT_MAX })
    return null
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({ title: title.trim(), content: content.trim(), category, importance, agent_id: agentId ? Number(agentId) : null })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('memoryPage.toast.failed'))
      setSaving(false)
    }
  }

  return (
    <DialogContent className='sm:max-w-lg'>
      <form onSubmit={submit} className='space-y-4' noValidate>
        <DialogHeader>
          <DialogTitle>{memory ? t('memoryPage.form.editTitle') : t('memoryPage.form.addTitle')}</DialogTitle>
          <DialogDescription>{t('memoryPage.form.description')}</DialogDescription>
        </DialogHeader>

        <div className='grid gap-2'>
          <Label htmlFor='memory-title'>{t('memoryPage.form.title')}</Label>
          <Input id='memory-title' value={title} maxLength={MEMORY_TITLE_MAX + 40} placeholder={t('memoryPage.form.titlePlaceholder')} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='memory-content'>{t('memoryPage.form.content')}</Label>
          <Textarea id='memory-content' className='min-h-28' value={content} placeholder={t('memoryPage.form.contentPlaceholder')} onChange={(event) => setContent(event.target.value)} />
          <p className='text-right text-xs text-muted-foreground'>{content.trim().length}/{MEMORY_CONTENT_MAX}</p>
        </div>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='grid gap-2'>
            <Label htmlFor='memory-category'>{t('memoryPage.form.category')}</Label>
            <select id='memory-category' className={selectClass} value={category} onChange={(event) => setCategory(event.target.value as MemoryCategory)}>
              {MEMORY_CATEGORIES.map((value) => <option key={value} value={value}>{t(`memoryPage.categories.${value}`)}</option>)}
            </select>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='memory-scope'>{t('memoryPage.form.scope')}</Label>
            <select id='memory-scope' className={selectClass} value={agentId} onChange={(event) => setAgentId(event.target.value)}>
              <option value=''>{t('memoryPage.form.scopeGlobal')}</option>
              {agents.map((agent) => <option key={agent.id} value={String(agent.id)}>{t('memoryPage.scope.agent', { name: agent.name })}</option>)}
            </select>
          </div>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='memory-importance'>{t('memoryPage.form.importance')}: {importance}</Label>
          <input id='memory-importance' type='range' min={1} max={5} step={1} value={importance} onChange={(event) => setImportance(Number(event.target.value))} />
          <p className='text-xs text-muted-foreground'>{t('memoryPage.form.importanceHint')}</p>
        </div>

        <p className='text-xs text-muted-foreground'>{t('memoryPage.privacy')}</p>
        {error && <p role='alert' className='text-sm text-destructive'>{error}</p>}

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onCancel} disabled={saving}>{t('memoryPage.actions.cancel')}</Button>
          <Button type='submit' disabled={saving}>{saving && <Loader2 className='mr-2 size-4 animate-spin' />}{saving ? t('memoryPage.actions.saving') : t('memoryPage.actions.save')}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
