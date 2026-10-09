import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { TasksImportDialog } from './tasks-import-dialog'

vi.mock('@/lib/show-submitted-data', () => ({ showSubmittedData: vi.fn() }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'tasksPage.import.title': 'Import Tasks',
        'tasksPage.import.description': 'Import tasks quickly from a CSV file.',
        'tasksPage.import.file': 'File',
        'tasksPage.import.close': 'Close',
        'tasksPage.import.import': 'Import',
        'tasksPage.import.validationRequired': 'Please upload a file.',
        'tasksPage.import.validationFormat': 'Please upload a CSV file.',
        'tasksPage.import.success': 'You have imported the following file:',
      })[key as keyof {
        'tasksPage.import.title': string
        'tasksPage.import.description': string
        'tasksPage.import.file': string
        'tasksPage.import.close': string
        'tasksPage.import.import': string
        'tasksPage.import.validationRequired': string
        'tasksPage.import.validationFormat': string
        'tasksPage.import.success': string
      }] ?? key,
  }),
}))

describe('TasksImportDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the dialog with title, description, file input and buttons', async () => {
    const screen = await render(
      <TasksImportDialog open onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByRole('heading', { name: 'Import Tasks' })).toBeInTheDocument()
    await expect.element(screen.getByText('Import tasks quickly from a CSV file.')).toBeInTheDocument()
    await expect.element(screen.getByLabelText('File')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
  })

  it('shows validation when submitting without a file', async () => {
    const onOpenChange = vi.fn()
    const screen = await render(
      <TasksImportDialog open onOpenChange={onOpenChange} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Import' }))

    await expect.element(screen.getByText('Please upload a file.')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(showSubmittedData).not.toHaveBeenCalled()
  })

  it('submits details for an uploaded CSV file and closes the dialog', async () => {
    const onOpenChange = vi.fn()
    const screen = await render(
      <TasksImportDialog open onOpenChange={onOpenChange} />
    )

    const csv = new File(['a,b'], 'tasks.csv', { type: 'text/csv' })
    await userEvent.upload(screen.getByLabelText('File'), csv)
    await userEvent.click(screen.getByRole('button', { name: 'Import' }))

    expect(showSubmittedData).toHaveBeenCalledWith(
      { name: 'tasks.csv', size: csv.size, type: 'text/csv' },
      'You have imported the following file:'
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes without submitting when Close is clicked', async () => {
    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <button type='button' onClick={() => setOpen(true)}>Reopen</button>
          <TasksImportDialog open={open} onOpenChange={setOpen} />
        </>
      )
    }
    const screen = await render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await expect.element(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument()
    expect(showSubmittedData).not.toHaveBeenCalled()
  })
})
