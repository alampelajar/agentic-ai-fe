import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { type Table } from '@tanstack/react-table'
import { AgentsMultiDeleteDialog } from './agents-multi-delete-dialog'

describe('AgentsMultiDeleteDialog', () => {
  it('requires the DELETE confirmation word before enabling deletion', async () => {
    const table = {
      getFilteredSelectedRowModel: () => ({ rows: [] }),
      resetRowSelection: vi.fn(),
    } as unknown as Table<unknown>
    const screen = await render(
      <AgentsMultiDeleteDialog open onOpenChange={vi.fn()} table={table} />
    )

    const input = screen.getByRole('textbox', { name: /Confirm by typing "DELETE"/i })
    const deleteButton = screen.getByRole('button', { name: 'Delete' })

    await expect.element(input).toBeInTheDocument()
    await expect.element(deleteButton).toBeDisabled()
    await userEvent.fill(input, 'DELETE')
    await expect.element(deleteButton).toBeEnabled()
  })
})
