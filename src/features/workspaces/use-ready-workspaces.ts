import { useEffect, useState } from 'react'
import { getWorkspaces, type Workspace } from './data/api'

/** The workspaces that are ready to use, or null while they load; `failed` when they could not be loaded. */
export function useReadyWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getWorkspaces()
      .then((loaded) => {
        if (!cancelled) setWorkspaces(loaded.filter((workspace) => workspace.status === 'ready'))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { workspaces, failed }
}
