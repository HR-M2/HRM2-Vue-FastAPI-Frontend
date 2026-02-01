/**
 * 语音识别服务类型定义
 */

/** 语音识别 Provider 类型 */
export type SpeechProviderType = 'aliyun'

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
  lang?: string
  continuous?: boolean
  interimResults?: boolean
}

/** 阿里云 Provider 配置 */
export interface AliyunProviderConfig {
  type: 'aliyun'
  appKey: string
  token: string
  url?: string
}

/** Provider 配置 */
export type ProviderConfig = AliyunProviderConfig

/** Provider 状态 */
export interface ProviderState {
  isSupported: boolean
  isListening: boolean
  error: string | null
}

/** 语音识别 Provider 接口 */
export interface ISpeechRecognitionProvider {
  readonly name: string
  readonly type: SpeechProviderType
  getState(): ProviderState
  checkSupport(): boolean
  initialize(config: SpeechRecognitionConfig, callbacks: SpeechRecognitionCallbacks): Promise<boolean>
  start(): Promise<boolean>
  stop(): void
  reset(): void
  destroy(): void
  setProviderConfig?(config: AliyunProviderConfig): void
}
