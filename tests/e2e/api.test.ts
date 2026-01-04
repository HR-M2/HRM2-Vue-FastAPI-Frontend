/**
 * API 端到端测试
 * 
 * 测试前端 API 客户端与后端的实际交互
 * 运行前需要启动后端服务: python run.py
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import {
  getPositions,
  createPosition,
  getPosition,
  updatePosition,
  deletePosition,
  getResumes,
  createResume,
  deleteResume,
  getApplications,
  createApplication,
  deleteApplication,
  healthCheck,
} from '../../src/api'

// 配置 API 客户端
beforeAll(() => {
  client.setConfig({
    baseUrl: 'http://localhost:8000',
  })
})

describe('API E2E Tests', () => {
  // 存储测试过程中创建的资源 ID，用于清理
  let testPositionId: string
  let testResumeId: string
  let testApplicationId: string

  describe('健康检查', () => {
    it('后端服务应该正常运行', async () => {
      const response = await healthCheck()
      expect(response.data?.success).toBe(true)
    })
  })

  describe('岗位管理', () => {
    it('应该能获取岗位列表', async () => {
      const response = await getPositions()
      expect(response.data?.success).toBe(true)
      expect(response.data?.data).toHaveProperty('items')
      expect(response.data?.data).toHaveProperty('total')
    })

    it('应该能创建岗位', async () => {
      const response = await createPosition({
        body: {
          title: `E2E测试岗位_${Date.now()}`,
          department: '测试部门',
          description: '这是一个端到端测试创建的岗位',
          required_skills: ['TypeScript', 'Vue'],
          min_experience: 1,
        },
      })
      expect(response.data?.success).toBe(true)
      expect(response.data?.data?.id).toBeDefined()
      testPositionId = response.data?.data?.id!
    })

    it('应该能获取岗位详情', async () => {
      const response = await getPosition({ path: { position_id: testPositionId } })
      expect(response.data?.success).toBe(true)
      expect(response.data?.data?.title).toContain('E2E测试岗位')
    })

    it('应该能更新岗位', async () => {
      const response = await updatePosition({
        path: { position_id: testPositionId },
        body: { description: '更新后的描述' },
      })
      expect(response.data?.success).toBe(true)
      expect(response.data?.data?.description).toBe('更新后的描述')
    })
  })

  describe('简历管理', () => {
    it('应该能获取简历列表', async () => {
      const response = await getResumes()
      expect(response.data?.success).toBe(true)
      expect(response.data?.data).toHaveProperty('items')
    })

    it('应该能创建简历', async () => {
      const response = await createResume({
        body: {
          candidate_name: `E2E测试候选人_${Date.now()}`,
          content: '这是一份端到端测试创建的简历内容',
          file_hash: `e2e_test_hash_${Date.now()}`,
          file_size: 1024,
        },
      })
      expect(response.data?.success).toBe(true)
      expect(response.data?.data?.id).toBeDefined()
      testResumeId = response.data?.data?.id!
    })
  })

  describe('应聘申请', () => {
    it('应该能获取申请列表', async () => {
      const response = await getApplications()
      expect(response.data?.success).toBe(true)
      expect(response.data?.data).toHaveProperty('items')
    })

    it('应该能创建应聘申请', async () => {
      const response = await createApplication({
        body: {
          position_id: testPositionId,
          resume_id: testResumeId,
          notes: 'E2E测试创建的申请',
        },
      })
      expect(response.data?.success).toBe(true)
      expect(response.data?.data?.id).toBeDefined()
      testApplicationId = response.data?.data?.id!
    })
  })

  describe('清理测试数据', () => {
    it('应该能删除应聘申请', async () => {
      if (testApplicationId) {
        const response = await deleteApplication({ path: { application_id: testApplicationId } })
        expect(response.data?.success).toBe(true)
      }
    })

    it('应该能删除岗位', async () => {
      if (testPositionId) {
        const response = await deletePosition({ path: { position_id: testPositionId } })
        expect(response.data?.success).toBe(true)
      }
    })

    it('应该能删除简历', async () => {
      if (testResumeId) {
        const response = await deleteResume({ path: { resume_id: testResumeId } })
        expect(response.data?.success).toBe(true)
      }
    })
  })
})
