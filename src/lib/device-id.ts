/**
 * A random id this browser keeps, sent when an account is made, so the server can tell
 * a second account made from the same browser (no new-account promo for it). It is not
 * a fingerprint: it says nothing about the device, and clearing the site's data makes
 * a new one. The server stores only a keyed hash of it.
 */
const KEY = 'device-id'
export const DEVICE_HEADER = 'X-Device-ID'

function makeId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // randomUUID needs a secure page (https or localhost); getRandomValues does not.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function deviceId(): string {
  try {
    const saved = window.localStorage.getItem(KEY)
    if (saved && /^[A-Za-z0-9-]{16,80}$/.test(saved)) return saved
    const created = makeId()
    window.localStorage.setItem(KEY, created)
    return created
  } catch {
    // Without storage every visit looks new; the address check still applies.
    return makeId()
  }
}

/** The header to send with a request that makes an account. */
export function deviceHeaders(): Record<string, string> {
  return { [DEVICE_HEADER]: deviceId() }
}
