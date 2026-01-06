/**
 * 简历相关类型定义
 */

import type { ScreeningScore } from '@/api/types.gen'

/**
 * 引用的经验详情
 */
export interface AppliedExperience {
  id: string
  learned_rule: string
  source_feedback: string
  category: string
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
  // RAG 经验引用
  applied_experiences?: AppliedExperience[]
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
