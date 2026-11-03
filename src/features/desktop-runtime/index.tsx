import { useState } from 'react'
import { Camera, Eye, Loader2, Square, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getDesktopScreenshot, getDesktopStatus, getDesktopWindows, inspectDesktopWindow, stopDesktopRuntime, type DesktopWindow } from './api'
import { DesktopInteractionPanel } from './interaction-panel'

export function DesktopRuntime() {
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:8765')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState('disconnected')
  const [device, setDevice] = useState('')
  const [windows, setWindows] = useState<DesktopWindow[]>([])
  const [screenshot, setScreenshot] = useState('')
  const [inspection, setInspection] = useState<string[]>([])
  const [selectedWindow, setSelectedWindow] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action() } catch (error) { toast.error(error instanceof Error ? error.message : 'Desktop runtime request failed.') } finally { setBusy(false) } }
  const connect = () => void run(async () => { const result = await getDesktopStatus(baseUrl, token); setStatus(result.status); setDevice(result.data?.device_name || ''); const list = await getDesktopWindows(baseUrl, token); setWindows(list.data?.windows || []); toast.success('Desktop runtime terhubung.') })
  const takeScreenshot = () => void run(async () => { const result = await getDesktopScreenshot(baseUrl, token); if (!result.data?.base64) throw new Error('Screenshot tidak tersedia.'); setScreenshot(`data:${result.data.mime_type || 'image/png'};base64,${result.data.base64}`) })
  const inspect = () => void run(async () => { if (!selectedWindow) throw new Error('Pilih jendela terlebih dahulu.'); const result = await inspectDesktopWindow(baseUrl, token, selectedWindow); setInspection((result.data?.elements || []).map((item) => `${item.name} · ${item.control_type || 'Unknown'} · ${item.automation_id || 'no id'}`)) })
  const stop = () => void run(async () => { await stopDesktopRuntime(baseUrl, token); setStatus('stopped'); setScreenshot(''); setInspection([]); toast.success('Desktop runtime dihentikan.') })

  return <div className='space-y-6'>
    <div><h1 className='text-2xl font-bold'>Desktop Access</h1><p className='text-sm text-muted-foreground'>Observe the Windows desktop (windows, screenshot, UI elements) and request interactions. Observation runs directly; every focus change, click, typing, hotkey, or scroll needs its own approval.</p></div>
    <Card><CardHeader><CardTitle>Runtime connection</CardTitle><CardDescription>Status: <span className='font-medium'>{status}</span>{device && ` · ${device}`}</CardDescription></CardHeader><CardContent className='grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end'><div className='grid gap-2'><Label htmlFor='desktop-url'>Runner URL</Label><Input id='desktop-url' value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} /></div><div className='grid gap-2'><Label htmlFor='desktop-token'>Bearer token</Label><Input id='desktop-token' type='password' value={token} onChange={(event) => setToken(event.target.value)} /></div><Button disabled={busy || !token.trim()} onClick={connect}>{busy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <RefreshCw className='mr-2 size-4' />}Connect</Button><Button variant='destructive' disabled={busy || status === 'stopped'} onClick={stop}><Square className='mr-2 size-4' />Stop</Button></CardContent></Card>
    <div className='grid gap-6 lg:grid-cols-2'><Card><CardHeader><CardTitle>Open windows</CardTitle><CardDescription>Read-only window metadata from Windows UI Automation.</CardDescription></CardHeader><CardContent className='space-y-3'>{windows.length ? windows.map((window) => <button type='button' key={window.handle} onClick={() => setSelectedWindow(String(window.handle))} className={`block w-full rounded-md border p-3 text-left text-sm ${selectedWindow === String(window.handle) ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}><span className='font-medium'>{window.title}</span><span className='block text-xs text-muted-foreground'>{window.class_name || 'Unknown'} · handle {window.handle}</span></button>) : <p className='text-sm text-muted-foreground'>Connect to load windows.</p>}<Button variant='outline' disabled={busy || !selectedWindow} onClick={inspect}><Eye className='mr-2 size-4' />Inspect selected window</Button>{inspection.length > 0 && <div className='max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs'>{inspection.map((item) => <div key={item}>{item}</div>)}</div>}</CardContent></Card><Card><CardHeader><CardTitle>Screenshot</CardTitle><CardDescription>Captured only after explicit user action; not persisted by the runner.</CardDescription></CardHeader><CardContent className='space-y-4'>{screenshot ? <img src={screenshot} alt='Desktop screenshot' className='max-h-[480px] w-full object-contain' /> : <div className='flex h-48 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground'>No screenshot captured.</div>}<Button variant='outline' disabled={busy || status === 'stopped'} onClick={takeScreenshot}><Camera className='mr-2 size-4' />Take screenshot</Button></CardContent></Card></div>
    <DesktopInteractionPanel baseUrl={baseUrl} token={token} disabled={busy || status === 'stopped'} />
  </div>
}
