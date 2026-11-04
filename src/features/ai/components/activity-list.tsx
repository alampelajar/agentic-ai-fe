import { Ban, Check, Clock, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toolKey, type ActivityItem, type ActivityState } from './activity'

const STATE_ICON: Record<ActivityState, typeof Check> = {
  running: Loader2,
  done: Check,
  denied: Ban,
  expired: Clock,
  failed: X,
}

/**
 * The tool calls of the current run, one row each: what the agent did, on what,
 * and how it ended. It is what lets a person see that something really happened
 * (or that a write was refused) instead of trusting the agent's own summary.
 */
export function ActivityList({ items }: { items: ActivityItem[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null

  return (
    <section aria-label={t('agentic.activity.title')} className='max-w-[46rem] rounded-md border border-border' data-testid='agent-activity'>
      <ul aria-live='polite' className='divide-y divide-border/60'>
        {items.map((item) => {
          const Icon = STATE_ICON[item.state]
          return (
            <li key={item.id} className='flex min-h-9 items-center gap-3 px-3 py-1.5 text-sm' data-state={item.state}>
              <Icon
                aria-hidden='true'
                className={`size-3.5 shrink-0 ${item.state === 'running' ? 'animate-spin text-muted-foreground' : item.state === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}
              />
              <span className='shrink-0 font-medium'>{t(`agentic.activity.tools.${toolKey(item.tool)}`, { defaultValue: item.tool })}</span>
              {/* taste-skill-ignore: a file path is literal code, the one place monospace belongs */}
              <span className='min-w-0 flex-1 truncate font-mono text-[13px] text-muted-foreground' title={item.detail}>
                {item.detail}
              </span>
              <span className={`shrink-0 text-[13px] ${item.state === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {t(`agentic.activity.${item.state}`)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
