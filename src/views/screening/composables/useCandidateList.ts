/**
 * 候选列表 composable
 * 统一管理当前岗位下所有候选人数据（合并原 ProcessingQueue + TaskHistory）
 */
import { ref, computed, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createScreeningStatusStream,
  type ScreeningStatusStreamHandle
} from '@/services/screening/screeningStatusStream'
import {
  getApplications,
  getScreeningTask,
  deleteApplication,
  startAiScreening
} from '@/api/sdk.gen'
import type { ApplicationDetailResponse } from '@/api/types.gen'

const isPendingStatus = (status: string) => ['running', 'pending'].includes(status)

// 工具调用事件
export interface ToolCallEvent {
  tool: string
  args: Record<string, unknown>
  result: string | null
}

// 单轮决策节点
export interface LoopNode {
  loop: number
  think_text: string
  is_thinking: boolean
  tool_calls: ToolCallEvent[]
}

// Agentic 筛选状态
export interface AgenticState {
  currentLoop: number
  maxLoops: number
  nodes: LoopNode[]
  finalReport: string
  isFinalStreaming: boolean
  totalLoops: number
  toolCallCount: number
}

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
  // Agentic 三维度评分
  technicalScore: number | null   // 技术能力
  projectScore: number | null     // 项目经验
  careerScore: number | null      // 职业轨迹
  screeningSummary: string | null
  screeningProgress: number
  currentSpeaker: string
  errorMessage: string | null
  recommendation: string | null
  // Agentic 状态（实时链式调用过程）
  agenticState: AgenticState
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

  const taskStreams = new Map<string, ScreeningStatusStreamHandle>()
  const taskErrorNotified = new Set<string>()
  const unsupportedSseWarned = ref(false)

  const createEmptyAgenticState = (): AgenticState => ({
    currentLoop: 0,
    maxLoops: 12,
    nodes: [],
    finalReport: '',
    isFinalStreaming: false,
    totalLoops: 0,
    toolCallCount: 0
  })

  const getDimensionScore = (
    scores: Record<string, unknown> | null | undefined,
    key: string,
    fallbackKey?: string
  ): number | null => {
    const direct = scores?.[key]
    if (typeof direct === 'number') return direct
    if (fallbackKey) {
      const fallback = scores?.[fallbackKey]
      if (typeof fallback === 'number') return fallback
    }
    return null
  }

  const applyDimensionScores = (item: CandidateItem, scores: Record<string, unknown> | null | undefined) => {
    item.technicalScore = getDimensionScore(scores, 'technical_score')
    item.projectScore = getDimensionScore(scores, 'project_score', 'hr_score')
    item.careerScore = getDimensionScore(scores, 'career_score', 'manager_score')
  }

  // 从 ApplicationDetailResponse 转换为 CandidateItem
  const mapAppToCandidate = (app: ApplicationDetailResponse): CandidateItem => {
    const task = app.screening_task
    const taskScores = (task as { dimension_scores?: Record<string, unknown> | null } | null)?.dimension_scores
    return {
      id: app.id,
      resumeId: app.resume_id,
      candidateName: app.candidate_name || '未知候选人',
      positionId: app.position_id,
      positionTitle: app.position_title || '',
      screeningTaskId: task?.id || null,
      screeningStatus: task?.status || 'none',
      screeningScore: task?.score ?? null,
      technicalScore: getDimensionScore(taskScores, 'technical_score'),
      projectScore: getDimensionScore(taskScores, 'project_score', 'hr_score'),
      careerScore: getDimensionScore(taskScores, 'career_score', 'manager_score'),
      screeningSummary: null,
      screeningProgress: task?.status === 'completed' ? 100 : 0,
      currentSpeaker: '',
      errorMessage: null,
      recommendation: null,
      agenticState: createEmptyAgenticState(),
      hasInterview: !!app.interview_session,
      interviewCompleted: app.interview_session?.is_completed || false,
      hasAnalysis: !!app.comprehensive_analysis,
      createdAt: app.created_at
    }
  }

  const getPendingTaskIds = (): Set<string> => {
    const ids = new Set<string>()
    for (const item of candidates.value) {
      if (item.screeningTaskId && isPendingStatus(item.screeningStatus)) {
        ids.add(item.screeningTaskId)
      }
    }
    return ids
  }

  const getCandidateByTaskId = (taskId: string): CandidateItem | undefined => {
    return candidates.value.find(c => c.screeningTaskId === taskId)
  }

  const isTaskPending = (taskId: string): boolean => {
    const item = getCandidateByTaskId(taskId)
    return !!item && isPendingStatus(item.screeningStatus)
  }

  const closeTaskStream = (taskId: string) => {
    const stream = taskStreams.get(taskId)
    if (stream) {
      stream.close()
      taskStreams.delete(taskId)
    }
    taskErrorNotified.delete(taskId)
  }

  const closeAllTaskStreams = () => {
    Array.from(taskStreams.keys()).forEach(taskId => closeTaskStream(taskId))
    taskErrorNotified.clear()
  }

  const applyTaskStatus = (item: CandidateItem, data: Record<string, unknown>) => {
    const previousStatus = item.screeningStatus
    const nextStatus = (data.status as string | undefined) ?? item.screeningStatus

    // 基础状态更新
    item.screeningStatus = nextStatus
    item.screeningProgress = (data.progress as number | undefined) ?? item.screeningProgress
    item.currentSpeaker = (data.current_speaker as string | undefined) ?? ''
    item.errorMessage = (data.error_message as string | undefined) ?? null

    // 更新 Agentic 状态（链式调用过程）
    if (data.nodes !== undefined) {
      const incomingNodes = Array.isArray(data.nodes) ? (data.nodes as LoopNode[]) : []
      const incomingFinalReport = (data.final_report as string | undefined) ?? ''
      const incomingCurrentLoop = data.current_loop as number | undefined
      const incomingMaxLoops = data.max_loops as number | undefined
      const incomingTotalLoops = data.total_loops as number | undefined
      const incomingToolCalls = data.tool_call_count as number | undefined
      item.agenticState = {
        currentLoop: incomingCurrentLoop && incomingCurrentLoop > 0
          ? incomingCurrentLoop
          : item.agenticState.currentLoop,
        maxLoops: incomingMaxLoops && incomingMaxLoops > 0
          ? incomingMaxLoops
          : item.agenticState.maxLoops || 12,
        nodes: incomingNodes.length > 0 ? incomingNodes : item.agenticState.nodes,
        finalReport: incomingFinalReport || item.agenticState.finalReport,
        isFinalStreaming: (data.is_final_streaming as boolean | undefined) ?? item.agenticState.isFinalStreaming,
        totalLoops: incomingTotalLoops && incomingTotalLoops > 0
          ? incomingTotalLoops
          : item.agenticState.totalLoops,
        toolCallCount: incomingToolCalls && incomingToolCalls > 0
          ? incomingToolCalls
          : item.agenticState.toolCallCount
      }
    }

    if (nextStatus === 'completed') {
      item.screeningScore = (data.score as number) ?? null
      item.recommendation = (data.recommendation as string | undefined) ?? null
      applyDimensionScores(item, data.dimension_scores as Record<string, unknown> | null)
      item.screeningSummary = (data.summary as string | undefined) ?? null
      if (data.final_report) {
        item.agenticState.finalReport = data.final_report as string
      }
    }

    if (nextStatus !== previousStatus) {
      if (nextStatus === 'completed') {
        ElMessage.success(`"${item.candidateName}" 初筛完成`)
      } else if (nextStatus === 'failed') {
        ElMessage.error(`"${item.candidateName}" 初筛失败`)
      }
    }

    if (item.screeningTaskId && !isPendingStatus(nextStatus)) {
      closeTaskStream(item.screeningTaskId)
    }
  }

  const notifyStreamError = (taskId: string, message: string) => {
    if (message.includes('不支持 SSE')) {
      if (!unsupportedSseWarned.value) {
        unsupportedSseWarned.value = true
        ElMessage.error(message)
      }
      return
    }

    if (!taskErrorNotified.has(taskId)) {
      taskErrorNotified.add(taskId)
      ElMessage.warning(message)
    }
  }

  const connectTaskStream = (taskId: string) => {
    if (taskStreams.has(taskId) || !isTaskPending(taskId)) {
      return
    }

    const stream = createScreeningStatusStream({
      taskId,
      callbacks: {
        onOpen: () => {
          taskErrorNotified.delete(taskId)
        },
        onStatus: (payload) => {
          const item = getCandidateByTaskId(taskId)
          if (!item) {
            closeTaskStream(taskId)
            return
          }

          applyTaskStatus(item, payload)
        },
        onError: (message) => {
          notifyStreamError(taskId, message)
        }
      }
    })

    taskStreams.set(taskId, stream)
  }

  const syncTaskStreams = () => {
    const pendingTaskIds = getPendingTaskIds()

    Array.from(taskStreams.keys()).forEach(taskId => {
      if (!pendingTaskIds.has(taskId)) {
        closeTaskStream(taskId)
      }
    })

    pendingTaskIds.forEach(taskId => {
      if (!taskStreams.has(taskId)) {
        connectTaskStream(taskId)
      }
    })
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
        applyDimensionScores(item, detail.dimension_scores as Record<string, unknown> | null)
        item.screeningSummary = detail.summary || null
      }
    } catch (err) {
      console.warn('获取维度评分失败:', err)
    }
  }

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

        // 对运行中的任务建立 SSE 连接
        startStatusSync()
      }
    } catch (err) {
      console.error('加载候选人列表失败:', err)
      ElMessage.error('加载候选人列表失败')
    } finally {
      loading.value = false
    }
  }

  // 启动状态同步
  const startStatusSync = () => {
    syncTaskStreams()
  }

  // 停止状态同步并清理连接
  const stopStatusSync = () => {
    closeAllTaskStreams()
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
        candidate.technicalScore = null
        candidate.projectScore = null
        candidate.careerScore = null
        candidate.screeningSummary = null
        candidate.recommendation = null
        candidate.agenticState = createEmptyAgenticState()
        candidate.errorMessage = null
        ElMessage.success('已重新提交初筛任务')
        startStatusSync()
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
      startStatusSync()
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
    startStatusSync,
    stopStatusSync
  }
}
