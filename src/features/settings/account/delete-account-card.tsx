import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, LoaderCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteCurrentUserAccount, requestAccountDeletionCode, verifyCurrentUserPasswordForDeletion } from '@/lib/api-auth'
import { useAuthStore } from '@/stores/auth-store'

export function DeleteAccountCard() {
  const navigate = useNavigate()
  const resetAuth = useAuthStore((state) => state.auth.reset)
  const { i18n } = useTranslation()
  const isIndonesian = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('id')

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [verifiedPassword, setVerifiedPassword] = useState('')
  // Google accounts have no password: they confirm with a code e-mailed to the account.
  const [codeMode, setCodeMode] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [code, setCode] = useState('')
  const [verifiedCode, setVerifiedCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [notice, setNotice] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [countdown, setCountdown] = useState(5)

  const copy = isIndonesian
    ? {
        sectionTitle: 'Zona berbahaya',
        sectionDescription: 'Hapus akun dan data pribadi terkait secara permanen.',
        openButton: 'Hapus akun',
        passwordTitle: 'Verifikasi kata sandi',
        passwordDescription: 'Masukkan kata sandi akun untuk melanjutkan. Akun belum dihapus pada tahap ini.',
        passwordLabel: 'Kata sandi akun',
        passwordPlaceholder: 'Masukkan kata sandi',
        verify: 'Verifikasi',
        verifying: 'Memverifikasi...',
        cancel: 'Tidak',
        finalTitle: 'Apakah Anda yakin ingin menghapus akun Anda?',
        finalDescription: 'Akun, tugas, riwayat percakapan, serta provider dan model AI custom milik Anda akan dihapus permanen. Data sistem bersama tetap dipertahankan. Tindakan ini tidak dapat dibatalkan.',
        yesDelete: 'Ya, hapus akun',
        wait: (seconds: number) => `Tunggu ${seconds} detik...`,
        deleting: 'Menghapus akun...',
        fallbackError: 'Gagal menghapus akun. Silakan coba lagi.',
        noPassword: 'Tidak punya kata sandi (masuk dengan Google)? Kirim kode ke email',
        codeTitle: 'Verifikasi lewat email',
        codeDescription: 'Kami mengirim kode 6 digit ke email akun Anda. Masukkan kode itu untuk melanjutkan. Akun belum dihapus pada tahap ini.',
        codeLabel: 'Kode verifikasi',
        codePlaceholder: '123456',
        sendingCode: 'Mengirim kode...',
        codeSent: 'Kode dikirim ke email akun Anda.',
        usePassword: 'Gunakan kata sandi',
        resendCode: 'Kirim ulang kode',
        next: 'Lanjut',
      }
    : {
        sectionTitle: 'Danger zone',
        sectionDescription: 'Permanently delete your account and associated private data.',
        openButton: 'Delete account',
        passwordTitle: 'Verify your password',
        passwordDescription: 'Enter your account password to continue. Your account has not been deleted yet.',
        passwordLabel: 'Account password',
        passwordPlaceholder: 'Enter your password',
        verify: 'Verify',
        verifying: 'Verifying...',
        cancel: 'No',
        finalTitle: 'Are you sure you want to delete your account?',
        finalDescription: 'Your account, tasks, conversation history, and custom AI providers and models will be permanently deleted. Shared system data will be kept. This action cannot be undone.',
        yesDelete: 'Yes, delete account',
        wait: (seconds: number) => `Wait ${seconds} seconds...`,
        deleting: 'Deleting account...',
        fallbackError: 'Could not delete your account. Please try again.',
        noPassword: 'No password (signed in with Google)? E-mail me a code',
        codeTitle: 'Verify by e-mail',
        codeDescription: 'We sent a 6-digit code to your account e-mail. Enter it to continue. Your account has not been deleted yet.',
        codeLabel: 'Verification code',
        codePlaceholder: '123456',
        sendingCode: 'Sending code...',
        codeSent: 'A code was sent to your account e-mail.',
        usePassword: 'Use my password',
        resendCode: 'Resend code',
        next: 'Continue',
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

  async function handleSendCode() {
    if (sendingCode) return
    setSendingCode(true)
    setPasswordError('')
    try {
      await requestAccountDeletionCode()
      setCodeMode(true)
      setCode('')
      setNotice(copy.codeSent)
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : copy.fallbackError)
    } finally {
      setSendingCode(false)
    }
  }

  // The code is single-use, so the server checks it only when the account is deleted.
  function handleContinueWithCode() {
    if (!/^\d{6}$/.test(code)) return
    setVerifiedCode(code)
    setPasswordOpen(false)
    setCountdown(5)
    setDeleteError('')
    setConfirmOpen(true)
    setCode('')
  }

  async function handleDeleteAccount() {
    if (countdown > 0 || deleting || (!verifiedPassword && !verifiedCode)) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteCurrentUserAccount(verifiedCode ? { otp: verifiedCode } : { password: verifiedPassword })
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
      setCodeMode(false)
      setCode('')
      setNotice('')
    }
  }

  function handleConfirmOpenChange(nextOpen: boolean) {
    if (deleting) return
    setConfirmOpen(nextOpen)
    if (!nextOpen) {
      setVerifiedPassword('')
      setVerifiedCode('')
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
        <Button type='button' variant='destructive' onClick={() => { setPassword(''); setPasswordError(''); setCodeMode(false); setCode(''); setNotice(''); setPasswordOpen(true) }}>
          <Trash2 className='me-2 size-4' />
          {copy.openButton}
        </Button>
      </div>

      <AlertDialog open={passwordOpen} onOpenChange={handlePasswordOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{codeMode ? copy.codeTitle : copy.passwordTitle}</AlertDialogTitle>
            <AlertDialogDescription>{codeMode ? copy.codeDescription : copy.passwordDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (codeMode) handleContinueWithCode()
              else void handleVerifyPassword()
            }}
            className='space-y-3'
          >
            {codeMode ? (
              <>
                <label htmlFor='delete-account-code' className='text-sm font-medium'>{copy.codeLabel}</label>
                <Input
                  id='delete-account-code'
                  inputMode='numeric'
                  autoComplete='one-time-code'
                  maxLength={6}
                  value={code}
                  placeholder={copy.codePlaceholder}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  required
                />
                {notice && <p className='text-sm text-muted-foreground'>{notice}</p>}
              </>
            ) : (
              <>
                <label htmlFor='delete-account-password' className='text-sm font-medium'>{copy.passwordLabel}</label>
                <Input
                  id='delete-account-password'
                  type='password'
                  autoComplete='current-password'
                  value={password}
                  placeholder={copy.passwordPlaceholder}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={verifying}
                  required
                />
              </>
            )}
            {passwordError && <p role='alert' className='text-sm text-destructive'>{passwordError}</p>}
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-sm'>
              {codeMode ? (
                <>
                  <button type='button' className='text-muted-foreground underline-offset-4 hover:underline' disabled={sendingCode} onClick={() => void handleSendCode()}>
                    {sendingCode ? copy.sendingCode : copy.resendCode}
                  </button>
                  <button type='button' className='text-muted-foreground underline-offset-4 hover:underline' onClick={() => { setCodeMode(false); setCode(''); setNotice(''); setPasswordError('') }}>
                    {copy.usePassword}
                  </button>
                </>
              ) : (
                <button type='button' className='text-muted-foreground underline-offset-4 hover:underline' disabled={sendingCode} onClick={() => void handleSendCode()}>
                  {sendingCode ? copy.sendingCode : copy.noPassword}
                </button>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type='button' disabled={verifying}>{copy.cancel}</AlertDialogCancel>
              {codeMode ? (
                <Button type='submit' disabled={!/^\d{6}$/.test(code)}>
                  <ShieldCheck className='me-2 size-4' />
                  {copy.next}
                </Button>
              ) : (
                <Button type='submit' disabled={!password || verifying}>
                  {verifying ? <><LoaderCircle className='me-2 size-4 animate-spin' />{copy.verifying}</> : <><ShieldCheck className='me-2 size-4' />{copy.verify}</>}
                </Button>
              )}
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