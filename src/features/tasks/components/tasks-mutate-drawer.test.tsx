import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { TasksMutateDrawer } from './tasks-mutate-drawer'
import { type Task } from '../data/schema'

const taskActions = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./tasks-provider', () => ({
  useTasks: () => taskActions,
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'tasksPage.createTask': 'Create Task',
        'tasksPage.createDescription': 'Add a new task by providing necessary info.',
        'tasksPage.updateTask': 'Update Task',
        'tasksPage.updateDescription': 'Update the task by providing necessary info.',
        'tasksPage.saveInstruction': 'Click save when you are done.',
        'tasksPage.titleField': 'Title',
        'tasksPage.titlePlaceholder': 'Enter a title',
        'tasksPage.status': 'Status',
        'tasksPage.selectStatus': 'Select status',
        'tasksPage.statuses.in progress': 'In Progress',
        'tasksPage.statuses.backlog': 'Backlog',
        'tasksPage.statuses.todo': 'Todo',
        'tasksPage.statuses.canceled': 'Canceled',
        'tasksPage.statuses.done': 'Done',
        'tasksPage.labels': 'Labels',
        'tasksPage.labelsList.documentation': 'Documentation',
        'tasksPage.labelsList.feature': 'Feature',
        'tasksPage.labelsList.bug': 'Bug',
        'tasksPage.priority': 'Priority',
        'tasksPage.priorities.high': 'High',
        'tasksPage.priorities.medium': 'Medium',
        'tasksPage.priorities.low': 'Low',
        'tasksPage.close': 'Close',
        'tasksPage.saveChanges': 'Save changes',
        'tasksPage.saving': 'Saving...',
        'tasksPage.validation.title': 'Title is required.',
        'tasksPage.validation.status': 'Please select a status.',
        'tasksPage.validation.label': 'Please select a label.',
        'tasksPage.validation.priority': 'Please choose a priority.',
        'tasksPage.saveError': 'Failed to save task.',
      } as Record<string, string>)[key] ?? key,
  }),
}))

const MOCK_TASK = {
  id: 'task-1',
  title: 'Existing task',
  status: 'in progress',
  label: 'feature',
  priority: 'medium',
} as const satisfies Task

describe('TasksMutateDrawer', () => {
  it('renders the create form', async () => {
    const screen = await render(
      <TasksMutateDrawer open onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByRole('heading', { name: 'Create Task' })).toBeInTheDocument()
    await expect.element(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('prefills the form when updating an existing task', async () => {
    const screen = await render(
      <TasksMutateDrawer open currentRow={MOCK_TASK} onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByRole('heading', { name: 'Update Task' })).toBeInTheDocument()
    await expect.element(screen.getByRole('textbox', { name: 'Title' })).toHaveValue(MOCK_TASK.title)
  })

  it('validates required fields before submitting', async () => {
    const screen = await render(
      <TasksMutateDrawer open onOpenChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await expect.element(screen.getByText('Title is required.')).toBeInTheDocument()
    expect(taskActions.create).not.toHaveBeenCalled()
  })

  it('closes when Close is clicked', async () => {
    const onOpenChange = vi.fn()
    const screen = await render(
      <TasksMutateDrawer open onOpenChange={onOpenChange} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
