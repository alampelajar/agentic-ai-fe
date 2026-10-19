
import { useMemo, useState } from 'react'
import {
  Search,
  X,
  CreditCard,
  ArrowUpRight,
} from 'lucide-react'
import { Main } from '@/components/layout/main'

type Category = 'all' | 'api' | 'enterprise'

type Provider = {
  id: string
  name: string
  description: string
  websiteUrl: string
  category: Exclude<Category, 'all'>
  highlights: string[]
  initials: string
}

const PROVIDERS: Provider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description:
      'Platform resmi Claude API untuk membangun aplikasi AI dengan kemampuan coding, analisis, dan penalaran.',
    websiteUrl: 'https://console.anthropic.com/',
    category: 'api',
    highlights: ['Claude API', 'Coding', 'Reasoning'],
    initials: 'AN',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description:
      'Penyedia API AI dengan layanan untuk aplikasi percakapan, penalaran, dan pengembangan perangkat lunak.',
    websiteUrl: 'https://platform.deepseek.com/',
    category: 'api',
    highlights: ['Direct API', 'Reasoning', 'Developer'],
    initials: 'DS',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description:
      'Platform API untuk mengintegrasikan model AI ke aplikasi, mulai dari pemrosesan bahasa hingga coding.',
    websiteUrl: 'https://console.mistral.ai/',
    category: 'api',
    highlights: ['Language API', 'Coding', 'Business'],
    initials: 'MI',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    description:
      'Platform AI yang berfokus pada kebutuhan bisnis, pencarian semantik, retrieval, dan pemrosesan bahasa.',
    websiteUrl: 'https://dashboard.cohere.com/',
    category: 'enterprise',
    highlights: ['Enterprise AI', 'Search', 'RAG'],
    initials: 'CO',
  },
  {
    id: 'ai21',
    name: 'AI21 Labs',
    description:
      'Penyedia model dan layanan API untuk membangun aplikasi generative AI serta solusi bahasa untuk bisnis.',
    websiteUrl: 'https://studio.ai21.com/',
    category: 'api',
    highlights: ['Language API', 'Generative AI', 'Business'],
    initials: 'AI',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    description:
      'Platform inference AI yang menawarkan akses API untuk menjalankan model dengan fokus pada kecepatan.',
    websiteUrl: 'https://cloud.cerebras.ai/',
    category: 'api',
    highlights: ['Inference API', 'Speed', 'Developer'],
    initials: 'CE',
  },
  {
    id: 'azure',
    name: 'Microsoft Azure AI',
    description:
      'Layanan AI berbasis cloud untuk aplikasi dan organisasi yang memerlukan integrasi serta pengelolaan enterprise.',
    websiteUrl: 'https://azure.microsoft.com/en-us/products/ai-services',
    category: 'enterprise',
    highlights: ['Cloud AI', 'Enterprise', 'Integration'],
    initials: 'AZ',
  },
]

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'api', label: 'AI API' },
  { id: 'enterprise', label: 'Enterprise' },
]



function ProviderIcon({ provider }: { provider: Provider }) {
  const [imageIndex, setImageIndex] = useState(0)

 
const logoUrls: Record<string, string[]> = {
  anthropic: [
    'https://cdn.simpleicons.org/anthropic',
  ],
  deepseek: [
    'https://cdn.simpleicons.org/deepseek',
  ],
  mistral: [
    'https://cdn.simpleicons.org/mistralai',
  ],

cohere: [
  'https://mintzoro.com/icons/svg/cohere.svg',
],
ai21: [
  'https://upload.wikimedia.org/wikipedia/commons/0/0b/AI21-Labs-Logo.jpg',
],
cerebras: [
  'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/cerebras/default.svg',
],

  azure: [
    'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/microsoftazure.svg',
  ],
}


  const urls = logoUrls[provider.id] ?? []
  const logoUrl = urls[imageIndex]

  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-2">
      {logoUrl ? (
        <img
          key={logoUrl}
          src={logoUrl}
          alt={`${provider.name} logo`}
          className="size-full object-contain"
          loading="eager"
          onError={() => setImageIndex((index) => index + 1)}
        />
      ) : (
        <span className="text-sm font-bold text-gray-800">
          {provider.initials}
        </span>
      )}
    </div>
  )
}



export function PaidModels() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] =
    useState<Category>('all')

  const filteredProviders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return PROVIDERS.filter((provider) => {
      const matchesSearch =
        !query ||
        provider.name.toLowerCase().includes(query) ||
        provider.description.toLowerCase().includes(query) ||
        provider.highlights.some((item) =>
          item.toLowerCase().includes(query),
        )

      const matchesCategory =
        selectedCategory === 'all' ||
        provider.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 md:p-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <CreditCard className="size-4" />
            AI RESOURCE DIRECTORY
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Model Berbayar
          </h1>

          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Jelajahi penyedia API AI berbayar untuk kebutuhan coding,
            penalaran, aplikasi bisnis, dan pengembangan produk. Pilih
            platform lalu kunjungi situs resminya untuk melihat model,
            harga, dan ketentuan penggunaan.
          </p>
        </section>

        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari provider atau kemampuan AI..."
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category.id

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {category.label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Daftar Provider
            </h2>

            <span className="text-sm text-muted-foreground">
              {filteredProviders.length} provider
            </span>
          </div>

          {filteredProviders.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredProviders.map((provider) => (
                <article
                  key={provider.id}
                  className="group flex flex-col rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <ProviderIcon provider={provider} />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold tracking-tight">
                        {provider.name}
                      </h3>

                      <span className="mt-1 inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {provider.category === 'api'
                          ? 'AI API'
                          : 'Enterprise'}
                      </span>
                    </div>

                    <CreditCard className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>

                  <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">
                    {provider.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {provider.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-md border px-2 py-1 text-xs text-muted-foreground"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 border-t pt-4">
                    <a
                      href={provider.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Kunjungi Situs Resmi
                      <ArrowUpRight className="size-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
              <Search className="mb-3 size-8 text-muted-foreground" />

              <h3 className="font-semibold">
                Provider tidak ditemukan
              </h3>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Coba kata kunci lain atau ubah kategori pencarian.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                }}
                className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Reset Filter
              </button>
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-muted-foreground">
          Catatan: halaman ini merupakan direktori provider. Harga,
          ketersediaan model, dan ketentuan akses ditentukan oleh
          masing-masing penyedia dan dapat berubah sewaktu-waktu.
        </p>
      </div>
    </Main>
  )
}

export default PaidModels
