import { useMemo, useState } from 'react'
import { ExternalLink, Search, X, CreditCard } from 'lucide-react'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Main } from '@/components/layout/main'

const route = getRouteApi('/_authenticated/apps/')

type DirectoryType = 'free' | 'paid'
type Category =
  | 'all'
  | 'coding'
  | 'chat'
  | 'api'
  | 'cli'
  | 'open-source'
  | 'multimodal'
  | 'enterprise'

type DirectoryItem = {
  id: string
  name: string
  type: DirectoryType
  descriptionKey: string
  accessKey: string
  categories: Exclude<Category, 'all'>[]
  websiteUrl: string
  logoUrl?: string
  initials: string
  models?: string[]
  modelCountKey?: string
  highlightKeys?: string[]
}

const FREE_MODEL_SOURCES: DirectoryItem[] = [
  {
    id: 'opencode',
    name: 'OpenCode',
    type: 'free',
    descriptionKey: 'appDirectory.freeSources.opencode.description',
    accessKey: 'appDirectory.accessTypes.freeModels',
    categories: ['coding', 'cli', 'open-source'],
    websiteUrl: 'https://opencode.ai/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=opencode.ai&sz=128',
    initials: 'OC',
    models: ['MiMo-V2.5 Free', 'Laguna S 2.1 Free', 'Ling-3.0-tiny Free'],
    modelCountKey: 'appDirectory.modelCount.freeModels',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'free',
    descriptionKey: 'appDirectory.freeSources.openrouter.description',
    accessKey: 'appDirectory.accessTypes.freeTier',
    categories: ['chat', 'api', 'multimodal'],
    websiteUrl: 'https://openrouter.ai/collections/free-models',
    logoUrl: 'https://www.google.com/s2/favicons?domain=openrouter.ai&sz=128',
    initials: 'OR',
    models: ['Nemotron 3 Ultra', 'Laguna S 2.1', 'Free model variants'],
    modelCountKey: 'appDirectory.modelCount.freeModels',
  },
  {
    id: 'kiro',
    name: 'Kiro',
    type: 'free',
    descriptionKey: 'appDirectory.freeSources.kiro.description',
    accessKey: 'appDirectory.accessTypes.freeTier',
    categories: ['coding', 'cli'],
    websiteUrl: 'https://kiro.dev/pricing/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=kiro.dev&sz=128',
    initials: 'KI',
    models: ['Qwen3 Coder', 'DeepSeek', 'MiniMax'],
    modelCountKey: 'appDirectory.modelCount.freeTier',
  },
  {
    id: 'kilo',
    name: 'Kilo Code',
    type: 'free',
    descriptionKey: 'appDirectory.freeSources.kilo.description',
    accessKey: 'appDirectory.accessTypes.freeModels',
    categories: ['coding', 'cli'],
    websiteUrl: 'https://kilo.ai/landing/free-models',
    logoUrl: 'https://www.google.com/s2/favicons?domain=kilo.ai&sz=128',
    initials: 'KC',
    models: ['Free model variants', 'Nemotron', 'Laguna'],
    modelCountKey: 'appDirectory.modelCount.freeModels',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    type: 'free',
    descriptionKey: 'appDirectory.freeSources.nvidia.description',
    accessKey: 'appDirectory.accessTypes.freeEndpoint',
    categories: ['api', 'multimodal'],
    websiteUrl: 'https://build.nvidia.com/models',
    logoUrl: 'https://www.google.com/s2/favicons?domain=build.nvidia.com&sz=128',
    initials: 'NV',
    models: ['Nemotron', 'DeepSeek', 'Qwen'],
    modelCountKey: 'appDirectory.modelCount.freeEndpoints',
  },
  {
    id: 'api-airforce',
    name: 'API.Airforce',
    type: 'free',
    descriptionKey: 'appDirectory.freeSources.apiAirforce.description',
    accessKey: 'appDirectory.accessTypes.freeTier',
    categories: ['api', 'chat'],
    websiteUrl: 'https://api.airforce/docs/api/models/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=api.airforce&sz=128',
    initials: 'AF',
    models: ['Free model variants'],
    modelCountKey: 'appDirectory.modelCount.freeVariants',
  },
  {
    id: 'poolside',
    name: 'Poolside',
    type: 'free',
    descriptionKey: 'appDirectory.freeSources.poolside.description',
    accessKey: 'appDirectory.accessTypes.limitedFree',
    categories: ['coding', 'api'],
    websiteUrl: 'https://www.poolside.ai/models',
    logoUrl: 'https://www.google.com/s2/favicons?domain=poolside.ai&sz=128',
    initials: 'PS',
    models: ['Laguna S', 'Laguna XS'],
    modelCountKey: 'appDirectory.modelCount.limitedFree',
  },
]

const PAID_PROVIDERS: DirectoryItem[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'paid',
    descriptionKey: 'appDirectory.paidProviders.anthropic',
    accessKey: 'appDirectory.accessTypes.paidApi',
    categories: ['api', 'coding', 'chat'],
    websiteUrl: 'https://console.anthropic.com/',
    logoUrl: 'https://cdn.simpleicons.org/anthropic',
    initials: 'AN',
    highlightKeys: ['claudeApi', 'coding', 'reasoning'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'paid',
    descriptionKey: 'appDirectory.paidProviders.deepseek',
    accessKey: 'appDirectory.accessTypes.paidApi',
    categories: ['api', 'coding', 'chat'],
    websiteUrl: 'https://platform.deepseek.com/',
    logoUrl: 'https://cdn.simpleicons.org/deepseek',
    initials: 'DS',
    highlightKeys: ['directApi', 'reasoning', 'developer'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    type: 'paid',
    descriptionKey: 'appDirectory.paidProviders.mistral',
    accessKey: 'appDirectory.accessTypes.paidApi',
    categories: ['api', 'coding', 'chat'],
    websiteUrl: 'https://console.mistral.ai/',
    logoUrl: 'https://cdn.simpleicons.org/mistralai',
    initials: 'MI',
    highlightKeys: ['languageApi', 'coding', 'business'],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    type: 'paid',
    descriptionKey: 'appDirectory.paidProviders.cohere',
    accessKey: 'appDirectory.accessTypes.enterprise',
    categories: ['enterprise', 'api', 'chat'],
    websiteUrl: 'https://dashboard.cohere.com/',
    logoUrl: 'https://mintzoro.com/icons/svg/cohere.svg',
    initials: 'CO',
    highlightKeys: ['enterpriseAI', 'search', 'rag'],
  },
  {
    id: 'ai21',
    name: 'AI21 Labs',
    type: 'paid',
    descriptionKey: 'appDirectory.paidProviders.ai21',
    accessKey: 'appDirectory.accessTypes.paidApi',
    categories: ['api', 'chat'],
    websiteUrl: 'https://studio.ai21.com/',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/AI21-Labs-Logo.jpg',
    initials: 'AI',
    highlightKeys: ['languageApi', 'generativeAI', 'business'],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    type: 'paid',
    descriptionKey: 'appDirectory.paidProviders.cerebras',
    accessKey: 'appDirectory.accessTypes.paidApi',
    categories: ['api', 'coding'],
    websiteUrl: 'https://cloud.cerebras.ai/',
    logoUrl: 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/cerebras/default.svg',
    initials: 'CE',
    highlightKeys: ['inferenceApi', 'speed', 'developer'],
  },
  {
    id: 'azure',
    name: 'Microsoft Azure AI',
    type: 'paid',
    descriptionKey: 'appDirectory.paidProviders.azure',
    accessKey: 'appDirectory.accessTypes.enterprise',
    categories: ['enterprise', 'api'],
    websiteUrl: 'https://azure.microsoft.com/en-us/products/ai-services',
    logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/microsoftazure.svg',
    initials: 'AZ',
    highlightKeys: ['cloudAI', 'enterprise', 'integration'],
  },
]

const DIRECTORY_ITEMS = [...FREE_MODEL_SOURCES, ...PAID_PROVIDERS]

const TYPE_FILTERS: Array<{ id: 'all' | DirectoryType; key: string }> = [
  { id: 'all', key: 'appDirectory.tabs.all' },
  { id: 'free', key: 'appDirectory.tabs.free' },
  { id: 'paid', key: 'appDirectory.tabs.paid' },
]

const CATEGORIES: Array<{ id: Category; key: string }> = [
  { id: 'all', key: 'appDirectory.categories.all' },
  { id: 'coding', key: 'appDirectory.categories.coding' },
  { id: 'chat', key: 'appDirectory.categories.chat' },
  { id: 'api', key: 'appDirectory.categories.api' },
  { id: 'cli', key: 'appDirectory.categories.cli' },
  { id: 'open-source', key: 'appDirectory.categories.openSource' },
  { id: 'multimodal', key: 'appDirectory.categories.multimodal' },
  { id: 'enterprise', key: 'appDirectory.categories.enterprise' },
]

function DirectoryLogo({ item }: { item: DirectoryItem }) {
  const [failed, setFailed] = useState(false)

  if (!item.logoUrl || failed) {
    return (
      <div className='flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted text-sm font-semibold'>
        {item.initials}
      </div>
    )
  }

  return (
    <div className='flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background p-2'>
      <img
        src={item.logoUrl}
        alt={item.name + ' logo'}
        className='size-full object-contain'
        loading='lazy'
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export function Apps() {
  const { t } = useTranslation()
  const search = route.useSearch() as {
    filter?: string
    category?: string
  }
  const initialFilter = search.filter ?? ''
  const routeCategory = search.category ?? 'all'
  const initialCategory = CATEGORIES.some((item) => item.id === routeCategory)
    ? (routeCategory as Category)
    : 'all'
  const initialTypeFilter: 'all' | DirectoryType =
    routeCategory === 'free' || routeCategory === 'free-tier' ? 'free' : 'all'

  const [searchTerm, setSearchTerm] = useState(initialFilter)
  const [category, setCategory] = useState<Category>(initialCategory)
  const [typeFilter, setTypeFilter] = useState<'all' | DirectoryType>(initialTypeFilter)

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return DIRECTORY_ITEMS.filter((item) => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      const matchesCategory =
        category === 'all' || item.categories.includes(category as Exclude<Category, 'all'>)

      const searchableContent = [
        item.name,
        t(item.descriptionKey),
        t(item.accessKey),
        ...item.categories.map((itemCategory) => t('appDirectory.categories.' + itemCategory.replace('-', ''))),
        ...(item.models ?? []),
        ...(item.highlightKeys ?? []).map((key) => t('appDirectory.highlights.' + key)),
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !query || searchableContent.includes(query)
      return matchesType && matchesCategory && matchesSearch
    })
  }, [category, searchTerm, typeFilter, t])

  return (
    <Main fixed className='flex min-h-0 flex-col overflow-hidden'>
      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
          <section className='border-b pb-6'>
            <div className='max-w-3xl'>
              <p className='mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                {t('appDirectory.badge')}
              </p>
              <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
                {t('appDirectory.title')}
              </h1>
              <p className='mt-2 text-sm leading-6 text-muted-foreground sm:text-base'>
                {t('appDirectory.description')}
              </p>
            </div>
          </section>

          <section className='space-y-4 border-b py-4'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div className='relative w-full lg:max-w-md'>
                <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('appDirectory.searchPlaceholder')}
                  aria-label={t('appDirectory.searchPlaceholder')}
                  className='h-10 w-full rounded-md border border-border bg-background pl-9 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/30'
                />
                {searchTerm && (
                  <button
                    type='button'
                    onClick={() => setSearchTerm('')}
                    aria-label={t('appDirectory.clearSearch')}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                  >
                    <X className='size-4' />
                  </button>
                )}
              </div>

              <div className='flex flex-wrap gap-1.5' role='group' aria-label={t('appDirectory.typeFilterLabel')}>
                {TYPE_FILTERS.map((item) => {
                  const active = typeFilter === item.id
                  return (
                    <button
                      key={item.id}
                      type='button'
                      aria-pressed={active}
                      onClick={() => setTypeFilter(item.id)}
                      className={[
                        'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                        active
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                      ].join(' ')}
                    >
                      {t(item.key)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2' role='group' aria-label={t('appDirectory.categoryFilterLabel')}>
              {CATEGORIES.map((item) => {
                const active = category === item.id
                return (
                  <button
                    key={item.id}
                    type='button'
                    aria-pressed={active}
                    onClick={() => setCategory(item.id)}
                    className={[
                      'rounded-md border px-3 py-1.5 text-xs transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                    ].join(' ')}
                  >
                    {t(item.key)}
                  </button>
                )
              })}
            </div>
          </section>

          <div className='flex items-center justify-between gap-4 py-5'>
            <p className='text-sm text-muted-foreground'>
              {t('appDirectory.resultCount', { count: filteredItems.length })}
            </p>
            <p className='hidden text-xs text-muted-foreground sm:block'>
              {typeFilter === 'paid'
                ? t('appDirectory.paidNotice')
                : typeFilter === 'free'
                  ? t('appDirectory.freeNotice')
                  : t('appDirectory.allNotice')}
            </p>
          </div>

          {filteredItems.length > 0 ? (
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              {filteredItems.map((item) => (
                <article
                  key={item.type + '-' + item.id}
                  className='group flex min-h-[260px] flex-col rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/30 hover:bg-muted/20'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <DirectoryLogo item={item} />
                      <div className='min-w-0'>
                        <h2 className='truncate font-semibold'>{item.name}</h2>
                        <p className='mt-0.5 text-xs text-muted-foreground'>
                          {t(item.accessKey)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={[
                        'shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold',
                        item.type === 'free'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
                      ].join(' ')}
                    >
                      {t('appDirectory.types.' + item.type)}
                    </span>
                  </div>

                  <p className='mt-5 text-sm leading-6 text-muted-foreground'>
                    {t(item.descriptionKey)}
                  </p>

                  <div className='mt-4 flex-1'>
                    {(item.models?.length || item.highlightKeys?.length) ? (
                      <>
                        <p className='mb-2 text-xs font-medium text-foreground'>
                          {t(item.type === 'free' ? 'appDirectory.models' : 'appDirectory.highlights')}
                        </p>
                        <div className='flex flex-wrap gap-1.5'>
                          {(item.models ?? item.highlightKeys ?? []).slice(0, 3).map((value) => (
                            <span
                              key={value}
                              className='rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground'
                            >
                              {item.type === 'paid'
                                ? t('appDirectory.highlights.' + value)
                                : value}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}

                    {item.modelCountKey && (
                      <p className='mt-2 text-xs text-muted-foreground'>
                        {t(item.modelCountKey)}
                      </p>
                    )}
                  </div>

                  <div className='mt-5 flex items-center justify-between gap-3 border-t pt-4'>
                    <div className='flex flex-wrap gap-x-2 gap-y-1'>
                      {item.categories.slice(0, 2).map((itemCategory) => (
                        <span key={itemCategory} className='text-xs text-muted-foreground'>
                          {t('appDirectory.categories.' + itemCategory.replace('-', ''))}
                        </span>
                      ))}
                    </div>
                    <a
                      href={item.websiteUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted'
                    >
                      {t('appDirectory.visitWebsite')}
                      <ExternalLink className='size-3.5' />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className='flex min-h-[320px] items-center justify-center rounded-xl border border-dashed px-6'>
              <div className='text-center'>
                <Search className='mx-auto mb-3 size-8 text-muted-foreground' />
                <h2 className='font-medium'>{t('appDirectory.empty.title')}</h2>
                <p className='mt-1 text-sm text-muted-foreground'>
                  {t('appDirectory.empty.description')}
                </p>
                <button
                  type='button'
                  onClick={() => {
                    setSearchTerm('')
                    setCategory('all')
                    setTypeFilter('all')
                  }}
                  className='mt-4 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted'
                >
                  {t('appDirectory.empty.reset')}
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
