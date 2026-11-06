import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Shuffle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ComboFormDialog } from './combo-form-dialog'
import {
  createCombo,
  deleteCombo,
  getComboAgents,
  getComboModelOptions,
  getCombos,
  updateCombo,
  type Combo,
  type ComboAgent,
  type ComboDraft,
  type ComboLimits,
  type ComboModelOption,
} from './data/api'

export function CombosPage() {
  const { t } = useTranslation()
  const [combos, setCombos] = useState<Combo[]>([])
  const [enabled, setEnabled] = useState(true)
  const [limits, setLimits] = useState<ComboLimits>({ max_combos: 10, max_members: 4 })
  const [models, setModels] = useState<ComboModelOption[]>([])
  const [agents, setAgents] = useState<ComboAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Combo | null>(null)
  const [deleting, setDeleting] = useState<Combo | null>(null)

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await getCombos()
      setCombos(list.combos)
      setEnabled(list.enabled)
      setLimits(list.limits)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('comboPage.error.title')
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    getComboModelOptions().then(setModels).catch(() => setModels([]))
    getComboAgents().then(setAgents).catch(() => setAgents([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agentName = useMemo(() => {
    const names = new Map(agents.map((agent) => [agent.id, agent.name]))
    return (id: number) => names.get(id) ?? `#${id}`
  }, [agents])

  const save = async (draft: ComboDraft) => {
    if (editing) {
      await updateCombo(editing.id, draft)
      toast.success(t('comboPage.toast.updated'))
    } else {
      await createCombo(draft)
      toast.success(t('comboPage.toast.created'))
    }
    setFormOpen(false)
    setEditing(null)
    await load()
  }

  const toggleActive = async (combo: Combo, next: boolean) => {
    setWorking(true)
    try {
      await updateCombo(combo.id, { is_active: next })
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('comboPage.toast.failed'))
    } finally {
      setWorking(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setWorking(true)
    try {
      await deleteCombo(deleting.id)
      toast.success(t('comboPage.toast.deleted'))
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('comboPage.toast.failed'))
    } finally {
      setWorking(false)
    }
  }

  const full = combos.length >= limits.max_combos

  return (
    <Main className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('comboPage.title')}</h1>
          <p className='mt-1 max-w-2xl text-sm text-muted-foreground'>{t('comboPage.subtitle')}</p>
        </div>
        <Button
          disabled={!enabled || full}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className='mr-2 size-4' />
          {t('comboPage.actions.add')}
        </Button>
      </div>

      {!enabled && (
        <p role='status' data-testid='combo-disabled-notice' className='rounded-md bg-muted px-4 py-3 text-sm'>
          {t('comboPage.disabledNotice')}
        </p>
      )}
      {enabled && full && (
        <p role='status' className='rounded-md bg-muted px-4 py-3 text-sm'>
          {t('comboPage.limitReached', { max: limits.max_combos })}
        </p>
      )}

      <div className='grid gap-4 lg:grid-cols-2'>
        {loading ? (
          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            {t('comboPage.loading')}
          </p>
        ) : loadError ? (
          <Card className='lg:col-span-2' role='alert'>
            <CardContent className='py-12 text-center'>
              <p className='font-medium'>{t('comboPage.error.title')}</p>
              <p className='mt-1 text-sm text-muted-foreground'>{loadError}</p>
              <Button className='mt-4' variant='outline' onClick={() => void load()}>
                {t('comboPage.actions.retry')}
              </Button>
            </CardContent>
          </Card>
        ) : combos.length === 0 ? (
          <Card className='lg:col-span-2'>
            <CardContent className='py-12 text-center'>
              <Shuffle className='mx-auto mb-3 size-8 text-muted-foreground' />
              <p className='font-medium'>{t('comboPage.empty.title')}</p>
              <p className='mx-auto mt-1 max-w-lg text-sm text-muted-foreground'>{t('comboPage.empty.description')}</p>
            </CardContent>
          </Card>
        ) : (
          combos.map((combo) => {
            const broken = combo.members.filter((member) => member.is_enabled && !member.available)
            return (
              <Card key={combo.id} data-testid='combo-card' className={combo.is_active ? 'gap-4 border-0 bg-muted/40 py-5 shadow-none' : 'gap-4 border-0 bg-muted/40 py-5 opacity-70 shadow-none'}>
                <CardHeader className='gap-1 px-5'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <CardTitle className='truncate text-base'>{combo.name}</CardTitle>
                      <p className='mt-1 text-sm text-muted-foreground'>{t(`comboPage.strategy.${combo.strategy}.name`)}</p>
                    </div>
                    <Switch
                      aria-label={t('comboPage.card.activeFor', { name: combo.name })}
                      checked={combo.is_active}
                      disabled={working || !enabled}
                      onCheckedChange={(next) => void toggleActive(combo, next)}
                    />
                  </div>
                  {combo.description && <p className='text-sm text-muted-foreground'>{combo.description}</p>}
                </CardHeader>
                <CardContent className='space-y-4 px-5'>
                  <ol className='grid gap-1 text-sm'>
                    {combo.members.map((member, index) => (
                      <li key={member.ai_model_id} className='flex items-baseline gap-3'>
                        <span className='w-4 shrink-0 tabular-nums text-muted-foreground'>{index + 1}</span>
                        <span className={member.available && member.is_enabled ? 'min-w-0 flex-1 truncate font-medium' : 'min-w-0 flex-1 truncate text-muted-foreground line-through'}>{member.name}</span>
                        <span className='shrink-0 text-muted-foreground'>
                          {combo.strategy === 'round_robin' ? `×${member.weight} · ` : ''}
                          {member.is_system ? t('comboPage.form.systemModel') : t('comboPage.form.ownModel')}
                        </span>
                      </li>
                    ))}
                  </ol>

                  {broken.length > 0 && (
                    <p className='text-sm text-destructive'>{t('comboPage.card.unavailable', { names: broken.map((member) => member.name).join(', ') })}</p>
                  )}

                  <p className='text-sm text-muted-foreground'>
                    {combo.agent_ids.length > 0 ? t('comboPage.card.usedBy', { names: combo.agent_ids.map(agentName).join(', ') }) : t('comboPage.card.noAgents')}
                  </p>

                  <div className='flex flex-wrap gap-2 pt-1'>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={!enabled}
                      onClick={() => {
                        setEditing(combo)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil className='mr-2 size-3.5' />
                      {t('comboPage.actions.edit')}
                    </Button>
                    <Button size='sm' variant='ghost' className='text-destructive hover:text-destructive' onClick={() => setDeleting(combo)}>
                      <Trash2 className='mr-2 size-3.5' />
                      {t('comboPage.actions.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <ComboFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        combo={editing}
        models={models}
        agents={agents}
        limits={limits}
        onSave={save}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('comboPage.delete.title')}
        desc={t('comboPage.delete.description', { name: deleting?.name ?? '' })}
        confirmText={t('comboPage.actions.delete')}
        destructive
        cancelBtnText={t('comboPage.actions.cancel')}
        handleConfirm={() => void remove()}
      />
    </Main>
  )
}
