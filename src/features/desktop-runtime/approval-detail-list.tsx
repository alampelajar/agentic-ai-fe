import { useState } from 'react'
import type { ApprovalDetail, ApprovalLang } from './approval-details'

const TEXT = {
  id: { show: 'Tampilkan teks lengkap', hide: 'Sembunyikan', maskedHint: 'Bagian yang tampak seperti kredensial disamarkan di layar ini. Teks lengkap tetap yang akan diketik.' },
  en: { show: 'Show full text', hide: 'Hide', maskedHint: 'Parts that look like credentials are masked on this screen. The full text is still what will be typed.' },
} as const

/**
 * The rows of an approval dialog. A value that looks like a credential is masked
 * until the user asks to see it, so it is never shown on screen by accident, but
 * the user can always read exactly what will be done before approving.
 * Give it a `key` that changes per action so a reveal never carries over.
 */
export function ApprovalDetailList({ details, lang = 'id' }: { details: ApprovalDetail[]; lang?: ApprovalLang }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const t = TEXT[lang]
  return (
    <dl className='grid gap-2 rounded-lg bg-muted/40 p-3 text-sm'>
      {details.map((detail) => {
        const showFull = Boolean(detail.fullValue && revealed[detail.key])
        return (
          <div key={detail.key} data-testid='approval-detail' data-warning={detail.warning ? 'true' : undefined}>
            <dt className='text-muted-foreground'>{detail.label}</dt>
            <dd
              className={`max-h-32 overflow-y-auto whitespace-pre-wrap break-all rounded bg-background/60 px-2 py-1 text-xs ${
                detail.warning ? 'border border-amber-500/60 text-amber-700 dark:text-amber-400' : 'font-mono'
              }`}
            >
              {showFull ? detail.fullValue : detail.value}
            </dd>
            {detail.fullValue !== undefined && (
              <div className='mt-1 flex flex-wrap items-center gap-2'>
                <button
                  type='button'
                  className='text-xs underline underline-offset-2'
                  onClick={() => setRevealed((current) => ({ ...current, [detail.key]: !current[detail.key] }))}
                >
                  {showFull ? t.hide : t.show}
                </button>
                {!showFull && <span className='text-xs text-muted-foreground'>{t.maskedHint}</span>}
              </div>
            )}
          </div>
        )
      })}
    </dl>
  )
}
