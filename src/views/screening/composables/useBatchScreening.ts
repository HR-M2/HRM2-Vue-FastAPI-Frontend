/**
 * 批量初筛 composable
 * 处理一键初筛功能
 */
import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { startAiScreening } from '@/api/sdk.gen'
import type { CandidateItem } from './useCandidateList'

export interface BatchProgress {
  current: number
  total: number
  items: { id: string; name: string; status: 'waiting' | 'running' | 'done' | 'failed' }[]
}

export function useBatchScreening(
  candidates: Ref<CandidateItem[]>,
  selectedPositionId: Ref<string | null>,
  onStartPolling: () => void
) {
  const batchScreening = ref(false)
  const batchProgress = ref<BatchProgress>({ current: 0, total: 0, items: [] })

  // 一键初筛：对当前岗位下未初筛/失败的候选人启动初筛
  const startBatchScreening = async () => {
    if (!selectedPositionId.value) return

    const toScreen = candidates.value.filter(
      c => c.positionId === selectedPositionId.value &&
        (c.screeningStatus === 'none' || c.screeningStatus === 'failed')
    )

    if (toScreen.length === 0) {
      ElMessage.info('没有需要初筛的候选人')
      return
    }

    batchScreening.value = true
    batchProgress.value = {
      current: 0,
      total: toScreen.length,
      items: toScreen.map(c => ({ id: c.id, name: c.candidateName, status: 'waiting' as const }))
    }

    let successCount = 0

    for (let i = 0; i < toScreen.length; i++) {
      const candidate = toScreen[i]!
      const progressItem = batchProgress.value.items[i]!

      // 更新进度
      batchProgress.value.current = i
      progressItem.status = 'running'

      try {
        const response = await startAiScreening({
          body: { application_id: candidate.id }
        })

        const data = response.data?.data as { task_id?: string } | undefined
        if (data?.task_id) {
          candidate.screeningTaskId = data.task_id
          candidate.screeningStatus = 'running'
          candidate.screeningProgress = 0
          candidate.screeningScore = null
          candidate.errorMessage = null
          progressItem.status = 'done'
          successCount++
        } else {
          progressItem.status = 'failed'
        }
      } catch (err) {
        console.error(`批量初筛 ${candidate.candidateName} 失败:`, err)
        progressItem.status = 'failed'
      }
    }

    batchProgress.value.current = toScreen.length

    if (successCount > 0) {
      ElMessage.success(`已提交 ${successCount} 份简历进行初筛`)
      onStartPolling()
    }

    // 延迟关闭进度面板
    setTimeout(() => {
      batchScreening.value = false
    }, 2000)
  }

  return {
    batchScreening,
    batchProgress,
    startBatchScreening
  }
}
