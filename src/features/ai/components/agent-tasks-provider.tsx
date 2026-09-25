import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createTask, getTasks, type BackendTask } from '@/features/tasks/data/api'

export type AgentTaskStatus = 'todo' | 'in progress' | 'done' | 'canceled' | 'backlog'
export type AgentTaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type AgentTaskLabel = 'bug' | 'feature' | 'documentation'

export type AgentTask = {
  id: string
  title: string
  status: AgentTaskStatus
  label: AgentTaskLabel
  priority: AgentTaskPriority
  description: string
  agent_id?: number | null
  model_id?: number | null
}

type AgentTasksContextType = {
  tasks: AgentTask[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addTasks: (newTasks: AgentTask[]) => Promise<void>
  updateTaskStatus: (taskId: string, status: AgentTaskStatus) => Promise<void>
  clearTasks: () => void
}

const AgentTasksContext = createContext<AgentTasksContextType | undefined>(undefined)

function mapTask(task: BackendTask): AgentTask {
  return {
    id: String(task.id),
    title: task.title,
    status: task.status,
    label: task.label,
    priority: task.priority,
    description: task.description ?? '',
    agent_id: task.agent_id ?? null,
    model_id: task.model_id ?? null,
  }
}

export function AgentTasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await getTasks()
      setTasks(loaded.map(mapTask))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const addTasks = async (newTasks: AgentTask[]) => {
    for (const task of newTasks) {
      try {
        const created = await createTask({
          title: task.title,
          description: task.description,
          status: task.status,
          label: task.label,
          priority: task.priority,
          agent_id: task.agent_id ?? null,
          model_id: task.model_id ?? null,
        })
        setTasks((current) => [mapTask(created), ...current.filter((item) => item.id !== task.id)])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create task')
        throw err
      }
    }
  }

  const updateTaskStatus = async (taskId: string, status: AgentTaskStatus) => {
    const updated = await import('@/features/tasks/data/api').then(({ updateTask }) =>
      updateTask(taskId, { status })
    )
    setTasks((current) => current.map((task) => task.id === taskId ? mapTask(updated) : task))
  }

  const clearTasks = () => setTasks([])

  return (
    <AgentTasksContext.Provider value={{
      tasks, loading, error, refresh, addTasks, updateTaskStatus, clearTasks,
    }}>
      {children}
    </AgentTasksContext.Provider>
  )
}

export function useAgentTasks() {
  const context = useContext(AgentTasksContext)
  if (!context) throw new Error('useAgentTasks must be used inside AgentTasksProvider')
  return context
}
