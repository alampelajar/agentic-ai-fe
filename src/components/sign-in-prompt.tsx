import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { LogIn } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  askToSignIn,
  currentPage,
  useSignedIn,
  useSignInPrompt,
} from '@/lib/guest'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * The pop-up a visitor sees when they use a feature without an account: sign in,
 * or create an account. While nobody is signed in, every form on the page opens it
 * instead of sending, and so does every control marked `data-needs-account`. A form
 * that handles visitors itself is marked `data-guest-ok`.
 */
export function SignInPrompt() {
  const { t } = useTranslation()
  const signedIn = useSignedIn()
  const open = useSignInPrompt((state) => state.open)
  const setOpen = useSignInPrompt((state) => state.setOpen)

  useEffect(() => {
    if (signedIn) {
      setOpen(false)
      return
    }
    const onSubmit = (event: Event) => {
      const form = event.target as Element | null
      if (form?.closest('[data-guest-ok]')) return
      event.preventDefault()
      event.stopPropagation()
      askToSignIn()
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (!target?.closest('[data-needs-account]')) return
      event.preventDefault()
      event.stopPropagation()
      askToSignIn()
    }
    // Capture, so the page's own handler never runs for a visitor.
    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [signedIn, setOpen])

  return (
    <Dialog open={open && !signedIn} onOpenChange={setOpen}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <LogIn className='size-4' />
          </div>
          <DialogTitle>{t('signInPrompt.title')}</DialogTitle>
          <DialogDescription>{t('signInPrompt.description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className='flex-col gap-3 sm:flex-col'>
          <Button asChild className='w-full'>
            <Link
              to='/sign-in'
              search={{ redirect: currentPage() }}
              onClick={() => setOpen(false)}
            >
              <LogIn className='size-4' />
              {t('signInPrompt.signIn')}
            </Link>
          </Button>
          <p className='text-center text-sm text-muted-foreground'>
            {t('signInPrompt.noAccount')}{' '}
            <Link
              to='/sign-up'
              onClick={() => setOpen(false)}
              className='font-medium text-primary underline-offset-4 hover:underline'
            >
              {t('signInPrompt.signUp')}
            </Link>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
