/**
 * 简历详情 composable
 * 处理简历详情查看和报告下载
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getScreeningTaskApiV1ScreeningTaskIdGet,
  downloadScreeningReportApiV1ScreeningTaskIdDownloadGet
} from '@/api/sdk.gen'
import type { ResumeData, ResumeFile, ProcessingTask, HistoryTask } from '@/types'
import { useScreeningUtils } from './useScreeningUtils'

export function useResumeDetail() {
  const { getHistoryTaskName } = useScreeningUtils()

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
      screening_score: item.score !== null && item.score !== undefined ? {
        comprehensive_score: item.score,
        hr_score: (item.dimension_scores?.hr_score as number) || undefined,
        technical_score: (item.dimension_scores?.technical_score as number) || undefined,
        manager_score: (item.dimension_scores?.manager_score as number) || undefined
      } : undefined,
      screening_summary: item.summary || undefined,
      created_at: item.created_at
    }
    
    // 如果已完成，尝试获取更多详情
    if (item.task_id && item.status === 'completed') {
      try {
        const response = await getScreeningTaskApiV1ScreeningTaskIdGet({
          path: { task_id: item.task_id }
        })
        
        if (response.data?.data) {
          const detail = response.data.data
          resumeData.screening_summary = detail.summary || resumeData.screening_summary
          if (detail.score !== null) {
            resumeData.screening_score = {
              comprehensive_score: detail.score,
              hr_score: (detail.dimension_scores?.hr_score as number) || undefined,
              technical_score: (detail.dimension_scores?.technical_score as number) || undefined,
              manager_score: (detail.dimension_scores?.manager_score as number) || undefined
            }
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
  const showHistoryTaskDetail = async (task: HistoryTask) => {
    const resumeData: ResumeData = {
      id: task.id,
      candidate_name: task.candidate_name || getHistoryTaskName(task),
      position_title: task.position_title || '',
      screening_score: task.score !== null ? {
        comprehensive_score: task.score,
        hr_score: (task.dimension_scores?.hr_score as number) || undefined,
        technical_score: (task.dimension_scores?.technical_score as number) || undefined,
        manager_score: (task.dimension_scores?.manager_score as number) || undefined
      } : undefined,
      screening_summary: task.summary || undefined,
      created_at: task.created_at
    }
    
    selectedResumeDetail.value = resumeData
    resumeDetailVisible.value = true
  }

  // 下载报告
  const downloadReport = async (taskId: string) => {
    try {
      const response = await downloadScreeningReportApiV1ScreeningTaskIdDownloadGet({
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
