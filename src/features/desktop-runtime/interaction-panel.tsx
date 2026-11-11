import { useRef, useState } from 'react'
import { AlertTriangle, Check, ShieldAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'id').startsWith('en') ? 'en' : 'id'
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
  const [events, setEvents] = useState<{ id: number; text: string }[]>([])
  const eventSeq = useRef(0)

  const isClick = action === 'desktop.click' || action === 'desktop.double_click'
  const isScroll = action === 'desktop.scroll'
  const showTarget = isClick || isScroll
  const scrollAmount = Number(amount)
  const formIncomplete = (isClick && !targetValue.trim()) || (isScroll && !(Number.isInteger(scrollAmount) && scrollAmount >= 1 && scrollAmount <= 20))

  const run = async (operation: () => Promise<void>) => { try { await operation() } catch (error) { toast.error(error instanceof Error ? error.message : t('desktopRuntime.interaction.toast.failed')) } }
  const note = (message: string) => setEvents((items) => [{ id: ++eventSeq.current, text: message }, ...items].slice(0, 20))

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
  const EXPIRED = t('desktopRuntime.interaction.toast.expired')
  const expireApproval = (approval: DesktopAction) => {
    // An approval already on its way to the runner is settled by the runner's answer instead.
    if (busyRef.current) return
    if (closeApproval(approval.id)) { note(t('desktopRuntime.interaction.log.expired', { action: approval.action })); toast.error(EXPIRED) }
  }

  const request = () => void run(async () => {
    const form: DesktopActionForm = { action, agent, reason, window: windowTitle, text, targetKind, targetValue, direction, amount }
    const result = await requestDesktopAction(baseUrl, token, buildDesktopActionRequest(form))
    // Window names are read-only metadata; they let the dialog show the application and not only a handle.
    const list = await getDesktopWindows(baseUrl, token).then((response) => response.data?.windows, () => undefined)
    setPendingWindows(list)
    openApproval(result.action)
    note(t('desktopRuntime.interaction.log.requested', { action: result.action.action }))
  })

  const resolve = (mode: 'once') => {
    const approval = pendingRef.current
    if (!approval || busyRef.current) return
    // Past the deadline there is nothing to approve, so nothing is sent.
    if (isExpired(approval.expires_at)) { expireApproval(approval); return }
    busyRef.current = true
    setBusy(true)
    void approveDesktopAction(baseUrl, token, approval.id, mode).then(
      () => { note(t('desktopRuntime.interaction.log.approved', { action: approval.action, mode })); closeApproval(approval.id) },
      (error: unknown) => {
        if (error instanceof RunnerRequestError) {
          // The runner answered, so it no longer holds this approval (it drops it before answering). Never retry.
          if (closeApproval(approval.id)) {
            note(error.status === 410 ? t('desktopRuntime.interaction.log.expired', { action: approval.action }) : t('desktopRuntime.interaction.log.failed', { message: error.message }))
            toast.error(error.status === 410 ? EXPIRED : error.message)
          }
          return
        }
        // Not an answer from the runner (network): the approval may still be valid, so keep the dialog.
        if (pendingRef.current?.id === approval.id) { busyRef.current = false; setBusy(false) }
        toast.error(error instanceof Error ? error.message : t('desktopRuntime.interaction.toast.failed'))
      }
    )
  }

  const deny = () => {
    const approval = pendingRef.current
    if (!approval || busyRef.current) return
    // Close first: from this moment the approval cannot be approved from this screen.
    closeApproval(approval.id)
    note(t('desktopRuntime.interaction.log.denied', { action: approval.action }))
    void denyDesktopAction(baseUrl, token, approval.id).catch((error: unknown) => {
      // 404 or 410 mean the runner already dropped it, which is what a deny wants.
      if (!(error instanceof RunnerRequestError)) toast.error(error instanceof Error ? error.message : t('desktopRuntime.interaction.toast.failed'))
    })
  }

  const emergency = () => {
    // Close first, so no approval can be given after the button is pressed, even if the request below fails.
    const approval = pendingRef.current
    if (approval) closeApproval(approval.id)
    void run(async () => { await emergencyStopDesktop(baseUrl, token); note(t('desktopRuntime.interaction.log.emergency')); toast.success(t('desktopRuntime.interaction.toast.emergency')) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('desktopRuntime.interaction.title')}</CardTitle>
        <CardDescription>{t('desktopRuntime.interaction.description')}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='grid gap-2'>
            <Label htmlFor='desktop-agent'>{t('desktopRuntime.interaction.fields.agent')}</Label>
            <Input id='desktop-agent' value={agent} onChange={(event) => setAgent(event.target.value)} />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='desktop-action'>{t('desktopRuntime.interaction.fields.action')}</Label>
            <select id='desktop-action' value={action} onChange={(event) => setAction(event.target.value)} className='h-9 rounded-md border bg-background px-3 text-sm'>
              <option value='desktop.focus_window'>{t('desktopRuntime.interaction.actions.focusWindow')}</option>
              <option value='desktop.click'>{t('desktopRuntime.interaction.actions.click')}</option>
              <option value='desktop.double_click'>{t('desktopRuntime.interaction.actions.doubleClick')}</option>
              <option value='desktop.scroll'>{t('desktopRuntime.interaction.actions.scroll')}</option>
              <option value='desktop.type'>{t('desktopRuntime.interaction.actions.type')}</option>
              <option value='desktop.hotkey'>{t('desktopRuntime.interaction.actions.hotkey')}</option>
            </select>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='desktop-target-window'>{t('desktopRuntime.interaction.fields.targetWindow')}</Label>
            <Input id='desktop-target-window' value={windowTitle} onChange={(event) => setWindowTitle(event.target.value)} placeholder={t('desktopRuntime.interaction.fields.targetWindowPlaceholder')} />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='desktop-reason'>{t('desktopRuntime.interaction.fields.reason')}</Label>
            <Input id='desktop-reason' value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
        </div>
        {showTarget && (
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='desktop-target-kind'>{isClick ? t('desktopRuntime.interaction.fields.controlToClick') : t('desktopRuntime.interaction.fields.controlToScroll')}</Label>
              <select id='desktop-target-kind' value={targetKind} onChange={(event) => setTargetKind(event.target.value as DesktopActionForm['targetKind'])} className='h-9 rounded-md border bg-background px-3 text-sm'>
                <option value='none'>{isClick ? t('desktopRuntime.interaction.fields.findHow') : t('desktopRuntime.interaction.fields.windowItself')}</option>
                <option value='name'>{t('desktopRuntime.interaction.fields.byName')}</option>
                <option value='automation_id'>{t('desktopRuntime.interaction.fields.byAutomationId')}</option>
                <option value='control_type'>{t('desktopRuntime.interaction.fields.byControlType')}</option>
              </select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='desktop-target-value'>{t('desktopRuntime.interaction.fields.controlValue')}</Label>
              <Input id='desktop-target-value' value={targetValue} onChange={(event) => setTargetValue(event.target.value)} placeholder={t('desktopRuntime.interaction.fields.controlValuePlaceholder')} disabled={targetKind === 'none'} />
            </div>
          </div>
        )}
        {isScroll && (
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='desktop-scroll-direction'>{t('desktopRuntime.interaction.fields.direction')}</Label>
              <select id='desktop-scroll-direction' value={direction} onChange={(event) => setDirection(event.target.value)} className='h-9 rounded-md border bg-background px-3 text-sm'>
                <option value='down'>{t('desktopRuntime.interaction.directions.down')}</option>
                <option value='up'>{t('desktopRuntime.interaction.directions.up')}</option>
                <option value='left'>{t('desktopRuntime.interaction.directions.left')}</option>
                <option value='right'>{t('desktopRuntime.interaction.directions.right')}</option>
              </select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='desktop-scroll-amount'>{t('desktopRuntime.interaction.fields.lines')}</Label>
              <Input id='desktop-scroll-amount' type='number' min={1} max={20} value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
          </div>
        )}
        {(action === 'desktop.type' || action === 'desktop.hotkey') && (
          <div className='grid gap-2'>
            <Label htmlFor='desktop-action-text'>{action === 'desktop.type' ? t('desktopRuntime.interaction.fields.text') : t('desktopRuntime.interaction.fields.hotkey')}</Label>
            <Input id='desktop-action-text' value={text} onChange={(event) => setText(event.target.value)} placeholder={action === 'desktop.hotkey' ? t('desktopRuntime.interaction.fields.hotkeyPlaceholder') : t('desktopRuntime.interaction.fields.textPlaceholder')} />
          </div>
        )}
        <div className='flex flex-wrap gap-2'>
          <Button disabled={disabled || !token || !agent || !reason || formIncomplete} onClick={request}>
            <ShieldAlert className='mr-2 size-4' />{t('desktopRuntime.interaction.buttons.request')}
          </Button>
          <Button variant='destructive' onClick={emergency}>
            <AlertTriangle className='mr-2 size-4' />{t('desktopRuntime.interaction.buttons.emergency')}
          </Button>
          <Button variant='outline' disabled={disabled || !token} onClick={() => void run(async () => { await revokeDesktopPermission(baseUrl, token); note(t('desktopRuntime.interaction.log.released')) })}>{t('desktopRuntime.interaction.buttons.release')}</Button>
        </div>
        {pending && (
          <div role='dialog' aria-label={t('desktopRuntime.interaction.dialog.label')} className='rounded-lg border-2 bg-amber-500/10 p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='font-semibold'>{t('desktopRuntime.interaction.dialog.required')}</p>
                <p className='mt-1 text-sm'>{t('desktopRuntime.interaction.dialog.requests', { agent: pending.agent })} <strong>{pending.action}</strong></p>
                <p className='mt-1 text-sm text-muted-foreground'>{pending.reason}</p>
              </div>
              <Button variant='ghost' size='icon' aria-label={t('desktopRuntime.interaction.dialog.denyAction')} disabled={busy} onClick={deny}>
                <X className='size-4' />
              </Button>
            </div>
            <div className='mt-3'>
              <ApprovalDetailList key={pending.id} lang={lang} details={describeDesktopAction(pending, { windows: pendingWindows, lang })} />
            </div>
            <ApprovalCountdown key={pending.id} expiresAt={pending.expires_at} lang={lang} onExpire={() => expireApproval(pending)} />
            <div className='mt-4 flex flex-wrap gap-2'>
              <Button disabled={busy} onClick={() => resolve('once')}>
                <Check className='mr-2 size-4' />{t('desktopRuntime.interaction.dialog.allowOnce')}
              </Button>
              <Button variant='destructive' disabled={busy} onClick={deny}>{t('desktopRuntime.interaction.dialog.deny')}</Button>
            </div>
          </div>
        )}
        <div className='rounded-md bg-muted p-3'>
          <p className='mb-2 text-sm font-medium'>{t('desktopRuntime.interaction.activity')}</p>
          {events.length ? events.map((event) => <p key={event.id} className='text-xs text-muted-foreground'>{event.text}</p>) : <p className='text-xs text-muted-foreground'>{t('desktopRuntime.interaction.noActivity')}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
