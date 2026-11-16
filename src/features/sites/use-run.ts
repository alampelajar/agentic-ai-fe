import { useEffect, useState } from 'react'
import { FINISHED_RUN, followRun, type AgentRun, type RunStep } from './data/api'

/**
 * Follows a run live. onFinished runs once when the run ends (completed, failed or
 * cancelled), with its final state.
 */
export function useRun(siteId: number, runId: number | undefined, onFinished: (run: AgentRun) => void) {
  const [run, setRun] = useState<AgentRun | null>(null)
  const [steps, setSteps] = useState<RunStep[]>([])

  useEffect(() => {
    if (!runId) return
    const controller = new AbortController()
    let finished = false
    void followRun(
      siteId,
      runId,
      (state) => {
        setRun(state.run)
        setSteps(state.steps ?? [])
        if (!finished && FINISHED_RUN.includes(state.run.status)) {
          finished = true
          onFinished(state.run)
        }
      },
      controller.signal,
    )
    return () => controller.abort()
    // onFinished is read when the run ends; following again for a new callback would restart the stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, runId])

  return { run, steps }
}
