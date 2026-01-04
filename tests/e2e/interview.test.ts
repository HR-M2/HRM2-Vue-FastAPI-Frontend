/**
 * 面试会话 E2E 测试
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import {
  createPosition,
  createResume,
  createApplication,
  createInterviewSession,
  getInterviewSessions,
  getInterviewSession,
  syncMessages,
  deleteInterviewSession,
  deleteApplication,
  deletePosition,
  deleteResume,
} from '../../src/api'

beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:8000' })
})

describe('面试会话 CRUD', () => {
  let positionId: string
  let resumeId: string
  let applicationId: string
  let sessionId: string

  // 创建测试数据
  beforeAll(async () => {
    const posRes = await createPosition({
      body: {
        title: `面试测试岗位_${Date.now()}`,
        required_skills: ['Vue', 'TypeScript'],
        min_experience: 1,
      },
    })
    positionId = posRes.data?.data?.id!

    const resumeRes = await createResume({
      body: {
        candidate_name: `面试测试候选人_${Date.now()}`,
        content: '3年前端开发经验，精通Vue3和TypeScript',
        file_hash: `interview_test_${Date.now()}`,
        file_size: 1024,
      },
    })
    resumeId = resumeRes.data?.data?.id!

    const appRes = await createApplication({
      body: { position_id: positionId, resume_id: resumeId },
    })
    applicationId = appRes.data?.data?.id!
  })

  it('应该能获取面试会话列表', async () => {
    const response = await getInterviewSessions()
    expect(response.data?.success).toBe(true)
    expect(response.data?.data).toHaveProperty('items')
  })

  it('应该能创建面试会话', async () => {
    const response = await createInterviewSession({
      body: {
        application_id: applicationId,
        interview_type: 'technical',
      },
    })
    expect(response.data?.success).toBe(true)
    expect(response.data?.data?.id).toBeDefined()
    sessionId = response.data?.data?.id!
  })

  it('应该能获取面试会话详情', async () => {
    const response = await getInterviewSession({ path: { session_id: sessionId } })
    expect(response.data?.success).toBe(true)
    expect(response.data?.data?.application_id).toBe(applicationId)
  })

  it('应该能同步对话记录', async () => {
    const response = await syncMessages({
      path: { session_id: sessionId },
      body: {
        messages: [
          { role: 'interviewer', content: '请介绍一下你的Vue项目经验' },
          { role: 'candidate', content: '我在上一家公司负责了一个Vue3+TypeScript的后台管理系统' },
        ],
      },
    })
    expect(response.data?.success).toBe(true)
  })

  // 清理测试数据
  afterAll(async () => {
    if (sessionId) await deleteInterviewSession({ path: { session_id: sessionId } })
    if (applicationId) await deleteApplication({ path: { application_id: applicationId } })
    if (positionId) await deletePosition({ path: { position_id: positionId } })
    if (resumeId) await deleteResume({ path: { resume_id: resumeId } })
  })
})
