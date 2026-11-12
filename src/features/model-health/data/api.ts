import { apiFetch } from '@/lib/api'

export type ModelHealthStatus = 'healthy' | 'unstable' | 'resting' | 'unused'

export type ModelHealth = {
  id: number
  name: string
  model_id: string
  provider: string
  provider_id: number
  is_system: boolean
  calls: number
  succeeded: number
  failed: number
  /** Failures with a 5xx status: the provider or model was overloaded or down. */
  busy: number
  /** Failures with 429: a rate limit or a used-up quota. */
  limited: number
  avg_latency_ms: number
  last_failure?: string
  last_failure_status?: number
  resting_until?: string
  status: ModelHealthStatus
}

/** The request quota a provider reported in the rate-limit headers of its last answer. */
export type ProviderQuota = { limit?: string; remaining?: string; reset?: string; seen_at: string }

export type ProviderHealth = {
  id: number
  name: string
  quota?: ProviderQuota
  /** OpenRouter's own account of the key: credit, usage and whether it is on the free tier. */
  openrouter?: {
    limit?: number | null
    limit_remaining?: number | null
    usage?: number
    usage_daily?: number
    is_free_tier?: boolean
  }
}

export type ModelHealthReport = { window_hours: number; models: ModelHealth[]; providers: ProviderHealth[] }

export async function getModelHealth(): Promise<ModelHealthReport> {
  const response = await apiFetch('/api/ai/models/health')
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${response.status}`)
  return { window_hours: data.window_hours ?? 24, models: data.models ?? [], providers: data.providers ?? [] }
}
