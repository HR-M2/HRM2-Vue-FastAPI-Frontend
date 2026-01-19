/**
 * 语音识别 Composable
 * 支持多种语音识别 Provider（浏览器原生、阿里云等）
 * 
 * 使用方法：
 * 1. 默认使用浏览器原生 Web Speech API
 * 2. 可通过系统设置切换到其他 Provider
 * 3. 支持自定义 Provider 扩展
 */
import { ref, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type {
  ISpeechRecognitionProvider,
  ProviderConfig,
  SpeechProviderType
} from '@/services/speech'
import { createSpeechProvider, getAvailableProviders } from '@/services/speech'

/** 语音识别设置存储 key */
const SPEECH_SETTINGS_KEY = 'speechRecognitionSettings'

/** 语音识别设置接口 */
export interface SpeechSettings {
  providerType: SpeechProviderType
  providerConfig?: Record<string, unknown>
}

/** 获取保存的语音识别设置 */
export function getSpeechSettings(): SpeechSettings {
  try {
    const saved = localStorage.getItem(SPEECH_SETTINGS_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('读取语音识别设置失败:', e)
  }
  return { providerType: 'browser' }
}

/** 保存语音识别设置 */
export function saveSpeechSettings(settings: SpeechSettings): void {
  try {
    localStorage.setItem(SPEECH_SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('保存语音识别设置失败:', e)
  }
}

/** 获取当前 Provider 配置 */
function getCurrentProviderConfig(): ProviderConfig {
  const settings = getSpeechSettings()
  const config: ProviderConfig = {
    type: settings.providerType,
    ...settings.providerConfig
  } as ProviderConfig
  return config
}

export interface SpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
  onAudioLevel?: (level: number) => void
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const {
    lang = 'zh-CN',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onStart,
    onEnd,
    onAudioLevel
  } = options

  const isSupported = ref(false)
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const finalTranscript = ref('')
  const error = ref<string | null>(null)
  const currentProviderType = ref<SpeechProviderType>('browser')

  let provider: ISpeechRecognitionProvider | null = null

  /** 内部回调处理 */
  const handleResult = (text: string, isFinal: boolean) => {
    if (isFinal) {
      finalTranscript.value += text
    } else {
      interimTranscript.value = text
    }
    transcript.value = finalTranscript.value + interimTranscript.value
    onResult?.(text, isFinal)
  }

  const handleError = (errorMessage: string) => {
    error.value = errorMessage
    isListening.value = false
    onError?.(errorMessage)
    ElMessage.warning(errorMessage)
  }

  const handleStart = () => {
    isListening.value = true
    error.value = null
    onStart?.()
  }

  const handleEnd = () => {
    isListening.value = false
    onEnd?.()
  }

  /** 初始化 Provider */
  const initProvider = async (): Promise<boolean> => {
    // 销毁现有 Provider
    if (provider) {
      provider.destroy()
      provider = null
    }

    // 创建新 Provider
    const config = getCurrentProviderConfig()
    currentProviderType.value = config.type
    provider = createSpeechProvider(config)

    // 检查支持性
    isSupported.value = provider.checkSupport()
    if (!isSupported.value) {
      error.value = `当前 Provider (${provider.name}) 不受支持`
      return false
    }

    // 初始化
    const success = await provider.initialize(
      { lang, continuous, interimResults },
      {
        onResult: handleResult,
        onError: handleError,
        onStart: handleStart,
        onEnd: handleEnd,
        onAudioLevel
      }
    )

    if (!success) {
      const state = provider.getState()
      error.value = state.error || '初始化语音识别失败'
      return false
    }

    return true
  }

  /** 启动识别 */
  const start = async (): Promise<boolean> => {
    // 确保 Provider 已初始化
    if (!provider) {
      const initialized = await initProvider()
      if (!initialized) {
        return false
      }
    }

    // 重置中间结果
    interimTranscript.value = ''

    // 启动识别
    const success = await provider!.start()
    if (!success) {
      const state = provider!.getState()
      if (state.error) {
        error.value = state.error
        ElMessage.error(state.error)
      }
    }
    return success
  }

  /** 停止识别 */
  const stop = () => {
    if (provider) {
      provider.stop()
    }
    isListening.value = false
  }

  /** 重置 */
  const reset = () => {
    stop()
    transcript.value = ''
    interimTranscript.value = ''
    finalTranscript.value = ''
    error.value = null
    if (provider) {
      provider.reset()
    }
  }

  /** 清理资源 */
  const cleanup = () => {
    if (provider) {
      provider.destroy()
      provider = null
    }
  }

  /** 切换 Provider */
  const switchProvider = async (providerType: SpeechProviderType): Promise<boolean> => {
    // 停止当前识别
    stop()
    cleanup()

    // 更新设置
    const settings = getSpeechSettings()
    settings.providerType = providerType
    saveSpeechSettings(settings)

    // 重新初始化
    return await initProvider()
  }

  /** 更新 Provider 配置 */
  const updateProviderConfig = async (config: Record<string, unknown>): Promise<boolean> => {
    const settings = getSpeechSettings()
    settings.providerConfig = { ...settings.providerConfig, ...config }
    saveSpeechSettings(settings)

    // 如果已有 Provider，需要重新初始化
    if (provider) {
      return await initProvider()
    }
    return true
  }

  /** 获取可用的 Provider 列表 */
  const getProviders = () => {
    return getAvailableProviders()
  }

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  // 初始化检查支持性
  const config = getCurrentProviderConfig()
  currentProviderType.value = config.type
  const tempProvider = createSpeechProvider(config)
  isSupported.value = tempProvider.checkSupport()

  return {
    // 状态
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    currentProviderType,
    // 方法
    start,
    stop,
    reset,
    cleanup,
    // Provider 管理
    switchProvider,
    updateProviderConfig,
    getProviders,
    initProvider
  }
}

// 导出 Provider 相关类型和工具
export { getAvailableProviders } from '@/services/speech'
export type { SpeechProviderType, ProviderConfig } from '@/services/speech'
