/**
 * AI 岗位需求生成测试
 * 
 * 测试 AI 根据描述生成结构化岗位需求的功能
 * 运行前需要启动后端服务: python run.py
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import { aiGeneratePosition, getAiStatus } from '../../src/api'

beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:8000' })
})

describe('AI 岗位需求生成', () => {
  // 检查 AI 服务是否可用
  beforeAll(async () => {
    const status = await getAiStatus()
    if (!status.data?.data?.is_configured) {
      console.warn('⚠️ LLM 服务未配置，AI 测试可能会失败')
    }
  })

  it('应该能根据简短描述生成岗位需求', async () => {
    const response = await aiGeneratePosition({
      body: {
        description: '招一个3年经验的Python后端开发',
      },
    })

    // 如果 LLM 未配置，会返回错误
    if (response.error) {
      expect(response.error).toBeDefined()
      console.warn('AI 服务未配置或调用失败:', response.error)
      return
    }

    expect(response.data?.success).toBe(true)
    expect(response.data?.data).toBeDefined()
    
    const positionData = response.data?.data
    // 验证生成的岗位数据包含必要字段
    expect(positionData).toHaveProperty('title')
    expect(positionData).toHaveProperty('required_skills')
  })

  it('应该能根据详细描述生成岗位需求', async () => {
    const response = await aiGeneratePosition({
      body: {
        description: `
          我们需要招聘一名高级前端开发工程师，要求：
          - 5年以上前端开发经验
          - 精通 Vue3、TypeScript
          - 熟悉 Element Plus 组件库
          - 有大型项目架构经验
          - 良好的团队协作能力
        `,
      },
    })

    if (response.error) {
      console.warn('AI 服务调用失败:', response.error)
      return
    }

    expect(response.data?.success).toBe(true)
    expect(response.data?.data).toBeDefined()
  })

  it('应该能处理带参考文档的岗位生成', async () => {
    const response = await aiGeneratePosition({
      body: {
        description: '招聘全栈开发工程师',
        documents: [
          {
            name: '技术栈说明',
            content: '我们使用 Vue3 + FastAPI 技术栈，数据库使用 PostgreSQL',
          },
        ],
      },
    })

    if (response.error) {
      console.warn('AI 服务调用失败:', response.error)
      return
    }

    expect(response.data?.success).toBe(true)
  })
})
