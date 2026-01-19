/**
 * 语音识别服务类型定义
 * 统一的语音识别接口抽象层
 */

/** 语音识别 Provider 类型 */
export type SpeechProviderType = 'browser' | 'aliyun' | 'custom'

/** 语音识别事件回调 */
export interface SpeechRecognitionCallbacks {
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
  onAudioLevel?: (level: number) => void
}

/** 语音识别配置 */
export interface SpeechRecognitionConfig {
  /** 识别语言，默认 zh-CN */
  lang?: string
  /** 是否持续识别，默认 true */
  continuous?: boolean
  /** 是否返回中间结果，默认 true */
  interimResults?: boolean
}

/** Provider 特定配置 - 浏览器原生 */
export interface BrowserProviderConfig {
  type: 'browser'
}

/** Provider 特定配置 - 阿里云 */
export interface AliyunProviderConfig {
  type: 'aliyun'
  /** 阿里云应用 AppKey (从智能语音交互控制台获取) */
  appKey: string
  /** 阿里云 Token (从控制台或CLI获取，有效期24小时) */
  token: string
  /** 服务地址，默认使用阿里云上海节点 */
  url?: string
}

/** Provider 特定配置 - 自定义 */
export interface CustomProviderConfig {
  type: 'custom'
  /** 自定义 WebSocket 地址 */
  wsUrl: string
  /** 自定义认证 token */
  authToken?: string
  /** 其他自定义参数 */
  [key: string]: unknown
}

/** Provider 配置联合类型 */
export type ProviderConfig = BrowserProviderConfig | AliyunProviderConfig | CustomProviderConfig

/** 完整的语音识别选项 */
export interface SpeechRecognitionOptions extends SpeechRecognitionConfig, SpeechRecognitionCallbacks {
  /** Provider 配置 */
  provider?: ProviderConfig
}

/** Provider 状态 */
export interface ProviderState {
  /** 是否支持当前 Provider */
  isSupported: boolean
  /** 是否正在监听 */
  isListening: boolean
  /** 错误信息 */
  error: string | null
}

/** 语音识别 Provider 接口 */
export interface ISpeechRecognitionProvider {
  /** Provider 名称 */
  readonly name: string
  
  /** Provider 类型 */
  readonly type: SpeechProviderType
  
  /** 获取当前状态 */
  getState(): ProviderState
  
  /** 检查是否支持 */
  checkSupport(): boolean
  
  /** 初始化 Provider */
  initialize(config: SpeechRecognitionConfig, callbacks: SpeechRecognitionCallbacks): Promise<boolean>
  
  /** 开始识别 */
  start(): Promise<boolean>
  
  /** 停止识别 */
  stop(): void
  
  /** 重置 */
  reset(): void
  
  /** 销毁清理资源 */
  destroy(): void
}

/** Provider 工厂函数类型 */
export type ProviderFactory = (config: ProviderConfig) => ISpeechRecognitionProvider

/** Provider 注册信息 */
export interface ProviderRegistration {
  type: SpeechProviderType
  name: string
  description: string
  factory: ProviderFactory
  /** 是否需要配置（如 API Key） */
  requiresConfig: boolean
  /** 配置字段定义 */
  configFields?: ConfigFieldDefinition[]
}

/** 配置字段定义 */
export interface ConfigFieldDefinition {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'select'
  required: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
}
