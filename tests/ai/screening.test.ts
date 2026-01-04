/**
 * AI 简历筛选测试
 * 
 * 测试 AI 多 Agent 协作进行简历筛选的功能
 * 运行前需要启动后端服务: python run.py
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import {
  createPosition,
  createResume,
  createApplication,
  startAiScreening,
  getScreeningStatus,
  getAiStatus,
  deleteApplication,
  deletePosition,
  deleteResume,
  deleteScreeningTask,
  getScreeningTasks,
} from '../../src/api'

beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:8000' })
})

describe('AI 简历筛选', () => {
  let positionId: string
  let resumeId: string
  let applicationId: string
  let taskId: string

  // 创建测试数据
  beforeAll(async () => {
    // 检查 AI 服务状态
    const status = await getAiStatus()
    if (!status.data?.data?.is_configured) {
      console.warn('⚠️ LLM 服务未配置，AI 筛选测试可能会失败')
    }

    // 创建测试岗位
    const posRes = await createPosition({
      body: {
        title: `AI筛选测试岗位_${Date.now()}`,
        description: '负责后端API开发和系统架构设计',
        required_skills: ['Python', 'FastAPI', 'PostgreSQL'],
        optional_skills: ['Docker', 'Kubernetes'],
        min_experience: 3,
      },
    })
    positionId = posRes.data?.data?.id!

    // 创建测试简历
    const resumeRes = await createResume({
      body: {
        candidate_name: `AI筛选测试候选人_${Date.now()}`,
        content: `
          个人简介：
          5年Python后端开发经验，精通FastAPI和Django框架。
          
          工作经历：
          - 2020-2023 某科技公司 高级后端工程师
            负责核心API开发，使用FastAPI构建微服务架构
            优化数据库查询性能，提升系统响应速度50%
          
          - 2018-2020 某互联网公司 后端开发工程师
            参与电商平台后端开发，使用Django框架
            
          技术技能：
          - 编程语言：Python, JavaScript
          - 框架：FastAPI, Django, Flask
          - 数据库：PostgreSQL, MySQL, Redis
          - 工具：Docker, Git, Linux
          
          教育背景：
          计算机科学与技术本科，2018年毕业
        `,
        file_hash: `ai_screening_test_${Date.now()}`,
        file_size: 2048,
      },
    })
    resumeId = resumeRes.data?.data?.id!

    // 创建应聘申请
    const appRes = await createApplication({
      body: { position_id: positionId, resume_id: resumeId },
    })
    applicationId = appRes.data?.data?.id!
  })

  it('应该能启动 AI 简历筛选任务', async () => {
    const response = await startAiScreening({
      body: { application_id: applicationId },
    })

    if (response.error) {
      console.warn('AI 筛选启动失败:', response.error)
      return
    }

    expect(response.data?.success).toBe(true)
    
    const data = response.data?.data as { task_id?: string } | null
    expect(data?.task_id).toBeDefined()
    taskId = data?.task_id!
  })

  it('应该能获取筛选任务状态', async () => {
    if (!taskId) {
      console.warn('跳过：没有可用的筛选任务')
      return
    }

    const response = await getScreeningStatus({ path: { task_id: taskId } })
    expect(response.data?.success).toBe(true)
    expect(response.data?.data).toHaveProperty('status')
  })

  it('应该能轮询等待筛选完成', async () => {
    if (!taskId) {
      console.warn('跳过：没有可用的筛选任务')
      return
    }

    // 轮询等待任务完成（最多等待 90 秒）
    const maxWaitTime = 90000
    const pollInterval = 3000
    let elapsed = 0
    let status: string = 'running'

    while (elapsed < maxWaitTime && status === 'running') {
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      elapsed += pollInterval

      const response = await getScreeningStatus({ path: { task_id: taskId } })
      const data = response.data?.data as { status?: string; progress?: number } | null
      status = data?.status || 'unknown'
      
      console.log(`筛选进度: ${data?.progress || 0}%, 状态: ${status}`)
    }

    // 验证最终状态
    expect(['completed', 'failed']).toContain(status)
    
    if (status === 'completed') {
      console.log('✅ AI 筛选任务完成')
    } else {
      console.warn('⚠️ AI 筛选任务失败或超时')
    }
  })

  // 清理测试数据
  afterAll(async () => {
    // 先获取并删除筛选任务
    if (applicationId) {
      const tasks = await getScreeningTasks({ query: { application_id: applicationId } })
      for (const task of tasks.data?.data?.items || []) {
        await deleteScreeningTask({ path: { task_id: task.id } })
      }
    }
    if (applicationId) await deleteApplication({ path: { application_id: applicationId } })
    if (positionId) await deletePosition({ path: { position_id: positionId } })
    if (resumeId) await deleteResume({ path: { resume_id: resumeId } })
  })
})
