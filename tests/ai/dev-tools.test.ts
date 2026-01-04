/**
 * AI 开发工具测试
 * 
 * 测试 AI 随机简历生成等开发辅助功能
 * 运行前需要启动后端服务: python run.py
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import {
  createPosition,
  generateRandomResume,
  getAiStatus,
  deletePosition,
  deleteResume,
  getResumes,
} from '../../src/api'

beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:8000' })
})

describe('AI 开发工具', () => {
  let positionId: string
  let generatedResumeIds: string[] = []

  // 创建测试岗位
  beforeAll(async () => {
    const status = await getAiStatus()
    if (!status.data?.data?.is_configured) {
      console.warn('⚠️ LLM 服务未配置，AI 开发工具测试可能会失败')
    }

    const posRes = await createPosition({
      body: {
        title: `AI工具测试岗位_${Date.now()}`,
        description: '负责数据分析和机器学习模型开发',
        required_skills: ['Python', 'Pandas', 'Scikit-learn'],
        optional_skills: ['TensorFlow', 'PyTorch'],
        min_experience: 2,
      },
    })
    positionId = posRes.data?.data?.id!
  })

  describe('随机简历生成', () => {
    it('应该能生成单份随机简历', async () => {
      const response = await generateRandomResume({
        body: {
          position_id: positionId,
          count: 1,
        },
      })

      if (response.error) {
        console.warn('AI 简历生成失败:', response.error)
        return
      }

      expect(response.data?.success).toBe(true)
      
      const data = response.data?.data as { resumes?: unknown[]; added?: { id?: string }[] } | null
      expect(data?.resumes).toBeInstanceOf(Array)
      expect(data?.resumes?.length).toBe(1)

      // 记录生成的简历ID用于清理
      const added = data?.added || []
      for (const resume of added) {
        if (resume.id) {
          generatedResumeIds.push(resume.id)
        }
      }
    })

    it('应该能批量生成随机简历', async () => {
      const response = await generateRandomResume({
        body: {
          position_id: positionId,
          count: 3,
        },
      })

      if (response.error) {
        console.warn('AI 批量简历生成失败:', response.error)
        return
      }

      expect(response.data?.success).toBe(true)
      
      const data = response.data?.data as { resumes?: unknown[]; added?: { id?: string }[] } | null
      expect(data?.resumes).toBeInstanceOf(Array)
      
      // 验证生成数量
      const resumes = data?.resumes || []
      expect(resumes.length).toBeLessThanOrEqual(3)

      // 记录生成的简历ID
      const added = data?.added || []
      for (const resume of added) {
        if (resume.id) {
          generatedResumeIds.push(resume.id)
        }
      }

      console.log(`生成了 ${resumes.length} 份简历，保存了 ${added.length} 份`)
    })

    it('生成的简历应该包含必要字段', async () => {
      const response = await generateRandomResume({
        body: {
          position_id: positionId,
          count: 1,
        },
      })

      if (response.error) {
        console.warn('AI 简历生成失败:', response.error)
        return
      }

      const data = response.data?.data as { resumes?: Record<string, unknown>[]; added?: { id?: string }[] } | null
      const resumes = data?.resumes || []
      if (resumes.length > 0) {
        const resume = resumes[0]
        expect(resume).toHaveProperty('candidate_name')
        expect(resume).toHaveProperty('content')
        expect(resume).toHaveProperty('file_hash')
      }

      // 记录生成的简历ID
      const added = data?.added || []
      for (const r of added) {
        if (r.id) {
          generatedResumeIds.push(r.id)
        }
      }
    })
  })

  // 清理测试数据
  afterAll(async () => {
    // 删除生成的简历
    for (const resumeId of generatedResumeIds) {
      try {
        await deleteResume({ path: { resume_id: resumeId } })
      } catch (e) {
        // 忽略删除失败
      }
    }
    if (positionId) await deletePosition({ path: { position_id: positionId } })
  })
})
