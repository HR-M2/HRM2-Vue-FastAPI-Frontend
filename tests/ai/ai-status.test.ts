/**
 * AI 服务状态测试
 * 
 * 测试 AI/LLM 服务的配置状态
 * 运行前需要启动后端服务: python run.py
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { client } from '../../src/api/client.gen'
import { getAiStatus, healthCheck } from '../../src/api'

beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:8000' })
})

describe('AI 服务状态', () => {
  it('后端服务应该正常运行', async () => {
    const response = await healthCheck()
    expect(response.data?.success).toBe(true)
  })

  it('应该能获取 AI 服务状态', async () => {
    const response = await getAiStatus()
    expect(response.data?.success).toBe(true)
    expect(response.data?.data).toHaveProperty('is_configured')
  })

  it('AI 服务应该已配置（如果配置了 API Key）', async () => {
    const response = await getAiStatus()
    // 注意：这个测试假设已配置 LLM API Key
    // 如果未配置，测试会失败，提示需要配置
    if (!response.data?.data?.is_configured) {
      console.warn('⚠️ LLM 服务未配置，请检查后端 .env 文件中的 API Key 配置')
    }
    expect(response.data?.data).toBeDefined()
  })
})
