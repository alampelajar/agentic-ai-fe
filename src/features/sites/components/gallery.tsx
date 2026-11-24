import { useEffect, useMemo, useState } from 'react'
import {
  Copy,
  ExternalLink,
  Eye,
  LayoutGrid,
  Loader2,
  Monitor,
  Smartphone,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getShowcase, type ShowcaseSite } from '../data/api'
import { siteErrorText } from '../lib/errors'

// The planner's kinds (the looks' `fits`, about sixty) in a few everyday groups, for
// the filters and the cards. A kind not listed, and "general", is "other".
const GROUPS: Record<string, string[]> = {
  food: [
    'food',
    'cafe',
    'coffee',
    'bakery',
    'restaurant',
    'snack',
    'juice',
    'grocery',
    'organic',
    'farm',
  ],
  shop: [
    'shop',
    'retail',
    'catalog',
    'fashion',
    'jewelry',
    'toys',
    'furniture',
    'florist',
    'handmade',
    'craft',
  ],
  service: [
    'service',
    'repair',
    'workshop',
    'automotive',
    'construction',
    'logistics',
    'consulting',
    'law',
    'notary',
    'finance',
    'agency',
    'professional',
    'it',
    'software',
    'tech',
    'startup',
  ],
  health: [
    'clinic',
    'dentist',
    'health',
    'pharmacy',
    'wellness',
    'beauty',
    'salon',
    'spa',
  ],
  creative: [
    'portfolio',
    'photography',
    'creative',
    'music',
    'architecture',
    'interior',
  ],
  event: ['wedding', 'engagement', 'anniversary', 'celebration', 'event'],
  community: [
    'community',
    'religious',
    'foundation',
    'culture',
    'education',
    'school',
    'kids',
  ],
  travel: ['travel', 'tourism', 'hotel', 'villa'],
  personal: ['personal'],
}

const GROUP_OF = new Map(
  Object.entries(GROUPS).flatMap(([group, kinds]) =>
    kinds.map((kind) => [kind, group] as const)
  )
)

const kindOf = (site: ShowcaseSite) => GROUP_OF.get(site.kind) ?? 'other'

type Loaded =
  | { state: 'loading' }
  | { state: 'error'; text: string }
  | { state: 'ready'; sites: ShowcaseSite[] }

/**
 * Websites other people made, chosen by an admin. A person can look at one and start
 * their own website with its look and page list.
 */
export function Gallery({ onCopy }: { onCopy: (site: ShowcaseSite) => void }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language.startsWith('en') ? 'en' : 'id'
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [kind, setKind] = useState('all')
  const [viewing, setViewing] = useState<ShowcaseSite | null>(null)

  useEffect(() => {
    let current = true
    getShowcase(language)
      .then((sites) => current && setLoaded({ state: 'ready', sites }))
      .catch(
        (error: unknown) =>
          current &&
          setLoaded({ state: 'error', text: siteErrorText(t, error) })
      )
    return () => {
      current = false
    }
  }, [language, attempt, t])

  const sites = useMemo(
    () => (loaded.state === 'ready' ? loaded.sites : []),
    [loaded]
  )
  // Only the kinds that have a website get a filter.
  const kinds = useMemo(() => [...new Set(sites.map(kindOf))], [sites])
  const shown =
    kind === 'all' ? sites : sites.filter((site) => kindOf(site) === kind)

  return (
    <section className='space-y-4' aria-labelledby='gallery-title'>
      <div>
        <h2 id='gallery-title' className='text-base font-semibold'>
          {t('siteBuilder.gallery.title')}
        </h2>
        <p className='text-sm text-muted-foreground'>
          {t('siteBuilder.gallery.help')}
        </p>
      </div>

      {loaded.state === 'loading' ? (
        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin' />
          {t('siteBuilder.gallery.loading')}
        </p>
      ) : loaded.state === 'error' ? (
        <div role='alert' className='rounded-xl border p-6 text-center'>
          <p className='text-sm font-medium'>
            {t('siteBuilder.gallery.error')}
          </p>
          <p className='mt-1 text-sm text-muted-foreground'>{loaded.text}</p>
          <Button
            className='mt-3'
            variant='outline'
            size='sm'
            onClick={() => {
              setLoaded({ state: 'loading' })
              setAttempt((count) => count + 1)
            }}
          >
            {t('siteBuilder.retry')}
          </Button>
        </div>
      ) : sites.length === 0 ? (
        <div className='rounded-xl border border-dashed p-10 text-center'>
          <LayoutGrid className='mx-auto mb-3 size-8 text-muted-foreground' />
          <p className='font-medium'>{t('siteBuilder.gallery.empty')}</p>
          <p className='mx-auto mt-1 max-w-md text-sm text-muted-foreground'>
            {t('siteBuilder.gallery.emptyHelp')}
          </p>
        </div>
      ) : (
        <>
          {kinds.length > 1 ? (
            <div
              role='group'
              aria-label={t('siteBuilder.gallery.filter')}
              className='flex flex-wrap gap-2'
            >
              {['all', ...kinds].map((key) => (
                <Button
                  key={key}
                  type='button'
                  size='sm'
                  variant={kind === key ? 'default' : 'outline'}
                  className='rounded-full'
                  aria-pressed={kind === key}
                  onClick={() => setKind(key)}
                >
                  {key === 'all'
                    ? t('siteBuilder.gallery.all')
                    : t(`siteBuilder.gallery.kinds.${key}`)}
                </Button>
              ))}
            </div>
          ) : null}
          <ul className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {shown.map((site) => (
              <li key={site.id}>
                <GalleryCard
                  site={site}
                  onView={() => setViewing(site)}
                  onCopy={() => onCopy(site)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <ViewDialog
        site={viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        onCopy={(site) => {
          setViewing(null)
          onCopy(site)
        }}
      />
    </section>
  )
}

function GalleryCard({
  site,
  onView,
  onCopy,
}: {
  site: ShowcaseSite
  onView: () => void
  onCopy: () => void
}) {
  const { t } = useTranslation()
  const kind = kindOf(site)
  return (
    <article className='group overflow-hidden rounded-xl border bg-card'>
      <div className='relative aspect-video overflow-hidden border-b bg-muted'>
        {/* A live, shrunken view of the website: a quarter of its size, not clickable. */}
        <iframe
          src={site.live_url}
          title={t('siteBuilder.gallery.frameTitle', { name: site.name })}
          loading='lazy'
          tabIndex={-1}
          aria-hidden
          sandbox='allow-scripts allow-same-origin'
          className='pointer-events-none absolute top-0 left-0 origin-top-left scale-25 border-0 bg-background'
          style={{ width: '400%', height: '400%' }}
        />
        <div className='absolute inset-0 hidden items-center justify-center gap-2 bg-background/60 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none sm:flex'>
          <Button size='sm' variant='secondary' onClick={onView} tabIndex={-1}>
            <Eye className='size-4' />
            {t('siteBuilder.gallery.view')}
          </Button>
          <Button size='sm' onClick={onCopy} tabIndex={-1}>
            <Copy className='size-4' />
            {t('siteBuilder.gallery.copy')}
          </Button>
        </div>
      </div>
      <div className='flex items-start justify-between gap-3 p-4'>
        <div className='min-w-0'>
          <h3 className='truncate text-sm font-semibold'>{site.name}</h3>
          <p className='truncate text-xs text-muted-foreground'>
            {[
              t(`siteBuilder.gallery.kinds.${kind}`),
              site.look,
              site.pages?.length
                ? t('siteBuilder.gallery.pages', { count: site.pages.length })
                : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className='flex shrink-0 gap-1'>
          <Button
            size='icon'
            variant='ghost'
            aria-label={t('siteBuilder.gallery.viewName', { name: site.name })}
            onClick={onView}
          >
            <Eye className='size-4' />
          </Button>
          <Button
            size='icon'
            variant='ghost'
            aria-label={t('siteBuilder.gallery.copyName', { name: site.name })}
            onClick={onCopy}
          >
            <Copy className='size-4' />
          </Button>
        </div>
      </div>
    </article>
  )
}

/** One gallery website, large, at computer or phone width. */
function ViewDialog({
  site,
  onOpenChange,
  onCopy,
}: {
  site: ShowcaseSite | null
  onOpenChange: (open: boolean) => void
  onCopy: (site: ShowcaseSite) => void
}) {
  const { t } = useTranslation()
  const [phone, setPhone] = useState(false)
  return (
    <Dialog open={site !== null} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-screen max-h-screen w-screen max-w-none flex-col gap-3 sm:h-5/6 sm:w-11/12 sm:max-w-6xl'>
        {site ? (
          <>
            <DialogHeader>
              <DialogTitle>{site.name}</DialogTitle>
              <DialogDescription>
                {t('siteBuilder.gallery.viewHelp')}
              </DialogDescription>
            </DialogHeader>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <p className='text-xs text-muted-foreground'>
                {site.pages?.length ? site.pages.join(' · ') : site.look}
              </p>
              <div className='flex items-center gap-1'>
                <Button
                  variant={phone ? 'ghost' : 'secondary'}
                  size='sm'
                  aria-pressed={!phone}
                  onClick={() => setPhone(false)}
                >
                  <Monitor className='size-4' />
                  {t('siteBuilder.look.computer')}
                </Button>
                <Button
                  variant={phone ? 'secondary' : 'ghost'}
                  size='sm'
                  aria-pressed={phone}
                  onClick={() => setPhone(true)}
                >
                  <Smartphone className='size-4' />
                  {t('siteBuilder.look.phone')}
                </Button>
                <Button variant='ghost' size='icon' asChild>
                  <a
                    href={site.live_url}
                    target='_blank'
                    rel='noreferrer'
                    aria-label={t('siteBuilder.preview.openNew')}
                  >
                    <ExternalLink className='size-4' />
                  </a>
                </Button>
              </div>
            </div>
            <div className='flex min-h-0 flex-1 justify-center overflow-auto rounded-md bg-muted p-2'>
              <iframe
                src={site.live_url}
                title={t('siteBuilder.gallery.frameTitle', { name: site.name })}
                sandbox='allow-scripts allow-same-origin'
                className={cn(
                  'h-full rounded-md border bg-background',
                  phone ? 'w-96 max-w-full' : 'w-full'
                )}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => onCopy(site)}>
                <Copy className='size-4' />
                {t('siteBuilder.gallery.copyThis')}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
