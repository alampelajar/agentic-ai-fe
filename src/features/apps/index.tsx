import { useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { getRouteApi } from '@tanstack/react-router'

import { Main } from '@/components/layout/main'
import { PageLoading } from '@/components/layout/page-loading'

const route = getRouteApi('/_authenticated/apps/')

type Category =
  | 'all'
  | 'coding'
  | 'chat'
  | 'api'
  | 'cli'
  | 'open-source'
  | 'multimodal'

type FreeType =
  | 'Free'
  | 'Free Tier'
  | 'Free Models'
  | 'Free Endpoint'
  | 'Limited Free'

type FreeModelSource = {
  id: string
  name: string
  description: string
  categories: Exclude<Category, 'all'>[]
  freeType: FreeType
  websiteUrl: string
  logoUrl: string
  models?: string[]
  modelCount?: string
}

const FREE_MODEL_SOURCES: FreeModelSource[] = [
  {
    id: 'opencode',
    name: 'OpenCode',
    description:
      'Open-source coding agent with a selection of models available at no cost for a limited time.',
    categories: ['coding', 'cli', 'open-source'],
    freeType: 'Free Models',
    websiteUrl: 'https://opencode.ai/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=opencode.ai&sz=128',
    models: [
      'MiMo-V2.5 Free',
      'Laguna S 2.1 Free',
      'Ling-3.0-tiny Free',
    ],
    modelCount: 'Free models available',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description:
      'Model directory with a dedicated collection of free AI models and free model access.',
    categories: ['chat', 'api', 'multimodal'],
    freeType: 'Free Tier',
    websiteUrl: 'https://openrouter.ai/collections/free-models',
    logoUrl: 'https://www.google.com/s2/favicons?domain=openrouter.ai&sz=128',
    models: [
      'Nemotron 3 Ultra',
      'Laguna S 2.1',
      'Free model variants',
    ],
    modelCount: 'Free models available',
  },
  {
    id: 'kiro',
    name: 'Kiro',
    description:
      'AI development environment with a free tier and access to selected coding models.',
    categories: ['coding', 'cli'],
    freeType: 'Free Tier',
    websiteUrl: 'https://kiro.dev/pricing/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=kiro.dev&sz=128',
    models: [
      'Qwen3 Coder',
      'DeepSeek',
      'MiniMax',
    ],
    modelCount: 'Free tier available',
  },
  {
    id: 'kilo',
    name: 'Kilo Code',
    description:
      'Developer-focused platform with hosted models and selected models available at no cost.',
    categories: ['coding', 'cli'],
    freeType: 'Free Models',
    websiteUrl: 'https://kilo.ai/landing/free-models',
    logoUrl: 'https://www.google.com/s2/favicons?domain=kilo.ai&sz=128',
    models: [
      'Free model variants',
      'Nemotron',
      'Laguna',
    ],
    modelCount: 'Free models available',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    description:
      'NVIDIA model catalog with hosted inference endpoints and selected free-access models.',
    categories: ['api', 'multimodal'],
    freeType: 'Free Endpoint',
    websiteUrl: 'https://build.nvidia.com/models',
    logoUrl: 'https://www.google.com/s2/favicons?domain=build.nvidia.com&sz=128',
    models: [
      'Nemotron',
      'DeepSeek',
      'Qwen',
    ],
    modelCount: 'Free endpoints available',
  },
  {
    id: 'api-airforce',
    name: 'API.Airforce',
    description:
      'OpenAI-compatible API platform with selected models and free variants.',
    categories: ['api', 'chat'],
    freeType: 'Free Tier',
    websiteUrl: 'https://api.airforce/docs/api/models/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=api.airforce&sz=128',
    models: [
      'Free model variants',
    ],
    modelCount: 'Free variants available',
  },
  {
    id: 'poolside',
    name: 'Poolside',
    description:
      'Agentic coding model platform with selected models and limited free access.',
    categories: ['coding', 'api'],
    freeType: 'Limited Free',
    websiteUrl: 'https://www.poolside.ai/models',
    logoUrl: 'https://www.google.com/s2/favicons?domain=poolside.ai&sz=128',
    models: [
      'Laguna S',
      'Laguna XS',
    ],
    modelCount: 'Limited free access',
  },
]

const CATEGORIES: Array<{
  id: Category
  label: string
}> = [
  { id: 'all', label: 'All' },
  { id: 'coding', label: 'Coding' },
  { id: 'chat', label: 'Chat' },
  { id: 'api', label: 'API' },
  { id: 'cli', label: 'CLI' },
  { id: 'open-source', label: 'Open Source' },
  { id: 'multimodal', label: 'Multimodal' },
]

function LogoFallback({ name }: { name: string }) {
  return (
    <div className='flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted text-sm font-semibold'>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function SourceLogo({
  source,
}: {
  source: FreeModelSource
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <LogoFallback name={source.name} />
  }

  return (
    <div className='flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background'>
      <img
        src={source.logoUrl}
        alt={`${source.name} logo`}
        className='size-8 object-contain'
        loading='lazy'
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export function Apps() {
  const search = route.useSearch() as {
    filter?: string
    category?: string
  }

  const initialFilter = search.filter ?? ''

  const initialCategory = (search.category ?? 'all') as Category

  const [searchTerm, setSearchTerm] = useState(initialFilter)

  const [category, setCategory] = useState<Category>(
    CATEGORIES.some((item) => item.id === initialCategory)
      ? initialCategory
      : 'all'
  )

  const [loading] = useState(false)

  const filteredSources = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return FREE_MODEL_SOURCES.filter((source) => {
      const matchesCategory =
        category === 'all' ||
        source.categories.includes(
          category as Exclude<Category, 'all'>
        )

      const searchableContent = [
        source.name,
        source.description,
        source.freeType,
        ...source.categories,
        ...(source.models ?? []),
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !query || searchableContent.includes(query)

      return matchesCategory && matchesSearch
    })
  }, [category, searchTerm])

  if (loading) {
    return <PageLoading />
  }

  return (
    <Main
      fixed
      className='flex min-h-0 flex-col overflow-hidden'
    >
      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>

          {/* HEADER */}

          <section className='border-b pb-7'>
            <div className='max-w-3xl'>
              <p className='mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                AI RESOURCE DIRECTORY
              </p>

              <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
                Free AI Models
              </h1>

              <p className='mt-2 text-sm leading-6 text-muted-foreground sm:text-base'>
                Discover websites that offer free models,
                free tiers, or limited free AI access.
              </p>
            </div>
          </section>

          {/* SEARCH + FILTER */}

          <section className='border-b py-4'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>

              <div className='relative w-full lg:max-w-md'>
                <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />

                <input
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder='Search free AI models...'
                  className='h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/30'
                />
              </div>

              <div className='flex flex-wrap gap-1.5'>
                {CATEGORIES.map((item) => {
                  const active = category === item.id

                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => setCategory(item.id)}
                      className={[
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        active
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                      ].join(' ')}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* RESULT COUNT */}

          <div className='flex items-center justify-between py-5'>
            <p className='text-sm text-muted-foreground'>
              {filteredSources.length}{' '}
              {filteredSources.length === 1
                ? 'source'
                : 'sources'}
            </p>

            <p className='hidden text-xs text-muted-foreground sm:block'>
              Free access may change over time
            </p>
          </div>

          {/* DIRECTORY */}

          {filteredSources.length > 0 ? (
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              {filteredSources.map((source) => (
                <article
                  key={source.id}
                  className='group flex min-h-[260px] flex-col rounded-xl border border-border bg-background p-5 transition-colors hover:bg-muted/20'
                >

                  {/* CARD HEADER */}

                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex min-w-0 items-center gap-3'>

                      {/* REAL LOGO */}

                      <SourceLogo source={source} />

                      <div className='min-w-0'>
                        <h2 className='truncate font-semibold'>
                          {source.name}
                        </h2>

                        <p className='mt-0.5 text-xs text-muted-foreground'>
                          {source.freeType}
                        </p>
                      </div>
                    </div>

                    <span className='shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground'>
                      Free
                    </span>
                  </div>

                  {/* DESCRIPTION */}

                  <p className='mt-5 text-sm leading-6 text-muted-foreground'>
                    {source.description}
                  </p>

                  {/* MODELS */}

                  <div className='mt-4 flex-1'>
                    {source.models &&
                      source.models.length > 0 && (
                        <>
                          <p className='mb-2 text-xs font-medium text-foreground'>
                            Models
                          </p>

                          <div className='flex flex-wrap gap-1.5'>
                            {source.models
                              .slice(0, 3)
                              .map((model) => (
                                <span
                                  key={model}
                                  className='rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground'
                                >
                                  {model}
                                </span>
                              ))}
                          </div>
                        </>
                      )}

                    {source.modelCount && (
                      <p className='mt-2 text-xs text-muted-foreground'>
                        {source.modelCount}
                      </p>
                    )}
                  </div>

                  {/* FOOTER */}

                  <div className='mt-5 flex items-center justify-between border-t pt-4'>
                    <div className='flex flex-wrap gap-x-2 gap-y-1'>
                      {source.categories
                        .slice(0, 2)
                        .map((item) => (
                          <span
                            key={item}
                            className='text-xs capitalize text-muted-foreground'
                          >
                            {item.replace('-', ' ')}
                          </span>
                        ))}
                    </div>

                    <a
                      href={source.websiteUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted'
                    >
                      Visit
                      <ExternalLink className='size-3.5' />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className='flex min-h-[320px] items-center justify-center rounded-xl border border-dashed'>
              <div className='text-center'>
                <h2 className='font-medium'>
                  No free AI resources found
                </h2>

                <p className='mt-1 text-sm text-muted-foreground'>
                  Try another search or category.
                </p>

                <button
                  type='button'
                  onClick={() => {
                    setSearchTerm('')
                    setCategory('all')
                  }}
                  className='mt-4 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted'
                >
                  Reset filters
                </button>
              </div>
            </div>
          )}

          <div className='h-12' />
        </div>
      </div>
    </Main>
  )
}

export default Apps