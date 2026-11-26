import en from '@/i18n/locales/en.json'
import id from '@/i18n/locales/id.json'
import routeTree from '@/routeTree.gen.ts?raw'
import desktopRoute from '@/routes/_authenticated/settings/desktop.tsx?raw'
import { describe, expect, it } from 'vitest'
import { sidebarData } from './sidebar-data'

type Item = { title: string; url?: string; items?: Item[] }
const flatten = (items: Item[]): Item[] =>
  items.flatMap((item) => [item, ...(item.items ? flatten(item.items) : [])])
const entries = flatten(
  (sidebarData.navGroups as { items: Item[] }[]).flatMap((group) => group.items)
)

// Every path the generated route tree knows about, with /_authenticated stripped.
const knownPaths = new Set(
  [...routeTree.matchAll(/'(\/[^']*)':\s*typeof /g)].map((match) => match[1])
)

describe('main navigation', () => {
  it('has no Local Runner entry, under any name, in the sidebar', () => {
    for (const entry of entries) {
      expect(`${entry.title} ${entry.url ?? ''}`).not.toMatch(
        /runner|desktopAccess|settings\/desktop/i
      )
    }
    const labels = entries.map(
      (entry) =>
        `${en[entry.title as keyof typeof en] ?? entry.title} ${id[entry.title as keyof typeof id] ?? entry.title}`
    )
    for (const label of labels)
      expect(label).not.toMatch(/local ?(agent )?runner/i)
  })

  // Integrations (GitHub, the Desktop Runtime) are for programmers: the menu
  // leaves them out, and their page stays reachable only by its address.
  it('does not show Integrations to people who only make websites', () => {
    const settings = entries.find((entry) => entry.title === 'settings')
    const integrations = settings?.items?.find(
      (entry) => entry.title === 'integrationsMenu'
    )
    expect(integrations).toBeUndefined()
    expect(knownPaths.has('/settings/integrations')).toBe(true)
  })

  it('keeps the website builder, the overview and the settings pages', () => {
    const urls = entries.map((entry) => entry.url)
    for (const url of [
      '/overview',
      '/sites',
      '/settings/account',
      '/settings/appearance',
      '/settings/notifications',
      '/settings/display',
      '/profile',
      '/feedback',
    ]) {
      expect(urls, url).toContain(url)
    }
  })

  it('has none of the features moved to the admin app or the background (WEBSITE-BUILDER.md, section 20)', () => {
    const urls = entries.map((entry) => entry.url)
    for (const url of [
      '/ai',
      '/users',
      '/apps',
      '/skills',
      '/memory',
      '/combos',
      '/model-health',
      '/workspaces',
      '/design-studio',
    ]) {
      expect(urls, url).not.toContain(url)
    }
  })

  it('has no Task menu: conversations are listed as chat history instead', () => {
    expect(
      entries.some((entry) => entry.url === '/tasks' || entry.title === 'tasks')
    ).toBe(false)
  })

  it('has no duplicate links', () => {
    const urls = entries.map((entry) => entry.url).filter(Boolean)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('links only to routes that exist', () => {
    for (const entry of entries) {
      if (entry.url)
        expect(knownPaths.has(entry.url), `${entry.url} is not a route`).toBe(
          true
        )
    }
  })

  it('has text in both languages for the menus of the cloud-first experience', () => {
    for (const title of [
      'sitesMenu',
      'aiOverview',
      'settings',
    ]) {
      expect(
        entries.some((entry) => entry.title === title),
        title
      ).toBe(true)
      expect(en[title as keyof typeof en], `${title} (en)`).toBeTruthy()
      expect(id[title as keyof typeof id], `${title} (id)`).toBeTruthy()
    }
  })
})

describe('the old Desktop Access address', () => {
  it('still exists, and sends the user on to Integrations instead of breaking', () => {
    expect(knownPaths.has('/settings/desktop')).toBe(true)
    expect(desktopRoute).toContain("redirect({ to: '/settings/integrations'")
    expect(knownPaths.has('/settings/integrations')).toBe(true)
  })
})
