/**
 * 视频分析相关类型定义
 */

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
