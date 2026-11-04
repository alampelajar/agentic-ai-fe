import { useTranslation } from 'react-i18next'

type Props = {
  agent: { name: string } | null
  model: { name: string; provider?: { name: string } } | null
  workspaceName: string | null
  onPick: (text: string) => void
}

const STARTERS = ['structure', 'review', 'readme'] as const

/**
 * What the conversation shows before the first message. It says what is missing
 * (an agent, then a model) or, once the session is set up, what the agent will
 * work with and how: the same facts the bar holds, written out, plus a few tasks
 * worth starting with when a workspace is there to work on.
 */
export function ThreadEmpty({ agent, model, workspaceName, onPick }: Props) {
  const { t } = useTranslation()

  if (!agent || !model) {
    return (
      <div className='max-w-[46rem] py-10' data-testid='thread-empty'>
        <h2 className='text-lg font-semibold'>
          {agent ? t('agentic.empty.chooseModelTitle', { agent: agent.name }) : t('agentic.empty.chooseAgentTitle')}
        </h2>
        <p className='mt-1 text-sm text-muted-foreground'>
          {agent ? t('agentic.empty.chooseModelBody') : t('agentic.empty.chooseAgentBody')}
        </p>
      </div>
    )
  }

  return (
    <div className='flex max-w-[46rem] flex-col gap-6 py-10' data-testid='thread-empty'>
      <h2 className='text-lg font-semibold'>{t('agentic.empty.readyTitle', { agent: agent.name })}</h2>

      <dl className='grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2 text-sm'>
        <dt className='text-muted-foreground'>{t('agentic.empty.factAgent')}</dt>
        <dd>{agent.name}</dd>
        <dt className='text-muted-foreground'>{t('agentic.empty.factModel')}</dt>
        <dd>
          {model.name}
          {model.provider?.name && <span className='text-muted-foreground'>{` · ${model.provider.name}`}</span>}
        </dd>
        <dt className='text-muted-foreground'>{t('agentic.empty.factWorkspace')}</dt>
        <dd>{workspaceName ?? <span className='text-muted-foreground'>{t('agentic.empty.noWorkspace')}</span>}</dd>
      </dl>

      {workspaceName && (
        <>
          <p className='text-sm text-muted-foreground'>{t('agentic.empty.withWorkspace')}</p>

          <div>
            <p className='mb-2 text-xs text-muted-foreground'>{t('agentic.empty.startersLabel')}</p>
            <ul className='flex flex-col gap-1.5'>
              {STARTERS.map((key) => {
                const text = t(`agentic.empty.starters.${key}`)
                return (
                  <li key={key}>
                    <button
                      type='button'
                      onClick={() => onPick(text)}
                      className='w-full rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    >
                      {text}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
