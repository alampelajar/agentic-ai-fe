import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { FolderGit2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getWorkspaces, type Workspace } from './data/api'

type Props = {
  value: number | null
  onChange: (workspace: Workspace | null) => void
  disabled?: boolean
}

/**
 * Chooses the cloud workspace a chat works in. It lists only workspaces that are
 * ready, and says plainly that the Local Agent Runner is not involved.
 */
export function WorkspaceSelector({ value, onChange, disabled }: Props) {
  const { t } = useTranslation()
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getWorkspaces()
      .then((loaded) => {
        if (!cancelled) setWorkspaces(loaded.filter((workspace) => workspace.status === 'ready'))
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const missing = value !== null && workspaces !== null && !workspaces.some((workspace) => workspace.id === value)

  return (
    <div className='mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground' data-testid='workspace-selector'>
      <FolderGit2 className='size-3.5' />
      <label htmlFor='chat-workspace'>{t('workspacePage.chat.label')}</label>
      <select
        id='chat-workspace'
        className='h-7 max-w-56 rounded-md border bg-background px-2 text-xs text-foreground'
        disabled={disabled || workspaces === null}
        value={value !== null && !missing ? String(value) : ''}
        onChange={(event) => onChange(workspaces?.find((workspace) => String(workspace.id) === event.target.value) ?? null)}
      >
        <option value=''>{t('workspacePage.chat.none')}</option>
        {workspaces?.map((workspace) => <option key={workspace.id} value={String(workspace.id)}>{workspace.name}</option>)}
      </select>
      {missing && <span role='alert' className='text-destructive'>{t('workspacePage.chat.unavailable')}</span>}
      {!missing && value !== null && <span>{t('workspacePage.chat.hint')}</span>}
      {!error && workspaces !== null && workspaces.length === 0 && (
        <span>
          {t('workspacePage.chat.needed')}{' '}
          <Link to='/workspaces' className='underline'>{t('workspacePage.chat.create')}</Link>
        </span>
      )}
    </div>
  )
}
