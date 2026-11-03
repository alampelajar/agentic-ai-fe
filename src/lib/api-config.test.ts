import { describe, expect, it } from 'vitest'
import { API_BASE_URL, DEFAULT_API_BASE_URL, resolveApiBaseUrl } from './api-config'

describe('resolveApiBaseUrl', () => {
  it('falls back to the backend default port when nothing is configured', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:8081')
    expect(resolveApiBaseUrl('')).toBe(DEFAULT_API_BASE_URL)
    expect(resolveApiBaseUrl('   ')).toBe(DEFAULT_API_BASE_URL)
  })

  it('uses VITE_API_BASE_URL, so a local .env can point at another backend port', () => {
    expect(resolveApiBaseUrl('http://localhost:8080')).toBe('http://localhost:8080')
  })

  it('ignores surrounding spaces and trailing slashes', () => {
    expect(resolveApiBaseUrl('  https://api.example.test//  ')).toBe('https://api.example.test')
  })
})

describe('API_BASE_URL', () => {
  it('has no trailing slash, so request paths can be appended directly', () => {
    expect(API_BASE_URL).not.toMatch(/\/$/)
  })
})
