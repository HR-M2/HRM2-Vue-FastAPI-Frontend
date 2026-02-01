/**
 * 语音识别服务入口
 */

export type {
  SpeechProviderType,
  SpeechRecognitionCallbacks,
  SpeechRecognitionConfig,
  ProviderConfig,
  AliyunProviderConfig,
  ProviderState,
  ISpeechRecognitionProvider
} from './types'

export { AliyunSpeechProvider } from './AliyunSpeechProvider'
