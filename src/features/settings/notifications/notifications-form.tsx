import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isSignedIn } from '@/lib/guest'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from './data/api'

type Choice = 'website_ready' | 'new_messages'
const CHOICES: Choice[] = ['website_ready', 'new_messages']

/** The e-mails the person wants, stored on their account and used by the server. */
export function NotificationsForm() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // A visitor sees the choices as they would start, to look at.
    if (!isSignedIn()) {
      setSettings({
        website_ready: true,
        new_messages: true,
        email_ready: true,
      })
      return
    }
    getNotificationSettings()
      .then(setSettings)
      .catch(() => setFailed(true))
  }, [])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!settings) return
    setSaving(true)
    try {
      setSettings(await saveNotificationSettings(settings))
      toast.success(t('settingsPage.notifications.success'))
    } catch {
      toast.error(t('settingsPage.notifications.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (failed) {
    return (
      <p role='alert' className='text-sm text-destructive'>
        {t('settingsPage.notifications.loadError')}
      </p>
    )
  }
  if (!settings) {
    return (
      <p className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        {t('settingsPage.notifications.loading')}
      </p>
    )
  }

  return (
    <form onSubmit={save} className='space-y-6'>
      {settings.email_ready ? null : (
        <p
          role='status'
          className='flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400'
        >
          <TriangleAlert className='mt-0.5 size-4 shrink-0' />
          {t('settingsPage.notifications.emailOff')}
        </p>
      )}

      <div className='space-y-3'>
        <h3 className='text-base font-semibold'>
          {t('settingsPage.notifications.emailNotifications')}
        </h3>
        {CHOICES.map((choice) => (
          <div
            key={choice}
            className='flex items-start justify-between gap-4 rounded-lg border p-4'
          >
            <div className='space-y-1'>
              <Label htmlFor={`notify-${choice}`}>
                {t(`settingsPage.notifications.choices.${choice}.title`)}
              </Label>
              <p className='text-xs text-muted-foreground'>
                {t(`settingsPage.notifications.choices.${choice}.help`)}
              </p>
            </div>
            <Switch
              id={`notify-${choice}`}
              checked={settings[choice]}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, [choice]: checked })
              }
            />
          </div>
        ))}
        <div className='flex items-start gap-3 rounded-lg border border-dashed p-4'>
          <ShieldCheck className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
          <div className='space-y-1'>
            <p className='text-sm font-medium'>
              {t('settingsPage.notifications.securityEmails')}
            </p>
            <p className='text-xs text-muted-foreground'>
              {t('settingsPage.notifications.securityAlways')}
            </p>
          </div>
        </div>
      </div>

      <Button type='submit' disabled={saving}>
        {saving ? <Loader2 className='size-4 animate-spin' /> : null}
        {saving
          ? t('settingsPage.notifications.saving')
          : t('settingsPage.notifications.saveChanges')}
      </Button>
    </form>
  )
}
