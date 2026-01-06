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
          if (detail.score !== null) {
            resumeData.screening_score = {
              comprehensive_score: detail.score,
              hr_score: (detail.dimension_scores?.hr_score as number) || undefined,
              technical_score: (detail.dimension_scores?.technical_score as number) || undefined,
              manager_score: (detail.dimension_scores?.manager_score as number) || undefined
            }
          }
          // 提取引用的经验
          if (detail.applied_experiences && detail.applied_experiences.length > 0) {
            resumeData.applied_experiences = detail.applied_experiences.map((exp: Record<string, unknown>) => ({
              id: exp.id as string,
              learned_rule: exp.learned_rule as string,
              source_feedback: exp.source_feedback as string,
              category: exp.category as string
            }))
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
      screening_score: task.score !== null ? {
        comprehensive_score: task.score,
        hr_score: (task.dimension_scores?.hr_score as number) || undefined,
        technical_score: (task.dimension_scores?.technical_score as number) || undefined,
        manager_score: (task.dimension_scores?.manager_score as number) || undefined
      } : undefined,
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
        if (detail.score !== null) {
          resumeData.screening_score = {
            comprehensive_score: detail.score,
            hr_score: (detail.dimension_scores?.hr_score as number) || undefined,
            technical_score: (detail.dimension_scores?.technical_score as number) || undefined,
            manager_score: (detail.dimension_scores?.manager_score as number) || undefined
          }
        }
        // 提取引用的经验
        if (detail.applied_experiences && detail.applied_experiences.length > 0) {
          resumeData.applied_experiences = detail.applied_experiences.map((exp: Record<string, unknown>) => ({
            id: exp.id as string,
            learned_rule: exp.learned_rule as string,
            source_feedback: exp.source_feedback as string,
            category: exp.category as string
          }))
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
