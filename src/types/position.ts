/**
 * 岗位相关类型定义
 */

import type { ResumeData } from './resume'

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
