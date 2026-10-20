import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Check, LoaderCircle, Pencil, RotateCcw, Trash2, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getCurrentUser, updateCurrentUserProfile } from '@/lib/api-auth'
import {
  AVATAR_PRESETS,
  avatarPresetValue,
  getAvatarPresetId,
  getAvatarSrc,
} from '@/lib/avatar-presets'
import { useAuthStore } from '@/stores/auth-store'

type Notice = { kind: 'success' | 'error'; text: string } | null

export function AccountForm() {
  const { t, i18n } = useTranslation()
  const isIndonesian = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('id')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customPhoto, setCustomPhoto] = useState<string | null>(null)
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false)
  const [pendingAvatarAction, setPendingAvatarAction] = useState<{ type: 'preset'; value: string; label: string } | { type: 'remove' } | null>(null)
  const authUser = useAuthStore((state) => state.auth.user)
  const seed = authUser?.accountNo || authUser?.email || 'agentic-ai-user'
  const [name, setName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')
  const [originalAvatar, setOriginalAvatar] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const initials = useMemo(
    () => (name || 'U').trim().split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase(),
    [name]
  )
  const selectedPreset = customPhoto ? null : getAvatarPresetId(avatar)
  const previewAvatar = customPhoto || getAvatarSrc(avatar, seed)
  const localPhotoKey = `agentic-ai-profile-avatar:${authUser?.accountNo || authUser?.email || authUser?.name || seed}`

  useEffect(() => {
    try {
      setCustomPhoto(window.localStorage.getItem(localPhotoKey))
    } catch {
      setCustomPhoto(null)
    }
  }, [localPhotoKey])

  function onPhotoFileChange(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setNotice({ kind: 'error', text: isIndonesian ? 'Pilih file gambar yang valid.' : 'Please choose a valid image file.' })
      return
    }

    const reader = new FileReader()
    reader.onerror = () => setNotice({ kind: 'error', text: isIndonesian ? 'Foto tidak dapat diproses.' : 'The photo could not be processed.' })
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => setNotice({ kind: 'error', text: isIndonesian ? 'Foto tidak dapat diproses.' : 'The photo could not be processed.' })
      image.onload = () => {
        const maxSize = 512
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) return
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        try {
          window.localStorage.setItem(localPhotoKey, dataUrl)
          setCustomPhoto(dataUrl)
          window.dispatchEvent(new CustomEvent('agentic-ai-avatar-updated', { detail: dataUrl }))
          setNotice({ kind: 'success', text: isIndonesian ? 'Foto profil berhasil diperbarui di browser ini.' : 'Profile photo updated in this browser.' })
        } catch {
          setNotice({ kind: 'error', text: isIndonesian ? 'Penyimpanan browser penuh. Coba gambar yang lebih kecil.' : 'Browser storage is full. Try a smaller image.' })
        }
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }
  const hasChanges = name.trim() !== originalName || avatar !== originalAvatar

  useEffect(() => {
    let active = true
    async function loadProfile() {
      try {
        const profile = await getCurrentUser()
        if (!active) return
        if (!profile) throw new Error(t('settingsPage.account.profileLoadError'))
        setName(profile.name || '')
        setOriginalName(profile.name || '')
        setEmail(profile.email || '')
        setAvatar(profile.avatar || '')
        setOriginalAvatar(profile.avatar || '')
      } catch {
        if (active) setNotice({ kind: 'error', text: t('settingsPage.account.profileLoadError') })
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadProfile()
    return () => { active = false }
  }, [t])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim()
    if (normalizedName.length < 2 || normalizedName.length > 30) {
      setNotice({ kind: 'error', text: t('settingsPage.account.profileNameError') })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      const updated = await updateCurrentUserProfile({ name: normalizedName, avatar })
      const savedName = updated.name || normalizedName
      const savedAvatar = updated.avatar || ''
      setName(savedName)
      setOriginalName(savedName)
      setAvatar(savedAvatar)
      setOriginalAvatar(savedAvatar)
      setEmail(updated.email || email)
      setNotice({ kind: 'success', text: t('settingsPage.account.profileSaveSuccess') })
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : t('settingsPage.account.profileSaveError'),
      })
    } finally {
      setSaving(false)
    }
  }

  function resetChanges() {
    setName(originalName)
    setAvatar(originalAvatar)
    setNotice(null)
  }

  if (loading) {
    return (
      <div className='flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground' aria-busy='true'>
        <LoaderCircle className='size-4 animate-spin' />
        {t('common.loading')}...
      </div>
    )
  }

  return (
    <>
    <form onSubmit={onSubmit} className='space-y-8'>
      <div className='grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]'>
        <section className='flex flex-col items-center rounded-xl border bg-card p-6 text-center'>
          <div className='mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <UserRound className='size-5' />
          </div>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            aria-label={isIndonesian ? 'Ubah foto profil' : 'Change profile photo'}
            onChange={(event) => {
              onPhotoFileChange(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
          <div className='relative'>
            <button
              type='button'
              onClick={() => setPhotoPreviewOpen(true)}
              aria-label={isIndonesian ? 'Lihat foto profil' : 'View profile photo'}
              className='block rounded-full transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            >
              <Avatar className='size-28 cursor-zoom-in border shadow-sm'>
                <AvatarImage src={previewAvatar} alt={name || 'Profile avatar'} />
                <AvatarFallback className='text-2xl'>{initials || 'U'}</AvatarFallback>
              </Avatar>
            </button>
            {customPhoto && (
              <Button
                type='button'
                size='icon'
                variant='destructive'
                aria-label={isIndonesian ? 'Hapus foto profil' : 'Delete profile photo'}
                title={isIndonesian ? 'Hapus foto profil' : 'Delete profile photo'}
                onClick={() => setPendingAvatarAction({ type: 'remove' })}
                className='absolute bottom-0 left-0 size-9 rounded-full border-2 border-background shadow-md'
              >
                <Trash2 className='size-4 text-white' />
              </Button>
            )}
            <Button
              type='button'
              size='icon'
              variant='secondary'
              aria-label={isIndonesian ? 'Ubah foto profil' : 'Edit profile photo'}
              title={isIndonesian ? 'Ubah foto profil' : 'Edit profile photo'}
              onClick={() => fileInputRef.current?.click()}
              className='absolute right-0 bottom-0 size-9 rounded-full border-2 border-background shadow-md'
            >
              <Pencil className='size-4' />
            </Button>
          </div>
          <p className='mt-4 max-w-full truncate font-semibold'>{name || t('settingsPage.account.namePlaceholder')}</p>
          <p className='mt-1 max-w-full truncate text-sm text-muted-foreground'>{email || t('settingsPage.account.email')}</p>
          <p className='mt-4 text-xs leading-5 text-muted-foreground'>
            {isIndonesian ? 'Klik foto untuk melihat ukuran penuh. Tekan ikon pensil untuk mengganti foto.' : 'Click the photo to view it larger. Use the pencil icon to change it.'}
          </p>

        </section>

        <section className='space-y-5 rounded-xl border bg-card p-5 sm:p-6'>
          <div className='space-y-2'>
            <label htmlFor='profile-name' className='text-sm font-medium'>{t('settingsPage.account.name')}</label>
            <Input
              id='profile-name'
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('settingsPage.account.namePlaceholder')}
              minLength={2}
              maxLength={30}
              autoComplete='name'
              required
            />
            <p className='text-xs text-muted-foreground'>{t('settingsPage.account.profileNameHint')}</p>
          </div>
          <div className='space-y-2'>
            <label htmlFor='profile-email' className='text-sm font-medium'>{t('settingsPage.account.email')}</label>
            <Input id='profile-email' value={email} readOnly aria-readonly='true' className='bg-muted/50' />
            <p className='text-xs text-muted-foreground'>{t('settingsPage.account.emailReadOnly')}</p>
          </div>
        </section>
      </div>

      <section className='space-y-4'>
        <div>
          <h3 className='text-base font-semibold'>{t('settingsPage.account.profilePhoto')}</h3>
          <p className='mt-1 text-sm text-muted-foreground'>{t('settingsPage.account.chooseAvatar')}</p>
        </div>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6'>
          {AVATAR_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id
            const source = getAvatarSrc(avatarPresetValue(preset.id), seed)
            return (
              <button
                key={preset.id}
                type='button'
                aria-pressed={isSelected}
                aria-label={preset.label}
                onClick={() => setPendingAvatarAction({
                  type: 'preset',
                  value: avatarPresetValue(preset.id),
                  label: preset.label,
                })}
                className={[
                  'group flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-colors',
                  isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50 hover:bg-accent/40',
                ].join(' ')}
              >
                <span className='relative'>
                  <Avatar className='size-16 rounded-xl sm:size-[4.5rem]'>
                    <AvatarImage src={source} alt={preset.label} />
                    <AvatarFallback className='rounded-xl'>{preset.label.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  {isSelected && (
                    <span className='absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                      <Check className='size-3.5' />
                    </span>
                  )}
                </span>
                <span className='text-xs font-medium'>{preset.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={notice.kind === 'error'
            ? 'rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'
            : 'rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400'}
        >
          {notice.text}
        </p>
      )}

      <div className='flex flex-wrap items-center gap-3 border-t pt-6'>
        <Button type='submit' disabled={saving || !hasChanges}>
          {saving ? <><LoaderCircle className='me-2 size-4 animate-spin' />{t('settingsPage.account.saving')}</> : t('settingsPage.account.saveChanges')}
        </Button>
        <Button type='button' variant='outline' onClick={resetChanges} disabled={saving || !hasChanges}>
          <RotateCcw className='me-2 size-4' />
          {t('common.reset')}
        </Button>
      </div>
    </form>
      <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>{isIndonesian ? 'Foto profil' : 'Profile photo'}</DialogTitle>
            <DialogDescription>{isIndonesian ? 'Pratinjau foto profil kamu.' : 'Preview your profile photo.'}</DialogDescription>
          </DialogHeader>
          <div className='flex justify-center rounded-xl bg-muted/40 p-6 sm:p-10'>
            <img
              src={previewAvatar || undefined}
              alt={name || 'Profile avatar'}
              className='max-h-[65vh] max-w-full rounded-lg object-contain'
            />
          </div>
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' onClick={() => setPhotoPreviewOpen(false)}>
              {isIndonesian ? 'Tutup' : 'Close'}
            </Button>
            <Button type='button' onClick={() => { setPhotoPreviewOpen(false); fileInputRef.current?.click() }}>
              <Pencil className='me-2 size-4' />
              {isIndonesian ? 'Ubah foto' : 'Change photo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={pendingAvatarAction !== null} onOpenChange={(open) => { if (!open) setPendingAvatarAction(null) }}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {pendingAvatarAction?.type === 'remove'
                ? (isIndonesian ? 'Hapus foto profil?' : 'Delete profile photo?')
                : (isIndonesian ? 'Gunakan avatar ini?' : 'Use this avatar?')}
            </DialogTitle>
            <DialogDescription>
              {pendingAvatarAction?.type === 'remove'
                ? (isIndonesian ? 'Foto kustom akan dihapus dan avatar bawaan akan digunakan kembali.' : 'Your custom photo will be deleted and the default avatar will be used.')
                : (isIndonesian ? `Avatar "${pendingAvatarAction?.type === 'preset' ? pendingAvatarAction.label : ''}" akan menggantikan foto profil saat ini. Lanjutkan?` : `The "${pendingAvatarAction?.type === 'preset' ? pendingAvatarAction.label : ''}" avatar will replace your current profile photo. Continue?`)}
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' onClick={() => setPendingAvatarAction(null)}>
              {isIndonesian ? 'Tidak' : 'No'}
            </Button>
            <Button
              type='button'
              variant={pendingAvatarAction?.type === 'remove' ? 'destructive' : 'default'}
              onClick={() => {
                if (!pendingAvatarAction) return
                if (pendingAvatarAction.type === 'remove') {
                  try {
                    window.localStorage.removeItem(localPhotoKey)
                    setCustomPhoto(null)
                    window.dispatchEvent(new CustomEvent('agentic-ai-avatar-updated', { detail: null }))
                    setNotice({ kind: 'success', text: isIndonesian ? 'Foto profil berhasil dihapus.' : 'Profile photo deleted.' })
                  } catch {
                    setNotice({ kind: 'error', text: isIndonesian ? 'Foto tidak dapat dihapus.' : 'The photo could not be deleted.' })
                  }
                } else {
                  if (customPhoto) {
                    window.localStorage.removeItem(localPhotoKey)
                    setCustomPhoto(null)
                    window.dispatchEvent(new CustomEvent('agentic-ai-avatar-updated', { detail: null }))
                  }
                  setAvatar(pendingAvatarAction.value)
                  setNotice(null)
                }
                setPendingAvatarAction(null)
              }}
            >
              {isIndonesian ? 'Ya' : 'Yes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
