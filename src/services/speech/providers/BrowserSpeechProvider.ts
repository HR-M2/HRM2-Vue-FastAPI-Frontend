/**
 * 浏览器原生语音识别 Provider
 * 使用 Web Speech API 实现
 */
import type {
  ISpeechRecognitionProvider,
  SpeechRecognitionConfig,
  SpeechRecognitionCallbacks,
  ProviderState
} from '../types'

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

interface INativeSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onaudiostart: ((this: INativeSpeechRecognition, ev: Event) => void) | null
  onaudioend: ((this: INativeSpeechRecognition, ev: Event) => void) | null
  onstart: ((this: INativeSpeechRecognition, ev: Event) => void) | null
  onend: ((this: INativeSpeechRecognition, ev: Event) => void) | null
  onerror: ((this: INativeSpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((this: INativeSpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onspeechstart: ((this: INativeSpeechRecognition, ev: Event) => void) | null
  onspeechend: ((this: INativeSpeechRecognition, ev: Event) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => INativeSpeechRecognition
    webkitSpeechRecognition: new () => INativeSpeechRecognition
  }
}

export class BrowserSpeechProvider implements ISpeechRecognitionProvider {
  readonly name = '浏览器原生'
  readonly type = 'browser' as const

  private recognition: INativeSpeechRecognition | null = null
  private config: SpeechRecognitionConfig = {}
  private callbacks: SpeechRecognitionCallbacks = {}
  private isSupported = false
  private isListening = false
  private error: string | null = null

  private shouldBeListening = false
  private restartAttempts = 0
  private networkErrorRetries = 0
  private readonly MAX_RESTART_ATTEMPTS = 5
  private readonly MAX_NETWORK_RETRIES = 3

  getState(): ProviderState {
    return {
      isSupported: this.isSupported,
      isListening: this.isListening,
      error: this.error
    }
  }

  checkSupport(): boolean {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    this.isSupported = !!SpeechRecognitionAPI
    return this.isSupported
  }

  async initialize(config: SpeechRecognitionConfig, callbacks: SpeechRecognitionCallbacks): Promise<boolean> {
    this.config = config
    this.callbacks = callbacks
    return this.checkSupport()
  }

  private destroyRecognition(): void {
    if (this.recognition) {
      this.recognition.onstart = null
      this.recognition.onend = null
      this.recognition.onresult = null
      this.recognition.onerror = null
      this.recognition.onspeechstart = null
      this.recognition.onspeechend = null
      try {
        this.recognition.abort()
      } catch (_e) {
        // ignore
      }
      this.recognition = null
    }
  }

  private initRecognition(): boolean {
    if (!this.checkSupport()) {
      this.error = '您的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器'
      return false
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognitionAPI()

    const { lang = 'zh-CN', continuous = true, interimResults = true } = this.config

    this.recognition.lang = lang
    this.recognition.continuous = continuous
    this.recognition.interimResults = interimResults
    this.recognition.maxAlternatives = 1

    this.recognition.onstart = () => {
      this.isListening = true
      this.error = null
      this.restartAttempts = 0
      this.networkErrorRetries = 0
      this.callbacks.onStart?.()
    }

    this.recognition.onend = () => {
      this.isListening = false

      if (this.shouldBeListening && this.restartAttempts < this.MAX_RESTART_ATTEMPTS) {
        this.restartAttempts++
        console.log(`语音识别自动重启 (${this.restartAttempts}/${this.MAX_RESTART_ATTEMPTS})`)
        setTimeout(() => {
          if (this.shouldBeListening) {
            this.destroyRecognition()
            if (this.initRecognition()) {
              try {
                this.recognition?.start()
              } catch (err) {
                console.error('重启语音识别失败:', err)
                this.shouldBeListening = false
                this.callbacks.onEnd?.()
              }
            } else {
              this.shouldBeListening = false
              this.callbacks.onEnd?.()
            }
          }
        }, 100)
      } else {
        this.restartAttempts = 0
        this.callbacks.onEnd?.()
      }
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
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

      if (final) {
        this.callbacks.onResult?.(final, true)
      } else if (interim) {
        this.callbacks.onResult?.(interim, false)
      }
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = ''

      switch (event.error) {
        case 'no-speech':
          console.log('未检测到语音，继续监听...')
          return
        case 'audio-capture':
          errorMessage = '未找到麦克风，请确保麦克风已连接'
          break
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
          break
        case 'network':
          if (this.networkErrorRetries < this.MAX_NETWORK_RETRIES && this.shouldBeListening) {
            this.networkErrorRetries++
            console.log(`网络错误，自动重试 (${this.networkErrorRetries}/${this.MAX_NETWORK_RETRIES})...`)
            setTimeout(() => {
              if (this.shouldBeListening) {
                this.destroyRecognition()
                if (this.initRecognition()) {
                  try {
                    this.recognition?.start()
                  } catch (err) {
                    console.error('网络错误重试失败:', err)
                  }
                }
              }
            }, 1000 * this.networkErrorRetries)
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

      this.error = errorMessage
      this.isListening = false
      this.shouldBeListening = false
      this.callbacks.onError?.(errorMessage)
    }

    this.recognition.onspeechstart = () => {}
    this.recognition.onspeechend = () => {}

    return true
  }

  async start(): Promise<boolean> {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      this.error = '无法访问麦克风，请确保已授予权限'
      this.callbacks.onError?.(this.error)
      return false
    }

    if (!this.recognition) {
      if (!this.initRecognition()) {
        return false
      }
    }

    try {
      this.shouldBeListening = true
      this.restartAttempts = 0
      this.networkErrorRetries = 0
      this.recognition?.start()
      return true
    } catch (err) {
      console.error('Start recognition error:', err)
      this.shouldBeListening = false
      return false
    }
  }

  stop(): void {
    this.shouldBeListening = false
    this.restartAttempts = 0
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  reset(): void {
    this.stop()
    this.error = null
  }

  destroy(): void {
    this.shouldBeListening = false
    this.destroyRecognition()
  }
}
