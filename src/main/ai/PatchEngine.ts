import { createHash } from 'crypto'
import { existsSync, readFileSync, writeFileSync, realpathSync } from 'fs'
import { resolve, normalize, relative, isAbsolute, sep } from 'path'
import type {
  PreparePatchInput,
  PatchPreviewResult,
  ApplyPatchInput,
  ApplyPatchResult,
  RollbackPatchResult,
  PatchRecord
} from '../../shared/ipc-types'
import { ProjectRepository, PatchRecordRepository } from '../database/connection'

export class PatchEngine {
  /**
   * Computes SHA-256 hash of a file's content to guard against stale edits.
   */
  static computeHash(content: string): string {
    return createHash('sha256').update(content, 'utf-8').digest('hex')
  }

  /**
   * Validates that target path resolves strictly inside the project root,
   * rejecting any path traversal ('..') or symlink escape attempts.
   */
  static validatePath(
    projectPath: string,
    targetPath: string
  ): { isValid: boolean; fullPath?: string; relativePath?: string; error?: string } {
    try {
      const normalizedRoot = normalize(resolve(projectPath))

      let target = targetPath.trim()
      let resolvedTarget: string

      if (isAbsolute(target)) {
        resolvedTarget = normalize(resolve(target))
      } else {
        resolvedTarget = normalize(resolve(normalizedRoot, target))
      }

      // Check root boundary containment
      const rootPrefix = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`
      if (resolvedTarget !== normalizedRoot && !resolvedTarget.startsWith(rootPrefix)) {
        return {
          isValid: false,
          error: `Path traversal violation: Target "${targetPath}" is outside project directory.`
        }
      }

      // Symlink resolution check if file exists
      if (existsSync(resolvedTarget)) {
        const realTarget = realpathSync(resolvedTarget)
        if (realTarget !== normalizedRoot && !realTarget.startsWith(rootPrefix)) {
          return {
            isValid: false,
            error: `Symlink escape violation: Real path "${realTarget}" escapes project root.`
          }
        }
      }

      const rel = relative(normalizedRoot, resolvedTarget).replace(/\\/g, '/')
      return {
        isValid: true,
        fullPath: resolvedTarget,
        relativePath: rel
      }
    } catch (err: any) {
      return {
        isValid: false,
        error: `Invalid file path: ${err.message}`
      }
    }
  }

  /**
   * Generates a standard unified diff between original and patched contents.
   */
  static generateDiff(
    fileName: string,
    originalContent: string,
    patchedContent: string
  ): string {
    const origLines = originalContent.split(/\r?\n/)
    const patchLines = patchedContent.split(/\r?\n/)

    const header = `--- a/${fileName}\n+++ b/${fileName}\n`
    const diffChunks: string[] = []

    let i = 0
    let j = 0

    while (i < origLines.length || j < patchLines.length) {
      if (i < origLines.length && j < patchLines.length && origLines[i] === patchLines[j]) {
        diffChunks.push(` ${origLines[i]}`)
        i++
        j++
      } else {
        // Collect deletions
        let delLines: string[] = []
        while (
          i < origLines.length &&
          (j >= patchLines.length || !patchLines.slice(j, j + 5).includes(origLines[i]))
        ) {
          delLines.push(`-${origLines[i]}`)
          i++
        }

        // Collect additions
        let addLines: string[] = []
        while (
          j < patchLines.length &&
          (i >= origLines.length || !origLines.slice(i, i + 5).includes(patchLines[j]))
        ) {
          addLines.push(`+${patchLines[j]}`)
          j++
        }

        diffChunks.push(...delLines, ...addLines)

        if (i < origLines.length && j < patchLines.length && origLines[i] === patchLines[j]) {
          diffChunks.push(` ${origLines[i]}`)
          i++
          j++
        }
      }
    }

    return `${header}@@ -1,${origLines.length} +1,${patchLines.length} @@\n${diffChunks.join('\n')}`
  }

  /**
   * Prepares and validates a proposed patch plan.
   */
  static preparePatch(input: PreparePatchInput): PatchPreviewResult {
    const project = ProjectRepository.getById(input.projectId)
    if (!project) {
      return {
        valid: false,
        filePath: input.filePath,
        relativePath: input.filePath,
        originalContent: '',
        patchedContent: '',
        unifiedDiff: '',
        fileHashBefore: '',
        explanation: input.explanation,
        error: `Project with ID "${input.projectId}" not found.`
      }
    }

    const validation = this.validatePath(project.path, input.filePath)
    if (!validation.isValid || !validation.fullPath) {
      return {
        valid: false,
        filePath: input.filePath,
        relativePath: input.filePath,
        originalContent: '',
        patchedContent: '',
        unifiedDiff: '',
        fileHashBefore: '',
        explanation: input.explanation,
        error: validation.error || 'Invalid file path'
      }
    }

    let originalContent = ''
    if (existsSync(validation.fullPath)) {
      try {
        originalContent = readFileSync(validation.fullPath, 'utf-8')
      } catch (err: any) {
        return {
          valid: false,
          filePath: validation.fullPath,
          relativePath: validation.relativePath || input.filePath,
          originalContent: '',
          patchedContent: '',
          unifiedDiff: '',
          fileHashBefore: '',
          explanation: input.explanation,
          error: `Failed to read target file: ${err.message}`
        }
      }
    }

    const fileHashBefore = this.computeHash(originalContent)
    const patchedContent = input.proposedCode
    const unifiedDiff = this.generateDiff(
      validation.relativePath || input.filePath,
      originalContent,
      patchedContent
    )

    return {
      valid: true,
      filePath: validation.fullPath,
      relativePath: validation.relativePath || input.filePath,
      originalContent,
      patchedContent,
      unifiedDiff,
      fileHashBefore,
      explanation: input.explanation
    }
  }

  /**
   * Applies patch to disk only after verifying the file hash matches the read state,
   * while persisting an immutable backup in SQLite for 1-click rollback.
   */
  static applyPatch(input: ApplyPatchInput): ApplyPatchResult {
    const project = ProjectRepository.getById(input.projectId)
    if (!project) {
      return {
        success: false,
        filePath: input.filePath,
        message: 'Project not found.',
        error: `Project "${input.projectId}" does not exist in database.`
      }
    }

    const validation = this.validatePath(project.path, input.filePath)
    if (!validation.isValid || !validation.fullPath) {
      return {
        success: false,
        filePath: input.filePath,
        message: 'Path validation failed.',
        error: validation.error || 'Target path escapes project root.'
      }
    }

    let currentDiskContent = ''
    if (existsSync(validation.fullPath)) {
      try {
        currentDiskContent = readFileSync(validation.fullPath, 'utf-8')
      } catch (err: any) {
        return {
          success: false,
          filePath: validation.fullPath,
          message: 'Could not read current disk file.',
          error: err.message
        }
      }
    }

    // Guard against stale overwrites
    const currentHash = this.computeHash(currentDiskContent)
    if (currentHash !== input.expectedHash) {
      return {
        success: false,
        filePath: validation.fullPath,
        message: 'Stale edit detected: File has been modified on disk since AI read it.',
        error: `Expected hash ${input.expectedHash.substring(0, 8)}, but disk has ${currentHash.substring(0, 8)}.`
      }
    }

    const hashAfter = this.computeHash(input.patchedContent)

    // Store complete backup snapshot in SQLite
    const patchRecord = PatchRecordRepository.create({
      projectId: project.id,
      filePath: validation.fullPath,
      relativePath: validation.relativePath || input.filePath,
      originalContent: currentDiskContent,
      patchedContent: input.patchedContent,
      unifiedDiff: input.unifiedDiff,
      explanation: input.explanation,
      fileHashBefore: currentHash,
      fileHashAfter: hashAfter
    })

    // Write patched file to disk
    try {
      writeFileSync(validation.fullPath, input.patchedContent, 'utf-8')
    } catch (err: any) {
      return {
        success: false,
        filePath: validation.fullPath,
        message: 'Failed to write patch to disk.',
        error: err.message
      }
    }

    return {
      success: true,
      patchRecordId: patchRecord.id,
      filePath: validation.fullPath,
      message: 'Patch successfully applied with automatic SQLite backup snapshot.'
    }
  }

  /**
   * Restores a previously patched file to its exact pre-patch snapshot.
   */
  static rollbackPatch(patchRecordId: string): RollbackPatchResult {
    const record = PatchRecordRepository.getById(patchRecordId)
    if (!record) {
      return {
        success: false,
        filePath: '',
        message: 'Patch backup record not found in database.',
        error: `Record ID "${patchRecordId}" not found.`
      }
    }

    const project = ProjectRepository.getById(record.projectId)
    if (!project) {
      return {
        success: false,
        filePath: record.filePath,
        message: 'Associated project not found.',
        error: 'Project record deleted.'
      }
    }

    const validation = this.validatePath(project.path, record.filePath)
    if (!validation.isValid || !validation.fullPath) {
      return {
        success: false,
        filePath: record.filePath,
        message: 'Security validation failed for rollback path.',
        error: validation.error || 'Target path escapes project root.'
      }
    }

    try {
      writeFileSync(validation.fullPath, record.originalContent, 'utf-8')
      PatchRecordRepository.markRolledBack(patchRecordId)
      return {
        success: true,
        filePath: validation.fullPath,
        message: `Successfully rolled back ${record.relativePath} to pre-patch snapshot.`
      }
    } catch (err: any) {
      return {
        success: false,
        filePath: validation.fullPath,
        message: 'Failed to write original content during rollback.',
        error: err.message
      }
    }
  }

  static getHistory(projectId: string): PatchRecord[] {
    return PatchRecordRepository.getByProjectId(projectId)
  }
}
