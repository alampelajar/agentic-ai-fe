import { useRef, useState } from 'react'
import { AlertTriangle, Check, ShieldAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { approveDesktopAction, denyDesktopAction, emergencyStopDesktop, getDesktopWindows, requestDesktopAction, revokeDesktopPermission, RunnerRequestError, type DesktopAction } from './api'
import { ApprovalCountdown } from './approval-countdown'
import { ApprovalDetailList } from './approval-detail-list'
import { buildDesktopActionRequest, describeDesktopAction, isExpired, type DesktopActionForm, type WindowInfo } from './approval-details'

export function DesktopInteractionPanel({ baseUrl, token, disabled }: { baseUrl: string; token: string; disabled: boolean }) {
  const [action, setAction] = useState('desktop.focus_window')
  const [agent, setAgent] = useState('Manual Desktop Agent')
  const [windowTitle, setWindowTitle] = useState('')
  const [reason, setReason] = useState('User requested a desktop interaction.')
  const [text, setText] = useState('')
  const [targetKind, setTargetKind] = useState<DesktopActionForm['targetKind']>('none')
  const [targetValue, setTargetValue] = useState('')
  const [direction, setDirection] = useState('down')
  const [amount, setAmount] = useState('1')
  const [pending, setPending] = useState<DesktopAction | null>(null)
  const [pendingWindows, setPendingWindows] = useState<WindowInfo[] | undefined>(undefined)
  const [events, setEvents] = useState<string[]>([])

  const isClick = action === 'desktop.click' || action === 'desktop.double_click'
  const isScroll = action === 'desktop.scroll'
  const showTarget = isClick || isScroll
  const scrollAmount = Number(amount)
  const formIncomplete = (isClick && !targetValue.trim()) || (isScroll && !(Number.isInteger(scrollAmount) && scrollAmount >= 1 && scrollAmount <= 20))

  const run = async (operation: () => Promise<void>) => { try { await operation() } catch (error) { toast.error(error instanceof Error ? error.message : 'Desktop action failed.') } }
  const note = (message: string) => setEvents((items) => [message, ...items].slice(0, 20))

  // The dialog's life. The ref is the source of truth so a late callback (a timer, a slow
  // response) can never touch a newer dialog: everything is keyed by the approval's id.
  const pendingRef = useRef<DesktopAction | null>(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const openApproval = (approval: DesktopAction) => { pendingRef.current = approval; busyRef.current = false; setBusy(false); setPending(approval) }
  // Idempotent: closes only if this approval is still the one on screen, and says whether it did.
  const closeApproval = (id: string) => {
    if (pendingRef.current?.id !== id) return false
    pendingRef.current = null
    busyRef.current = false
    setBusy(false)
    setPending(null)
    return true
  }
  const EXPIRED = 'Approval expired. Request a new one to continue.'
  const expireApproval = (approval: DesktopAction) => {
    // An approval already on its way to the runner is settled by the runner's answer instead.
    if (busyRef.current) return
    if (closeApproval(approval.id)) { note(`Approval expired: ${approval.action}`); toast.error(EXPIRED) }
  }

  const request = () => void run(async () => {
    const form: DesktopActionForm = { action, agent, reason, window: windowTitle, text, targetKind, targetValue, direction, amount }
    const result = await requestDesktopAction(baseUrl, token, buildDesktopActionRequest(form))
    // Window names are read-only metadata; they let the dialog show the application and not only a handle.
    const list = await getDesktopWindows(baseUrl, token).then((response) => response.data?.windows, () => undefined)
    setPendingWindows(list)
    openApproval(result.action)
    note(`Approval requested: ${result.action.action}`)
  })

  const resolve = (mode: 'once') => {
    const approval = pendingRef.current
    if (!approval || busyRef.current) return
    // Past the deadline there is nothing to approve, so nothing is sent.
    if (isExpired(approval.expires_at)) { expireApproval(approval); return }
    busyRef.current = true
    setBusy(true)
    void approveDesktopAction(baseUrl, token, approval.id, mode).then(
      () => { note(`Approved ${approval.action} (${mode})`); closeApproval(approval.id) },
      (error: unknown) => {
        if (error instanceof RunnerRequestError) {
          // The runner answered, so it no longer holds this approval (it drops it before answering). Never retry.
          if (closeApproval(approval.id)) {
            note(error.status === 410 ? `Approval expired: ${approval.action}` : `Approval failed: ${error.message}`)
            toast.error(error.status === 410 ? EXPIRED : error.message)
          }
          return
        }
        // Not an answer from the runner (network): the approval may still be valid, so keep the dialog.
        if (pendingRef.current?.id === approval.id) { busyRef.current = false; setBusy(false) }
        toast.error(error instanceof Error ? error.message : 'Desktop action failed.')
      }
    )
  }

  const deny = () => {
    const approval = pendingRef.current
    if (!approval || busyRef.current) return
    // Close first: from this moment the approval cannot be approved from this screen.
    closeApproval(approval.id)
    note(`Denied ${approval.action}`)
    void denyDesktopAction(baseUrl, token, approval.id).catch((error: unknown) => {
      // 404 or 410 mean the runner already dropped it, which is what a deny wants.
      if (!(error instanceof RunnerRequestError)) toast.error(error instanceof Error ? error.message : 'Desktop action failed.')
    })
  }

  const emergency = () => {
    // Close first, so no approval can be given after the button is pressed, even if the request below fails.
    const approval = pendingRef.current
    if (approval) closeApproval(approval.id)
    void run(async () => { await emergencyStopDesktop(baseUrl, token); note('Emergency stop: queue cancelled and permission revoked.'); toast.success('Emergency stop activated.') })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desktop interaction approval</CardTitle>
        <CardDescription>Every mutating action needs its own approval. Approving an action also reserves the desktop for that agent until you release control or use Emergency Stop.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='grid gap-2'>
            <Label htmlFor='desktop-agent'>Agent</Label>
            <Input id='desktop-agent' value={agent} onChange={(event) => setAgent(event.target.value)} />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='desktop-action'>Action</Label>
            <select id='desktop-action' value={action} onChange={(event) => setAction(event.target.value)} className='h-9 rounded-md border bg-background px-3 text-sm'>
              <option value='desktop.focus_window'>Focus window</option>
              <option value='desktop.click'>Click</option>
              <option value='desktop.double_click'>Double click</option>
              <option value='desktop.scroll'>Scroll</option>
              <option value='desktop.type'>Type</option>
              <option value='desktop.hotkey'>Hotkey</option>
            </select>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='desktop-target-window'>Target window</Label>
            <Input id='desktop-target-window' value={windowTitle} onChange={(event) => setWindowTitle(event.target.value)} placeholder='Exact title or window handle' />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='desktop-reason'>Reason</Label>
            <Input id='desktop-reason' value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
        </div>
        {showTarget && (
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='desktop-target-kind'>{isClick ? 'Control to click' : 'Control to scroll (optional)'}</Label>
              <select id='desktop-target-kind' value={targetKind} onChange={(event) => setTargetKind(event.target.value as DesktopActionForm['targetKind'])} className='h-9 rounded-md border bg-background px-3 text-sm'>
                <option value='none'>{isClick ? 'Choose how to find it' : 'The window itself'}</option>
                <option value='name'>By name</option>
                <option value='automation_id'>By automation ID</option>
                <option value='control_type'>By control type</option>
              </select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='desktop-target-value'>Control value</Label>
              <Input id='desktop-target-value' value={targetValue} onChange={(event) => setTargetValue(event.target.value)} placeholder='For example Save, 15 or Edit' disabled={targetKind === 'none'} />
            </div>
          </div>
        )}
        {isScroll && (
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='desktop-scroll-direction'>Direction</Label>
              <select id='desktop-scroll-direction' value={direction} onChange={(event) => setDirection(event.target.value)} className='h-9 rounded-md border bg-background px-3 text-sm'>
                <option value='down'>Down</option>
                <option value='up'>Up</option>
                <option value='left'>Left</option>
                <option value='right'>Right</option>
              </select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='desktop-scroll-amount'>Lines (1 to 20)</Label>
              <Input id='desktop-scroll-amount' type='number' min={1} max={20} value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
          </div>
        )}
        {(action === 'desktop.type' || action === 'desktop.hotkey') && (
          <div className='grid gap-2'>
            <Label htmlFor='desktop-action-text'>{action === 'desktop.type' ? 'Text' : 'Allowlisted hotkey'}</Label>
            <Input id='desktop-action-text' value={text} onChange={(event) => setText(event.target.value)} placeholder={action === 'desktop.hotkey' ? 'CTRL+A, CTRL+S, ESC' : 'Text is sent only after approval'} />
          </div>
        )}
        <div className='flex flex-wrap gap-2'>
          <Button disabled={disabled || !token || !agent || !reason || formIncomplete} onClick={request}>
            <ShieldAlert className='mr-2 size-4' />Request approval
          </Button>
          <Button variant='destructive' onClick={emergency}>
            <AlertTriangle className='mr-2 size-4' />Emergency stop
          </Button>
          <Button variant='outline' disabled={disabled || !token} onClick={() => void run(async () => { await revokeDesktopPermission(baseUrl, token); setEvents((items) => ['Desktop control released.', ...items]) })}>Release desktop control</Button>
        </div>
        {pending && (
          <div role='dialog' aria-label='Desktop action approval' className='rounded-lg border-2 border-amber-500/50 bg-amber-500/5 p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='font-semibold'>Approval required</p>
                <p className='mt-1 text-sm'>{pending.agent} requests <strong>{pending.action}</strong></p>
                <p className='mt-1 text-sm text-muted-foreground'>{pending.reason}</p>
              </div>
              <Button variant='ghost' size='icon' aria-label='Deny action' disabled={busy} onClick={deny}>
                <X className='size-4' />
              </Button>
            </div>
            <div className='mt-3'>
              <ApprovalDetailList key={pending.id} lang='en' details={describeDesktopAction(pending, { windows: pendingWindows, lang: 'en' })} />
            </div>
            <ApprovalCountdown key={pending.id} expiresAt={pending.expires_at} lang='en' onExpire={() => expireApproval(pending)} />
            <div className='mt-4 flex flex-wrap gap-2'>
              <Button disabled={busy} onClick={() => resolve('once')}>
                <Check className='mr-2 size-4' />Allow once
              </Button>
              <Button variant='destructive' disabled={busy} onClick={deny}>Deny</Button>
            </div>
          </div>
        )}
        <div className='rounded-md bg-muted p-3'>
          <p className='mb-2 text-sm font-medium'>Activity</p>
          {events.length ? events.map((event) => <p key={event} className='text-xs text-muted-foreground'>{event}</p>) : <p className='text-xs text-muted-foreground'>No desktop actions yet.</p>}
        </div>
      </CardContent>
    </Card>
  )
}
