import { useState } from 'react'
import { Loader2, PlugZap, Unplug } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDesktopRuntime } from '@/stores/desktop-runtime-store'

/** Connect to, and disconnect from, the Local Agent Runner. Everything shown is something the runner already supports. */
export function DesktopConnectionCard() {
  const { t } = useTranslation()
  const state = useDesktopRuntime()

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex flex-wrap items-center gap-2'>
          {t('desktopRuntime.connection.title')}
          <Badge variant={state.connected ? 'default' : 'secondary'}>
            {state.connected ? t('desktopRuntime.connection.connected') : t('desktopRuntime.connection.notConnected')}
          </Badge>
        </CardTitle>
        <CardDescription>{t('desktopRuntime.connection.tokenNote')}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end'>
          <div className='grid gap-2'>
            <Label htmlFor='runtime-url'>{t('desktopRuntime.connection.url')}</Label>
            <Input id='runtime-url' value={state.url} spellCheck={false} onChange={(event) => state.setUrl(event.target.value)} />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='runtime-token'>{t('desktopRuntime.connection.token')}</Label>
            <Input id='runtime-token' type='password' autoComplete='off' value={state.token} placeholder={t('desktopRuntime.connection.tokenPlaceholder')} onChange={(event) => state.setToken(event.target.value)} />
          </div>
          <Button disabled={state.connecting || !state.token.trim()} onClick={() => void state.connect()}>
            {state.connecting ? <Loader2 className='mr-2 size-4 animate-spin' /> : <PlugZap className='mr-2 size-4' />}
            {state.connecting ? t('desktopRuntime.connection.connecting') : state.connected ? t('desktopRuntime.connection.reconnect') : t('desktopRuntime.connection.connect')}
          </Button>
          <Button variant='outline' disabled={state.connecting || (!state.connected && !state.token)} onClick={() => state.disconnect()}>
            <Unplug className='mr-2 size-4' />
            {t('desktopRuntime.connection.disconnect')}
          </Button>
        </div>

        {state.problem && (
          <p role='alert' className='text-sm text-destructive'>
            {t(`desktopRuntime.problems.${state.problem}`, { detail: state.problemDetail })}
          </p>
        )}

        {state.connected && (
          <dl className='grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]' data-testid='runtime-status'>
            <dt className='text-muted-foreground'>{t('desktopRuntime.connection.device')}</dt>
            <dd>{state.deviceName || '—'}</dd>
            <dt className='text-muted-foreground'>{t('desktopRuntime.connection.desktopControl')}</dt>
            <dd>{state.stopped ? t('desktopRuntime.connection.stopped') : t(`desktopRuntime.connection.desktopStates.${state.desktopControl}`)}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

/** Local project folders and cloning: the runner's own file tools, kept for those who use them. */
export function LocalFoldersCard() {
  const { t } = useTranslation()
  const state = useDesktopRuntime()
  const [repository, setRepository] = useState('')

  if (!state.connected) return null
  const cloneMessage = state.cloneMessage
  const message = cloneMessage.startsWith('ok:')
    ? t('desktopRuntime.localFolders.cloned', { name: cloneMessage.slice(3) })
    : cloneMessage.startsWith('error:')
      ? t('desktopRuntime.localFolders.cloneFailed', { detail: cloneMessage.slice(6) })
      : cloneMessage === 'not-connected'
        ? t('desktopRuntime.localFolders.notConnected')
        : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>{t('desktopRuntime.localFolders.title')}</CardTitle>
        <CardDescription>{t('desktopRuntime.localFolders.description')}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {state.localWorkspaces.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('desktopRuntime.localFolders.none')}</p>
        ) : (
          <div className='grid max-w-xl gap-2'>
            <Label htmlFor='local-folder'>{t('desktopRuntime.localFolders.select')}</Label>
            <select id='local-folder' className='h-9 rounded-md border bg-background px-3 text-sm' value={state.localWorkspaceId} onChange={(event) => state.selectLocalWorkspace(event.target.value)}>
              {state.localWorkspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name} ({workspace.id})</option>)}
            </select>
          </div>
        )}
        <div className='grid max-w-xl gap-2 sm:grid-cols-[1fr_auto] sm:items-end'>
          <div className='grid gap-2'>
            <Label htmlFor='clone-url'>{t('desktopRuntime.localFolders.clone')}</Label>
            <Input id='clone-url' value={repository} placeholder='https://github.com/owner/repository' spellCheck={false} onChange={(event) => setRepository(event.target.value)} />
          </div>
          <Button
            variant='outline'
            disabled={state.cloning || !repository.trim()}
            onClick={() => void state.cloneRepository(repository).then((done) => done && setRepository(''))}
          >
            {state.cloning ? t('desktopRuntime.localFolders.cloning') : t('desktopRuntime.localFolders.cloneButton')}
          </Button>
        </div>
        {message && <p role='status' className='text-sm text-muted-foreground'>{message}</p>}
      </CardContent>
    </Card>
  )
}
