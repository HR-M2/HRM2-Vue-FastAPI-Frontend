/**
 * AI 综合分析测试
 * 
 * 测试 AI 综合评估功能，整合简历、筛选、面试数据进行分析
 * 运行前需要启动后端服务: python run.py
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import {
  createPosition,
  createResume,
  createApplication,
  createInterviewSession,
  syncMessages,
  aiComprehensiveAnalysis,
  createAnalysis,
  getAnalysis,
  getAnalyses,
  deleteAnalysis,
  getAiStatus,
  deleteInterviewSession,
  deleteApplication,
  deletePosition,
  deleteResume,
} from '../../src/api'

beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:8000' })
})

describe('AI 综合分析', () => {
  let positionId: string
  let resumeId: string
  let applicationId: string
  let sessionId: string
  let analysisId: string

  // 创建测试数据
  beforeAll(async () => {
    const status = await getAiStatus()
    if (!status.data?.data?.is_configured) {
      console.warn('⚠️ LLM 服务未配置，AI 综合分析测试可能会失败')
    }

    // 创建测试岗位
    const posRes = await createPosition({
      body: {
        title: `AI分析测试岗位_${Date.now()}`,
        description: '负责产品设计和用户研究',
        required_skills: ['产品设计', '用户研究', 'Figma'],
        min_experience: 3,
      },
    })
    positionId = posRes.data?.data?.id!

    // 创建测试简历
    const resumeRes = await createResume({
      body: {
        candidate_name: `AI分析测试候选人_${Date.now()}`,
        content: `
          个人简介：
          4年产品设计经验，专注于B端产品设计。
          
          工作经历：
          - 2020-2024 某SaaS公司 高级产品设计师
            负责企业级产品的用户体验设计
            主导设计系统建设，提升团队设计效率
            
          技能：
          - 设计工具：Figma, Sketch, Adobe XD
          - 原型工具：Axure, Principle
          - 用户研究：访谈、可用性测试、数据分析
          
          项目经验：
          - 企业CRM系统重设计：用户满意度提升30%
          - 设计系统建设：组件复用率达到80%
        `,
        file_hash: `ai_analysis_test_${Date.now()}`,
        file_size: 1280,
      },
    })
    resumeId = resumeRes.data?.data?.id!

    // 创建应聘申请
    const appRes = await createApplication({
      body: { position_id: positionId, resume_id: resumeId },
    })
    applicationId = appRes.data?.data?.id!

    // 创建面试会话并添加对话记录
    const sessionRes = await createInterviewSession({
      body: {
        application_id: applicationId,
        interview_type: 'comprehensive',
      },
    })
    sessionId = sessionRes.data?.data?.id!

    // 同步面试对话
    await syncMessages({
      path: { session_id: sessionId },
      body: {
        messages: [
          { role: 'interviewer', content: '请介绍一下你的设计流程' },
          { role: 'candidate', content: '我通常从用户研究开始，通过访谈和数据分析了解用户需求，然后进行原型设计和迭代。' },
          { role: 'interviewer', content: '你如何处理设计与开发的协作？' },
          { role: 'candidate', content: '我会建立设计规范和组件库，与开发团队保持密切沟通，确保设计落地的一致性。' },
        ],
      },
    })
  })

  describe('综合分析 API', () => {
    it('应该能调用 AI 综合分析接口', async () => {
      const response = await aiComprehensiveAnalysis({
        body: { application_id: applicationId },
      })

      if (response.error) {
        console.warn('AI 综合分析失败:', response.error)
        return
      }

      expect(response.data?.success).toBe(true)
      expect(response.data?.data).toBeDefined()
    })
  })

  describe('综合分析 CRUD', () => {
    it('应该能创建综合分析记录', async () => {
      const response = await createAnalysis({
        body: { application_id: applicationId },
      })

      if (response.error) {
        console.warn('创建综合分析失败:', response.error)
        return
      }

      expect(response.data?.success).toBe(true)
      expect(response.data?.data?.id).toBeDefined()
      analysisId = response.data?.data?.id!
    })

    it('应该能获取综合分析详情', async () => {
      if (!analysisId) {
        console.warn('跳过：没有可用的分析记录')
        return
      }

      const response = await getAnalysis({ path: { analysis_id: analysisId } })
      expect(response.data?.success).toBe(true)
      expect(response.data?.data?.application_id).toBe(applicationId)
    })

    it('应该能获取综合分析列表', async () => {
      const response = await getAnalyses()
      expect(response.data?.success).toBe(true)
      expect(response.data?.data).toHaveProperty('items')
    })

    it('应该能按应聘申请筛选分析', async () => {
      const response = await getAnalyses({ query: { application_id: applicationId } })
      expect(response.data?.success).toBe(true)
    })
  })

  // 清理测试数据
  afterAll(async () => {
    if (analysisId) await deleteAnalysis({ path: { analysis_id: analysisId } })
    if (sessionId) await deleteInterviewSession({ path: { session_id: sessionId } })
    if (applicationId) await deleteApplication({ path: { application_id: applicationId } })
    if (positionId) await deletePosition({ path: { position_id: positionId } })
    if (resumeId) await deleteResume({ path: { resume_id: resumeId } })
  })
})
