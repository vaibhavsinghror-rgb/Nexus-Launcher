import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { EnvVariable } from '../../shared/ipc-types'

const SECRET_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /password/i,
  /pass/i,
  /auth/i,
  /credential/i,
  /private/i,
  /cert/i,
  /api_key/i
]

export class EnvResolver {
  /**
   * Reads .env files safely without modifying them.
   */
  static getProjectEnv(projectPath: string): EnvVariable[] {
    const envFiles = ['.env', '.env.local', '.env.development', '.env.example']
    const result: Map<string, EnvVariable> = new Map()

    for (const fileName of envFiles) {
      const filePath = join(projectPath, fileName)
      if (!existsSync(filePath)) continue

      try {
        const content = readFileSync(filePath, 'utf-8')
        const lines = content.split(/\r?\n/)

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue

          const eqIndex = trimmed.indexOf('=')
          if (eqIndex === -1) continue

          const key = trimmed.substring(0, eqIndex).trim()
          let value = trimmed.substring(eqIndex + 1).trim()

          // Remove surrounding quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.substring(1, value.length - 1)
          }

          const isSecret = SECRET_PATTERNS.some((pattern) => pattern.test(key))

          if (!result.has(key)) {
            result.set(key, {
              key,
              value,
              isSecret,
              sourceFile: fileName
            })
          }
        }
      } catch (err) {
        console.error(`Failed to read env file: ${filePath}`, err)
      }
    }

    return Array.from(result.values())
  }

  /**
   * Safely updates or appends key-values into a target .env file.
   */
  static saveProjectEnv(projectPath: string, fileName: string, vars: Record<string, string>): boolean {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
    const targetFile = join(projectPath, safeFileName || '.env')

    try {
      let existingContent = ''
      if (existsSync(targetFile)) {
        existingContent = readFileSync(targetFile, 'utf-8')
      }

      const existingLines = existingContent.split(/\r?\n/)
      const updatedKeys = new Set<string>()
      const outputLines: string[] = []

      for (const line of existingLines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) {
          outputLines.push(line)
          continue
        }

        const eqIndex = line.indexOf('=')
        if (eqIndex === -1) {
          outputLines.push(line)
          continue
        }

        const key = line.substring(0, eqIndex).trim()
        if (vars[key] !== undefined) {
          outputLines.push(`${key}=${vars[key]}`)
          updatedKeys.add(key)
        } else {
          outputLines.push(line)
        }
      }

      // Append any new keys not previously in the file
      for (const [key, val] of Object.entries(vars)) {
        if (!updatedKeys.has(key)) {
          outputLines.push(`${key}=${val}`)
        }
      }

      writeFileSync(targetFile, outputLines.join('\n'), 'utf-8')
      return true
    } catch (err) {
      console.error('Failed to save env file:', targetFile, err)
      return false
    }
  }
}
