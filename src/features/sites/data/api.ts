import { apiFetch } from '@/lib/api/client'

// Website Builder API (see WEBSITE-BUILDER.md). Every error carries a `code` the
// interface translates under siteBuilder.errors.<code>.

export type SiteStatus = 'draft' | 'building' | 'ready' | 'failed'
export type RunStatus =
  'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export type Site = {
  id: number
  name: string
  description: string
  /** Language of the website's text, taken from the description. */
  language: 'id' | 'en'
  /** Language the person reads the builder in. */
  ui_language: 'id' | 'en'
  kind: string
  status: SiteStatus
  design_direction: string
  design_variant: string
  has_version: boolean
  published: boolean
  slug: string | null
  live_url: string
  active_run_id?: number
  /** A stopped run left finished parts; starting the same work again continues from them. */
  can_continue?: boolean
  created_at: string
  updated_at: string
}

export type Question = {
  id: string
  text: string
  multiple: boolean
  options: string[]
  /** Answered in the person's own words, without choices. */ free?: boolean
}

export type Direction = {
  key: string
  /** The colour variant chosen for this site, '' for the look's own colours. */
  variant: string
  variant_name: string
  name: string
  description: string
  palette: Record<
    | 'background'
    | 'surface'
    | 'foreground'
    | 'muted'
    | 'primary'
    | 'primary_foreground'
    | 'accent'
    | 'border',
    string
  >
  serif: boolean
  radius: string
  /** Address of the look's example website, '' until it has been made. */
  sample_url: string
}

export type Contact = {
  phone: string
  whatsapp: string
  email: string
  address: string
  hours: string
}

export type BriefSummary = {
  name: string
  tagline: string
  summary: string
  pages: string[]
  contact: Contact
  language?: 'id' | 'en'
}

export type Fact = { label: string; value: string }

export type SiteImage = { src: string; alt: string; logo?: boolean }

export type SiteVersion = {
  id: number
  number: number
  summary: string
  created_at: string
}

export type AgentRun = {
  id: number
  site_id: number
  kind: 'create' | 'revise'
  request: string
  direction: string
  variant?: string
  status: RunStatus
  cancel_requested: boolean
  error_message: string
  summary: string
  model_calls: number
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export type RunStep = {
  id: number
  index: number
  kind: 'model' | 'build' | 'review' | 'info'
  summary: string
  detail: string
  status: 'running' | 'done' | 'failed'
  created_at: string
}

export type SiteDetail = Site & {
  /** The person's credits, to say what a change uses. */
  plan?: Plan
  questions?: Question[]
  brief?: BriefSummary
  direction?: Direction
  images: SiteImage[]
  versions: SiteVersion[]
  current_version: number
  published_version?: number
  published_at?: string
  last_run?: AgentRun
  suggested_slug: string
}

export const FINISHED_RUN: readonly RunStatus[] = [
  'completed',
  'failed',
  'cancelled',
]

export class SiteRequestError extends Error {
  readonly status: number
  readonly code: string
  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'SiteRequestError'
    this.status = status
    this.code = code
  }
}

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok)
    throw new SiteRequestError(
      data?.error || 'Request failed',
      response.status,
      data?.code || 'unknown'
    )
  return data as T
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

/** What the person may still use: websites, and the monthly AI allowance (0 = no limit). */
/**
 * What a person may still do: credits. A new website uses create_cost, a change
 * revise_cost, paid only when the work succeeds.
 */
export type Plan = {
  credits: number
  /** What is left once the work already started is paid for. */
  available: number
  create_cost: number
  revise_cost: number
  site_limit: number
  sites_used: number
  /** One of the owners' own accounts: uses no credits. */
  unlimited: boolean
}

/** One change of the balance: credits used for a website, or added by an admin. */
export type CreditEntry = {
  id: number
  amount: number
  balance: number
  reason: 'create' | 'revise' | 'admin'
  site_id: number | null
  site_name: string
  note: string
  created_at: string
}

export async function getCredits(): Promise<{
  plan: Plan
  history: CreditEntry[]
  welcome: number
}> {
  return parse(await apiFetch('/api/me/credits'))
}

/** Whether the person can pay for work that uses cost credits. */
export function canAfford(plan: Plan | null, cost: number): boolean {
  return !plan || plan.unlimited || plan.available >= cost
}

export async function getSitesAndPlan(): Promise<{
  sites: Site[]
  plan: Plan | null
}> {
  const data = await parse<{ sites: Site[]; plan?: Plan }>(
    await apiFetch('/api/sites')
  )
  return { sites: data.sites ?? [], plan: data.plan ?? null }
}

export async function getSites(): Promise<Site[]> {
  return (await getSitesAndPlan()).sites
}

/**
 * Starts a website from a description. remixOf is a gallery website whose look and
 * page list the new one copies.
 */
export async function createSite(
  description: string,
  language: string,
  remixOf?: number
): Promise<Site> {
  return (
    await parse<{ site: Site }>(
      await apiFetch('/api/sites', {
        method: 'POST',
        ...json({ description, language, remix_of: remixOf }),
      })
    )
  ).site
}

/** A published website an admin chose for the gallery every person sees. */
export type ShowcaseSite = {
  id: number
  name: string
  kind: string
  /** The look's name, in the language asked for. */
  look: string
  pages: string[] | null
  live_url: string
}

export async function getShowcase(
  language: 'id' | 'en'
): Promise<ShowcaseSite[]> {
  return (
    (
      await parse<{ sites: ShowcaseSite[] }>(
        await apiFetch(`/api/sites/showcase?lang=${language}`)
      )
    ).sites ?? []
  )
}

export async function getSite(id: number): Promise<SiteDetail> {
  return (await parse<{ site: SiteDetail }>(await apiFetch(`/api/sites/${id}`)))
    .site
}

export async function deleteSite(id: number): Promise<void> {
  await parse(await apiFetch(`/api/sites/${id}`, { method: 'DELETE' }))
}

export type QuestionsResult = {
  questions: Question[]
  kind: string
  suggested_name: string
  /** The website's language, detected from the description. */
  language: 'id' | 'en'
  /** What the description already says, shown back for correction. */
  understood: Fact[] | null
  known_contact: Contact
  look_wish: string
  directions: Direction[]
  all_directions: Direction[]
  /** The gallery website this one copies: its look is offered first. */
  remix?: { name: string; direction: string; variant: string } | null
}

export async function getQuestions(id: number): Promise<QuestionsResult> {
  return parse(await apiFetch(`/api/sites/${id}/questions`, { method: 'POST' }))
}

export type BriefInput = {
  name: string
  answers: Record<string, string[]>
  extra: string
  contact: Contact
  direction: string
  variant: string
  language: 'id' | 'en'
}

export async function makeBrief(
  id: number,
  input: BriefInput
): Promise<BriefSummary> {
  return (
    await parse<{ brief: BriefSummary }>(
      await apiFetch(`/api/sites/${id}/brief`, {
        method: 'POST',
        ...json(input),
      })
    )
  ).brief
}

export async function uploadImage(
  id: number,
  file: File,
  logo: boolean
): Promise<SiteImage[]> {
  const form = new FormData()
  form.append('file', file)
  form.append('logo', String(logo))
  return (
    await parse<{ images: SiteImage[] }>(
      await apiFetch(`/api/sites/${id}/images`, { method: 'POST', body: form })
    )
  ).images
}

export async function removeImage(
  id: number,
  src: string
): Promise<SiteImage[]> {
  return (
    await parse<{ images: SiteImage[] }>(
      await apiFetch(`/api/sites/${id}/images?src=${encodeURIComponent(src)}`, {
        method: 'DELETE',
      })
    )
  ).images
}

export async function startRun(
  id: number,
  input: {
    kind: 'create' | 'revise'
    request?: string
    direction?: string
    variant?: string
  }
): Promise<AgentRun> {
  return (
    await parse<{ run: AgentRun }>(
      await apiFetch(`/api/sites/${id}/runs`, {
        method: 'POST',
        ...json(input),
      })
    )
  ).run
}

async function getRun(
  id: number,
  runId: number
): Promise<{ run: AgentRun; steps: RunStep[] }> {
  return parse(await apiFetch(`/api/sites/${id}/runs/${runId}`))
}

export async function cancelRun(id: number, runId: number): Promise<void> {
  await parse(
    await apiFetch(`/api/sites/${id}/runs/${runId}/cancel`, { method: 'POST' })
  )
}

export async function restoreVersion(
  id: number,
  number: number
): Promise<void> {
  await parse(
    await apiFetch(`/api/sites/${id}/versions/${number}/restore`, {
      method: 'POST',
    })
  )
}

export async function getPreview(
  id: number
): Promise<{ url: string; expires_at: string }> {
  return parse(await apiFetch(`/api/sites/${id}/preview`))
}

export async function checkSlug(
  siteId: number,
  slug: string
): Promise<{ available: boolean; code: string; url: string }> {
  return parse(
    await apiFetch(
      `/api/sites/slug-available?site_id=${siteId}&slug=${encodeURIComponent(slug)}`
    )
  )
}

export async function publishSite(
  id: number,
  slug: string
): Promise<{ url: string }> {
  return parse(
    await apiFetch(`/api/sites/${id}/publish`, {
      method: 'POST',
      ...json({ slug }),
    })
  )
}

export async function unpublishSite(id: number): Promise<void> {
  await parse(await apiFetch(`/api/sites/${id}/unpublish`, { method: 'POST' }))
}

/**
 * Follows a run as it happens (server-sent events read with fetch, so the access token
 * goes in the header). Calls onState with every change until the run ends or the signal
 * aborts; falls back to polling when the stream breaks.
 */
export async function followRun(
  id: number,
  runId: number,
  onState: (state: { run: AgentRun; steps: RunStep[] }) => void,
  signal: AbortSignal
): Promise<void> {
  try {
    const response = await apiFetch(`/api/sites/${id}/runs/${runId}/events`, {
      headers: { Accept: 'text/event-stream' },
      signal,
    })
    if (!response.ok || !response.body) throw new Error('stream unavailable')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundary = buffer.indexOf('\n\n')
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const event = /^event: (.*)$/m.exec(block)?.[1]
        const data = /^data: (.*)$/m.exec(block)?.[1]
        if (event === 'state' && data) onState(JSON.parse(data))
        if (event === 'end') return
        boundary = buffer.indexOf('\n\n')
      }
    }
  } catch (error) {
    if (signal.aborted) return
    void error
  }
  // The stream broke before the run ended: poll instead.
  while (!signal.aborted) {
    try {
      const state = await getRun(id, runId)
      onState(state)
      if (FINISHED_RUN.includes(state.run.status)) return
    } catch {
      // keep trying until the page is left
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

/** One readable file of a version, marked against the version before it. */
export type VersionFile = {
  path: string
  size: number
  change?: 'added' | 'changed' | 'removed'
}

export async function getVersionFiles(
  id: number,
  number: number
): Promise<{ files: VersionFile[]; has_previous: boolean }> {
  const data = await parse<{ files: VersionFile[]; has_previous: boolean }>(
    await apiFetch(`/api/sites/${id}/versions/${number}/files`)
  )
  return { files: data.files ?? [], has_previous: data.has_previous }
}

export type VersionFileContent = {
  path: string
  /** False when the version removed the file; content is then empty. */
  exists: boolean
  content: string
  /** The same file in the version before, when it had it. */
  previous_content?: string
}

export async function getVersionFile(
  id: number,
  number: number,
  path: string
): Promise<VersionFileContent> {
  return parse(
    await apiFetch(
      `/api/sites/${id}/versions/${number}/file?path=${encodeURIComponent(path)}`
    )
  )
}

/** One thing a visitor sent through a form on the website (a booking, an RSVP...). */
export type SiteMessage = {
  id: number
  form: string
  fields: { name: string; value: string }[]
  at: string
  /** Sent to the preview, before the website was published. */
  test: boolean
}

export async function getSiteMessages(
  id: number
): Promise<{ messages: SiteMessage[]; test: boolean }> {
  return parse(await apiFetch(`/api/sites/${id}/messages`))
}
