import { useEffect, useRef, useState } from 'react'
import type { ApprovalLang } from './approval-details'

const TEXT = {
  id: (seconds: number, until: string) => `Berlaku sampai ${until} (${seconds} detik lagi). Tidak ada yang dijalankan sebelum Anda menyetujui.`,
  en: (seconds: number, until: string) => `Valid until ${until} (${seconds} s left). Nothing is done until you approve.`,
} as const

/**
 * Counts down to the expiry time the runner reported, not to a time computed
 * when this renders, and calls onExpire exactly once when it is reached. Mount
 * it with a key that changes per approval: it owns one timeout (the exact
 * deadline) and one interval (the on-screen seconds), and clears both when the
 * dialog closes, so nothing outlives the approval.
 */
export function ApprovalCountdown({ expiresAt, onExpire, lang = 'en' }: { expiresAt: string; onExpire: () => void; lang?: ApprovalLang }) {
  const deadline = Date.parse(expiresAt)
  const valid = !Number.isNaN(deadline)
  const [now, setNow] = useState(() => Date.now())
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  })
  useEffect(() => {
    if (!valid) return
    const timeout = setTimeout(() => {
      setNow(Date.now())
      onExpireRef.current()
    }, Math.max(0, deadline - Date.now()))
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [deadline, valid])

  if (!valid) return null
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000))
  return (
    <p className='mt-2 text-xs text-muted-foreground' data-testid='approval-countdown'>
      {TEXT[lang](seconds, new Date(deadline).toLocaleTimeString())}
    </p>
  )
}
