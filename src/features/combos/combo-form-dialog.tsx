import { useState } from 'react'
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Combo, ComboAgent, ComboDraft, ComboLimits, ComboModelOption, ComboStrategy } from './data/api'

export const COMBO_NAME_MAX = 100

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The combo being edited; none when making a new one. */
  combo?: Combo | null
  models: ComboModelOption[]
  agents: ComboAgent[]
  limits: ComboLimits
  /** Saves the draft. Throw to keep the dialog open and show the message. */
  onSave: (draft: ComboDraft) => Promise<void>
}

type Picked = { id: number; weight: number }

export function ComboFormDialog({ open, onOpenChange, combo, ...rest }: Props) {
  // Mounted fresh for every open, so the form starts from the right combo.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ComboForm key={combo?.id ?? 'new'} combo={combo} onCancel={() => onOpenChange(false)} {...rest} />}
    </Dialog>
  )
}

function ComboForm({ combo, models, agents, limits, onSave, onCancel }: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState(combo?.name ?? '')
  const [description, setDescription] = useState(combo?.description ?? '')
  const [strategy, setStrategy] = useState<ComboStrategy>(combo?.strategy ?? 'fallback')
  const [picked, setPicked] = useState<Picked[]>(combo ? combo.members.map((member) => ({ id: member.ai_model_id, weight: member.weight })) : [])
  const [agentIds, setAgentIds] = useState<number[]>(combo?.agent_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modelById = new Map(models.map((model) => [model.id, model]))
  // A member the combo still lists but that can no longer be chosen (switched off or removed).
  const missing = combo ? combo.members.filter((member) => !modelById.has(member.ai_model_id)) : []

  const togglePick = (id: number) => {
    setError(null)
    setPicked((current) => {
      if (current.some((item) => item.id === id)) return current.filter((item) => item.id !== id)
      if (current.length >= limits.max_members) {
        setError(t('comboPage.form.errors.tooManyModels', { max: limits.max_members }))
        return current
      }
      return [...current, { id, weight: 1 }]
    })
  }

  const move = (index: number, direction: -1 | 1) =>
    setPicked((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const setWeight = (id: number, weight: number) => setPicked((current) => current.map((item) => (item.id === id ? { ...item, weight } : item)))

  const toggleAgent = (id: number) => setAgentIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  const validate = () => {
    if (!name.trim()) return t('comboPage.form.errors.nameRequired')
    if (name.trim().length > COMBO_NAME_MAX) return t('comboPage.form.errors.nameTooLong', { max: COMBO_NAME_MAX })
    if (picked.length === 0) return t('comboPage.form.errors.modelsRequired')
    if (agentIds.length === 0) return t('comboPage.form.errors.agentsRequired')
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
      await onSave({
        name: name.trim(),
        description: description.trim(),
        strategy,
        // Let one request try every member before giving up.
        max_attempts: picked.length,
        members: picked.map((item) => ({ ai_model_id: item.id, weight: strategy === 'round_robin' ? item.weight : 1 })),
        agent_ids: agentIds,
      })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('comboPage.toast.failed'))
      setSaving(false)
    }
  }

  const strategies: ComboStrategy[] = ['fallback', 'round_robin']

  return (
    <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-2xl'>
      <form onSubmit={submit} className='space-y-5' noValidate>
        <DialogHeader>
          <DialogTitle>{combo ? t('comboPage.form.editTitle') : t('comboPage.form.addTitle')}</DialogTitle>
          <DialogDescription>{t('comboPage.form.description')}</DialogDescription>
        </DialogHeader>

        <div className='grid gap-2'>
          <Label htmlFor='combo-name'>{t('comboPage.form.name')}</Label>
          <Input id='combo-name' value={name} maxLength={COMBO_NAME_MAX + 20} placeholder={t('comboPage.form.namePlaceholder')} onChange={(event) => setName(event.target.value)} />
        </div>

        <div className='grid gap-2'>
          <Label htmlFor='combo-description'>{t('comboPage.form.descriptionLabel')}</Label>
          <Input id='combo-description' value={description} placeholder={t('comboPage.form.descriptionPlaceholder')} onChange={(event) => setDescription(event.target.value)} />
        </div>

        <fieldset className='grid gap-2'>
          <legend className='mb-1 text-sm font-medium'>{t('comboPage.form.strategy')}</legend>
          {strategies.map((value) => (
            <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-sm ${strategy === value ? 'bg-muted' : 'hover:bg-muted/60'}`}>
              <input type='radio' name='combo-strategy' value={value} aria-label={t(`comboPage.strategy.${value}.name`)} className='mt-1' checked={strategy === value} onChange={() => setStrategy(value)} />
              <span>
                <span className='block font-medium'>{t(`comboPage.strategy.${value}.name`)}</span>
                <span className='block text-muted-foreground'>{t(`comboPage.strategy.${value}.description`)}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className='grid gap-2'>
          <legend className='mb-1 text-sm font-medium'>{t('comboPage.form.models', { count: picked.length, max: limits.max_members })}</legend>
          <p className='text-sm text-muted-foreground'>{strategy === 'fallback' ? t('comboPage.form.modelsHintFallback') : t('comboPage.form.modelsHintRoundRobin')}</p>

          {picked.length > 0 && (
            <ol className='grid gap-1' aria-label={t('comboPage.form.order')}>
              {picked.map((item, index) => {
                const model = modelById.get(item.id)
                return (
                  <li key={item.id} className='flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm'>
                    <span className='w-5 shrink-0 tabular-nums text-muted-foreground'>{index + 1}</span>
                    <span className='min-w-0 flex-1 truncate font-medium'>{model?.name ?? `#${item.id}`}</span>
                    {strategy === 'round_robin' && (
                      <label className='flex items-center gap-2 text-muted-foreground'>
                        {t('comboPage.form.weight')}
                        <input
                          type='number'
                          min={1}
                          max={10}
                          value={item.weight}
                          aria-label={t('comboPage.form.weightFor', { name: model?.name ?? item.id })}
                          className='h-8 w-14 rounded-md border bg-background px-2 text-foreground'
                          onChange={(event) => setWeight(item.id, Math.min(10, Math.max(1, Number(event.target.value) || 1)))}
                        />
                      </label>
                    )}
                    <Button type='button' variant='ghost' size='icon' className='size-8' disabled={index === 0} aria-label={t('comboPage.form.moveUp', { name: model?.name ?? item.id })} onClick={() => move(index, -1)}>
                      <ArrowUp className='size-4' />
                    </Button>
                    <Button type='button' variant='ghost' size='icon' className='size-8' disabled={index === picked.length - 1} aria-label={t('comboPage.form.moveDown', { name: model?.name ?? item.id })} onClick={() => move(index, 1)}>
                      <ArrowDown className='size-4' />
                    </Button>
                  </li>
                )
              })}
            </ol>
          )}

          {missing.length > 0 && (
            <p className='text-sm text-muted-foreground'>{t('comboPage.form.missing', { names: missing.map((member) => member.name).join(', ') })}</p>
          )}

          <ul className='grid max-h-52 gap-0.5 overflow-y-auto'>
            {models.length === 0 && <li className='px-3 py-2 text-sm text-muted-foreground'>{t('comboPage.form.noModels')}</li>}
            {models.map((model) => {
              const checked = picked.some((item) => item.id === model.id)
              return (
                <li key={model.id}>
                  <label className='flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/60'>
                    <input type='checkbox' checked={checked} onChange={() => togglePick(model.id)} />
                    <span className='min-w-0 flex-1 truncate'>{model.name}</span>
                    <span className='shrink-0 text-muted-foreground'>
                      {model.provider} · {model.is_system ? t('comboPage.form.systemModel') : t('comboPage.form.ownModel')}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>

        <fieldset className='grid gap-2'>
          <legend className='mb-1 text-sm font-medium'>{t('comboPage.form.agents')}</legend>
          <p className='text-sm text-muted-foreground'>{t('comboPage.form.agentsHint')}</p>
          <ul className='grid gap-0.5 sm:grid-cols-2'>
            {agents.map((agent) => (
              <li key={agent.id}>
                <label className='flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/60'>
                  <input type='checkbox' checked={agentIds.includes(agent.id)} onChange={() => toggleAgent(agent.id)} />
                  {agent.name}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <p className='text-sm text-muted-foreground'>{t('comboPage.privacy')}</p>
        {error && (
          <p role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onCancel} disabled={saving}>
            {t('comboPage.actions.cancel')}
          </Button>
          <Button type='submit' disabled={saving}>
            {saving && <Loader2 className='mr-2 size-4 animate-spin' />}
            {saving ? t('comboPage.actions.saving') : t('comboPage.actions.save')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
