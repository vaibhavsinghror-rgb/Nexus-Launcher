import type {
  AIProviderConfig,
  CrashDiagnosticRequest,
  CrashDiagnosticReport
} from '../../shared/ipc-types'
import { SettingsRepository } from '../database/connection'
import { ContextBuilder } from './ContextBuilder'
import { ProviderFactory } from './ProviderFactory'
import type { ChatMessage } from './types'

export class DiagnosticsEngine {
  private static activeController: AbortController | null = null

  static getConfig(): AIProviderConfig {
    return SettingsRepository.get<AIProviderConfig>('ai_config', {
      provider: 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      model: 'llama3:latest',
      temperature: 0.2,
      contextTokenLimit: 8192
    })
  }

  static saveConfig(config: AIProviderConfig): boolean {
    return SettingsRepository.set('ai_config', config)
  }

  static cancelCurrent(): boolean {
    if (this.activeController) {
      this.activeController.abort()
      this.activeController = null
      return true
    }
    return false
  }

  /**
   * Cleans and robustly parses a JSON string returned by local LLMs.
   */
  private static cleanJson(raw: string): any {
    let clean = raw.trim()

    // 1. Strip ```json ... ``` or ``` ... ```
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    }

    // 2. Locate first '{' and last '}'
    const firstBrace = clean.indexOf('{')
    const lastBrace = clean.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1)
    }

    return JSON.parse(clean)
  }

  /**
   * Executes AI crash diagnostics.
   */
  static async diagnose(
    request: CrashDiagnosticRequest,
    overrideConfig?: AIProviderConfig
  ): Promise<CrashDiagnosticReport> {
    const config = overrideConfig || this.getConfig()
    const adapter = ProviderFactory.getAdapter(config.provider)

    // Build bounded context & redaction
    const context = ContextBuilder.buildCrashContext(request)

    const messages: ChatMessage[] = [
      { role: 'system', content: context.systemPrompt },
      { role: 'user', content: context.userPrompt }
    ]

    this.activeController = new AbortController()
    const startTime = performance.now()

    try {
      const rawResponse = await adapter.generateChat(config, messages, this.activeController.signal)
      const latencyMs = Math.round(performance.now() - startTime)

      let parsed: any
      try {
        parsed = this.cleanJson(rawResponse)
      } catch (jsonErr) {
        // Fallback heuristic extraction if local model output loose text
        parsed = {
          observedEvidence: request.errorSummary || `Process exited with code ${request.exitCode}`,
          exitCode: request.exitCode,
          rootCauseCategory: 'Other',
          fileReference: context.parsedStackTraceFile,
          explanation: rawResponse.slice(0, 400),
          recommendedFix: 'Review console logs and project dependencies.',
          recommendedCommand: ''
        }
      }

      const report: CrashDiagnosticReport = {
        observedEvidence:
          parsed.observedEvidence ||
          request.errorSummary ||
          `Process exited with code ${request.exitCode}`,
        exitCode: request.exitCode,
        rootCauseCategory: parsed.rootCauseCategory || 'Other',
        fileReference: parsed.fileReference || context.parsedStackTraceFile,
        explanation: parsed.explanation || 'Diagnosis completed.',
        recommendedFix: parsed.recommendedFix || 'Inspect the error details above.',
        recommendedCommand: parsed.recommendedCommand || undefined,
        suggestedPatch: parsed.suggestedPatch || undefined,
        timestamp: Date.now(),
        modelUsed: config.model,
        latencyMs
      }

      return report
    } finally {
      this.activeController = null
    }
  }
}
