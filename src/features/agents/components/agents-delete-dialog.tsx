'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Agent } from '../data/schema'

type AgentDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Agent
}

export function AgentsDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: AgentDeleteDialogProps) {
  const [value, setValue] = useState('')

  const handleDelete = () => {
    if (value.trim() !== currentRow.name) return

    onOpenChange(false)

    showSubmittedData(currentRow, 'The following AI Agent has been deleted:')
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='agents-delete-form'
      disabled={value.trim() !== currentRow.name}
      destructive
      confirmText='Delete'
      title={
        <span className='text-destructive'>
          <AlertTriangle className='me-1 inline-block' size={18} />
          Delete Agent
        </span>
      }
      desc={
        <form
          id='agents-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p>
            Are you sure you want to delete
            <span className='font-bold'> {currentRow.name}</span>?
            <br />
            Provider:
            <span className='font-bold'> {currentRow.provider}</span>
            <br />
            Model:
            <span className='font-bold'> {currentRow.model}</span>
            <br />
            This action cannot be undone.
          </p>

          <Label>
            Agent Name
            <Input
              autoFocus
              placeholder='Type agent name to confirm'
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This will permanently remove the AI Agent.
            </AlertDescription>
          </Alert>
        </form>
      }
    />
  )
}
