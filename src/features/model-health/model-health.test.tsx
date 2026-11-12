import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import type { ModelHealthReport } from './data/api'
import { ModelHealthPage } from './index'

const mocks = vi.hoisted(() => ({ getModelHealth: vi.fn() }))
vi.mock('./data/api', () => ({ getModelHealth: mocks.getModelHealth }))

const report: ModelHealthReport = {
  window_hours: 24,
  models: [
    { id: 1, name: 'GPT-OSS-120b', model_id: 'openai/gpt-oss-120b', provider: 'Groq', provider_id: 10, is_system: true, calls: 20, succeeded: 19, failed: 1, busy: 0, limited: 1, avg_latency_ms: 1800, last_failure: '2026-11-12T08:00:00Z', last_failure_status: 429, status: 'healthy' },
    { id: 2, name: 'gemini-3.8-flash', model_id: 'gemini-3.8-flash', provider: 'Gemini', provider_id: 11, is_system: true, calls: 6, succeeded: 2, failed: 4, busy: 4, limited: 0, avg_latency_ms: 0, status: 'unstable' },
    { id: 3, name: 'Agnes', model_id: 'agnes-2.5-flash', provider: 'NaraRouter', provider_id: 12, is_system: true, calls: 0, succeeded: 0, failed: 0, busy: 0, limited: 0, avg_latency_ms: 0, status: 'unused' },
  ],
  providers: [
    { id: 10, name: 'Groq', quota: { limit: '1000', remaining: '987', reset: '1m26s', seen_at: '2026-11-12T08:00:00Z' } },
    { id: 11, name: 'OpenRouter', openrouter: { is_free_tier: true, usage_daily: 0 } },
    { id: 12, name: 'NaraRouter' },
  ],
}

describe('Model health page', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await i18n.changeLanguage('en')
  })

  it('shows each model with its status in words, its counts and speed', async () => {
    mocks.getModelHealth.mockResolvedValue(report)
    const screen = await render(<ModelHealthPage />)
    const groq = screen.getByTestId('model-health-1')
    await expect.element(groq).toHaveTextContent('Healthy')
    await expect.element(groq).toHaveTextContent('95%')
    await expect.element(groq).toHaveTextContent('1.8 s')
    await expect.element(groq).toHaveTextContent('HTTP 429')
    await expect.element(screen.getByTestId('model-health-2')).toHaveTextContent('Unstable')
    await expect.element(screen.getByTestId('model-health-3')).toHaveTextContent('Not used')
  })

  it('shows the quota each provider reported, and says when none is known yet', async () => {
    mocks.getModelHealth.mockResolvedValue(report)
    const screen = await render(<ModelHealthPage />)
    await expect.element(screen.getByTestId('provider-quota-10')).toHaveTextContent('987 / 1000 requests left')
    await expect.element(screen.getByTestId('provider-quota-10')).toHaveTextContent('Resets in 1m26s')
    await expect.element(screen.getByTestId('provider-quota-11')).toHaveTextContent('Free tier')
    await expect.element(screen.getByTestId('provider-quota-12')).toHaveTextContent('No quota known yet')
  })

  it('says when it cannot load, and tries again', async () => {
    mocks.getModelHealth.mockRejectedValueOnce(new Error('HTTP 500')).mockResolvedValueOnce(report)
    const screen = await render(<ModelHealthPage />)
    await expect.element(screen.getByRole('alert')).toHaveTextContent('HTTP 500')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await expect.element(screen.getByTestId('model-health-1')).toBeInTheDocument()
    expect(mocks.getModelHealth).toHaveBeenCalledTimes(2)
  })

  it('shows an empty state when there are no models', async () => {
    mocks.getModelHealth.mockResolvedValue({ window_hours: 24, models: [], providers: [] })
    const screen = await render(<ModelHealthPage />)
    await expect.element(screen.getByText('No models yet')).toBeInTheDocument()
  })
})
