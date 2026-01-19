/**
 * 语音识别服务主入口
 * 提供统一的语音识别抽象层
 */

// 类型导出
export type {
  SpeechProviderType,
  SpeechRecognitionCallbacks,
  SpeechRecognitionConfig,
  SpeechRecognitionOptions,
  ProviderConfig,
  BrowserProviderConfig,
  AliyunProviderConfig,
  CustomProviderConfig,
  ProviderState,
  ISpeechRecognitionProvider,
  ProviderFactory,
  ProviderRegistration,
  ConfigFieldDefinition
} from './types'

// Provider 导出
export { BrowserSpeechProvider } from './providers/BrowserSpeechProvider'
export { AliyunSpeechProvider } from './providers/AliyunSpeechProvider'

// Registry 导出
export {
  getSpeechProviderRegistry,
  createSpeechProvider,
  getAvailableProviders,
  registerCustomProvider
} from './SpeechProviderRegistry'
