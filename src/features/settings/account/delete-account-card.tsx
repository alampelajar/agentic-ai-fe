import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, LoaderCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/password-input'
import { deleteCurrentUserAccount, verifyCurrentUserPasswordForDeletion } from '@/lib/api-auth'
import { useAuthStore } from '@/stores/auth-store'

export function DeleteAccountCard() {
  const navigate = useNavigate()
  const resetAuth = useAuthStore((state) => state.auth.reset)
  const { t } = useTranslation()

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [verifiedPassword, setVerifiedPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [countdown, setCountdown] = useState(5)

  const copy = {
    sectionTitle: t('deleteAccount.sectionTitle'),
    sectionDescription: t('deleteAccount.sectionDescription'),
    openButton: t('deleteAccount.openButton'),
    passwordTitle: t('deleteAccount.passwordTitle'),
    passwordDescription: t('deleteAccount.passwordDescription'),
    passwordLabel: t('deleteAccount.passwordLabel'),
    passwordPlaceholder: t('deleteAccount.passwordPlaceholder'),
    verify: t('deleteAccount.verify'),
    verifying: t('deleteAccount.verifying'),
    cancel: t('deleteAccount.cancel'),
    finalTitle: t('deleteAccount.finalTitle'),
    finalDescription: t('deleteAccount.finalDescription'),
    yesDelete: t('deleteAccount.yesDelete'),
    wait: (seconds: number) => t('deleteAccount.wait', { seconds }),
    deleting: t('deleteAccount.deleting'),
    fallbackError: t('deleteAccount.fallbackError'),
  }

  useEffect(() => {
    if (!confirmOpen || countdown <= 0) return
    const timer = window.setTimeout(() => {
      setCountdown((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [confirmOpen, countdown])

  async function handleVerifyPassword() {
    if (!password || verifying) return
    setVerifying(true)
    setPasswordError('')
    try {
      await verifyCurrentUserPasswordForDeletion(password)
      setVerifiedPassword(password)
      setPasswordOpen(false)
      setCountdown(5)
      setDeleteError('')
      setConfirmOpen(true)
      setPassword('')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : copy.fallbackError)
    } finally {
      setVerifying(false)
    }
  }

  async function handleDeleteAccount() {
    if (countdown > 0 || deleting || !verifiedPassword) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteCurrentUserAccount(verifiedPassword)
      resetAuth()
      await navigate({ to: '/sign-in', replace: true })
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : copy.fallbackError)
      setDeleting(false)
    }
  }

  function handlePasswordOpenChange(nextOpen: boolean) {
    if (verifying) return
    setPasswordOpen(nextOpen)
    if (!nextOpen) {
      setPassword('')
      setPasswordError('')
    }
  }

  function handleConfirmOpenChange(nextOpen: boolean) {
    if (deleting) return
    setConfirmOpen(nextOpen)
    if (!nextOpen) {
      setVerifiedPassword('')
      setDeleteError('')
      setCountdown(5)
    }
  }

  return (
    <section className='rounded-xl border border-destructive/30 p-5 sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-1'>
          <h3 className='flex items-center gap-2 text-base font-semibold text-destructive'>
            <AlertTriangle className='size-4' />
            {copy.sectionTitle}
          </h3>
          <p className='text-sm text-muted-foreground'>{copy.sectionDescription}</p>
        </div>
        <Button type='button' variant='destructive' onClick={() => { setPassword(''); setPasswordError(''); setPasswordOpen(true) }}>
          <Trash2 className='me-2 size-4' />
          {copy.openButton}
        </Button>
      </div>

      <AlertDialog open={passwordOpen} onOpenChange={handlePasswordOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.passwordTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.passwordDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); void handleVerifyPassword() }} className='space-y-3'>
            <label htmlFor='delete-account-password' className='text-sm font-medium'>{copy.passwordLabel}</label>
            <PasswordInput
              id='delete-account-password'
              autoComplete='current-password'
              value={password}
              placeholder={copy.passwordPlaceholder}
              onChange={(event) => setPassword(event.target.value)}
              disabled={verifying}
              required
            />
            {passwordError && <p role='alert' className='text-sm text-destructive'>{passwordError}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel type='button' disabled={verifying}>{copy.cancel}</AlertDialogCancel>
              <Button type='submit' disabled={!password || verifying}>
                {verifying ? <><LoaderCircle className='me-2 size-4 animate-spin' />{copy.verifying}</> : <><ShieldCheck className='me-2 size-4' />{copy.verify}</>}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-destructive'>{copy.finalTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.finalDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role='alert' className='rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive'>{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel type='button' disabled={deleting}>{copy.cancel}</AlertDialogCancel>
            <Button type='button' variant='destructive' disabled={countdown > 0 || deleting} onClick={() => void handleDeleteAccount()}>
              {deleting ? <><LoaderCircle className='me-2 size-4 animate-spin' />{copy.deleting}</> : <><Trash2 className='me-2 size-4' />{countdown > 0 ? copy.wait(countdown) : copy.yesDelete}</>}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}