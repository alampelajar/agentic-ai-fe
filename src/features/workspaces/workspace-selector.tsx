import { Link } from '@tanstack/react-router'
import { ChevronDown, FolderGit2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type Workspace } from './data/api'
import { useReadyWorkspaces } from './use-ready-workspaces'

type Props = {
  value: number | null
  onChange: (workspace: Workspace | null) => void
  disabled?: boolean
  /**
   * `bar` is the compact control for the chat's session bar: the label and the list
   * on one line, no explanation (the conversation's start says what a workspace
   * means). `block` is the original centred line with its hint.
   */
  variant?: 'block' | 'bar'
}

/**
 * Chooses the cloud workspace a chat works in. It lists only workspaces that are
 * ready, and says plainly that the Local Agent Runner is not involved.
 */
export function WorkspaceSelector({ value, onChange, disabled, variant = 'block' }: Props) {
  const { t } = useTranslation()
  const { workspaces, failed: error } = useReadyWorkspaces()

  const missing = value !== null && workspaces !== null && !workspaces.some((workspace) => workspace.id === value)

  const bar = variant === 'bar'

  return (
    <div
      className={bar ? 'col-span-2 flex min-w-0 items-center gap-2 text-sm sm:col-span-1' : 'mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground'}
      data-testid='workspace-selector'
    >
      <label htmlFor='chat-workspace' className={bar ? 'sr-only' : 'flex items-center gap-2'}>
        {!bar && <FolderGit2 className='size-3.5' />}
        {t('workspacePage.chat.label')}
      </label>
      {bar && <FolderGit2 aria-hidden='true' className='-mr-1 size-4 shrink-0 text-muted-foreground' />}
      <div className={bar ? 'relative min-w-0 flex-1 sm:max-w-56 sm:flex-none' : 'contents'}>
        <select
          id='chat-workspace'
          className={
            bar
              ? 'h-9 w-full appearance-none rounded-md border border-border bg-transparent py-0 pl-3 pr-9 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
              : 'h-7 max-w-56 rounded-md border bg-background px-2 text-xs text-foreground'
          }
          disabled={disabled || workspaces === null}
          value={value !== null && !missing ? String(value) : ''}
          onChange={(event) => onChange(workspaces?.find((workspace) => String(workspace.id) === event.target.value) ?? null)}
        >
          <option value=''>{t('workspacePage.chat.none')}</option>
          {workspaces?.map((workspace) => (
            <option key={workspace.id} value={String(workspace.id)}>
              {workspace.name}
            </option>
          ))}
        </select>
        {bar && <ChevronDown aria-hidden='true' className='pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />}
      </div>
      {missing && (
        <span role='alert' className='text-xs text-destructive'>
          {t('workspacePage.chat.unavailable')}
        </span>
      )}
      {!bar && !missing && value !== null && <span>{t('workspacePage.chat.hint')}</span>}
      {!error && workspaces !== null && workspaces.length === 0 && (
        <span className={bar ? 'text-xs text-muted-foreground' : undefined}>
          {bar ? null : <>{t('workspacePage.chat.needed')} </>}
          <Link to='/workspaces' className={bar ? 'text-xs text-muted-foreground underline' : 'underline'}>
            {t('workspacePage.chat.create')}
          </Link>
        </span>
      )}
    </div>
  )
}
