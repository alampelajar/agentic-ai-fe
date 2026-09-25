import React, { useCallback, useEffect, useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { createTask, deleteTask, getTasks, updateTask, type BackendTask } from '../data/api'
import { type Task } from '../data/schema'

type TasksDialogType = 'create' | 'update' | 'delete' | 'import'

type TasksContextType = {
  open: TasksDialogType | null
  setOpen: (str: TasksDialogType | null) => void
  currentRow: Task | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Task | null>>
  tasks: Task[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (task: Partial<Task>) => Promise<Task>
  update: (id: string, task: Partial<Task>) => Promise<Task>
  remove: (id: string) => Promise<void>
}

const TasksContext = React.createContext<TasksContextType | null>(null)

function mapTask(task: BackendTask): Task {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    label: task.label,
    priority: task.priority,
    agent_id: task.agent_id ?? null,
    model_id: task.model_id ?? null,
    agent: task.agent ?? null,
    created_at: task.created_at,
    updated_at: task.updated_at,
  }
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<TasksDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Task | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTasks()
      setTasks(data.map(mapTask))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()

    const handleRefresh = () => { void refresh() }
    const handleFocus = () => { void refresh() }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }

    window.addEventListener('tasks:refresh', handleRefresh)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('tasks:refresh', handleRefresh)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh])

  const create = async (payload: Partial<Task>) => {
    const created = mapTask(await createTask(payload))
    setTasks((current) => [created, ...current])
    return created
  }

  const update = async (id: string, payload: Partial<Task>) => {
    const updated = mapTask(await updateTask(id, payload))
    setTasks((current) => current.map((item) => item.id === id ? updated : item))
    return updated
  }

  const remove = async (id: string) => {
    await deleteTask(id)
    setTasks((current) => current.filter((item) => item.id !== id))
  }

  return (
    <TasksContext.Provider value={{
      open, setOpen, currentRow, setCurrentRow,
      tasks, loading, error, refresh, create, update, remove,
    }}>
      {children}
    </TasksContext.Provider>
  )
}

export const useTasks = () => {
  const tasksContext = React.useContext(TasksContext)
  if (!tasksContext) throw new Error('useTasks has to be used within <TasksContext>')
  return tasksContext
}
