import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Agent } from '../data/schema'

type AgentsDialogType = 'invite' | 'add' | 'edit' | 'delete'

type AgentsContextType = {
  open: AgentsDialogType | null
  setOpen: (str: AgentsDialogType | null) => void
  currentRow: Agent | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Agent | null>>
}

const AgentsContext = React.createContext<AgentsContextType | null>(null)

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<AgentsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Agent | null>(null)

  return (
    <AgentsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </AgentsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAgents = () => {
  const agentsContext = React.useContext(AgentsContext)

  if (!agentsContext) {
    throw new Error('useAgents has to be used within <AgentsProvider>')
  }

  return agentsContext
}
