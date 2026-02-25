/**
 * 简历详情 composable
 * 处理简历详情查看和报告下载
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getScreeningTask,
  downloadScreeningReport
} from '@/api/sdk.gen'
import type { ResumeData, ResumeFile, ProcessingTask } from '@/types'
import type { ScreeningTaskResponse } from '@/api/types.gen'
import { useScreeningUtils } from '@/composables/useScreeningUtils'

export function useResumeDetail() {
  const { getHistoryTaskName } = useScreeningUtils()

  const toNumberOrUndefined = (value: unknown): number | undefined => {
    return typeof value === 'number' ? value : undefined
  }

  const getDimensionScores = (scores: Record<string, unknown> | null | undefined) => {
    return {
      technical_score: toNumberOrUndefined(scores?.technical_score),
      project_score: toNumberOrUndefined(scores?.project_score ?? scores?.hr_score),
      career_score: toNumberOrUndefined(scores?.career_score ?? scores?.manager_score)
    }
  }

  const buildScreeningScore = (score: number | null | undefined, scores: Record<string, unknown> | null | undefined) => {
    if (score === null || score === undefined) return undefined
    return {
      comprehensive_score: score,
      ...getDimensionScores(scores)
    }
  }

  // 对话框状态
  const previewDialogVisible = ref(false)
  const resumeDetailVisible = ref(false)

  // 数据
  const previewFileData = ref<ResumeFile | null>(null)
  const selectedResumeDetail = ref<ResumeData | null>(null)

  // 预览文件
  const previewFile = (file: ResumeFile) => {
    previewFileData.value = file
    previewDialogVisible.value = true
  }

  // 显示简历详情
  const showResumeDetail = (resume: ResumeData) => {
    selectedResumeDetail.value = resume
    resumeDetailVisible.value = true
  }

  // 显示处理队列项详情
  const showQueueItemDetail = async (item: ProcessingTask) => {
    const resumeData: ResumeData = {
      id: item.task_id || '',
      candidate_name: item.name,
      position_title: item.applied_position || '',
      screening_score: buildScreeningScore(item.score, item.dimension_scores as Record<string, unknown> | null | undefined),
      screening_summary: item.summary || undefined,
      created_at: item.created_at
    }
    
    // 尝试获取更多详情（包括简历内容和引用的经验）
    if (item.task_id) {
      try {
        const response = await getScreeningTask({
          path: { task_id: item.task_id }
        })
        
        if (response.data?.data) {
          const detail = response.data.data
          resumeData.screening_summary = detail.summary || resumeData.screening_summary
          resumeData.resume_content = detail.resume_content || undefined
          resumeData.screening_score = buildScreeningScore(
            detail.score,
            detail.dimension_scores as Record<string, unknown> | null | undefined
          )
          // 提取引用的经验
          if (detail.applied_experiences && detail.applied_experiences.length > 0) {
            resumeData.applied_experiences = detail.applied_experiences
          }
        }
      } catch (err) {
        console.warn('获取任务详情失败:', err)
      }
    }
    
    selectedResumeDetail.value = resumeData
    resumeDetailVisible.value = true
  }

  // 显示历史任务详情
  const showHistoryTaskDetail = async (task: ScreeningTaskResponse) => {
    const resumeData: ResumeData = {
      id: task.id,
      candidate_name: task.candidate_name || getHistoryTaskName(task),
      position_title: task.position_title || '',
      screening_score: buildScreeningScore(
        task.score,
        task.dimension_scores as unknown as Record<string, unknown> | null | undefined
      ),
      screening_summary: task.summary || undefined,
      created_at: task.created_at
    }
    
    // 获取完整详情（包括简历内容、候选人姓名和引用的经验）
    try {
      const response = await getScreeningTask({
        path: { task_id: task.id }
      })
      
      if (response.data?.data) {
        const detail = response.data.data
        // 更新候选人姓名
        if (detail.candidate_name) {
          resumeData.candidate_name = detail.candidate_name
        }
        // 更新岗位名称
        if (detail.position_title) {
          resumeData.position_title = detail.position_title
        }
        // 更新简历内容
        resumeData.resume_content = detail.resume_content || undefined
        // 更新评分（如果API返回更完整的数据）
        resumeData.screening_summary = detail.summary || resumeData.screening_summary
        resumeData.screening_score = buildScreeningScore(
          detail.score,
          detail.dimension_scores as Record<string, unknown> | null | undefined
        )
        // 提取引用的经验
        if (detail.applied_experiences && detail.applied_experiences.length > 0) {
          resumeData.applied_experiences = detail.applied_experiences
        }
      }
    } catch (err) {
      console.warn('获取历史任务详情失败:', err)
    }
    
    selectedResumeDetail.value = resumeData
    resumeDetailVisible.value = true
  }

  // 下载报告
  const downloadReport = async (taskId: string) => {
    try {
      const response = await downloadScreeningReport({
        path: { task_id: taskId }
      })
      
      // 处理下载
      if (response.data) {
        const blob = new Blob([response.data as unknown as BlobPart], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `screening_report_${taskId}.md`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('下载报告失败:', err)
      ElMessage.error('下载报告失败')
    }
  }

  return {
    previewDialogVisible,
    resumeDetailVisible,
    previewFileData,
    selectedResumeDetail,
    previewFile,
    showResumeDetail,
    showQueueItemDetail,
    showHistoryTaskDetail,
    downloadReport
  }
}
