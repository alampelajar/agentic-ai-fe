import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { useAuthStore } from '@/stores/auth-store'
import { getAvatarSrc } from '@/lib/avatar-presets'

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const name = user?.name || 'User'
  const email = user?.email || 'No email'
  const avatarStorageKey = `agentic-ai-profile-avatar:${user?.accountNo || user?.email || name}`
  const defaultAvatar = getAvatarSrc(
    user?.avatar,
    user?.accountNo || user?.email || name
  )
  const [customAvatar, setCustomAvatar] = useState<string | null>(null)
  const avatar = customAvatar || defaultAvatar

  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const detail = (event as CustomEvent<string | null>).detail
      setCustomAvatar(typeof detail === 'string' ? detail : null)
    }
    window.addEventListener('agentic-ai-avatar-updated', handleAvatarUpdate)
    return () => window.removeEventListener('agentic-ai-avatar-updated', handleAvatarUpdate)
  }, [])

  useEffect(() => {
    try {
      setCustomAvatar(window.localStorage.getItem(avatarStorageKey))
    } catch {
      setCustomAvatar(null)
    }
  }, [avatarStorageKey])

  const handleAvatarSelection = (file?: File) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      window.alert(t('navigation.avatarInvalidFile'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => window.alert(t('navigation.avatarUploadFailed'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => window.alert(t('navigation.avatarUploadFailed'))
      image.onload = () => {
        const maxSize = 512
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))

        const context = canvas.getContext('2d')
        if (!context) {
          window.alert(t('navigation.avatarUploadFailed'))
          return
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const compressedAvatar = canvas.toDataURL('image/jpeg', 0.82)

        try {
          window.localStorage.setItem(avatarStorageKey, compressedAvatar)
          setCustomAvatar(compressedAvatar)
          window.dispatchEvent(new CustomEvent('agentic-ai-avatar-updated', { detail: compressedAvatar }))
        } catch {
          window.alert(t('navigation.avatarStorageFull'))
        }
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    try {
      window.localStorage.removeItem(avatarStorageKey)
      setCustomAvatar(null)
      window.dispatchEvent(new CustomEvent('agentic-ai-avatar-updated', { detail: null }))
    } catch {
      window.alert(t('navigation.avatarUploadFailed'))
    }
  }

  const initials = name
    .trim()
    .split(/\\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        className='hidden'
        aria-label={t('navigation.changeAvatar')}
        onChange={(event) => {
          handleAvatarSelection(event.currentTarget.files?.[0])
          event.currentTarget.value = ''
        }}
      />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='relative h-8 w-8 rounded-full'
          >
            <Avatar className='h-8 w-8'>
              <AvatarImage
                src={avatar}
                alt={name}
              />
              <AvatarFallback>
                {initials || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className='w-56'
          align='end'
          forceMount
        >
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-medium'>
                {name}
              </p>
              <p className='text-xs leading-none text-muted-foreground'>
                {email}
              </p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                fileInputRef.current?.click()
              }}
            >
              {t('navigation.changeAvatar')}
            </DropdownMenuItem>
            {customAvatar && (
              <DropdownMenuItem onSelect={handleRemoveAvatar}>
                {t('navigation.removeAvatar')}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to='/profile'>
                {t('navigation.profile')}
                <DropdownMenuShortcut>
                  ⇧⌘P
                </DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link to='/settings'>
                {t('navigation.billing')}
                <DropdownMenuShortcut>
                  ⌘B
                </DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link to='/settings'>
                {t('navigation.settings')}
                <DropdownMenuShortcut>
                  ⌘S
                </DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem>
              {t('navigation.newTeam')}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant='destructive'
            onClick={() => setOpen(true)}
          >
            {t('navigation.signOut')}
            <DropdownMenuShortcut className='text-current'>
              ⇧⌘Q
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog
        open={!!open}
        onOpenChange={setOpen}
      />
    </>
  )
}
