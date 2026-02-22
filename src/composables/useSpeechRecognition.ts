/**
 * 语音识别 Composable
 * 支持阿里云实时语音识别
 */
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { AliyunSpeechProvider } from '@/services/speech'
import type { AliyunProviderConfig, ISpeechRecognitionProvider } from '@/services/speech'

/** 阿里云语音识别配置存储 key */
const ALIYUN_CONFIG_KEY = 'aliyunSpeechConfig'

/** 获取保存的阿里云配置 */
export function getAliyunConfig(): AliyunProviderConfig | null {
  try {
    const saved = localStorage.getItem(ALIYUN_CONFIG_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('读取阿里云配置失败:', e)
  }
  return null
}

/** 保存阿里云配置 */
export function saveAliyunConfig(config: AliyunProviderConfig): void {
  try {
    localStorage.setItem(ALIYUN_CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('保存阿里云配置失败:', e)
  }
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
  const isConfigured = ref(false)

  let provider: ISpeechRecognitionProvider | null = null

  // 检查是否已配置阿里云
  const checkConfig = () => {
    const config = getAliyunConfig()
    isConfigured.value = !!(config?.appKey && config?.token)
    return isConfigured.value
  }

  // 检查支持性
  const checkSupport = () => {
    isSupported.value = !!(
      typeof WebSocket !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof AudioContext !== 'undefined'
    )
    return isSupported.value
  }

  // 初始化 Provider
  const initProvider = async (): Promise<boolean> => {
    if (provider) {
      provider.destroy()
      provider = null
    }

    const config = getAliyunConfig()
    if (!config?.appKey || !config?.token) {
      error.value = '请先配置阿里云语音识别 AppKey 和 Token'
      return false
    }

    provider = new AliyunSpeechProvider(config)

    const success = await provider.initialize(
      { lang, continuous, interimResults },
      {
        onResult: (text, isFinal) => {
          if (isFinal) {
            finalTranscript.value += text
          } else {
            interimTranscript.value = text
          }
          transcript.value = finalTranscript.value + interimTranscript.value
          onResult?.(text, isFinal)
        },
        onError: (errorMsg) => {
          error.value = errorMsg
          isListening.value = false
          onError?.(errorMsg)
          ElMessage.warning(errorMsg)
        },
        onStart: () => {
          isListening.value = true
          error.value = null
          onStart?.()
        },
        onEnd: () => {
          isListening.value = false
          onEnd?.()
        },
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

  // 启动识别
  const start = async (): Promise<boolean> => {
    if (!checkSupport()) {
      error.value = '浏览器不支持语音识别'
      ElMessage.error(error.value)
      return false
    }

    if (!checkConfig()) {
      error.value = '请先配置阿里云语音识别'
      ElMessage.warning(error.value)
      return false
    }

    if (!provider) {
      const initialized = await initProvider()
      if (!initialized) {
        ElMessage.error(error.value || '初始化失败')
        return false
      }
    }

    interimTranscript.value = ''

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

  // 停止识别
  const stop = () => {
    if (provider) {
      provider.stop()
    }
    isListening.value = false
  }

  // 重置
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

  // 清理资源
  const cleanup = () => {
    if (provider) {
      provider.destroy()
      provider = null
    }
  }

  // 更新阿里云配置
  const updateConfig = async (config: AliyunProviderConfig): Promise<boolean> => {
    stop()
    cleanup()
    saveAliyunConfig(config)
    isConfigured.value = true
    return await initProvider()
  }

  onUnmounted(() => {
    cleanup()
  })

  checkSupport()
  checkConfig()

  return {
    isSupported,
    isListening,
    isConfigured,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    start,
    stop,
    reset,
    cleanup,
    updateConfig,
    getAliyunConfig
  }
}
