import { describe, expect, it } from 'vitest'
import { canAfford, type Plan } from '../data/api'
import { planBlocksNewSite } from './plan-usage'

const plan = (over: Partial<Plan> = {}): Plan => ({
  credits: 10,
  available: 10,
  create_cost: 2,
  revise_cost: 1,
  site_limit: 50,
  sites_used: 0,
  unlimited: false,
  ...over,
})

describe('credits', () => {
  it('lets a new account make a website', () => {
    expect(planBlocksNewSite(plan())).toBe(false)
  })

  it('stops a new website without enough credits left', () => {
    expect(planBlocksNewSite(plan({ credits: 1, available: 1 }))).toBe(true)
    // Credits held by work already started count as used.
    expect(planBlocksNewSite(plan({ credits: 3, available: 1 }))).toBe(true)
    expect(canAfford(plan({ available: 1 }), 1)).toBe(true)
  })

  it('never stops an unlimited account', () => {
    expect(
      planBlocksNewSite(plan({ credits: 0, available: 0, unlimited: true }))
    ).toBe(false)
  })

  it('keeps the safety limit on websites', () => {
    expect(planBlocksNewSite(plan({ sites_used: 50 }))).toBe(true)
  })
})
