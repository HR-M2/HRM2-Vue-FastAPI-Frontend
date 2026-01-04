/**
 * 筛选任务 E2E 测试
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import {
  createPosition,
  createResume,
  createApplication,
  createScreeningTask,
  getScreeningTasks,
  getScreeningTask,
  getScreeningStatus,
  deleteScreeningTask,
  deleteApplication,
  deletePosition,
  deleteResume,
} from '../../src/api'

beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:8000' })
})

describe('筛选任务 CRUD', () => {
  let positionId: string
  let resumeId: string
  let applicationId: string
  let taskId: string

  // 创建测试数据
  beforeAll(async () => {
    const posRes = await createPosition({
      body: {
        title: `筛选测试岗位_${Date.now()}`,
        required_skills: ['Python', 'FastAPI'],
        min_experience: 2,
      },
    })
    positionId = posRes.data?.data?.id!

    const resumeRes = await createResume({
      body: {
        candidate_name: `筛选测试候选人_${Date.now()}`,
        content: '5年Python开发经验，熟悉FastAPI、Django框架',
        file_hash: `screening_test_${Date.now()}`,
        file_size: 1024,
      },
    })
    resumeId = resumeRes.data?.data?.id!

    const appRes = await createApplication({
      body: { position_id: positionId, resume_id: resumeId },
    })
    applicationId = appRes.data?.data?.id!
  })

  it('应该能获取筛选任务列表', async () => {
    const response = await getScreeningTasks()
    expect(response.data?.success).toBe(true)
    expect(response.data?.data).toHaveProperty('items')
  })

  it('应该能创建筛选任务', async () => {
    const response = await createScreeningTask({
      body: { application_id: applicationId },
    })
    expect(response.data?.success).toBe(true)
    expect(response.data?.data?.id).toBeDefined()
    taskId = response.data?.data?.id!
  })

  it('应该能获取筛选任务详情', async () => {
    const response = await getScreeningTask({ path: { task_id: taskId } })
    expect(response.data?.success).toBe(true)
    expect(response.data?.data?.application_id).toBe(applicationId)
  })

  it('应该能获取筛选任务状态', async () => {
    const response = await getScreeningStatus({ path: { task_id: taskId } })
    expect(response.data?.success).toBe(true)
    expect(response.data?.data).toHaveProperty('status')
  })

  // 清理测试数据
  afterAll(async () => {
    if (taskId) await deleteScreeningTask({ path: { task_id: taskId } })
    if (applicationId) await deleteApplication({ path: { application_id: applicationId } })
    if (positionId) await deletePosition({ path: { position_id: positionId } })
    if (resumeId) await deleteResume({ path: { resume_id: resumeId } })
  })
})
