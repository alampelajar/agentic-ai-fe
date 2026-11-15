import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SkillToolsField } from './skill-tools-field'
import { createSkill } from './data/api'

const emptyManifest = { id: '', name: '', version: '1.0.0', description: '', author: '', platforms: ['windows'], instructions: 'SKILL.md', tools: [] as string[], requested_permissions: [] as string[] }

export function CreateSkill() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [manifest, setManifest] = useState(emptyManifest)
  const [instructions, setInstructions] = useState('')
  const [working, setWorking] = useState(false)
  const setField = (field: keyof typeof manifest, value: string) => setManifest((current) => ({ ...current, [field]: value }))

  const submit = async () => {
    setWorking(true)
    try {
      await createSkill({ ...manifest, id: manifest.id.trim().toLowerCase(), name: manifest.name.trim(), description: manifest.description.trim(), author: manifest.author.trim() }, instructions)
      toast.success(t('skillsPage.toast.created'))
      void navigate({ to: '/skills' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('skillsPage.toast.operationFailed'))
    } finally {
      setWorking(false)
    }
  }

  return <Main className='space-y-6'>
    <div className='space-y-3 border-b pb-6'>
      <Button asChild variant='ghost' size='sm' className='-ml-2'>
        <Link to='/skills'><ArrowLeft className='mr-2 size-4' />{t('skillsPage.form.back')}</Link>
      </Button>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>{t('skillsPage.form.title')}</h1>
        <p className='mt-1 max-w-2xl text-sm text-muted-foreground'>{t('skillsPage.form.description')}</p>
      </div>
    </div>

    <Card>
      <CardContent>
        <form className='grid gap-6 lg:grid-cols-2' onSubmit={(event) => { event.preventDefault(); void submit() }}>
          <div className='space-y-4'>
            <div className='grid gap-2'><Label htmlFor='skill-id'>{t('skillsPage.form.slug')}</Label><Input id='skill-id' required value={manifest.id} onChange={(event) => setField('id', event.target.value)} placeholder={t('skillsPage.form.slugPlaceholder')} /></div>
            <div className='grid gap-2'><Label htmlFor='skill-name'>{t('skillsPage.form.name')}</Label><Input id='skill-name' required value={manifest.name} onChange={(event) => setField('name', event.target.value)} placeholder={t('skillsPage.form.namePlaceholder')} /></div>
            <div className='grid gap-2'><Label htmlFor='skill-version'>{t('skillsPage.form.version')}</Label><Input id='skill-version' required value={manifest.version} onChange={(event) => setField('version', event.target.value)} /></div>
            <div className='grid gap-2'><Label htmlFor='skill-author'>{t('skillsPage.form.author')}</Label><Input id='skill-author' value={manifest.author} onChange={(event) => setField('author', event.target.value)} placeholder={t('skillsPage.form.authorPlaceholder')} /></div>
            <div className='grid gap-2'><Label htmlFor='skill-description'>{t('skillsPage.form.descriptionLabel')}</Label><Textarea id='skill-description' value={manifest.description} onChange={(event) => setField('description', event.target.value)} /></div>
            <SkillToolsField value={manifest.tools} onChange={(tools) => setManifest((current) => ({ ...current, tools }))} />
          </div>
          <div className='space-y-4'>
            <div className='grid gap-2'><Label htmlFor='skill-instructions'>{t('skillsPage.form.instructions')}</Label><Textarea id='skill-instructions' required className='min-h-72 font-mono text-sm' value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder={t('skillsPage.form.instructionsPlaceholder')} /></div>
            <p className='text-xs text-muted-foreground'>{t('skillsPage.form.note')}</p>
            <div className='flex flex-wrap gap-2'>
              <Button type='submit' disabled={working || !instructions.trim()}>{working ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Check className='mr-2 size-4' />}{t('skillsPage.form.save')}</Button>
              <Button asChild variant='outline'><Link to='/skills'>{t('common.cancel')}</Link></Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  </Main>
}
