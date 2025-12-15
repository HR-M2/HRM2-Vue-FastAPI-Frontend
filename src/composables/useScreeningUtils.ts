/**
 * Screening 工具函数 composable
 * 提供状态转换、格式化等通用工具
 */
import { marked } from 'marked'
import type { ScreeningScore, ProcessingTask, HistoryTask } from '@/types'

export function useScreeningUtils() {
  // 渲染 Markdown 内容
  const renderMarkdown = (content: string, isResume = false): string => {
    if (!content) return ''
    
    if (isResume) {
      // 简历内容特殊处理：原文没有换行符，使用 \u200b 作为分隔
      let processed = content
        .replace(/\u200b([^|\u200b]+)\u200b/g, '\n\n**$1**\n')
        .replace(/\u200b/g, '\n\n')
        .replace(/([。！？])\s*/g, '$1\n')
        .replace(/\s*\|\s*/g, ' | ')
        .replace(/(\d{4}-\d{4})\s*(?=[^\d])/g, '$1\n')
        .trim()
      
      return marked(processed) as string
    }
    
    return marked(content) as string
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 获取状态类型
  const getStatusType = (status: string) => {
    const types: Record<string, string> = {
      pending: 'warning',
      running: 'primary',
      completed: 'success',
      failed: 'danger'
    }
    return types[status] || 'info'
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '队列中',
      running: '处理中',
      completed: '已完成',
      failed: '失败'
    }
    return texts[status] || status
  }

  // Agent顺序定义（用于进度显示）
  const AGENT_ORDER = ['User_Proxy', 'Assistant', 'HR_Expert', 'Technical_Expert', 'Project_Manager_Expert', 'Critic']
  const TOTAL_AGENTS = AGENT_ORDER.length
  
  // 获取发言人文本（包含步骤信息）
  const getSpeakerText = (speaker: string) => {
    const speakerNames: Record<string, string> = {
      'User_Proxy': '初始化',
      'Assistant': '协调准备',
      'HR_Expert': 'HR评分中',
      'Technical_Expert': '技术评分中',
      'Project_Manager_Expert': '管理评分中',
      'Critic': '综合评审中'
    }
    
    const stepIndex = AGENT_ORDER.indexOf(speaker)
    const stepNum = stepIndex >= 0 ? stepIndex + 1 : '?'
    const displayName = speakerNames[speaker] || speaker
    
    return `${displayName} (${stepNum}/${TOTAL_AGENTS})`
  }

  // 获取处理任务的评分
  const getItemScore = (item: ProcessingTask): ScreeningScore | null => {
    if (item.score !== null && item.score !== undefined) {
      const dimensionScores = item.dimension_scores || {}
      return {
        comprehensive_score: item.score,
        hr_score: dimensionScores['hr_score'] as number | undefined,
        technical_score: dimensionScores['technical_score'] as number | undefined,
        manager_score: dimensionScores['manager_score'] as number | undefined
      }
    }
    return null
  }

  // 获取历史任务名称
  const getHistoryTaskName = (task: HistoryTask): string => {
    // 1. 优先使用候选人名称
    if (task.candidate_name) return task.candidate_name
    
    // 2. 对于失败的任务，显示错误信息的前20个字符
    if (task.status === 'failed' && task.error_message) {
      return `错误: ${task.error_message.substring(0, 20)}${task.error_message.length > 20 ? '...' : ''}`
    }
    
    // 3. 显示状态和任务ID
    return `${getStatusText(task.status)}任务 ${task.id.substring(0, 8)}...`
  }

  // 获取历史任务评分
  const getHistoryTaskScore = (task: HistoryTask): ScreeningScore | null => {
    if (task.score !== null && task.score !== undefined) {
      const dimensionScores = task.dimension_scores || {}
      return {
        comprehensive_score: task.score,
        hr_score: dimensionScores['hr_score'] as number | undefined,
        technical_score: dimensionScores['technical_score'] as number | undefined,
        manager_score: dimensionScores['manager_score'] as number | undefined
      }
    }
    return null
  }

  return {
    renderMarkdown,
    formatFileSize,
    formatDate,
    getStatusType,
    getStatusText,
    getSpeakerText,
    getItemScore,
    getHistoryTaskName,
    getHistoryTaskScore
  }
}
