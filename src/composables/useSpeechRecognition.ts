/**
 * 语音识别 Composable
 * 使用 Web Speech API 实现实时语音转文字
 */
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onaudiostart: ((this: ISpeechRecognition, ev: Event) => void) | null
  onaudioend: ((this: ISpeechRecognition, ev: Event) => void) | null
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onspeechstart: ((this: ISpeechRecognition, ev: Event) => void) | null
  onspeechend: ((this: ISpeechRecognition, ev: Event) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
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
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const {
    lang = 'zh-CN',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onStart,
    onEnd
  } = options

  const isSupported = ref(false)
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const finalTranscript = ref('')
  const error = ref<string | null>(null)

  let recognition: ISpeechRecognition | null = null
  let shouldBeListening = false // 用于追踪用户是否希望继续录音
  let restartAttempts = 0
  let networkErrorRetries = 0 // 网络错误重试计数
  const MAX_RESTART_ATTEMPTS = 5
  const MAX_NETWORK_RETRIES = 3 // 网络错误最大重试次数

  const checkSupport = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    isSupported.value = !!SpeechRecognitionAPI
    return isSupported.value
  }

  const destroyRecognition = () => {
    if (recognition) {
      recognition.onstart = null
      recognition.onend = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onspeechstart = null
      recognition.onspeechend = null
      try {
        recognition.abort()
      } catch (_e) {
        // ignore
      }
      recognition = null
    }
  }

  const initRecognition = () => {
    if (!checkSupport()) {
      error.value = '您的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器'
      ElMessage.error(error.value)
      return false
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognitionAPI()

    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      isListening.value = true
      error.value = null
      // 成功启动后重置所有重试计数
      restartAttempts = 0
      networkErrorRetries = 0
      onStart?.()
    }

    recognition.onend = () => {
      isListening.value = false
      
      // 如果用户希望继续录音，自动重启
      if (shouldBeListening && restartAttempts < MAX_RESTART_ATTEMPTS) {
        restartAttempts++
        console.log(`语音识别自动重启 (${restartAttempts}/${MAX_RESTART_ATTEMPTS})`)
        setTimeout(() => {
          if (shouldBeListening) {
            // 完全重建 recognition 对象以绕过 Chrome 60秒限制
            destroyRecognition()
            if (initRecognition()) {
              try {
                recognition?.start()
              } catch (err) {
                console.error('重启语音识别失败:', err)
                shouldBeListening = false
                onEnd?.()
              }
            } else {
              shouldBeListening = false
              onEnd?.()
            }
          }
        }, 100)
      } else {
        restartAttempts = 0
        onEnd?.()
      }
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result) {
          const transcriptText = result[0]?.transcript || ''
          if (result.isFinal) {
            final += transcriptText
          } else {
            interim += transcriptText
          }
        }
      }

      interimTranscript.value = interim

      if (final) {
        finalTranscript.value += final
      }

      transcript.value = finalTranscript.value + interimTranscript.value

      if (final) {
        onResult?.(final, true)
      } else if (interim) {
        onResult?.(interim, false)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = ''
      let shouldRetry = false
      
      switch (event.error) {
        case 'no-speech':
          // 无语音检测，静默处理，自动继续
          console.log('未检测到语音，继续监听...')
          return
        case 'audio-capture':
          errorMessage = '未找到麦克风，请确保麦克风已连接'
          break
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
          break
        case 'network':
          // 网络错误，尝试自动重试
          if (networkErrorRetries < MAX_NETWORK_RETRIES && shouldBeListening) {
            networkErrorRetries++
            console.log(`网络错误，自动重试 (${networkErrorRetries}/${MAX_NETWORK_RETRIES})...`)
            setTimeout(() => {
              if (shouldBeListening) {
                destroyRecognition()
                if (initRecognition()) {
                  try {
                    recognition?.start()
                  } catch (err) {
                    console.error('网络错误重试失败:', err)
                  }
                }
              }
            }, 1000 * networkErrorRetries) // 递增延迟重试
            return
          }
          errorMessage = '网络连接异常，请检查网络后重试（语音识别需要访问 Google 服务）'
          break
        case 'aborted':
          return
        case 'service-not-allowed':
          errorMessage = '语音识别服务不可用，请稍后重试'
          break
        default:
          errorMessage = `语音识别错误: ${event.error}`
      }
      
      error.value = errorMessage
      isListening.value = false
      shouldBeListening = false
      onError?.(errorMessage)
      ElMessage.warning(errorMessage)
    }

    recognition.onspeechstart = () => {}
    recognition.onspeechend = () => {}

    return true
  }

  const start = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      error.value = '无法访问麦克风，请确保已授予权限'
      ElMessage.error(error.value)
      onError?.(error.value)
      return false
    }

    if (!recognition) {
      if (!initRecognition()) {
        return false
      }
    }

    try {
      interimTranscript.value = ''
      shouldBeListening = true
      restartAttempts = 0
      networkErrorRetries = 0
      recognition?.start()
      return true
    } catch (err) {
      console.error('Start recognition error:', err)
      shouldBeListening = false
      return false
    }
  }

  const stop = () => {
    shouldBeListening = false
    restartAttempts = 0
    if (recognition && isListening.value) {
      recognition.stop()
    }
  }

  const reset = () => {
    stop()
    transcript.value = ''
    interimTranscript.value = ''
    finalTranscript.value = ''
    error.value = null
  }

  const cleanup = () => {
    shouldBeListening = false
    destroyRecognition()
  }

  onUnmounted(() => {
    cleanup()
  })

  checkSupport()

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    start,
    stop,
    reset,
    cleanup
  }
}
