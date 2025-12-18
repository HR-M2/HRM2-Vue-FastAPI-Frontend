/**
 * 任务相关类型定义
 */

/**
 * 任务状态类型
 */
export type TaskStatus = 'pending' | 'running' | 'processing' | 'completed' | 'failed'

/**
 * 处理队列项类型
 */
export interface ProcessingTask {
  name: string
  task_id: string | null
  application_id?: string
  status: TaskStatus
  progress: number
  created_at: string
  applied_position?: string
  error_message?: string
  current_speaker?: string
  score?: number | null
  dimension_scores?: Record<string, unknown> | null
  summary?: string | null
  recommendation?: string | null
  report_content?: string | null
}
