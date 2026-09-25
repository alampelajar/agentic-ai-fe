import { AgentsActionDialog } from './agents-action-dialog'
import { AgentsDeleteDialog } from './agents-delete-dialog'
import { AgentsInviteDialog } from './agents-invite-dialog'
import { useAgents } from './agents-provider'

export function AgentsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useAgents()

  return (
    <>
      <AgentsActionDialog
        key='agent-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      <AgentsInviteDialog
        key='agent-invite'
        open={open === 'invite'}
        onOpenChange={() => setOpen('invite')}
      />

      {currentRow && (
        <>
          <AgentsActionDialog
            key={`agent-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <AgentsDeleteDialog
            key={`agent-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
