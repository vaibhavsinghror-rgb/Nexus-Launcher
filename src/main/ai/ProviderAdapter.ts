import type { AIProviderConfig } from '../../shared/ipc-types'

export class ProviderAdapter {
  static async checkHealth(config: AIProviderConfig): Promise<{ online: boolean; message: string }> {
    try {
      let targetUrl = config.baseUrl.trim().replace(/\/+$/, '')
      if (config.provider === 'ollama') {
        targetUrl = `${targetUrl}/api/tags`
      } else {
        // LM Studio or OpenAI compatible
        targetUrl = `${targetUrl}/models`
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        return { online: true, message: `Connected to ${config.provider} successfully.` }
      }
      return {
        online: false,
        message: `Provider returned HTTP ${response.status} (${response.statusText})`
      }
    } catch (err: any) {
      return {
        online: false,
        message: err.name === 'AbortError' ? 'Connection timed out' : `Connection failed: ${err.message}`
      }
    }
  }

  static async getModels(config: AIProviderConfig): Promise<string[]> {
    try {
      const baseUrl = config.baseUrl.trim().replace(/\/+$/, '')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`

      if (config.provider === 'ollama') {
        const res = await fetch(`${baseUrl}/api/tags`, { headers })
        if (!res.ok) return []
        const data = (await res.json()) as any
        return (data.models || []).map((m: any) => m.name)
      } else {
        const res = await fetch(`${baseUrl}/models`, { headers })
        if (!res.ok) return []
        const data = (await res.json()) as any
        return (data.data || []).map((m: any) => m.id)
      }
    } catch {
      return []
    }
  }

  static async chatComplete(
    config: AIProviderConfig,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const baseUrl = config.baseUrl.trim().replace(/\/+$/, '')

    if (config.provider === 'ollama') {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          options: { temperature: config.temperature ?? 0.2 }
        })
      })

      if (!res.ok) {
        throw new Error(`Ollama chat error: ${res.statusText}`)
      }
      const data = (await res.json()) as any
      return data.message?.content || ''
    } else {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`

      const endpoint = baseUrl.endsWith('/v1')
        ? `${baseUrl}/chat/completions`
        : `${baseUrl}/v1/chat/completions`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: config.temperature ?? 0.2
        })
      })

      if (!res.ok) {
        throw new Error(`OpenAI/LM Studio chat error: ${res.statusText}`)
      }
      const data = (await res.json()) as any
      return data.choices?.[0]?.message?.content || ''
    }
  }
}
