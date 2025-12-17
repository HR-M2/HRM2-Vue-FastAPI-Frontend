/**
 * 通用类型定义
 */

// 从 API 类型导入并重新导出
import type {
  PositionResponse,
  PositionListResponse,
  ResumeResponse,
  ResumeListResponse,
  ApplicationResponse,
  ApplicationDetailResponse,
  ScreeningTaskResponse,
  ScreeningTaskBrief,
  VideoAnalysisResponse,
  VideoAnalysisBrief,
  BigFiveScores,
  ScreeningDimensionScores,
} from '@/api/types.gen'

export type {
  PositionResponse,
  PositionListResponse,
  ResumeResponse,
  ResumeListResponse,
  ApplicationResponse,
  ApplicationDetailResponse,
  ScreeningTaskResponse,
  ScreeningTaskBrief,
  VideoAnalysisResponse,
  VideoAnalysisBrief,
  BigFiveScores,
  ScreeningDimensionScores,
}

/**
 * 任务状态类型
 */
export type TaskStatus = 'pending' | 'running' | 'processing' | 'completed' | 'failed'

/**
 * 筛选评分
 */
export interface ScreeningScore {
  hr_score?: number
  technical_score?: number
  manager_score?: number
  comprehensive_score: number
}

/**
 * 岗位数据（前端扩展）
 */
export interface PositionData {
  id: string
  title: string
  department?: string
  description?: string
  requirements?: string
  required_skills?: string[]
  optional_skills?: string[]
  min_experience?: number
  education?: string[]
  salary_min?: number
  salary_max?: number
  is_active?: boolean
  resume_count?: number
  resumes?: ResumeData[]
  created_at?: string
  updated_at?: string
}

/**
 * 简历数据（前端扩展）
 */
export interface ResumeData {
  id: string
  candidate_name: string
  position_title?: string
  content?: string
  resume_content?: string
  screening_score?: ScreeningScore
  screening_summary?: string
  file_hash?: string
  created_at?: string
}

/**
 * 简历文件类型
 */
export interface ResumeFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  content: string
  status: 'pending' | 'parsing' | 'parsed' | 'error'
  error?: string
}

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

/**
 * 历史任务类型（基于 ScreeningTaskResponse）
 */
export interface HistoryTask {
  id: string
  task_id: string
  application_id: string
  status: string
  score: number | null
  dimension_scores?: ScreeningDimensionScores | null
  summary: string | null
  recommendation: string | null
  report_content: string | null
  error_message: string | null
  candidate_name?: string | null
  position_title?: string | null
  created_at: string
  updated_at: string
}

/**
 * 导航项类型
 */
export interface NavItem {
  key: string
  label: string
  icon?: string
  path: string
}

/**
 * 视频分析应用数据（用于视频分析页面）
 */
export interface VideoApplicationData {
  id: string
  position_id: string
  resume_id: string
  candidate_name?: string | null
  position_title?: string | null
  created_at: string
  screening_task?: {
    id: string
    status: string
    score: number | null
    dimension_scores: Record<string, unknown> | null
    recommendation: string | null
  } | null
  video_analysis?: {
    id: string
    video_name: string
    status: string
    fraud_score: number | null
    confidence_score: number | null
    big_five_scores?: {
      openness?: number | null
      conscientiousness?: number | null
      extraversion?: number | null
      agreeableness?: number | null
      neuroticism?: number | null
    } | null
    summary: string | null
  } | null
}
