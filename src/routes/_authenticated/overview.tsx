import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  ListTodo,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const API_URL = 'http://localhost:8080'

// ============================================================
// ROUTE
// ============================================================

export const Route = createFileRoute('/_authenticated/overview')({
  component: AIOverview,
})

// ============================================================
// TYPES
// ============================================================

type AgentModel = {
  id: number
  name: string
  model_id: string
  description: string
  is_system: boolean
  is_active: boolean

  provider: {
    id: number
    name: string
    type: string
    base_url: string
    is_system: boolean
  }
}

type Agent = {
  id: number
  slug: string
  name: string
  description: string
  status: string
  is_active: boolean
  models: AgentModel[]
}

// ============================================================
// PAGE
// ============================================================

function AIOverview() {
  const { t } = useTranslation()
  const accessToken = useAuthStore((state) => state.auth.accessToken)

  const [agents, setAgents] = useState<Agent[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  // ==========================================================
  // LOAD
  // ==========================================================

  const loadAgents = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/agents`, {
        method: 'GET',

        headers: {
          ...(accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {}),
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || t('overviewPage.errors.loadAgents'))
      }

      setAgents(Array.isArray(data?.agents) ? data.agents : [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('overviewPage.errors.loadAgents')
      )

      setAgents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
  }, [accessToken])

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const totalAgents = agents.length

  const activeAgents = agents.filter((agent) => agent.is_active).length

  const totalModels = agents.reduce(
    (total, agent) => total + agent.models.length,
    0
  )

  const systemModels = agents.reduce(
    (total, agent) =>
      total + agent.models.filter((model) => model.is_system).length,
    0
  )

  // ==========================================================
  // ACTIVE AGENTS
  // ==========================================================

  const activeAgentsList = useMemo(() => {
    return agents.filter((agent) => agent.is_active).slice(0, 5)
  }, [agents])

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return <OverviewSkeleton />
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
      <div className='flex flex-1 flex-col gap-6 p-4 pb-10 sm:p-6'>
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='mb-2 flex items-center gap-2 text-sm font-medium text-primary'>
              <Sparkles className='size-4' />
              {t('agenticAI')}
            </div>

            <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
              {t('overview')}
            </h1>

            <p className='mt-1 text-sm text-muted-foreground sm:text-base'>
              {t('overviewPage.subtitle')}
            </p>
          </div>

          <Link
            to='/ai'
            className='inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'
          >
            <Sparkles className='me-2 size-4' />
            {t('startAITask')}
          </Link>
        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <Card className='border-destructive/30'>
            <CardContent className='p-4'>
              <p className='font-medium text-destructive'>
                {t('overviewPage.errors.title')}
              </p>

              <p className='mt-1 text-sm text-muted-foreground'>{error}</p>
            </CardContent>
          </Card>
        )}

        {/* ====================================================
            STATISTICS
        ==================================================== */}

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <StatCard
            title={t('overviewPage.stats.totalAgents')}
            value={totalAgents}
            description={t('overviewPage.stats.totalAgentsDescription')}
            icon={Bot}
            href='/users'
            color='blue'
          />

          <StatCard
            title={t('activeAgents')}
            value={activeAgents}
            description={t('overviewPage.stats.activeAgentsDescription')}
            icon={Sparkles}
            href='/users'
            color='violet'
          />

          <StatCard
            title={t('overviewPage.stats.availableModels')}
            value={totalModels}
            description={t('overviewPage.stats.availableModelsDescription')}
            icon={Cpu}
            href='/users'
            color='amber'
          />

          <StatCard
            title={t('overviewPage.stats.systemModels')}
            value={systemModels}
            description={t('overviewPage.stats.systemModelsDescription')}
            icon={CheckCircle2}
            href='/users'
            color='emerald'
          />
        </div>

        {/* ====================================================
            ACTIVE AGENTS
        ==================================================== */}

        <div className='grid gap-6 lg:grid-cols-2'>
          <section className='rounded-xl border bg-card p-5 shadow-sm'>
            <div className='mb-5 flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-lg font-semibold'>{t('activeAgents')}</h2>

                <p className='mt-1 text-sm text-muted-foreground'>
                  {t('overviewPage.activeAgentsDescription')}
                </p>
              </div>

              <Link
                to='/ai/agents'
                className='group flex shrink-0 items-center gap-1 text-sm font-medium text-primary'
              >
                {t('viewAll')}
                <ChevronRight className='size-4 transition-transform group-hover:translate-x-0.5' />
              </Link>
            </div>

            {activeAgentsList.length > 0 ? (
              <div className='space-y-3'>
                {activeAgentsList.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            ) : (
              <EmptyAgents />
            )}
          </section>

          {/* ==================================================
              MODEL SUMMARY
          ================================================== */}

          <section className='rounded-xl border bg-card p-5 shadow-sm'>
            <div className='mb-5'>
              <h2 className='text-lg font-semibold'>{t('overviewPage.modelSummary.title')}</h2>

              <p className='mt-1 text-sm text-muted-foreground'>
                {t('overviewPage.modelSummary.description')}
              </p>
            </div>

            {agents.length === 0 ? (
              <EmptyAgents />
            ) : (
              <div className='space-y-3'>
                {agents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className='rounded-lg border p-3'>
                    <div className='flex items-center gap-3'>
                      <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                        <Bot className='size-4' />
                      </div>

                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium'>
                          {agent.name}
                        </p>

                        <p className='mt-0.5 text-xs text-muted-foreground'>
                          {t('overviewPage.modelCount', {
                            count: agent.models.length,
                          })}
                        </p>
                      </div>

                      <Cpu className='size-4 text-muted-foreground' />
                    </div>

                    {agent.models.length > 0 && (
                      <div className='mt-3 space-y-1'>
                        {agent.models.slice(0, 2).map((model) => (
                          <div
                            key={model.id}
                            className='flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5'
                          >
                            <span className='size-1.5 rounded-full bg-emerald-500' />

                            <span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>
                              {model.name}
                            </span>
                          </div>
                        ))}

                        {agent.models.length > 2 && (
                          <p className='px-2.5 pt-1 text-[11px] text-muted-foreground'>
                            {t('overviewPage.moreModels', { count: agent.models.length - 2 })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <section className='rounded-xl border bg-card p-5 shadow-sm'>
          <div className='mb-5'>
            <h2 className='text-lg font-semibold'>{t('quickActions')}</h2>

            <p className='mt-1 text-sm text-muted-foreground'>
              {t('overviewPage.quickActionsDescription')}
            </p>
          </div>

          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            <QuickAction
              href='/ai'
              icon={Sparkles}
              title={t('createAIGoal')}
              description={t('overviewPage.quickActions.createGoal')}
              color='blue'
            />

            <QuickAction
              href='/users'
              icon={Bot}
              title={t('manageAgents')}
              description={t('overviewPage.quickActions.manageAgents')}
              color='violet'
            />

            <QuickAction
              href='/tasks'
              icon={ListTodo}
              title={t('viewTasks')}
              description={t('overviewPage.quickActions.viewTasks')}
              color='amber'
            />
          </div>
        </section>
      </div>
    </div>
  )
}

// ============================================================
// EMPTY AGENTS
// ============================================================

function EmptyAgents() {
  const { t } = useTranslation()

  return (
    <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center'>
      <Bot className='size-7 text-muted-foreground' />

      <p className='mt-3 text-sm font-medium'>{t('overviewPage.emptyAgents.title')}</p>

      <p className='mt-1 text-xs text-muted-foreground'>
        {t('overviewPage.emptyAgents.description')}
      </p>

      <Link to='/ai/agents' className='mt-3 text-xs font-medium text-primary'>
        {t('overviewPage.emptyAgents.viewAgents')}
      </Link>
    </div>
  )
}

// ============================================================
// AGENT CARD
// ============================================================

function AgentCard({ agent }: { agent: Agent }) {
  const { t } = useTranslation()
  const status = agent.status.toLowerCase()

  const isReady = status === 'ready' || status === 'idle'

  return (
    <Link
      to='/ai/agents/detail'
      className='group block rounded-lg border p-4 transition-all hover:border-primary/30 hover:bg-muted/20'
    >
      <div className='flex items-center justify-between gap-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10'>
            <Bot className='size-4' />
          </div>

          <div className='min-w-0'>
            <p className='truncate text-sm font-medium'>{agent.name}</p>

            <div className='mt-1 flex items-center gap-2'>
              <span
                className={`size-2 rounded-full ${
                  isReady ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />

              <span className='text-xs text-muted-foreground'>
                {isReady ? t('overviewPage.agentCard.ready') : agent.status}
              </span>
            </div>
          </div>
        </div>

        <span className='text-xs font-semibold'>
          {t('overviewPage.modelCount', {
            count: agent.models.length,
          })}
        </span>
      </div>

      <div className='mt-3 h-1.5 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-emerald-500'
          style={{
            width: `${agent.is_active ? 100 : 0}%`,
          }}
        />
      </div>
    </Link>
  )
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  color,
}: {
  title: string
  value: number
  description: string
  icon: React.ElementType
  href: '/ai/agents'
  color: 'blue' | 'violet' | 'amber' | 'emerald'
}) {
  const { t } = useTranslation()

  const colors = {
    blue: {
      icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },

    violet: {
      icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },

    amber: {
      icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },

    emerald: {
      icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
  }

  return (
    <Link
      to={href}
      className='group rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md'
    >
      <div className='flex items-center justify-between gap-3'>
        <p className='text-sm font-medium text-muted-foreground'>{title}</p>

        <div
          className={`flex size-10 items-center justify-center rounded-lg ${colors[color].icon}`}
        >
          <Icon className='size-5' />
        </div>
      </div>

      <div className='mt-4'>
        <p className='text-3xl font-bold tracking-tight'>{value}</p>

        <p className='mt-1 text-xs text-muted-foreground'>{description}</p>
      </div>

      <div className='mt-4 flex items-center text-xs font-medium text-muted-foreground'>
        {t('overviewPage.openPage')}
        <ArrowRight className='ms-1 size-3 transition-transform group-hover:translate-x-1' />
      </div>
    </Link>
  )
}

// ============================================================
// QUICK ACTION
// ============================================================

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: '/ai' | '/users' | '/tasks'
  icon: React.ElementType
  title: string
  description: string
  color: 'blue' | 'violet' | 'amber'
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',

    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',

    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  }

  return (
    <Link
      to={href}
      className='group flex items-center gap-3 rounded-lg border p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm'
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${colors[color]}`}
      >
        <Icon className='size-4' />
      </div>

      <div className='min-w-0 flex-1'>
        <p className='text-sm font-medium'>{title}</p>

        <p className='truncate text-xs text-muted-foreground'>{description}</p>
      </div>

      <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
    </Link>
  )
}

// ============================================================
// SKELETON
// ============================================================

function OverviewSkeleton() {
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
      <div className='flex flex-1 flex-col gap-6 p-4 pb-10 sm:p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div className='space-y-3'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-8 w-48' />
            <Skeleton className='h-4 w-96 max-w-full' />
          </div>

          <Skeleton className='h-10 w-32 shrink-0 rounded-md' />
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div key={index} className='rounded-xl border bg-card p-5'>
              <Skeleton className='h-4 w-28' />
              <Skeleton className='mt-5 h-8 w-12' />
              <Skeleton className='mt-2 h-3 w-28' />
            </div>
          ))}
        </div>

        <div className='grid gap-6 lg:grid-cols-2'>
          {Array.from({
            length: 2,
          }).map((_, index) => (
            <div key={index} className='rounded-xl border bg-card p-5'>
              <Skeleton className='h-6 w-36' />
              <Skeleton className='mt-2 h-4 w-56' />

              <div className='mt-6 space-y-4'>
                {Array.from({
                  length: 3,
                }).map((__, itemIndex) => (
                  <div key={itemIndex} className='flex gap-3'>
                    <Skeleton className='size-10 rounded-lg' />

                    <div className='flex-1 space-y-2'>
                      <Skeleton className='h-4 w-40' />
                      <Skeleton className='h-3 w-24' />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
