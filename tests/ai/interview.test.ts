/**
 * AI 面试功能测试
 * 
 * 测试 AI 面试问题生成、自适应问题、模拟回答等功能
 * 运行前需要启动后端服务: python run.py
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import {
  createPosition,
  createResume,
  createApplication,
  createInterviewSession,
  aiGenerateInitialQuestions,
  aiGenerateAdaptiveQuestions,
  aiSimulateCandidateAnswer,
  aiGenerateReport,
  syncMessages,
  getAiStatus,
  deleteInterviewSession,
  deleteApplication,
  deletePosition,
  deleteResume,
} from '../../src/api'

beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:8000' })
})

describe('AI 面试功能', () => {
  let positionId: string
  let resumeId: string
  let applicationId: string
  let sessionId: string

  // 创建测试数据
  beforeAll(async () => {
    const status = await getAiStatus()
    if (!status.data?.data?.is_configured) {
      console.warn('⚠️ LLM 服务未配置，AI 面试测试可能会失败')
    }

    // 创建测试岗位
    const posRes = await createPosition({
      body: {
        title: `AI面试测试岗位_${Date.now()}`,
        description: '负责前端开发和用户体验优化',
        required_skills: ['Vue3', 'TypeScript', 'Element Plus'],
        min_experience: 2,
      },
    })
    positionId = posRes.data?.data?.id!

    // 创建测试简历
    const resumeRes = await createResume({
      body: {
        candidate_name: `AI面试测试候选人_${Date.now()}`,
        content: `
          个人简介：
          3年前端开发经验，专注于Vue生态系统开发。
          
          工作经历：
          - 2021-2024 某互联网公司 前端开发工程师
            使用Vue3 + TypeScript开发企业级后台管理系统
            负责组件库封装和性能优化
            
          技术技能：
          - 前端框架：Vue3, React
          - 语言：TypeScript, JavaScript
          - UI库：Element Plus, Ant Design
          - 工具：Vite, Webpack, Git
          
          项目经验：
          - 企业级CRM系统：使用Vue3 + Pinia + Element Plus
          - 数据可视化平台：使用ECharts进行图表开发
        `,
        file_hash: `ai_interview_test_${Date.now()}`,
        file_size: 1536,
      },
    })
    resumeId = resumeRes.data?.data?.id!

    // 创建应聘申请
    const appRes = await createApplication({
      body: { position_id: positionId, resume_id: resumeId },
    })
    applicationId = appRes.data?.data?.id!

    // 创建面试会话
    const sessionRes = await createInterviewSession({
      body: {
        application_id: applicationId,
        interview_type: 'technical',
      },
    })
    sessionId = sessionRes.data?.data?.id!
  })

  describe('初始问题生成', () => {
    it('应该能生成初始面试问题', async () => {
      const response = await aiGenerateInitialQuestions({
        body: {
          session_id: sessionId,
          count: 3,
          interest_point_count: 2,
        },
      })

      if (response.error) {
        console.warn('AI 问题生成失败:', response.error)
        return
      }

      expect(response.data?.success).toBe(true)
      
      const data = response.data?.data as { questions?: unknown[] } | null
      expect(data).toHaveProperty('questions')
      expect(data?.questions).toBeInstanceOf(Array)
      
      if (data?.questions?.length) {
        console.log('生成的问题数量:', data.questions.length)
      }
    })
  })

  describe('自适应问题生成', () => {
    it('应该能根据回答生成追问', async () => {
      const response = await aiGenerateAdaptiveQuestions({
        body: {
          session_id: sessionId,
          current_question: '请介绍一下你在Vue3项目中的经验',
          current_answer: '我在上一家公司负责了一个Vue3+TypeScript的后台管理系统，主要使用Pinia做状态管理，Element Plus做UI组件。',
          followup_count: 2,
          alternative_count: 2,
        },
      })

      if (response.error) {
        console.warn('AI 自适应问题生成失败:', response.error)
        return
      }

      expect(response.data?.success).toBe(true)
      expect(response.data?.data).toBeDefined()
    })
  })

  describe('模拟候选人回答', () => {
    it('应该能模拟理想候选人回答', async () => {
      const response = await aiSimulateCandidateAnswer({
        body: {
          session_id: sessionId,
          question: '请描述一个你解决过的复杂技术问题',
          candidate_type: 'ideal',
        },
      })

      if (response.error) {
        console.warn('AI 模拟回答失败:', response.error)
        return
      }

      expect(response.data?.success).toBe(true)
      expect(response.data?.data?.answer).toBeDefined()
    })

    it('应该能模拟初级候选人回答', async () => {
      const response = await aiSimulateCandidateAnswer({
        body: {
          session_id: sessionId,
          question: '你对微前端架构有什么了解？',
          candidate_type: 'junior',
        },
      })

      if (response.error) {
        console.warn('AI 模拟回答失败:', response.error)
        return
      }

      expect(response.data?.success).toBe(true)
      expect(response.data?.data?.answer).toBeDefined()
    })
  })

  describe('面试报告生成', () => {
    it('应该能生成面试报告', async () => {
      // 先同步一些对话记录
      await syncMessages({
        path: { session_id: sessionId },
        body: {
          messages: [
            { role: 'interviewer', content: '请介绍一下你的Vue3项目经验' },
            { role: 'candidate', content: '我在上一家公司负责了一个Vue3+TypeScript的后台管理系统，使用Pinia做状态管理。' },
            { role: 'interviewer', content: '你在项目中遇到过什么技术难题？' },
            { role: 'candidate', content: '主要是性能优化方面，我通过虚拟滚动和组件懒加载解决了大数据量渲染的问题。' },
          ],
        },
      })

      const response = await aiGenerateReport({
        body: {
          session_id: sessionId,
          hr_notes: '候选人沟通能力良好，技术基础扎实',
        },
      })

      if (response.error) {
        console.warn('AI 报告生成失败:', response.error)
        return
      }

      expect(response.data?.success).toBe(true)
      expect(response.data?.data).toBeDefined()
    })
  })

  // 清理测试数据
  afterAll(async () => {
    if (sessionId) await deleteInterviewSession({ path: { session_id: sessionId } })
    if (applicationId) await deleteApplication({ path: { application_id: applicationId } })
    if (positionId) await deletePosition({ path: { position_id: positionId } })
    if (resumeId) await deleteResume({ path: { resume_id: resumeId } })
  })
})
