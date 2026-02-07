/**
 * 候选列表 composable
 * 统一管理当前岗位下所有候选人数据（合并原 ProcessingQueue + TaskHistory）
 */
import { ref, computed, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getApplications,
  getScreeningStatus,
  getScreeningTask,
  deleteApplication,
  startAiScreening
} from '@/api/sdk.gen'
import type { ApplicationDetailResponse } from '@/api/types.gen'

export interface CandidateItem {
  id: string // application_id
  resumeId: string
  candidateName: string
  positionId: string
  positionTitle: string
  // 初筛相关
  screeningTaskId: string | null
  screeningStatus: string // pending | running | completed | failed | none
  screeningScore: number | null
  hrScore: number | null
  techScore: number | null
  mgrScore: number | null
  screeningSummary: string | null
  screeningProgress: number
  currentSpeaker: string
  errorMessage: string | null
  // 其他状态
  hasInterview: boolean
  interviewCompleted: boolean
  hasAnalysis: boolean
  // 时间
  createdAt: string
}

export function useCandidateList(selectedPositionId: Ref<string | null>) {
  const candidates = ref<CandidateItem[]>([])
  const loading = ref(false)
  const statusFilter = ref('all')
  const sortBy = ref('score')
  const pollingTimer = ref<number | null>(null)

  // 根据筛选和排序后的候选人列表
  const filteredCandidates = computed(() => {
    let list = candidates.value.filter(c => c.positionId === selectedPositionId.value)

    if (statusFilter.value !== 'all') {
      list = list.filter(c => c.screeningStatus === statusFilter.value)
    }

    list.sort((a, b) => {
      if (sortBy.value === 'score') return (b.screeningScore || 0) - (a.screeningScore || 0)
      if (sortBy.value === 'time') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return 0
    })

    return list
  })

  // 当前岗位的统计
  const positionStats = computed(() => {
    const list = candidates.value.filter(c => c.positionId === selectedPositionId.value)
    return {
      total: list.length,
      completed: list.filter(c => c.screeningStatus === 'completed').length,
      processing: list.filter(c => ['running', 'pending'].includes(c.screeningStatus)).length,
      unscreened: list.filter(c => c.screeningStatus === 'none').length,
      failed: list.filter(c => c.screeningStatus === 'failed').length
    }
  })

  // 是否有可批量初筛的候选人
  const canBatchScreen = computed(() => {
    return candidates.value.filter(
      c => c.positionId === selectedPositionId.value &&
        (c.screeningStatus === 'none' || c.screeningStatus === 'failed')
    ).length > 0
  })

  // 从 ApplicationDetailResponse 转换为 CandidateItem
  const mapAppToCandidate = (app: ApplicationDetailResponse): CandidateItem => {
    const task = app.screening_task
    return {
      id: app.id,
      resumeId: app.resume_id,
      candidateName: app.candidate_name || '未知候选人',
      positionId: app.position_id,
      positionTitle: app.position_title || '',
      screeningTaskId: task?.id || null,
      screeningStatus: task?.status || 'none',
      screeningScore: task?.score ?? null,
      hrScore: null,
      techScore: null,
      mgrScore: null,
      screeningSummary: null,
      screeningProgress: task?.status === 'completed' ? 100 : 0,
      currentSpeaker: '',
      errorMessage: null,
      hasInterview: !!app.interview_session,
      interviewCompleted: app.interview_session?.is_completed || false,
      hasAnalysis: !!app.comprehensive_analysis,
      createdAt: app.created_at
    }
  }

  // 获取已完成任务的维度评分（ScreeningTaskBrief 不含 dimension_scores，需单独获取）
  const fetchDimensionScores = async (item: CandidateItem) => {
    if (!item.screeningTaskId) return
    try {
      const response = await getScreeningTask({
        path: { task_id: item.screeningTaskId }
      })
      if (response.data?.data) {
        const detail = response.data.data
        const dimScores = detail.dimension_scores as Record<string, number> | null
        if (dimScores) {
          item.hrScore = dimScores.hr_score ?? null
          item.techScore = dimScores.technical_score ?? null
          item.mgrScore = dimScores.manager_score ?? null
        }
        item.screeningSummary = detail.summary || null
      }
    } catch (err) {
      console.warn('获取维度评分失败:', err)
    }
  }

  // 加载候选人列表
  const loadCandidates = async () => {
    if (!selectedPositionId.value) return

    loading.value = true
    try {
      const response = await getApplications({
        query: {
          position_id: selectedPositionId.value,
          page_size: 100,
          include_details: true
        }
      })

      if (response.data?.data?.items) {
        const apps = response.data.data.items as ApplicationDetailResponse[]
        candidates.value = apps.map(mapAppToCandidate)

        // 对已完成初筛的候选人，获取完整任务详情以填充维度评分
        const completedItems = candidates.value.filter(
          c => c.screeningStatus === 'completed' && c.screeningTaskId
        )
        for (const item of completedItems) {
          fetchDimensionScores(item)
        }

        // 如果有正在处理的任务，启动轮询
        const hasPending = candidates.value.some(
          c => ['running', 'pending'].includes(c.screeningStatus)
        )
        if (hasPending) {
          startPolling()
        }
      }
    } catch (err) {
      console.error('加载候选人列表失败:', err)
      ElMessage.error('加载候选人列表失败')
    } finally {
      loading.value = false
    }
  }

  // 轮询任务状态
  const pollTaskStatus = async () => {
    const pendingItems = candidates.value.filter(
      c => ['running', 'pending'].includes(c.screeningStatus) && c.screeningTaskId
    )

    if (pendingItems.length === 0) {
      stopPolling()
      return
    }

    for (const item of pendingItems) {
      if (!item.screeningTaskId) continue
      try {
        const response = await getScreeningStatus({
          path: { task_id: item.screeningTaskId }
        })

        if (response.data?.data) {
          const data = response.data.data as Record<string, unknown>
          item.screeningStatus = (data.status as string) || item.screeningStatus
          item.screeningProgress = (data.progress as number) || item.screeningProgress
          item.currentSpeaker = (data.current_speaker as string) || ''
          item.errorMessage = (data.error_message as string) || null

          if (data.status === 'completed') {
            item.screeningScore = (data.score as number) ?? null
            const dimScores = data.dimension_scores as Record<string, number> | null
            if (dimScores) {
              item.hrScore = dimScores.hr_score ?? null
              item.techScore = dimScores.technical_score ?? null
              item.mgrScore = dimScores.manager_score ?? null
            }
            item.screeningSummary = (data.summary as string) || null
            ElMessage.success(`"${item.candidateName}" 初筛完成`)
          } else if (data.status === 'failed') {
            ElMessage.error(`"${item.candidateName}" 初筛失败`)
          }
        }
      } catch (err) {
        console.error('轮询任务状态失败:', err)
      }
    }
  }

  // 启动轮询
  const startPolling = () => {
    if (pollingTimer.value) return
    pollingTimer.value = window.setInterval(pollTaskStatus, 3000)
  }

  // 停止轮询
  const stopPolling = () => {
    if (pollingTimer.value) {
      clearInterval(pollingTimer.value)
      pollingTimer.value = null
    }
  }

  // 重新初筛某个候选人
  const retryScreening = async (candidate: CandidateItem) => {
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
        ElMessage.success('已重新提交初筛任务')
        startPolling()
      }
    } catch (err) {
      console.error('重新初筛失败:', err)
      ElMessage.error('重新初筛失败')
    }
  }

  // 删除候选人（删除 application，不删简历）
  const deleteCandidate = async (candidate: CandidateItem) => {
    try {
      await ElMessageBox.confirm(
        `确定要移除候选人「${candidate.candidateName}」吗？将从该岗位中移除，但不会删除简历。`,
        '确认移除',
        { confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning' }
      )

      await deleteApplication({ path: { application_id: candidate.id } })
      candidates.value = candidates.value.filter(c => c.id !== candidate.id)
      ElMessage.success('已移除候选人')
    } catch (err) {
      if (err !== 'cancel') {
        console.error('删除候选人失败:', err)
        ElMessage.error('删除候选人失败')
      }
    }
  }

  return {
    candidates,
    filteredCandidates,
    positionStats,
    canBatchScreen,
    loading,
    statusFilter,
    sortBy,
    loadCandidates,
    retryScreening,
    deleteCandidate,
    startPolling,
    stopPolling
  }
}
