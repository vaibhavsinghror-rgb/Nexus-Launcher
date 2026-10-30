import { existsSync, readFileSync } from 'fs'
import { isAbsolute, join, resolve, normalize, basename } from 'path'
import type { CrashDiagnosticRequest } from '../../shared/ipc-types'
import { ProjectRepository, LaunchProfileRepository } from '../database/connection'
import { ProcessManager } from '../processes/ProcessManager'
import { EnvResolver } from '../services/EnvResolver'
import type { ChatMessage } from './types'

export interface BoundedContextResult {
  systemPrompt: string
  userPrompt: string
  redactedSecretsCount: number
  referencedFiles: string[]
  parsedStackTraceFile?: { file: string; line: number }
}

const MANIFEST_FILES = [
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'Pipfile',
  'tsconfig.json',
  'docker-compose.yml'
]

export class ContextBuilder {
  /**
   * Redacts known environment secrets and standard credential patterns.
   */
  static redactSecrets(text: string, projectPath?: string): { cleanText: string; count: number } {
    if (!text) return { cleanText: '', count: 0 }
    let clean = text
    let count = 0

    // 1. Redact project-specific .env variables
    if (projectPath && existsSync(projectPath)) {
      try {
        const envVars = EnvResolver.getProjectEnv(projectPath)
        for (const item of envVars) {
          const val = item.value?.trim()
          if (val && val.length >= 4) {
            // Escape regex special chars
            const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const rx = new RegExp(escaped, 'g')
            if (rx.test(clean)) {
              clean = clean.replace(rx, `[REDACTED_SECRET:${item.key}]`)
              count++
            }
          }
        }
      } catch {}
    }

    // 2. Generic API keys and tokens
    const genericPatterns: Array<{ name: string; rx: RegExp }> = [
      { name: 'OPENAI_KEY', rx: /\bsk-[a-zA-Z0-9_-]{20,}\b/g },
      { name: 'GITHUB_TOKEN', rx: /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{20,}\b/g },
      { name: 'BEARER_TOKEN', rx: /Bearer\s+([a-zA-Z0-9_\-\.]{15,})/g },
      { name: 'AWS_KEY', rx: /\bAKIA[0-9A-Z]{16,28}\b/g }
    ]

    for (const pat of genericPatterns) {
      if (pat.rx.test(clean)) {
        clean = clean.replace(pat.rx, `[REDACTED_${pat.name}]`)
        count++
      }
    }

    return { cleanText: clean, count }
  }

  /**
   * Parses stack traces to locate source files and line numbers.
   */
  static parseStackTrace(
    logs: string,
    projectPath: string
  ): { filePath: string; line: number; snippet?: string } | null {
    if (!logs) return null

    // Pattern 1: Python: File ".../app.py", line 42, in <module>
    const pyRegex = /File\s+["']([^"']+)["'],\s+line\s+(\d+)/g
    let match: RegExpExecArray | null
    let candidates: Array<{ filePath: string; line: number }> = []

    while ((match = pyRegex.exec(logs)) !== null) {
      const candidatePath = match[1]
      const lineNum = parseInt(match[2], 10)
      candidates.push({ filePath: candidatePath, line: lineNum })
    }

    // Pattern 2: Node / TypeScript: at funcName (path/to/file.ts:42:15) or at path/to/file.js:42:15
    const nodeRegex =
      /at\s+(?:.*?\(|)([a-zA-Z]:[\\/][^():\s]+|(?:\.{1,2}[\\/]|[a-zA-Z0-9_\-\.\/]+?\.[a-zA-Z]{1,4})):(\d+)(?::(\d+))?/g
    while ((match = nodeRegex.exec(logs)) !== null) {
      const candidatePath = match[1]
      const lineNum = parseInt(match[2], 10)
      candidates.push({ filePath: candidatePath, line: lineNum })
    }

    // Evaluate candidates in reverse (innermost / latest frame first)
    for (const cand of candidates.reverse()) {
      let resolved = cand.filePath
      if (!isAbsolute(resolved)) {
        resolved = resolve(projectPath, resolved)
      } else {
        resolved = normalize(resolved)
      }

      // Skip external site-packages or node_modules
      if (
        resolved.includes('node_modules') ||
        resolved.includes('site-packages') ||
        resolved.includes('lib\\python') ||
        resolved.includes('lib/python')
      ) {
        continue
      }

      if (existsSync(resolved)) {
        try {
          const content = readFileSync(resolved, 'utf-8')
          const lines = content.split(/\r?\n/)
          const lineIdx = cand.line - 1
          const start = Math.max(0, lineIdx - 15)
          const end = Math.min(lines.length, lineIdx + 16)
          const snippetLines = lines.slice(start, end).map((l, i) => {
            const currentLine = start + i + 1
            const prefix = currentLine === cand.line ? ' -> ' : '    '
            return `${prefix}${currentLine.toString().padStart(4, ' ')} | ${l}`
          })

          return {
            filePath: resolved,
            line: cand.line,
            snippet: snippetLines.join('\n')
          }
        } catch {}
      }
    }

    return null
  }

  /**
   * Constructs token-bounded crash diagnostics context.
   */
  static buildCrashContext(request: CrashDiagnosticRequest): BoundedContextResult {
    const project = ProjectRepository.getById(request.projectId)
    if (!project) {
      throw new Error(`Project with ID "${request.projectId}" was not found.`)
    }

    // 1. Gather recent logs (last 150 lines)
    let rawLogs = request.recentLogs || ''
    if (!rawLogs && request.processId) {
      const logEntries = ProcessManager.getInstance().getLogs(request.processId)
      rawLogs = logEntries.map((l) => l.message).join('')
    }
    const logLines = rawLogs.split(/\r?\n/)
    const trimmedLogs = logLines.slice(-150).join('\n')

    // 2. Parse Stack Trace for source file reference & snippet
    const stackInfo = this.parseStackTrace(trimmedLogs, project.path)

    // 3. Collect Manifest Files
    const manifestSnippets: string[] = []
    const referencedFiles: string[] = []

    for (const manifestName of MANIFEST_FILES) {
      const fullPath = join(project.path, manifestName)
      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, 'utf-8')
          const manifestLines = content.split(/\r?\n/).slice(0, 80).join('\n')
          manifestSnippets.push(`--- ${manifestName} ---\n${manifestLines}`)
          referencedFiles.push(manifestName)
        } catch {}
      }
    }

    // 4. Redact Secrets
    const { cleanText: redactedLogs, count: redactedCount } = this.redactSecrets(
      trimmedLogs,
      project.path
    )

    // 5. System Prompt (Authoritative JSON contract)
    const systemPrompt = `You are the Nexus Launcher AI Diagnostic Engine, an expert developer assistant specialized in offline, local-first root-cause debugging.
Analyze the provided process failure context and output a strictly valid JSON object matching this TypeScript interface:

{
  "observedEvidence": string,       // Brief summary of the exact failure message, exit code, or error string
  "exitCode": number,               // The process exit code (e.g. 1)
  "rootCauseCategory": "Missing Dependency" | "Port Conflict" | "Venv Mismatch" | "Syntax/Import Error" | "Missing Env Var" | "Runtime Error" | "Other",
  "fileReference": {                // The exact file and line causing the failure, or null if system/environment
    "file": string,
    "line": number
  } | null,
  "explanation": string,            // Clear 2-4 sentence explanation of why this error happened
  "recommendedFix": string,         // Step-by-step resolution advice
  "recommendedCommand": string      // Single, copy-pasteable terminal command to fix it (e.g. 'pip install ...' or 'npm install ...' or 'taskkill ...')
}

Return ONLY the raw JSON object. Do not include markdown code block syntax (no \`\`\`json), and do not include any preamble or outro prose.`

    // 6. User Prompt
    let userPrompt = `### PROJECT METADATA
- Project Name: ${project.name}
- Project Path: ${project.path}
- Project Type: ${project.project_type}
- Primary Language: ${project.primary_language}
- Framework: ${project.framework || 'Unknown'}
- Python Virtual Env: ${project.python_venv_path || 'None (Using System Python)'}
- Exit Code: ${request.exitCode}
${request.errorSummary ? `- Error Summary: ${request.errorSummary}\n` : ''}
${request.customNotes ? `- User Notes: ${request.customNotes}\n` : ''}

### RECENT CONSOLE OUTPUT (LAST 150 LINES)
${redactedLogs || 'No console logs captured.'}
`

    if (stackInfo && stackInfo.snippet) {
      referencedFiles.push(basename(stackInfo.filePath))
      userPrompt += `\n### REFERENCED SOURCE FILE SNIPPET: ${stackInfo.filePath} (Around Line ${stackInfo.line})\n${stackInfo.snippet}\n`
    }

    if (manifestSnippets.length > 0) {
      userPrompt += `\n### PROJECT MANIFESTS\n${manifestSnippets.join('\n\n')}\n`
    }

    return {
      systemPrompt,
      userPrompt,
      redactedSecretsCount: redactedCount,
      referencedFiles,
      parsedStackTraceFile: stackInfo
        ? { file: stackInfo.filePath, line: stackInfo.line }
        : undefined
    }
  }
}
