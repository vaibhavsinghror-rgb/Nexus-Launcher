import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative, extname, basename } from 'path'
import type { FileTreeNode, ProjectConfigFile } from '../../shared/ipc-types'

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.venv',
  'venv',
  'env',
  '__pycache__',
  'dist',
  'out',
  '.next',
  '.vite',
  'target',
  'build',
  '.cache'
])

export class ConfigInspector {
  /**
   * Scans project root for important schema, docker, config, and documentation files.
   */
  static getProjectConfigFiles(projectPath: string): ProjectConfigFile[] {
    const results: ProjectConfigFile[] = []
    if (!existsSync(projectPath)) return results

    const candidateFiles: Array<{
      relPath: string
      category: ProjectConfigFile['category']
      language: string
    }> = [
      // Schema / DB
      { relPath: 'schema.prisma', category: 'schema', language: 'prisma' },
      { relPath: join('prisma', 'schema.prisma'), category: 'schema', language: 'prisma' },
      { relPath: 'schema.sql', category: 'schema', language: 'sql' },
      // Docker
      { relPath: 'docker-compose.yml', category: 'docker', language: 'yaml' },
      { relPath: 'docker-compose.yaml', category: 'docker', language: 'yaml' },
      { relPath: 'Dockerfile', category: 'docker', language: 'dockerfile' },
      // Configs
      { relPath: 'package.json', category: 'config', language: 'json' },
      { relPath: 'pyproject.toml', category: 'config', language: 'toml' },
      { relPath: 'requirements.txt', category: 'config', language: 'plaintext' },
      { relPath: 'tsconfig.json', category: 'config', language: 'json' },
      { relPath: 'vite.config.ts', category: 'config', language: 'typescript' },
      { relPath: 'next.config.js', category: 'config', language: 'javascript' },
      { relPath: 'next.config.mjs', category: 'config', language: 'javascript' },
      // Env
      { relPath: '.env', category: 'env', language: 'plaintext' },
      { relPath: '.env.example', category: 'env', language: 'plaintext' },
      // Docs
      { relPath: 'README.md', category: 'docs', language: 'markdown' },
      { relPath: 'SPEC.md', category: 'docs', language: 'markdown' },
      { relPath: 'ARCHITECTURE.md', category: 'docs', language: 'markdown' }
    ]

    for (const cand of candidateFiles) {
      const full = join(projectPath, cand.relPath)
      if (existsSync(full)) {
        try {
          const stats = statSync(full)
          if (stats.isFile()) {
            results.push({
              name: cand.relPath.replace(/\\/g, '/'),
              path: full,
              category: cand.category,
              language: cand.language,
              sizeBytes: stats.size
            })
          }
        } catch {
          // ignore
        }
      }
    }

    // Also look for any *.sql files in project root
    try {
      const rootFiles = readdirSync(projectPath)
      for (const f of rootFiles) {
        if (f.endsWith('.sql') && !results.some((r) => r.name === f)) {
          const full = join(projectPath, f)
          results.push({
            name: f,
            path: full,
            category: 'schema',
            language: 'sql',
            sizeBytes: statSync(full).size
          })
        }
      }
    } catch {
      // ignore
    }

    return results
  }

  /**
   * Safely reads file text content with a 500KB cap.
   */
  static readFileContent(filePath: string): string {
    if (!existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`)
    }
    const stats = statSync(filePath)
    if (stats.size > 500 * 1024) {
      return `/* File is too large to preview inline (${(stats.size / 1024).toFixed(1)} KB) */`
    }
    return readFileSync(filePath, 'utf-8')
  }

  /**
   * Builds a fast, bounded directory tree excluding heavy folders.
   */
  static getDirectoryTree(
    dirPath: string,
    currentDepth = 0,
    maxDepth = 4,
    nodeCounter = { count: 0 }
  ): FileTreeNode | null {
    if (!existsSync(dirPath) || currentDepth > maxDepth || nodeCounter.count > 400) {
      return null
    }

    try {
      const stats = statSync(dirPath)
      const isDirectory = stats.isDirectory()
      const name = basename(dirPath)
      const ext = isDirectory ? undefined : extname(dirPath).toLowerCase()

      nodeCounter.count++

      if (!isDirectory) {
        return {
          name,
          path: dirPath,
          relativePath: name,
          isDirectory: false,
          size: stats.size,
          extension: ext
        }
      }

      const children: FileTreeNode[] = []
      const entries = readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.env') continue
        if (EXCLUDED_DIRS.has(entry.name)) continue

        const childPath = join(dirPath, entry.name)
        const childNode = this.getDirectoryTree(childPath, currentDepth + 1, maxDepth, nodeCounter)
        if (childNode) {
          children.push(childNode)
        }
      }

      // Sort: folders first, then files
      children.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })

      return {
        name,
        path: dirPath,
        relativePath: name,
        isDirectory: true,
        children
      }
    } catch {
      return null
    }
  }
}
