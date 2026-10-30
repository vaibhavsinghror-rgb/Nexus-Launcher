import { describe, it, expect } from 'vitest'
import { PatchEngine } from '../src/main/ai/PatchEngine'
import { resolve } from 'path'

describe('Patch Boundary Validation Tests', () => {
  const projectRoot = resolve(process.cwd())

  it('approves files residing strictly inside the project root', () => {
    const validRelative = 'src/renderer/src/App.tsx'
    const validation = PatchEngine.validatePath(projectRoot, validRelative)

    expect(validation.isValid).toBe(true)
    expect(validation.fullPath).toBe(resolve(projectRoot, validRelative))
    expect(validation.relativePath).toBe('src/renderer/src/App.tsx')
  })

  it('rejects path traversal attempting to escape project root with ..', () => {
    const maliciousTraversal = '../../windows/system32/cmd.exe'
    const validation = PatchEngine.validatePath(projectRoot, maliciousTraversal)

    expect(validation.isValid).toBe(false)
    expect(validation.error).toContain('Path traversal violation')
  })

  it('rejects absolute paths pointing outside project root', () => {
    const maliciousAbsolute = 'C:\\Windows\\System32\\drivers\\etc\\hosts'
    const validation = PatchEngine.validatePath(projectRoot, maliciousAbsolute)

    expect(validation.isValid).toBe(false)
    expect(validation.error).toContain('Path traversal violation')
  })

  it('computes deterministic SHA-256 hashes to guard against stale edits', () => {
    const contentA = 'function hello() { return "world"; }\n'
    const contentB = 'function hello() { return "nexus"; }\n'

    const hashA1 = PatchEngine.computeHash(contentA)
    const hashA2 = PatchEngine.computeHash(contentA)
    const hashB = PatchEngine.computeHash(contentB)

    expect(hashA1).toBe(hashA2)
    expect(hashA1).not.toBe(hashB)
    expect(hashA1).toHaveLength(64)
  })

  it('generates unified diff with deletions and additions', () => {
    const original = 'const port = 3000;\nconsole.log(port);\n'
    const patched = 'const port = 8000;\nconsole.log(port);\n'

    const diff = PatchEngine.generateDiff('config.ts', original, patched)

    expect(diff).toContain('--- a/config.ts')
    expect(diff).toContain('+++ b/config.ts')
    expect(diff).toContain('-const port = 3000;')
    expect(diff).toContain('+const port = 8000;')
  })
})
