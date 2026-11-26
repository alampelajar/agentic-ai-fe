import { Link, Outlet } from '@tanstack/react-router'
import { BookOpen, FileText, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Main } from '@/components/layout/main'

// Guides and policies: how to use the builder, the terms and the privacy policy.
// The words live in the language files under `docs.<page>`; a page is a list of
// sections, each with a title and its paragraphs.

/** The day the terms and the privacy policy were last changed. */
export const DOCS_UPDATED = '2026-11-26'

export type DocKey = 'howTo' | 'terms' | 'privacy'

const PAGES: { key: DocKey; to: string; icon: LucideIcon }[] = [
  { key: 'howTo', to: '/docs/how-to', icon: BookOpen },
  { key: 'terms', to: '/docs/terms', icon: FileText },
  { key: 'privacy', to: '/docs/privacy', icon: ShieldCheck },
]

type Section = { title: string; body: string[] }

export function DocsLayout() {
  const { t } = useTranslation()
  return (
    <Main className='space-y-6'>
      <header className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {t('docs.title')}
        </h1>
        <p className='text-sm text-muted-foreground'>{t('docs.description')}</p>
      </header>

      <div className='grid gap-6 lg:grid-cols-4'>
        <nav aria-label={t('docs.navLabel')} className='lg:col-span-1'>
          <ul className='flex flex-wrap gap-2 lg:sticky lg:top-20 lg:flex-col'>
            {PAGES.map((page) => (
              <li key={page.key} className='shrink-0'>
                <Link
                  to={page.to}
                  className='flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:border-transparent'
                  activeProps={{
                    className:
                      'border-border bg-muted font-medium text-foreground lg:border-border',
                  }}
                >
                  <page.icon className='size-4' />
                  {t(`docs.${page.key}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className='min-w-0 lg:col-span-3'>
          <Outlet />
        </div>
      </div>
    </Main>
  )
}

export function DocPage({ doc }: { doc: DocKey }) {
  const { t, i18n } = useTranslation()
  const sections = t(`docs.${doc}.sections`, {
    returnObjects: true,
  }) as Section[]
  const updated = new Date(`${DOCS_UPDATED}T00:00:00`).toLocaleDateString(
    i18n.language,
    { day: 'numeric', month: 'long', year: 'numeric' }
  )

  return (
    <article className='max-w-3xl space-y-6 rounded-xl border bg-card p-4 sm:p-8'>
      <header className='space-y-2 border-b pb-6'>
        <h2 className='text-2xl font-semibold tracking-tight'>
          {t(`docs.${doc}.title`)}
        </h2>
        <p className='text-sm text-muted-foreground'>
          {t(`docs.${doc}.intro`)}
        </p>
        <p className='text-xs text-muted-foreground'>
          {t('docs.updated', { date: updated })}
        </p>
      </header>

      <nav aria-label={t('docs.contents')} className='space-y-2'>
        <p className='text-xs font-medium text-muted-foreground'>
          {t('docs.contents')}
        </p>
        <ol className='grid gap-1 text-sm sm:grid-cols-2'>
          {sections.map((section, index) => (
            <li key={section.title}>
              <a
                href={`#${doc}-${index + 1}`}
                className='rounded-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
              >
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((section, index) => (
        <section
          key={section.title}
          id={`${doc}-${index + 1}`}
          className='scroll-mt-20 space-y-2 border-t pt-6'
        >
          <h3 className='text-base font-semibold'>
            {index + 1}. {section.title}
          </h3>
          {section.body.map((paragraph) => (
            <p key={paragraph} className='text-sm leading-6'>
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  )
}
