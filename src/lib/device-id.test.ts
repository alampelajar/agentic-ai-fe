import { afterEach, describe, expect, it } from 'vitest'
import { DEVICE_HEADER, deviceHeaders, deviceId } from './device-id'

describe('deviceId', () => {
  afterEach(() => window.localStorage.removeItem('device-id'))

  it('makes one random id and keeps it', () => {
    const first = deviceId()
    expect(first).toMatch(/^[A-Za-z0-9-]{16,80}$/)
    expect(deviceId()).toBe(first)
    expect(deviceHeaders()).toEqual({ [DEVICE_HEADER]: first })
  })

  it('replaces a damaged saved id', () => {
    window.localStorage.setItem('device-id', '<bad>')
    expect(deviceId()).not.toBe('<bad>')
  })
})
