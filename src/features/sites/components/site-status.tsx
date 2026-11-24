import {
  CircleAlert,
  CircleCheck,
  Clock,
  Globe,
  Loader2,
  PencilLine,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Site } from '../data/api'

/** Status in a word and an icon, never by colour alone. */
export function SiteStatus({ site }: { site: Site }) {
  const { t } = useTranslation()
  if (site.published) {
    return (
      <span className='inline-flex w-fit shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400'>
        <Globe className='size-3' />
        {t('siteBuilder.status.published')}
      </span>
    )
  }
  const icon =
    {
      draft: PencilLine,
      building: Loader2,
      ready: CircleCheck,
      failed: CircleAlert,
    }[site.status] ?? Clock
  const Icon = icon
  const tone =
    site.status === 'failed'
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
      : 'bg-muted text-muted-foreground'
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs ${tone}`}
    >
      <Icon
        className={
          site.status === 'building' ? 'size-3 animate-spin' : 'size-3'
        }
      />
      {t(`siteBuilder.status.${site.status}`)}
    </span>
  )
}
