import type {
  AIProviderConfig,
  AIModelInfo,
  AIConnectionTestResult
} from '../../shared/ipc-types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIProviderAdapter {
  testConnection(config: AIProviderConfig): Promise<AIConnectionTestResult>
  listModels(config: AIProviderConfig): Promise<AIModelInfo[]>
  generateChat(
    config: AIProviderConfig,
    messages: ChatMessage[],
    signal?: AbortSignal
  ): Promise<string>
}
