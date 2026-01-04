/**
 * 视频分析 E2E 测试
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import {
  createPosition,
  createResume,
  createApplication,
  createVideoAnalysis,
  getVideoAnalyses,
  getVideoAnalysis,
  getVideoStatus,
  deleteVideoAnalysis,
  deleteApplication,
  deletePosition,
  deleteResume,
} from '../../src/api'

beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:8000' })
})

describe('视频分析 CRUD', () => {
  let positionId: string
  let resumeId: string
  let applicationId: string
  let videoId: string

  // 创建测试数据
  beforeAll(async () => {
    const posRes = await createPosition({
      body: {
        title: `视频测试岗位_${Date.now()}`,
        required_skills: ['沟通能力'],
        min_experience: 0,
      },
    })
    positionId = posRes.data?.data?.id!

    const resumeRes = await createResume({
      body: {
        candidate_name: `视频测试候选人_${Date.now()}`,
        content: '应届毕业生，沟通能力强',
        file_hash: `video_test_${Date.now()}`,
        file_size: 1024,
      },
    })
    resumeId = resumeRes.data?.data?.id!

    const appRes = await createApplication({
      body: { position_id: positionId, resume_id: resumeId },
    })
    applicationId = appRes.data?.data?.id!
  })

  it('应该能获取视频分析列表', async () => {
    const response = await getVideoAnalyses()
    expect(response.data?.success).toBe(true)
    expect(response.data?.data).toHaveProperty('items')
  })

  it('应该能创建视频分析', async () => {
    const response = await createVideoAnalysis({
      body: {
        application_id: applicationId,
        video_name: 'test_video.mp4',
        video_url: 'https://example.com/test.mp4',
      },
    })
    expect(response.data?.success).toBe(true)
    expect(response.data?.data?.id).toBeDefined()
    videoId = response.data?.data?.id!
  })

  it('应该能获取视频分析详情', async () => {
    const response = await getVideoAnalysis({ path: { video_id: videoId } })
    expect(response.data?.success).toBe(true)
    expect(response.data?.data?.application_id).toBe(applicationId)
  })

  it('应该能获取视频分析状态', async () => {
    const response = await getVideoStatus({ path: { video_id: videoId } })
    expect(response.data?.success).toBe(true)
    expect(response.data?.data).toHaveProperty('status')
  })

  // 清理测试数据
  afterAll(async () => {
    if (videoId) await deleteVideoAnalysis({ path: { video_id: videoId } })
    if (applicationId) await deleteApplication({ path: { application_id: applicationId } })
    if (positionId) await deletePosition({ path: { position_id: positionId } })
    if (resumeId) await deleteResume({ path: { resume_id: resumeId } })
  })
})
