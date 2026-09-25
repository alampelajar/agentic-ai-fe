import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Bot, Play, Square, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type Agent } from '../data/schema'
import { AgentsMultiDeleteDialog } from './agents-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkStatus = (status: 'running' | 'offline') => {
    const selectedAgents = selectedRows.map((row) => row.original as Agent)

    toast.promise(sleep(1500), {
      loading:
        status === 'running' ? 'Starting agents...' : 'Stopping agents...',

      success: () => {
        table.resetRowSelection()

        return `${
          status === 'running' ? 'Started' : 'Stopped'
        } ${selectedAgents.length} agent${selectedAgents.length > 1 ? 's' : ''}`
      },

      error: 'Operation failed.',
    })
  }

  const handleDeploy = () => {
    const selectedAgents = selectedRows.map((row) => row.original as Agent)

    toast.promise(sleep(1500), {
      loading: 'Deploying agents...',

      success: () => {
        table.resetRowSelection()

        return `Deployed ${selectedAgents.length} agent${
          selectedAgents.length > 1 ? 's' : ''
        }`
      },

      error: 'Deployment failed.',
    })
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='agent'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='outline' size='icon' onClick={handleDeploy}>
              <Bot />
            </Button>
          </TooltipTrigger>

          <TooltipContent>Deploy Agents</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatus('running')}
            >
              <Play />
            </Button>
          </TooltipTrigger>

          <TooltipContent>Start Agents</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatus('offline')}
            >
              <Square />
            </Button>
          </TooltipTrigger>

          <TooltipContent>Stop Agents</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>

          <TooltipContent>Delete Agents</TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <AgentsMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
