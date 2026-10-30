import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import type { GitStatus } from '../../shared/ipc-types'

export class GitInspector {
  static getStatus(projectPath: string): GitStatus {
    const gitDir = join(projectPath, '.git')
    if (!existsSync(gitDir)) {
      return {
        isGitRepo: false,
        branch: null,
        isClean: true,
        dirtyCount: 0,
        ahead: 0,
        behind: 0,
        lastCommitMessage: null,
        lastCommitAuthor: null,
        lastCommitDate: null
      }
    }

    try {
      const execOpts = {
        cwd: projectPath,
        timeout: 2500,
        encoding: 'utf-8' as const,
        stdio: ['pipe', 'pipe', 'pipe'] as any
      }

      // 1. Current Branch
      let branch = 'unknown'
      try {
        branch = execSync('git rev-parse --abbrev-ref HEAD', execOpts).trim()
      } catch {
        branch = 'detached'
      }

      // 2. Status Porcelain for dirty count
      let dirtyCount = 0
      try {
        const statusOutput = execSync('git status --porcelain', execOpts)
        const lines = statusOutput.split(/\r?\n/).filter((l) => l.trim().length > 0)
        dirtyCount = lines.length
      } catch {
        dirtyCount = 0
      }

      // 3. Ahead / Behind
      let ahead = 0
      let behind = 0
      try {
        const counts = execSync('git rev-list --left-right --count HEAD...@{upstream}', execOpts).trim()
        const [a, b] = counts.split(/\s+/).map((n) => parseInt(n, 10) || 0)
        ahead = a || 0
        behind = b || 0
      } catch {
        // No upstream tracked
      }

      // 4. Last Commit Info
      let lastCommitMessage: string | null = null
      let lastCommitAuthor: string | null = null
      let lastCommitDate: string | null = null

      try {
        const log = execSync('git log -1 --format="%s%x00%an%x00%cr"', execOpts).trim()
        if (log) {
          const parts = log.split('\x00')
          lastCommitMessage = parts[0] || null
          lastCommitAuthor = parts[1] || null
          lastCommitDate = parts[2] || null
        }
      } catch {
        // Empty repo or no commits yet
      }

      return {
        isGitRepo: true,
        branch,
        isClean: dirtyCount === 0,
        dirtyCount,
        ahead,
        behind,
        lastCommitMessage,
        lastCommitAuthor,
        lastCommitDate
      }
    } catch {
      return {
        isGitRepo: true,
        branch: null,
        isClean: true,
        dirtyCount: 0,
        ahead: 0,
        behind: 0,
        lastCommitMessage: null,
        lastCommitAuthor: null,
        lastCommitDate: null
      }
    }
  }
}
