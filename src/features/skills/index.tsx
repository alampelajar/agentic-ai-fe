import { useEffect, useRef, useState } from 'react'
import { Check, FileArchive, FilePlus2, GitBranch, Loader2, Search, Trash2, Upload, WandSparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createSkill, deleteSkill, getSkills, importSkillGithub, importSkillZip, type Skill, updateSkill, validateSkill } from './data/api'

const emptyManifest = { id: '', name: '', version: '1.0.0', description: '', author: '', platforms: ['windows'], instructions: 'SKILL.md', tools: [], requested_permissions: [] }

export function Skills() {
  const { t } = useTranslation()
  const [skills, setSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const latestRequest = useRef(0)
  const [working, setWorking] = useState(false)
  const [githubURL, setGithubURL] = useState('')
  const [manifest, setManifest] = useState(emptyManifest)
  const [instructions, setInstructions] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Skill | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Only the newest request may update the list, so a slow answer to an older
  // search cannot replace the result of a newer one.
  const refresh = async (term = search) => {
    const request = ++latestRequest.current
    setLoading(true)
    setLoadError(null)
    try {
      const loaded = await getSkills(term)
      if (request === latestRequest.current) setSkills(loaded)
    } catch (error) {
      if (request !== latestRequest.current) return
      const message = error instanceof Error ? error.message : t('skillsPage.toast.loadFailed')
      setLoadError(message)
      toast.error(message)
    } finally {
      if (request === latestRequest.current) setLoading(false)
    }
  }
  useEffect(() => { void refresh('') }, [])

  const run = async (action: () => Promise<void>) => { setWorking(true); try { await action(); await refresh() } catch (error) { toast.error(error instanceof Error ? error.message : t('skillsPage.toast.operationFailed')) } finally { setWorking(false) } }
  const setField = (field: keyof typeof manifest, value: string) => setManifest((current) => ({ ...current, [field]: value }))

  const confirmDelete = () => {
    const skill = pendingDelete
    setPendingDelete(null)
    if (skill) void run(async () => { await deleteSkill(skill.id); toast.success(t('skillsPage.toast.deleted')) })
  }

  const stats: [string, number][] = [
    [t('skillsPage.stats.installed'), skills.length],
    [t('skillsPage.stats.active'), skills.filter((skill) => skill.is_enabled).length],
    [t('skillsPage.stats.needsAttention'), skills.filter((skill) => skill.validation_status === 'error').length],
  ]

  return <Main className='space-y-6'>
    <div className='flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between'>
      <div><p className='text-sm text-muted-foreground'>{t('skillsPage.eyebrow')}</p><h1 className='text-2xl font-semibold tracking-tight'>{t('skillsPage.title')}</h1><p className='mt-1 max-w-2xl text-sm text-muted-foreground'>{t('skillsPage.subtitle')}</p></div>
      <div className='flex gap-2'><Button onClick={() => document.getElementById('create-skill')?.scrollIntoView({ behavior: 'smooth' })}><FilePlus2 className='mr-2 size-4' />{t('skillsPage.create')}</Button><Button variant='outline' onClick={() => fileRef.current?.click()}><Upload className='mr-2 size-4' />{t('skillsPage.importZip')}</Button><input ref={fileRef} type='file' accept='.zip,application/zip' className='hidden' onChange={(event) => { const file = event.target.files?.[0]; if (file) void run(async () => { await importSkillZip(file); toast.success(t('skillsPage.toast.imported')) }); event.target.value = '' }} /></div>
    </div>

    <div className='grid gap-3 sm:grid-cols-3'>{stats.map(([label, value]) => <Card key={label} className='gap-3 py-4'><CardContent className='px-5'><p className='text-sm text-muted-foreground'>{label}</p><p className='mt-1 text-2xl font-semibold tabular-nums'>{value}</p></CardContent></Card>)}</div>

    <Tabs defaultValue='installed' className='space-y-4'><TabsList><TabsTrigger value='installed'>{t('skillsPage.tabs.installed')}</TabsTrigger><TabsTrigger value='discover'>{t('skillsPage.tabs.discover')}</TabsTrigger><TabsTrigger value='create'>{t('skillsPage.tabs.create')}</TabsTrigger></TabsList>
      <TabsContent value='installed' className='space-y-4'><div className='flex max-w-xl items-center gap-2'><Search className='size-4 text-muted-foreground' /><Input value={search} placeholder={t('skillsPage.searchPlaceholder')} aria-label={t('skillsPage.searchPlaceholder')} onChange={(event) => { setSearch(event.target.value); void refresh(event.target.value) }} /></div><div className='grid gap-4 lg:grid-cols-2'>{loading ? <p className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' />{t('skillsPage.loading')}</p> : loadError ? <Card className='lg:col-span-2' role='alert'><CardContent className='py-12 text-center'><p className='font-medium'>{t('skillsPage.loadErrorTitle')}</p><p className='mt-1 text-sm text-muted-foreground'>{loadError}</p><Button className='mt-4' variant='outline' onClick={() => void refresh(search)}>{t('skillsPage.retry')}</Button></CardContent></Card> : skills.length === 0 ? <Card className='border-dashed lg:col-span-2'><CardContent className='py-12 text-center'><WandSparkles className='mx-auto mb-3 size-8 text-muted-foreground' /><p className='font-medium'>{t('skillsPage.emptyTitle')}</p><p className='mt-1 text-sm text-muted-foreground'>{t('skillsPage.emptyDescription')}</p></CardContent></Card> : skills.map((skill) => <SkillCard key={skill.id} skill={skill} working={working} onToggle={() => void run(async () => { await updateSkill(skill.id, { is_enabled: !skill.is_enabled }); toast.success(skill.is_enabled ? t('skillsPage.toast.disabled') : t('skillsPage.toast.enabled')) })} onValidate={() => void run(async () => { const result = await validateSkill(skill.id); toast[result.valid ? 'success' : 'error'](result.valid ? t('skillsPage.toast.valid') : result.error || t('skillsPage.toast.invalid')) })} onDelete={() => setPendingDelete(skill)} />)}</div></TabsContent>
      <TabsContent value='discover' className='space-y-4'><Card><CardHeader><CardTitle>{t('skillsPage.github.title')}</CardTitle><CardDescription>{t('skillsPage.github.description')}</CardDescription></CardHeader><CardContent className='flex max-w-2xl gap-2'><Input value={githubURL} onChange={(event) => setGithubURL(event.target.value)} aria-label={t('skillsPage.github.title')} placeholder='https://github.com/owner/repository' /><Button disabled={!githubURL.trim() || working} onClick={() => void run(async () => { await importSkillGithub(githubURL); setGithubURL(''); toast.success(t('skillsPage.toast.githubImported')) })}><GitBranch className='mr-2 size-4' />{t('skillsPage.github.import')}</Button></CardContent></Card></TabsContent>
      <TabsContent value='create' id='create-skill'><Card><CardHeader><CardTitle>{t('skillsPage.form.title')}</CardTitle><CardDescription>{t('skillsPage.form.description')}</CardDescription></CardHeader><CardContent><form className='grid gap-4 lg:grid-cols-2' onSubmit={(event) => { event.preventDefault(); void run(async () => { await createSkill({ ...manifest, id: manifest.id.trim().toLowerCase(), name: manifest.name.trim(), description: manifest.description.trim(), author: manifest.author.trim() }, instructions); setManifest(emptyManifest); setInstructions(''); toast.success(t('skillsPage.toast.created')) }) }}><div className='space-y-4'><div className='grid gap-2'><Label htmlFor='skill-id'>{t('skillsPage.form.slug')}</Label><Input id='skill-id' required value={manifest.id} onChange={(event) => setField('id', event.target.value)} placeholder={t('skillsPage.form.slugPlaceholder')} /></div><div className='grid gap-2'><Label htmlFor='skill-name'>{t('skillsPage.form.name')}</Label><Input id='skill-name' required value={manifest.name} onChange={(event) => setField('name', event.target.value)} placeholder={t('skillsPage.form.namePlaceholder')} /></div><div className='grid gap-2'><Label htmlFor='skill-version'>{t('skillsPage.form.version')}</Label><Input id='skill-version' required value={manifest.version} onChange={(event) => setField('version', event.target.value)} /></div><div className='grid gap-2'><Label htmlFor='skill-author'>{t('skillsPage.form.author')}</Label><Input id='skill-author' value={manifest.author} onChange={(event) => setField('author', event.target.value)} placeholder={t('skillsPage.form.authorPlaceholder')} /></div><div className='grid gap-2'><Label htmlFor='skill-description'>{t('skillsPage.form.descriptionLabel')}</Label><Textarea id='skill-description' value={manifest.description} onChange={(event) => setField('description', event.target.value)} /></div></div><div className='space-y-4'><div className='grid gap-2'><Label htmlFor='skill-instructions'>{t('skillsPage.form.instructions')}</Label><Textarea id='skill-instructions' required className='min-h-72 font-mono text-sm' value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder={t('skillsPage.form.instructionsPlaceholder')} /></div><p className='text-xs text-muted-foreground'>{t('skillsPage.form.note')}</p><Button type='submit' disabled={working || !instructions.trim()}>{working ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Check className='mr-2 size-4' />}{t('skillsPage.form.save')}</Button></div></form></CardContent></Card></TabsContent>
    </Tabs>

    <ConfirmDialog
      open={pendingDelete !== null}
      onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
      title={t('skillsPage.delete.title', { name: pendingDelete?.name ?? '' })}
      desc={t('skillsPage.delete.description')}
      cancelBtnText={t('common.cancel')}
      confirmText={t('skillsPage.delete.confirm')}
      destructive
      handleConfirm={confirmDelete}
    />
  </Main>
}

function SkillCard({ skill, working, onToggle, onValidate, onDelete }: { skill: Skill; working: boolean; onToggle: () => void; onValidate: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  return <Card className='gap-4 py-5'><CardHeader className='gap-2 px-5'><div className='flex items-start justify-between gap-3'><div><CardTitle className='text-base'>{skill.name}</CardTitle><CardDescription className='mt-1'>{skill.slug} · v{skill.current_version || '—'}</CardDescription></div><Badge variant={skill.is_enabled ? 'default' : 'secondary'}>{skill.is_enabled ? t('skillsPage.card.enabled') : skill.status}</Badge></div><p className='text-sm text-muted-foreground'>{skill.description || t('skillsPage.card.noDescription')}</p></CardHeader><CardContent className='space-y-4 px-5'><div className='flex flex-wrap gap-1.5'>{skill.tools.length ? skill.tools.map((tool) => <Badge key={tool} variant='outline'>{tool}</Badge>) : <span className='text-xs text-muted-foreground'>{t('skillsPage.card.noTools')}</span>}</div>{skill.validation_status === 'error' && <p className='text-sm text-destructive'>{skill.validation_error}</p>}<div className='flex flex-wrap gap-2 border-t pt-3'><Button size='sm' variant={skill.is_enabled ? 'outline' : 'default'} disabled={working} onClick={onToggle}>{skill.is_enabled ? t('skillsPage.card.disable') : t('skillsPage.card.enable')}</Button><Button size='sm' variant='ghost' disabled={working} onClick={onValidate}>{t('skillsPage.card.validate')}</Button><Button size='sm' variant='ghost' className='text-destructive' disabled={working} onClick={onDelete}><Trash2 className='mr-1.5 size-4' />{t('skillsPage.card.delete')}</Button><span className='ml-auto flex items-center gap-1 text-xs text-muted-foreground'><FileArchive className='size-3.5' />{skill.source}</span></div></CardContent></Card>
}
