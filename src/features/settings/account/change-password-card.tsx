import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { changeCurrentUserPassword } from '@/lib/api-auth'

type Notice = { kind: 'success' | 'error'; text: string } | null

export function ChangePasswordCard() {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const copy = {
    title: t('changePassword.title'),
    description: t('changePassword.description'),
    current: t('changePassword.current'),
    currentPlaceholder: t('changePassword.currentPlaceholder'),
    next: t('changePassword.next'),
    nextPlaceholder: t('changePassword.nextPlaceholder'),
    confirm: t('changePassword.confirm'),
    confirmPlaceholder: t('changePassword.confirmPlaceholder'),
    mismatch: t('changePassword.mismatch'),
    minLength: t('changePassword.minLength'),
    same: t('changePassword.same'),
    save: t('changePassword.save'),
    saving: t('changePassword.saving'),
    success: t('changePassword.success'),
    failure: t('changePassword.failure'),
  }

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const newPasswordInvalid = newPassword.length > 0 && newPassword.length < 8
  const samePassword = currentPassword.length > 0 && newPassword.length > 0 && currentPassword === newPassword

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)

    if (newPassword.length < 8) {
      setNotice({ kind: 'error', text: copy.minLength })
      return
    }
    if (newPassword !== confirmPassword) {
      setNotice({ kind: 'error', text: copy.mismatch })
      return
    }
    if (currentPassword === newPassword) {
      setNotice({ kind: 'error', text: copy.same })
      return
    }

    setSaving(true)
    try {
      await changeCurrentUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setNotice({ kind: 'success', text: copy.success })
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : copy.failure,
      })
    } finally {
      setSaving(false)
    }
  }

  function passwordField(
    id: string,
    label: string,
    value: string,
    placeholder: string,
    visible: boolean,
    toggleVisible: () => void,
    onChange: (value: string) => void,
    autoComplete: 'current-password' | 'new-password',
    minLength?: number
  ) {
    return (
      <div className='space-y-2'>
        <label htmlFor={id} className='text-sm font-medium'>{label}</label>
        <div className='relative'>
          <Input
            id={id}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            minLength={minLength}
            className='pe-10'
            required
            disabled={saving}
          />
          <button
            type='button'
            onClick={toggleVisible}
            aria-label={visible ? (t('changePassword.hidePassword')) : (t('changePassword.showPassword'))}
            className='absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground'
            disabled={saving}
          >
            {visible ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className='space-y-5 rounded-xl border bg-card p-5 sm:p-6'>
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
          <KeyRound className='size-5' />
        </div>
        <div className='space-y-1'>
          <h3 className='text-base font-semibold'>{copy.title}</h3>
          <p className='text-sm text-muted-foreground'>{copy.description}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className='space-y-4'>
        {passwordField('current-password', copy.current, currentPassword, copy.currentPlaceholder, showCurrent, () => setShowCurrent((value) => !value), setCurrentPassword, 'current-password')}
        {passwordField('new-password', copy.next, newPassword, copy.nextPlaceholder, showNew, () => setShowNew((value) => !value), setNewPassword, 'new-password', 8)}
        {passwordField('confirm-new-password', copy.confirm, confirmPassword, copy.confirmPlaceholder, showConfirm, () => setShowConfirm((value) => !value), setConfirmPassword, 'new-password', 8)}

        {mismatch && <p role='alert' className='text-sm text-destructive'>{copy.mismatch}</p>}
        {newPasswordInvalid && <p role='alert' className='text-sm text-destructive'>{copy.minLength}</p>}
        {samePassword && <p role='alert' className='text-sm text-destructive'>{copy.same}</p>}
        {notice && (
          <p role={notice.kind === 'error' ? 'alert' : 'status'} className={notice.kind === 'success' ? 'text-sm text-emerald-600' : 'text-sm text-destructive'}>
            {notice.text}
          </p>
        )}

        <div className='flex justify-end'>
          <Button type='submit' disabled={saving || !currentPassword || !newPassword || !confirmPassword || mismatch || newPasswordInvalid || samePassword}>
            {saving ? <><LoaderCircle className='me-2 size-4 animate-spin' />{copy.saving}</> : <><ShieldCheck className='me-2 size-4' />{copy.save}</>}
          </Button>
        </div>
      </form>
    </section>
  )
}
