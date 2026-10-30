import { describe, it, expect } from 'vitest'
import { ContextBuilder } from '../src/main/ai/ContextBuilder'

describe('Secret Redaction Engine Tests', () => {
  it('redacts OpenAI API keys', () => {
    const raw = 'Configured key is sk-proj-1234567890abcdefghijklmnopqrstuvwxyz1234 in runtime'
    const { cleanText, count } = ContextBuilder.redactSecrets(raw)

    expect(count).toBeGreaterThanOrEqual(1)
    expect(cleanText).not.toContain('sk-proj')
    expect(cleanText).toContain('[REDACTED_OPENAI_KEY]')
  })

  it('redacts GitHub Personal Access Tokens', () => {
    const raw = 'Git push failed using token ghp_1234567890abcdefghijklmnopqrstuvwxyz'
    const { cleanText, count } = ContextBuilder.redactSecrets(raw)

    expect(count).toBeGreaterThanOrEqual(1)
    expect(cleanText).not.toContain('ghp_')
    expect(cleanText).toContain('[REDACTED_GITHUB_TOKEN]')
  })

  it('redacts Bearer authorization tokens', () => {
    const raw = 'Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz'
    const { cleanText, count } = ContextBuilder.redactSecrets(raw)

    expect(count).toBeGreaterThanOrEqual(1)
    expect(cleanText).not.toContain('eyJhbGci')
    expect(cleanText).toContain('[REDACTED_BEARER_TOKEN]')
  })

  it('redacts AWS Access Keys', () => {
    const raw = 'S3 bucket connection using key AKIA1234567890EXAMPLE'
    const { cleanText, count } = ContextBuilder.redactSecrets(raw)

    expect(count).toBeGreaterThanOrEqual(1)
    expect(cleanText).not.toContain('AKIA1234567890EXAMPLE')
    expect(cleanText).toContain('[REDACTED_AWS_KEY]')
  })

  it('preserves ordinary non-sensitive log text', () => {
    const raw = 'INFO: Application server started on port 3000\nConnected to PostgreSQL database'
    const { cleanText, count } = ContextBuilder.redactSecrets(raw)

    expect(count).toBe(0)
    expect(cleanText).toBe(raw)
  })
})
