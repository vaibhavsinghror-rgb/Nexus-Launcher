import type {
  AIProviderConfig,
  AIModelInfo,
  AIConnectionTestResult
} from '../../shared/ipc-types'
import type { AIProviderAdapter, ChatMessage } from './types'

export class LMStudioAdapter implements AIProviderAdapter {
  private normalizeUrl(baseUrl: string): string {
    let clean = baseUrl.trim().replace(/\/+$/, '')
    // Ensure /v1 is present for OpenAI-compatible local servers if not already included
    if (!clean.endsWith('/v1')) {
      clean = `${clean}/v1`
    }
    return clean
  }

  private getHeaders(config: AIProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    } else {
      headers['Authorization'] = 'Bearer lm-studio'
    }
    return headers
  }

  async testConnection(config: AIProviderConfig): Promise<AIConnectionTestResult> {
    const base = this.normalizeUrl(config.baseUrl || 'http://127.0.0.1:1234/v1')
    const url = `${base}/models`
    const startTime = performance.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(config),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const latencyMs = Math.round(performance.now() - startTime)

      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          models: [],
          message: `Server returned HTTP ${response.status}`,
          error: `HTTP ${response.status} ${response.statusText}`
        }
      }

      const json = await response.json()
      const rawModels = json.data || json.models || []
      const models: AIModelInfo[] = rawModels.map((m: any) => ({
        id: m.id || m.name,
        name: m.id || m.name,
        sizeBytes: m.size,
        modifiedAt: m.created ? new Date(m.created * 1000).toISOString() : undefined
      }))

      return {
        success: true,
        latencyMs,
        models,
        message: `Connected to Local Server (${models.length} model${models.length === 1 ? '' : 's'} loaded)`
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime)
      return {
        success: false,
        latencyMs,
        models: [],
        message:
          'Could not connect to LM Studio or OpenAI-compatible local server. Ensure server is running.',
        error: err.message || String(err)
      }
    }
  }

  async listModels(config: AIProviderConfig): Promise<AIModelInfo[]> {
    const base = this.normalizeUrl(config.baseUrl || 'http://127.0.0.1:1234/v1')
    const url = `${base}/models`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(config),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) return []

      const json = await response.json()
      const rawModels = json.data || json.models || []
      return rawModels.map((m: any) => ({
        id: m.id || m.name,
        name: m.id || m.name,
        sizeBytes: m.size,
        modifiedAt: m.created ? new Date(m.created * 1000).toISOString() : undefined
      }))
    } catch {
      return []
    }
  }

  async generateChat(
    config: AIProviderConfig,
    messages: ChatMessage[],
    signal?: AbortSignal
  ): Promise<string> {
    const base = this.normalizeUrl(config.baseUrl || 'http://127.0.0.1:1234/v1')
    const url = `${base}/chat/completions`

    const body = {
      model: config.model || 'local-model',
      messages,
      temperature: config.temperature ?? 0.2,
      max_tokens: 2048,
      stream: false
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify(body),
      signal
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`LM Studio / OpenAI-compatible request failed (${response.status}): ${errText}`)
    }

    const json = await response.json()
    const choice = json?.choices?.[0]
    return choice?.message?.content || ''
  }
}
