import { defineConfig } from 'vitest/config'

/**
 * AI 功能测试配置
 * 
 * AI 测试耗时较长，单独配置更长的超时时间
 */
export default defineConfig({
  test: {
    include: ['tests/ai/**/*.test.ts'],
    testTimeout: 120000,  // 单个测试 120 秒
    hookTimeout: 60000,   // beforeAll/afterAll 60 秒
    maxConcurrency: 2,    // 限制并发数为 2，避免 LLM API 限流
    sequence: {
      shuffle: false,     // 按顺序执行，避免并发问题
    },
  },
})
