/**
 * 语音识别 Provider 注册表
 * 管理所有可用的语音识别 Provider
 */
import type {
  SpeechProviderType,
  ISpeechRecognitionProvider,
  ProviderConfig,
  ProviderRegistration,
  ConfigFieldDefinition,
  AliyunProviderConfig
} from './types'
import { BrowserSpeechProvider } from './providers/BrowserSpeechProvider'
import { AliyunSpeechProvider } from './providers/AliyunSpeechProvider'

class SpeechProviderRegistry {
  private static instance: SpeechProviderRegistry
  private providers: Map<SpeechProviderType, ProviderRegistration> = new Map()

  private constructor() {
    this.registerBuiltInProviders()
  }

  static getInstance(): SpeechProviderRegistry {
    if (!SpeechProviderRegistry.instance) {
      SpeechProviderRegistry.instance = new SpeechProviderRegistry()
    }
    return SpeechProviderRegistry.instance
  }

  private registerBuiltInProviders(): void {
    // 注册浏览器原生 Provider
    this.register({
      type: 'browser',
      name: '浏览器原生',
      description: '使用浏览器内置的 Web Speech API（需要网络连接到 Google 服务）',
      factory: () => new BrowserSpeechProvider(),
      requiresConfig: false
    })

    // 注册阿里云 Provider
    this.register({
      type: 'aliyun',
      name: '阿里云语音识别',
      description: '使用阿里云实时语音识别服务（需要配置 Token）',
      factory: (config) => {
        const provider = new AliyunSpeechProvider()
        if (config.type === 'aliyun') {
          provider.setProviderConfig(config as AliyunProviderConfig)
        }
        return provider
      },
      requiresConfig: true,
      configFields: [
        {
          key: 'appKey',
          label: 'AppKey',
          type: 'text',
          required: true,
          placeholder: '从阿里云智能语音交互控制台获取'
        },
        {
          key: 'token',
          label: 'Token',
          type: 'password',
          required: true,
          placeholder: '从阿里云控制台或CLI获取，有效期24小时'
        },
        {
          key: 'url',
          label: '服务地址',
          type: 'text',
          required: false,
          placeholder: '可选，默认使用阿里云上海节点'
        }
      ]
    })
  }

  /**
   * 注册一个新的 Provider
   */
  register(registration: ProviderRegistration): void {
    this.providers.set(registration.type, registration)
  }

  /**
   * 注销一个 Provider
   */
  unregister(type: SpeechProviderType): boolean {
    return this.providers.delete(type)
  }

  /**
   * 获取所有已注册的 Provider 信息
   */
  getRegistrations(): ProviderRegistration[] {
    return Array.from(this.providers.values())
  }

  /**
   * 获取指定类型的 Provider 注册信息
   */
  getRegistration(type: SpeechProviderType): ProviderRegistration | undefined {
    return this.providers.get(type)
  }

  /**
   * 创建 Provider 实例
   */
  createProvider(config: ProviderConfig): ISpeechRecognitionProvider {
    const registration = this.providers.get(config.type)
    if (!registration) {
      console.warn(`未找到类型为 "${config.type}" 的语音识别 Provider，使用默认浏览器原生 Provider`)
      return new BrowserSpeechProvider()
    }
    return registration.factory(config)
  }

  /**
   * 检查指定类型的 Provider 是否已注册
   */
  hasProvider(type: SpeechProviderType): boolean {
    return this.providers.has(type)
  }

  /**
   * 获取 Provider 的配置字段定义
   */
  getConfigFields(type: SpeechProviderType): ConfigFieldDefinition[] {
    const registration = this.providers.get(type)
    return registration?.configFields || []
  }

  /**
   * 检查 Provider 是否需要配置
   */
  requiresConfig(type: SpeechProviderType): boolean {
    const registration = this.providers.get(type)
    return registration?.requiresConfig || false
  }
}

// 导出单例获取函数
export function getSpeechProviderRegistry(): SpeechProviderRegistry {
  return SpeechProviderRegistry.getInstance()
}

// 便捷函数：创建 Provider
export function createSpeechProvider(config: ProviderConfig): ISpeechRecognitionProvider {
  return getSpeechProviderRegistry().createProvider(config)
}

// 便捷函数：获取所有可用的 Provider
export function getAvailableProviders(): ProviderRegistration[] {
  return getSpeechProviderRegistry().getRegistrations()
}

// 便捷函数：注册自定义 Provider
export function registerCustomProvider(registration: ProviderRegistration): void {
  getSpeechProviderRegistry().register(registration)
}
