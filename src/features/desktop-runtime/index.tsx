import { useEffect, useState } from 'react'
import { Camera, Eye, Loader2, RefreshCw, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useDesktopRuntime } from '@/stores/desktop-runtime-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDesktopScreenshot, getDesktopWindows, inspectDesktopWindow, stopDesktopRuntime, type DesktopWindow } from './api'
import { DesktopInteractionPanel } from './interaction-panel'

/**
 * Desktop control panels: windows, screenshot, inspection and the approval-gated
 * interactions. They use the connection made on the Integrations page and show
 * nothing until the Desktop Runtime is connected and switched on at the runner.
 */
export function DesktopRuntime() {
  const { t } = useTranslation()
  const { url, token, connected, desktopControl, stopped, markDesktopStopped } = useDesktopRuntime()
  const [windows, setWindows] = useState<DesktopWindow[]>([])
  const [screenshot, setScreenshot] = useState('')
  const [inspection, setInspection] = useState<string[]>([])
  const [selectedWindow, setSelectedWindow] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('desktopRuntime.panels.requestFailed'))
    } finally {
      setBusy(false)
    }
  }
  const loadWindows = () => run(async () => setWindows((await getDesktopWindows(url, token)).data?.windows || []))
  const takeScreenshot = () => void run(async () => {
    const result = await getDesktopScreenshot(url, token)
    if (!result.data?.base64) throw new Error(t('desktopRuntime.panels.noScreenshotData'))
    setScreenshot(`data:${result.data.mime_type || 'image/png'};base64,${result.data.base64}`)
  })
  const inspect = () => void run(async () => {
    if (!selectedWindow) throw new Error(t('desktopRuntime.panels.chooseWindowFirst'))
    const result = await inspectDesktopWindow(url, token, selectedWindow)
    setInspection((result.data?.elements || []).map((item) => `${item.name} · ${item.control_type || t('desktopRuntime.panels.unknown')} · ${item.automation_id || t('desktopRuntime.panels.noId')}`))
  })
  const stop = () => void run(async () => {
    await stopDesktopRuntime(url, token)
    markDesktopStopped()
    setScreenshot('')
    setInspection([])
    toast.success(t('desktopRuntime.panels.stopped'))
  })

  // Load the window list once when the runtime becomes usable.
  const usable = connected && desktopControl === 'available' && !stopped
  useEffect(() => {
    if (!usable) return
    void loadWindows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usable])

  if (!connected) return <p className='text-sm text-muted-foreground'>{t('desktopRuntime.panels.connectFirst')}</p>
  if (desktopControl === 'disabled') return <p className='text-sm text-muted-foreground'>{t('desktopRuntime.panels.unavailable')}</p>

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>{t('desktopRuntime.panels.heading')}</h3>
        <p className='text-sm text-muted-foreground'>{t('desktopRuntime.panels.description')}</p>
      </div>
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>{t('desktopRuntime.panels.windowsTitle')}</CardTitle>
            <CardDescription>{t('desktopRuntime.panels.windowsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {windows.length ? (
              windows.map((window) => (
                <button type='button' key={window.handle} onClick={() => setSelectedWindow(String(window.handle))} className={`block w-full rounded-md border p-3 text-left text-sm ${selectedWindow === String(window.handle) ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                  <span className='font-medium'>{window.title}</span>
                  <span className='block text-xs text-muted-foreground'>{window.class_name || t('desktopRuntime.panels.unknown')} · {t('desktopRuntime.panels.handle', { handle: window.handle })}</span>
                </button>
              ))
            ) : (
              <p className='text-sm text-muted-foreground'>{busy ? t('desktopRuntime.panels.loadingWindows') : t('desktopRuntime.panels.noWindows')}</p>
            )}
            <div className='flex flex-wrap gap-2'>
              <Button variant='outline' disabled={busy || stopped} onClick={() => void loadWindows()}>
                {busy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <RefreshCw className='mr-2 size-4' />}{t('desktopRuntime.panels.refreshWindows')}
              </Button>
              <Button variant='outline' disabled={busy || !selectedWindow} onClick={inspect}>
                <Eye className='mr-2 size-4' />{t('desktopRuntime.panels.inspectWindow')}
              </Button>
            </div>
            {inspection.length > 0 && <div className='max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs'>{inspection.map((item) => <div key={item}>{item}</div>)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('desktopRuntime.panels.screenshotTitle')}</CardTitle>
            <CardDescription>{t('desktopRuntime.panels.screenshotDescription')}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {screenshot ? <img src={screenshot} alt={t('desktopRuntime.panels.screenshotAlt')} className='max-h-120 w-full object-contain' /> : <div className='flex h-48 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground'>{t('desktopRuntime.panels.noScreenshot')}</div>}
            <div className='flex flex-wrap gap-2'>
              <Button variant='outline' disabled={busy || stopped} onClick={takeScreenshot}><Camera className='mr-2 size-4' />{t('desktopRuntime.panels.takeScreenshot')}</Button>
              <Button variant='destructive' disabled={busy || stopped} onClick={stop}><Square className='mr-2 size-4' />{t('desktopRuntime.panels.stop')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <DesktopInteractionPanel baseUrl={url} token={token} disabled={busy || stopped} />
    </div>
  )
}
