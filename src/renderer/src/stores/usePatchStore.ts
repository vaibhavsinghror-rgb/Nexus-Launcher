import { create } from 'zustand'
import type {
  PatchPreviewResult,
  PatchRecord,
  PreparePatchInput,
  ApplyPatchResult,
  RollbackPatchResult
} from '../../../shared/ipc-types'

interface PatchStore {
  activePreview: PatchPreviewResult | null
  currentProjectId: string | null
  isReviewOpen: boolean
  isPreparing: boolean
  isApplying: boolean
  isRollingBack: boolean
  applyResult: ApplyPatchResult | null
  rollbackResult: RollbackPatchResult | null
  patchHistory: PatchRecord[]

  // Actions
  preparePatch: (plan: PreparePatchInput) => Promise<PatchPreviewResult>
  applyPatch: () => Promise<ApplyPatchResult | null>
  rollbackPatch: (patchRecordId: string) => Promise<RollbackPatchResult>
  loadHistory: (projectId: string) => Promise<void>
  openReview: (preview: PatchPreviewResult, projectId: string) => void
  closeReview: () => void
}

export const usePatchStore = create<PatchStore>((set, get) => ({
  activePreview: null,
  currentProjectId: null,
  isReviewOpen: false,
  isPreparing: false,
  isApplying: false,
  isRollingBack: false,
  applyResult: null,
  rollbackResult: null,
  patchHistory: [],

  preparePatch: async (plan) => {
    set({ isPreparing: true, currentProjectId: plan.projectId })
    try {
      const res = await window.nexus.patches.prepare(plan)
      set({ activePreview: res, isReviewOpen: true })
      return res
    } finally {
      set({ isPreparing: false })
    }
  },

  applyPatch: async () => {
    const preview = get().activePreview
    const projectId = get().currentProjectId
    if (!preview || !projectId || !preview.valid) return null

    set({ isApplying: true, applyResult: null })
    try {
      const res = await window.nexus.patches.apply({
        projectId,
        filePath: preview.filePath,
        patchedContent: preview.patchedContent,
        expectedHash: preview.fileHashBefore,
        explanation: preview.explanation,
        unifiedDiff: preview.unifiedDiff
      })
      set({ applyResult: res })
      if (res.success) {
        await get().loadHistory(projectId)
      }
      return res
    } catch (err: any) {
      const errRes: ApplyPatchResult = {
        success: false,
        filePath: preview.filePath,
        message: 'Failed to apply patch',
        error: err.message
      }
      set({ applyResult: errRes })
      return errRes
    } finally {
      set({ isApplying: false })
    }
  },

  rollbackPatch: async (patchRecordId: string) => {
    set({ isRollingBack: true, rollbackResult: null })
    try {
      const res = await window.nexus.patches.rollback(patchRecordId)
      set({ rollbackResult: res })
      const projectId = get().currentProjectId
      if (projectId && res.success) {
        await get().loadHistory(projectId)
      }
      return res
    } catch (err: any) {
      const errRes: RollbackPatchResult = {
        success: false,
        filePath: '',
        message: 'Rollback failed',
        error: err.message
      }
      set({ rollbackResult: errRes })
      return errRes
    } finally {
      set({ isRollingBack: false })
    }
  },

  loadHistory: async (projectId: string) => {
    try {
      const history = await window.nexus.patches.getHistory(projectId)
      set({ patchHistory: history })
    } catch (err) {
      console.error('Failed to load patch history:', err)
    }
  },

  openReview: (preview, projectId) => {
    set({
      activePreview: preview,
      currentProjectId: projectId,
      isReviewOpen: true,
      applyResult: null,
      rollbackResult: null
    })
  },

  closeReview: () => {
    set({ isReviewOpen: false })
  }
}))
