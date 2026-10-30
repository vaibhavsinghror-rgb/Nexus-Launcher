import type {
  AIProviderConfig,
  AIModelInfo,
  AIConnectionTestResult
} from '../../shared/ipc-types'
import type { AIProviderAdapter, ChatMessage } from './types'

export class OllamaAdapter implements AIProviderAdapter {
  private normalizeUrl(baseUrl: string): string {
    return baseUrl.trim().replace(/\/+$/, '')
  }

  async testConnection(config: AIProviderConfig): Promise<AIConnectionTestResult> {
    const base = this.normalizeUrl(config.baseUrl || 'http://127.0.0.1:11434')
    const url = `${base}/api/tags`
    const startTime = performance.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const latencyMs = Math.round(performance.now() - startTime)

      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          models: [],
          message: `Ollama returned HTTP ${response.status}`,
          error: `HTTP ${response.status} ${response.statusText}`
        }
      }

      const json = await response.json()
      const rawModels = json.models || []
      const models: AIModelInfo[] = rawModels.map((m: any) => ({
        id: m.name || m.model,
        name: m.name || m.model,
        sizeBytes: m.size,
        modifiedAt: m.modified_at
      }))

      return {
        success: true,
        latencyMs,
        models,
        message: `Connected to Ollama (${models.length} model${models.length === 1 ? '' : 's'} available)`
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime)
      return {
        success: false,
        latencyMs,
        models: [],
        message: 'Could not connect to Ollama. Ensure Ollama is running (`ollama serve`).',
        error: err.message || String(err)
      }
    }
  }

  async listModels(config: AIProviderConfig): Promise<AIModelInfo[]> {
    const base = this.normalizeUrl(config.baseUrl || 'http://127.0.0.1:11434')
    const url = `${base}/api/tags`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) return []

      const json = await response.json()
      return (json.models || []).map((m: any) => ({
        id: m.name || m.model,
        name: m.name || m.model,
        sizeBytes: m.size,
        modifiedAt: m.modified_at
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
    const base = this.normalizeUrl(config.baseUrl || 'http://127.0.0.1:11434')
    const url = `${base}/api/chat`

    const body = {
      model: config.model || 'llama3:latest',
      messages,
      stream: false,
      options: {
        temperature: config.temperature ?? 0.2,
        num_ctx: config.contextTokenLimit ?? 8192
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Ollama request failed (${response.status}): ${errText}`)
    }

    const json = await response.json()
    return json?.message?.content || ''
  }
}
