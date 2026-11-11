import { useEffect, useState } from 'react'
import { GitBranch, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { disconnectGitHub, getGitHubConnection, startGitHubConnect, type GitHubConnection } from '@/lib/api-github'

// GitHub sends the browser back with ?github=connected|denied|error.
function takeResultFromAddress(): string | null {
  const params = new URLSearchParams(window.location.search)
  const result = params.get('github')
  if (!result) return null
  params.delete('github')
  const rest = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''))
  return result
}

/** `goTo` is where the browser is sent to approve on GitHub; a test passes its own. */
export function GitHubCard({ goTo = (url: string) => window.location.assign(url) }: { goTo?: (url: string) => void }) {
  const { t } = useTranslation()
  const [state, setState] = useState<GitHubConnection | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const result = takeResultFromAddress()
    if (result === 'connected') toast.success(t('githubIntegration.connected'))
    else if (result === 'denied') toast.info(t('githubIntegration.denied'))
    else if (result) toast.error(t('githubIntegration.error'))

    getGitHubConnection()
      .then((value) => !cancelled && setState(value))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [t])

  async function connect() {
    setBusy(true)
    try {
      goTo(await startGitHubConnect())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('githubIntegration.error'))
      setBusy(false)
    }
  }

  async function disconnect() {
    setBusy(true)
    try {
      await disconnectGitHub()
      setState((current) => ({ configured: current?.configured ?? true, connected: false }))
      toast.success(t('githubIntegration.disconnected'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('githubIntegration.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card data-testid='github-card'>
      <CardHeader>
        <CardTitle className='flex flex-wrap items-center gap-2 text-base'>
          <GitBranch className='size-4' />
          {t('githubIntegration.title')}
          {state?.connected && <Badge variant='outline'>{t('githubIntegration.connectedBadge')}</Badge>}
        </CardTitle>
        <CardDescription>{t('githubIntegration.description')}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-3 text-sm'>
        {failed ? (
          <p role='alert' className='text-destructive'>{t('githubIntegration.statusFailed')}</p>
        ) : !state ? (
          <p className='flex items-center gap-2 text-muted-foreground'><LoaderCircle className='size-4 animate-spin' />{t('githubIntegration.loading')}</p>
        ) : state.connected ? (
          <>
            <p>{t('githubIntegration.signedInAs')} <span className='font-medium'>@{state.githubLogin}</span></p>
            <Button type='button' variant='outline' disabled={busy} onClick={() => void disconnect()}>
              {busy && <LoaderCircle className='me-2 size-4 animate-spin' />}
              {t('githubIntegration.disconnect')}
            </Button>
          </>
        ) : !state.configured ? (
          <p className='text-muted-foreground'>{t('githubIntegration.notConfigured')}</p>
        ) : (
          <>
            <p className='text-muted-foreground'>{t('githubIntegration.consent')}</p>
            <Button type='button' disabled={busy} onClick={() => void connect()}>
              {busy ? <LoaderCircle className='me-2 size-4 animate-spin' /> : <GitBranch className='me-2 size-4' />}
              {t('githubIntegration.connect')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
