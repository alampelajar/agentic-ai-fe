import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { AgentSkill, Skill } from '@/features/skills/data/api'
import { AgentSkills } from './agent-skills'

const mocks = vi.hoisted(() => ({
  getSkills: vi.fn(),
  getAgentSkills: vi.fn(),
  assignSkillToAgent: vi.fn(),
  updateAgentSkill: vi.fn(),
  removeSkillFromAgent: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock('@/features/skills/data/api', () => ({
  getSkills: mocks.getSkills,
  getAgentSkills: mocks.getAgentSkills,
  assignSkillToAgent: mocks.assignSkillToAgent,
  updateAgentSkill: mocks.updateAgentSkill,
  removeSkillFromAgent: mocks.removeSkillFromAgent,
}))

const skill = (id: number, name: string): Skill => ({
  id,
  slug: name.toLowerCase(),
  name,
  description: '',
  author: '',
  source: 'created',
  status: 'installed',
  is_enabled: true,
  current_version: '1.0.0',
  validation_status: 'valid',
  tools: ['desktop.status'],
  requested_permissions: [],
})
const assignment = (record: Skill, enabled = true): AgentSkill => ({ id: record.id * 10, agent_id: 7, skill_id: record.id, is_enabled: enabled, skill: record })

describe('Agent skill assignment', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lists the assigned skills and offers only the ones not yet assigned', async () => {
    const reader = skill(1, 'Reader')
    const typer = skill(2, 'Typer')
    mocks.getAgentSkills.mockResolvedValueOnce([assignment(reader)])
    mocks.getSkills.mockResolvedValueOnce([reader, typer])
    const screen = await render(<AgentSkills agentId={7} />)

    await expect.element(screen.getByRole('button', { name: 'Lepas Reader' })).toBeInTheDocument()
    const select = screen.getByLabelText('Tambahkan skill').element() as HTMLSelectElement
    const options = [...select.options].map((option) => option.text)
    expect(options).toHaveLength(2)
    expect(options[0]).toBe('Pilih skill')
    expect(options[1]).toContain('Typer')
    expect(options.join(' ')).not.toContain('Reader')
    expect(mocks.getAgentSkills).toHaveBeenCalledWith(7)
  })

  it('shows an empty state when nothing is assigned', async () => {
    mocks.getAgentSkills.mockResolvedValueOnce([])
    mocks.getSkills.mockResolvedValueOnce([])
    const screen = await render(<AgentSkills agentId={7} />)
    await expect.element(screen.getByText('Belum ada skill yang dipasang pada agent ini.')).toBeInTheDocument()
  })

  it('says the load failed, instead of showing the empty state, and retries', async () => {
    const reader = skill(1, 'Reader')
    mocks.getAgentSkills.mockRejectedValueOnce(new Error('Agent tidak ditemukan.')).mockResolvedValueOnce([assignment(reader)])
    mocks.getSkills.mockResolvedValue([reader])
    const screen = await render(<AgentSkills agentId={7} />)

    await expect.element(screen.getByText('Assignment skill gagal dimuat')).toBeInTheDocument()
    await expect.element(screen.getByText('Agent tidak ditemukan.')).toBeInTheDocument()
    await expect.element(screen.getByText('Belum ada skill yang dipasang pada agent ini.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    await expect.element(screen.getByRole('button', { name: 'Lepas Reader' })).toBeInTheDocument()
  })

  it('assigns the selected skill to this agent only', async () => {
    const reader = skill(1, 'Reader')
    mocks.getAgentSkills.mockResolvedValueOnce([]).mockResolvedValueOnce([assignment(reader)])
    mocks.getSkills.mockResolvedValue([reader])
    mocks.assignSkillToAgent.mockResolvedValueOnce({})
    const screen = await render(<AgentSkills agentId={7} />)

    await userEvent.click(screen.getByRole('button', { name: /Pasang/ }))
    expect(mocks.assignSkillToAgent).toHaveBeenCalledExactlyOnceWith(7, 1)
    await expect.element(screen.getByRole('button', { name: 'Lepas Reader' })).toBeInTheDocument()
  })

  it('disables and removes an assignment', async () => {
    const reader = skill(1, 'Reader')
    mocks.getAgentSkills.mockResolvedValue([assignment(reader)])
    mocks.getSkills.mockResolvedValue([reader])
    mocks.updateAgentSkill.mockResolvedValue({})
    mocks.removeSkillFromAgent.mockResolvedValue({})
    const screen = await render(<AgentSkills agentId={7} />)

    await userEvent.click(screen.getByRole('button', { name: 'Disable' }))
    expect(mocks.updateAgentSkill).toHaveBeenCalledExactlyOnceWith(7, 1, false)
    await userEvent.click(screen.getByRole('button', { name: 'Lepas Reader' }))
    expect(mocks.removeSkillFromAgent).toHaveBeenCalledExactlyOnceWith(7, 1)
  })

  it('reports a failed assignment and keeps what is shown', async () => {
    const reader = skill(1, 'Reader')
    mocks.getAgentSkills.mockResolvedValue([])
    mocks.getSkills.mockResolvedValue([reader])
    mocks.assignSkillToAgent.mockRejectedValueOnce(new Error('Skill sudah terpasang atau assignment gagal.'))
    const screen = await render(<AgentSkills agentId={7} />)

    await userEvent.click(screen.getByRole('button', { name: /Pasang/ }))
    await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Skill sudah terpasang atau assignment gagal.'))
  })
})
