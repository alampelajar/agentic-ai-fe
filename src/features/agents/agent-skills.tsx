import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { assignSkillToAgent, getAgentSkills, getSkills, removeSkillFromAgent, updateAgentSkill, type AgentSkill, type Skill } from '@/features/skills/data/api'

export function AgentSkills({ agentId }: { agentId: number }) {
  const { t } = useTranslation()
  const [assignments, setAssignments] = useState<AgentSkill[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkill, setSelectedSkill] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [assigned, available] = await Promise.all([getAgentSkills(agentId), getSkills()])
      setAssignments(assigned)
      setSkills(available)
      setSelectedSkill(available.find((skill) => !assigned.some((item) => item.skill_id === skill.id))?.id.toString() || '')
    } catch (error) {
      const message = error instanceof Error ? error.message : t('agentSkills.loadFailed')
      setLoadError(message)
      toast.error(message)
    } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [agentId])
  const available = useMemo(() => skills.filter((skill) => !assignments.some((item) => item.skill_id === skill.id)), [assignments, skills])
  const run = async (action: () => Promise<void>) => {
    setWorking(true)
    try { await action(); await refresh() } catch (error) { toast.error(error instanceof Error ? error.message : t('agentSkills.updateFailed')) } finally { setWorking(false) }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('agentSkills.title')}</CardTitle><CardDescription>{t('agentSkills.description')}</CardDescription></CardHeader>
      <CardContent className='space-y-5'>
        {loading ? <div className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' />{t('agentSkills.loading')}</div> : loadError ? <div role='alert' className='rounded-lg border border-dashed p-5 text-center'><p className='font-medium'>{t('agentSkills.loadErrorTitle')}</p><p className='mt-1 text-sm text-muted-foreground'>{loadError}</p><Button className='mt-4' variant='outline' onClick={() => void refresh()}>{t('agentSkills.retry')}</Button></div> : <>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
            <div className='grid flex-1 gap-2'><Label htmlFor='agent-skill-select'>{t('agentSkills.add')}</Label><select id='agent-skill-select' value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)} className='h-9 rounded-md border bg-background px-3 text-sm' disabled={!available.length || working}><option value=''>{available.length ? t('agentSkills.choose') : t('agentSkills.allAssigned')}</option>{available.map((skill) => <option key={skill.id} value={skill.id}>{skill.name} · v{skill.current_version || '—'}</option>)}</select></div>
            <Button disabled={!selectedSkill || working} onClick={() => void run(async () => { await assignSkillToAgent(agentId, Number(selectedSkill)); toast.success(t('agentSkills.assigned')) })}><Plus className='mr-2 size-4' />{t('agentSkills.assign')}</Button>
          </div>
          <div className='space-y-3'>{assignments.length === 0 ? <p className='rounded-lg border border-dashed p-5 text-sm text-muted-foreground'>{t('agentSkills.empty')}</p> : assignments.map((assignment) => <div key={assignment.id} className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center'><div className='flex min-w-0 flex-1 items-start gap-3'><ShieldCheck className='mt-0.5 size-4 shrink-0 text-muted-foreground' /><div className='min-w-0'><p className='font-medium'>{assignment.skill.name}</p><p className='truncate text-xs text-muted-foreground'>{assignment.skill.slug} · v{assignment.skill.current_version || '—'}</p><div className='mt-2 flex flex-wrap gap-1'>{assignment.skill.tools.map((tool) => <Badge key={tool} variant='outline'>{tool}</Badge>)}</div></div></div><div className='flex items-center gap-2'><Button size='sm' variant={assignment.is_enabled ? 'outline' : 'default'} disabled={working} onClick={() => void run(async () => { await updateAgentSkill(agentId, assignment.skill_id, !assignment.is_enabled) })}>{assignment.is_enabled ? t('skillsPage.card.disable') : t('skillsPage.card.enable')}</Button><Button size='icon' variant='ghost' className='text-destructive' aria-label={t('agentSkills.remove', { name: assignment.skill.name })} disabled={working} onClick={() => void run(async () => { await removeSkillFromAgent(agentId, assignment.skill_id); toast.success(t('agentSkills.removed')) })}><Trash2 className='size-4' /></Button></div></div>)}</div>
        </>}
      </CardContent>
    </Card>
  )
}
