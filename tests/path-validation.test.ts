import { describe, it, expect } from 'vitest'
import { ProjectScanner } from '../src/main/services/ProjectScanner'
import { resolve } from 'path'

describe('Path Validation Tests', () => {
  it('normalizes valid absolute paths', () => {
    const cwd = process.cwd()
    const result = ProjectScanner.normalizeWindowsPath(cwd)
    expect(result).toBe(resolve(cwd))
  })

  it('strips surrounding double and single quotes', () => {
    const cwd = process.cwd()
    const quotedDouble = `"${cwd}"`
    const quotedSingle = `'${cwd}'`

    expect(ProjectScanner.normalizeWindowsPath(quotedDouble)).toBe(resolve(cwd))
    expect(ProjectScanner.normalizeWindowsPath(quotedSingle)).toBe(resolve(cwd))
  })

  it('rejects invalid or non-existent directories', () => {
    expect(ProjectScanner.normalizeWindowsPath('Z:\\non_existent_folder_xyz_123')).toBeNull()
    expect(ProjectScanner.normalizeWindowsPath('')).toBeNull()
    expect(ProjectScanner.normalizeWindowsPath(null as any)).toBeNull()
  })

  it('rejects files that are not directories', () => {
    const filePath = resolve(process.cwd(), 'package.json')
    expect(ProjectScanner.normalizeWindowsPath(filePath)).toBeNull()
  })
})
