import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createWorkspace, type Workspace, type WorkspaceRuntime } from './data/api'

export const MAX_ZIP_MB = 50
const GITHUB_URL = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?(\.git)?\/?$/

type Source = 'empty' | 'zip' | 'github'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (workspace: Workspace) => void
}

export function CreateWorkspaceDialog({ open, onOpenChange, onCreated }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CreateForm onCancel={() => onOpenChange(false)} onCreated={onCreated} />}
    </Dialog>
  )
}

function CreateForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (workspace: Workspace) => void }) {
  const { t } = useTranslation()
  const [source, setSource] = useState<Source>('empty')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [runtime, setRuntime] = useState<WorkspaceRuntime>('')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const problem = () => {
    if (!name.trim()) return t('workspacePage.create.errors.nameRequired')
    if (source === 'zip') {
      if (!file) return t('workspacePage.create.errors.zipRequired')
      if (!file.name.toLowerCase().endsWith('.zip')) return t('workspacePage.create.errors.zipType')
      if (file.size > MAX_ZIP_MB * 1024 * 1024) return t('workspacePage.create.errors.zipSize', { max: MAX_ZIP_MB })
    }
    if (source === 'github' && !GITHUB_URL.test(url.trim())) return t('workspacePage.create.errors.githubUrl')
    return null
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found = problem()
    if (found) {
      setError(found)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const base = { name: name.trim(), description: description.trim(), default_runtime: runtime }
      const workspace = await createWorkspace(source === 'zip' ? { ...base, source, file: file as File } : source === 'github' ? { ...base, source, url: url.trim() } : { ...base, source })
      onCreated(workspace)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('workspacePage.create.errors.failed'))
      setSaving(false)
    }
  }

  return (
    <DialogContent className='sm:max-w-lg'>
      <form onSubmit={submit} className='space-y-4' noValidate>
        <DialogHeader>
          <DialogTitle>{t('workspacePage.create.title')}</DialogTitle>
          <DialogDescription>{t('workspacePage.create.description')}</DialogDescription>
        </DialogHeader>

        <fieldset className='grid gap-2'>
          <legend className='text-sm font-medium'>{t('workspacePage.create.source')}</legend>
          <div className='flex flex-wrap gap-4 text-sm'>
            {(['empty', 'zip', 'github'] as const).map((value) => (
              <label key={value} className='flex items-center gap-2'>
                <input type='radio' name='workspace-source' value={value} checked={source === value} onChange={() => { setSource(value); setError(null) }} />
                {t(`workspacePage.create.sources.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className='grid gap-2'>
          <Label htmlFor='workspace-name'>{t('workspacePage.create.name')}</Label>
          <Input id='workspace-name' value={name} maxLength={100} placeholder={t('workspacePage.create.namePlaceholder')} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='workspace-description'>{t('workspacePage.create.descriptionLabel')}</Label>
          <Input id='workspace-description' value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='workspace-runtime'>{t('workspacePage.create.runtime')}</Label>
          <select id='workspace-runtime' className='h-9 rounded-md border bg-background px-3 text-sm' value={runtime} onChange={(event) => setRuntime(event.target.value as WorkspaceRuntime)}>
            <option value=''>{t('workspacePage.create.runtimeNone')}</option>
            <option value='go'>Go</option>
            <option value='node'>Node.js</option>
            <option value='python'>Python</option>
          </select>
        </div>

        {source === 'zip' && (
          <div className='grid gap-2'>
            <Label htmlFor='workspace-zip'>{t('workspacePage.create.zipFile')}</Label>
            <input id='workspace-zip' type='file' accept='.zip,application/zip' onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <p className='text-xs text-muted-foreground'>{t('workspacePage.create.zipHint', { max: MAX_ZIP_MB })}</p>
          </div>
        )}
        {source === 'github' && (
          <div className='grid gap-2'>
            <Label htmlFor='workspace-github'>{t('workspacePage.create.githubUrl')}</Label>
            <Input id='workspace-github' value={url} placeholder='https://github.com/owner/repository' onChange={(event) => setUrl(event.target.value)} />
            <p className='text-xs text-muted-foreground'>{t('workspacePage.create.githubHint')}</p>
          </div>
        )}

        {error && <p role='alert' className='text-sm text-destructive'>{error}</p>}
        <DialogFooter>
          <Button type='button' variant='outline' onClick={onCancel} disabled={saving}>{t('workspacePage.actions.cancel')}</Button>
          <Button type='submit' disabled={saving}>
            {saving && <Loader2 className='mr-2 size-4 animate-spin' />}
            {saving ? t('workspacePage.create.creating') : t('workspacePage.create.submit')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
