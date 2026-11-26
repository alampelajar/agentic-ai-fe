import { apiFetch } from '@/lib/api/client'

/** The e-mails a person may switch off. Security e-mails are always sent. */
export type NotificationSettings = {
  website_ready: boolean
  new_messages: boolean
  /** Whether this server can send e-mail at all. */
  email_ready: boolean
}

async function read(response: Response): Promise<NotificationSettings> {
  const result: {
    ok?: boolean
    message?: string
    notifications?: NotificationSettings
  } = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok || !result.notifications) {
    throw new Error(result.message || 'notifications')
  }
  return result.notifications
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return read(await apiFetch('/api/me/notifications'))
}

export async function saveNotificationSettings(
  settings: Pick<NotificationSettings, 'website_ready' | 'new_messages'>
): Promise<NotificationSettings> {
  return read(
    await apiFetch('/api/me/notifications', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  )
}
