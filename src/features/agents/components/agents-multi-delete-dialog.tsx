'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'

type AgentMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

const CONFIRM_WORD = 'DELETE'

export function AgentsMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: AgentMultiDeleteDialogProps<TData>) {
  const [value, setValue] = useState('')

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleDelete = () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`Please type "${CONFIRM_WORD}" to confirm.`)
      return
    }

    onOpenChange(false)

    toast.promise(sleep(1500), {
      loading: 'Deleting agents...',

      success: () => {
        setValue('')
        table.resetRowSelection()

        return `Deleted ${selectedRows.length} agent${
          selectedRows.length > 1 ? 's' : ''
        }`
      },

      error: 'Delete failed.',
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='agents-multi-delete-form'
      disabled={value.trim() !== CONFIRM_WORD}
      destructive
      confirmText='Delete'
      title={
        <span className='text-destructive'>
          <AlertTriangle className='me-1 inline-block' size={18} />
          Delete {selectedRows.length} Agent
          {selectedRows.length > 1 ? 's' : ''}
        </span>
      }
      desc={
        <form
          id='agents-multi-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p>
            Are you sure you want to delete the selected AI Agents?
            <br />
            This action cannot be undone.
          </p>

          <Label className='flex flex-col gap-2'>
            Confirm by typing "{CONFIRM_WORD}"
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Type "${CONFIRM_WORD}"`}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Warning</AlertTitle>

            <AlertDescription>This operation is permanent.</AlertDescription>
          </Alert>
        </form>
      }
    />
  )
}
