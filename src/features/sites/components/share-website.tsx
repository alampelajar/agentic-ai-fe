import { useEffect, useState } from 'react'
import { Download, MessageCircle, Share2 } from 'lucide-react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/**
 * Ways to tell people about a published website: WhatsApp, the phone's own share
 * menu, and a QR code to print or put on a poster.
 */
export function ShareWebsite({ url, name }: { url: string; name: string }) {
  const { t } = useTranslation()
  const [qr, setQr] = useState<string | null>(null)
  const message = t('siteBuilder.share.message', { name, url })
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  useEffect(() => {
    let current = true
    QRCode.toDataURL(url, { margin: 1, width: 480 })
      .then((data) => current && setQr(data))
      .catch(() => current && setQr(null))
    return () => {
      current = false
    }
  }, [url])

  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <p className='text-sm font-semibold'>{t('siteBuilder.share.title')}</p>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
        {qr ? (
          <img
            src={qr}
            alt={t('siteBuilder.share.qrAlt', { name })}
            className='size-32 shrink-0 rounded-md border bg-background'
          />
        ) : null}
        <div className='flex flex-col gap-2'>
          <Button asChild variant='outline' size='sm'>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target='_blank'
              rel='noreferrer'
            >
              <MessageCircle className='size-4' />
              {t('siteBuilder.share.whatsapp')}
            </a>
          </Button>
          {canShare ? (
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                void navigator
                  .share({ title: name, text: message, url })
                  .catch(() => undefined)
              }
            >
              <Share2 className='size-4' />
              {t('siteBuilder.share.other')}
            </Button>
          ) : null}
          {qr ? (
            <Button asChild variant='outline' size='sm'>
              <a href={qr} download={`${name}-qr.png`}>
                <Download className='size-4' />
                {t('siteBuilder.share.downloadQr')}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <p className='text-xs text-muted-foreground'>
        {t('siteBuilder.share.help')}
      </p>
    </div>
  )
}
