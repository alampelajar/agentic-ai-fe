import { useNavigate, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { signOut } from '@/lib/session'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const handleSignOut = async () => {
    await signOut()
    // Preserve current location for redirect after sign-in
    const currentPath = location.href
    navigate({
      to: '/sign-in',
      search: { redirect: currentPath },
      replace: true,
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('auth.signOutDialog.title')}
      desc={t('auth.signOutDialog.description')}
      confirmText={t('auth.signOutDialog.confirmButton')}
      destructive
      handleConfirm={() => void handleSignOut()}
      className='sm:max-w-sm'
    />
  )
}
