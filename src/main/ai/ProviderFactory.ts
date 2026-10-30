import type { AIProviderType } from '../../shared/ipc-types'
import type { AIProviderAdapter } from './types'
import { OllamaAdapter } from './OllamaAdapter'
import { LMStudioAdapter } from './LMStudioAdapter'

export class ProviderFactory {
  private static ollama = new OllamaAdapter()
  private static lmstudio = new LMStudioAdapter()

  static getAdapter(provider: AIProviderType): AIProviderAdapter {
    switch (provider) {
      case 'ollama':
        return this.ollama
      case 'lmstudio':
      case 'openai-compatible':
      default:
        return this.lmstudio
    }
  }
}
