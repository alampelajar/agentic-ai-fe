import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import type { Combo, ComboList } from './data/api'
import { CombosPage } from './index'

const mocks = vi.hoisted(() => ({
  getCombos: vi.fn(),
  createCombo: vi.fn(),
  updateCombo: vi.fn(),
  deleteCombo: vi.fn(),
  getComboModelOptions: vi.fn(),
  getComboAgents: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock('./data/api', async (importActual) => ({
  ...(await importActual<typeof import('./data/api')>()),
  getCombos: mocks.getCombos,
  createCombo: mocks.createCombo,
  updateCombo: mocks.updateCombo,
  deleteCombo: mocks.deleteCombo,
  getComboModelOptions: mocks.getComboModelOptions,
  getComboAgents: mocks.getComboAgents,
}))

const combo = (overrides: Partial<Combo> = {}): Combo => ({
  id: 1,
  ai_model_id: 50,
  name: 'Coding dengan cadangan',
  slug: 'coding-dengan-cadangan',
  description: '',
  strategy: 'fallback',
  max_attempts: 2,
  is_active: true,
  members: [
    { ai_model_id: 11, name: 'Model A', model_id: 'a', provider: 'OpenRouter', is_system: true, position: 0, weight: 1, is_enabled: true, available: true },
    { ai_model_id: 12, name: 'Model B', model_id: 'b', provider: 'Mine', is_system: false, position: 1, weight: 1, is_enabled: true, available: true },
  ],
  agent_ids: [7],
  created_at: '2026-11-01T10:00:00Z',
  ...overrides,
})

const list = (overrides: Partial<ComboList> = {}): ComboList => ({ combos: [combo()], enabled: true, limits: { max_combos: 10, max_members: 3 }, ...overrides })

describe('Combos page', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    mocks.getComboModelOptions.mockResolvedValue([
      { id: 11, name: 'Model A', model_id: 'a', provider: 'OpenRouter', is_system: true },
      { id: 12, name: 'Model B', model_id: 'b', provider: 'Mine', is_system: false },
      { id: 13, name: 'Model C', model_id: 'c', provider: 'Mine', is_system: false },
      { id: 14, name: 'Model D', model_id: 'd', provider: 'Mine', is_system: false },
    ])
    mocks.getComboAgents.mockResolvedValue([
      { id: 7, name: 'Coding Agent' },
      { id: 8, name: 'Testing Agent' },
    ])
    await i18n.changeLanguage('en')
  })

  it('shows each combo with its strategy, its models in order and the agents that use it', async () => {
    mocks.getCombos.mockResolvedValue(list())
    const screen = await render(<CombosPage />)
    await expect.element(screen.getByText('Coding dengan cadangan')).toBeInTheDocument()
    const card = screen.getByTestId('combo-card')
    await expect.element(card.getByText('Fallback')).toBeInTheDocument()
    await expect.element(card.getByText('Model A')).toBeInTheDocument()
    await expect.element(card.getByText('Model B')).toBeInTheDocument()
    await expect.element(card.getByText('Used with: Coding Agent')).toBeInTheDocument()
  })

  it('says what a combo is when there are none', async () => {
    mocks.getCombos.mockResolvedValue(list({ combos: [] }))
    const screen = await render(<CombosPage />)
    await expect.element(screen.getByText('No combos yet')).toBeInTheDocument()
  })

  it('explains a missing model and keeps the combo out of reach while the feature is switched off', async () => {
    mocks.getCombos.mockResolvedValue(
      list({
        enabled: false,
        combos: [combo({ members: [{ ai_model_id: 11, name: 'Model A', model_id: 'a', provider: 'x', is_system: true, position: 0, weight: 1, is_enabled: true, available: false }] })],
      })
    )
    const screen = await render(<CombosPage />)
    await expect.element(screen.getByTestId('combo-disabled-notice')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'New combo' })).toBeDisabled()
    await expect.element(screen.getByText(/Not available now: Model A/)).toBeInTheDocument()
  })

  it('stops the new-combo button at the limit', async () => {
    mocks.getCombos.mockResolvedValue(list({ limits: { max_combos: 1, max_members: 3 } }))
    const screen = await render(<CombosPage />)
    await expect.element(screen.getByRole('button', { name: 'New combo' })).toBeDisabled()
    await expect.element(screen.getByText(/reached the limit of 1 combos/)).toBeInTheDocument()
  })

  it('shows the error and lets the person try again', async () => {
    mocks.getCombos.mockRejectedValueOnce(new Error('Gagal mengambil combo.')).mockResolvedValue(list())
    const screen = await render(<CombosPage />)
    await expect.element(screen.getByText('Gagal mengambil combo.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await expect.element(screen.getByText('Coding dengan cadangan')).toBeInTheDocument()
  })

  describe('the form', () => {
    const openForm = async () => {
      mocks.getCombos.mockResolvedValue(list({ combos: [] }))
      const screen = await render(<CombosPage />)
      await userEvent.click(screen.getByRole('button', { name: 'New combo' }))
      return screen
    }

    it('names what is missing before sending anything', async () => {
      const screen = await openForm()
      await userEvent.click(screen.getByRole('button', { name: 'Save combo' }))
      await expect.element(screen.getByRole('alert')).toHaveTextContent('Give the combo a name.')

      await userEvent.type(screen.getByLabelText('Name'), 'Coding')
      await userEvent.click(screen.getByRole('button', { name: 'Save combo' }))
      await expect.element(screen.getByRole('alert')).toHaveTextContent('Choose at least one model.')

      await userEvent.click(screen.getByRole('checkbox', { name: /Model A/ }))
      await userEvent.click(screen.getByRole('button', { name: 'Save combo' }))
      await expect.element(screen.getByRole('alert')).toHaveTextContent('Choose at least one agent.')
      expect(mocks.createCombo).not.toHaveBeenCalled()
    })

    it('sends the models in the order chosen, with the weights only for round-robin', async () => {
      mocks.createCombo.mockResolvedValue(combo())
      const screen = await openForm()
      await userEvent.type(screen.getByLabelText('Name'), 'Gilir')
      await userEvent.click(screen.getByRole('radio', { name: /Round-robin/ }))
      await userEvent.click(screen.getByRole('checkbox', { name: /Model B/ }))
      await userEvent.click(screen.getByRole('checkbox', { name: /Model A/ }))
      await userEvent.click(screen.getByRole('button', { name: 'Move Model A up' }))
      await userEvent.fill(screen.getByLabelText('Weight of Model A'), '3')
      await userEvent.click(screen.getByRole('checkbox', { name: 'Coding Agent' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save combo' }))

      expect(mocks.createCombo).toHaveBeenCalledWith({
        name: 'Gilir',
        description: '',
        strategy: 'round_robin',
        max_attempts: 2,
        members: [
          { ai_model_id: 11, weight: 3 },
          { ai_model_id: 12, weight: 1 },
        ],
        agent_ids: [7],
      })
    })

    it('needs two models for a pipeline and sends them in the order chosen', async () => {
      mocks.createCombo.mockResolvedValue(combo())
      const screen = await openForm()
      await userEvent.type(screen.getByLabelText('Name'), 'Berantai')
      await userEvent.click(screen.getByRole('radio', { name: /Pipeline/ }))
      await userEvent.click(screen.getByRole('checkbox', { name: /Model A/ }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Coding Agent' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save combo' }))
      await expect.element(screen.getByRole('alert')).toHaveTextContent('A pipeline needs at least two models')
      expect(mocks.createCombo).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole('checkbox', { name: /Model B/ }))
      const chosen = screen.getByLabelText('Chosen models, in order')
      await expect.element(chosen).toHaveTextContent('Writes a draft')
      await expect.element(chosen).toHaveTextContent('Answers')
      await userEvent.click(screen.getByRole('button', { name: 'Save combo' }))
      expect(mocks.createCombo).toHaveBeenCalledWith({
        name: 'Berantai',
        description: '',
        strategy: 'pipeline',
        max_attempts: 2,
        members: [
          { ai_model_id: 11, weight: 1 },
          { ai_model_id: 12, weight: 1 },
        ],
        agent_ids: [7],
      })
    })

    it('does not let more models than the limit be chosen', async () => {
      const screen = await openForm()
      for (const name of ['Model A', 'Model B', 'Model C']) await userEvent.click(screen.getByRole('checkbox', { name: new RegExp(name) }))
      await userEvent.click(screen.getByRole('checkbox', { name: /Model D/ }))
      await expect.element(screen.getByRole('alert')).toHaveTextContent('A combo can hold at most 3 models.')
      await expect.element(screen.getByRole('checkbox', { name: /Model D/ })).not.toBeChecked()
    })

    it('keeps the form open and shows the reason when the server refuses', async () => {
      mocks.createCombo.mockRejectedValue(new Error('Anda sudah memakai batas 10 combo.'))
      const screen = await openForm()
      await userEvent.type(screen.getByLabelText('Name'), 'Coding')
      await userEvent.click(screen.getByRole('checkbox', { name: /Model A/ }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Coding Agent' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save combo' }))
      await expect.element(screen.getByRole('alert')).toHaveTextContent('Anda sudah memakai batas 10 combo.')
      await expect.element(screen.getByLabelText('Name')).toBeInTheDocument()
    })
  })
})
