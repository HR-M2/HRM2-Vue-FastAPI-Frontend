/**
 * 阿里云语音识别 Provider
 * 使用阿里云实时语音识别 WebSocket API
 */
import type {
  ISpeechRecognitionProvider,
  SpeechRecognitionConfig,
  SpeechRecognitionCallbacks,
  ProviderState,
  AliyunProviderConfig
} from './types'

export class AliyunSpeechProvider implements ISpeechRecognitionProvider {
  readonly name = '阿里云语音识别'
  readonly type = 'aliyun' as const

  private config: SpeechRecognitionConfig = {}
  private providerConfig: AliyunProviderConfig | null = null
  private callbacks: SpeechRecognitionCallbacks = {}
  private isSupported = false
  private isListening = false
  private error: string | null = null

  private websocket: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private taskId: string = ''

  constructor(providerConfig?: AliyunProviderConfig) {
    if (providerConfig) {
      this.providerConfig = providerConfig
    }
  }

  getState(): ProviderState {
    return {
      isSupported: this.isSupported,
      isListening: this.isListening,
      error: this.error
    }
  }

  checkSupport(): boolean {
    this.isSupported = !!(
      typeof WebSocket !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof AudioContext !== 'undefined'
    )
    return this.isSupported
  }

  async initialize(config: SpeechRecognitionConfig, callbacks: SpeechRecognitionCallbacks): Promise<boolean> {
    this.config = config
    this.callbacks = callbacks

    if (!this.checkSupport()) {
      this.error = '浏览器不支持 WebSocket 或音频 API'
      return false
    }

    if (!this.providerConfig?.appKey || !this.providerConfig?.token) {
      this.error = '阿里云语音识别配置不完整，请配置 AppKey 和 Token'
      return false
    }

    return true
  }

  setProviderConfig(config: AliyunProviderConfig): void {
    this.providerConfig = config
  }

  private generateTaskId(): string {
    let result = ''
    const hexChars = '0123456789abcdef'
    for (let i = 0; i < 32; i++) {
      result += hexChars.charAt(Math.floor(Math.random() * 16))
    }
    return result
  }

  private buildWebSocketUrl(): string {
    const baseUrl = this.providerConfig?.url || 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1'
    const token = this.providerConfig?.token || ''
    return `${baseUrl}?token=${token}`
  }

  private async connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false
      
      const doResolve = (value: boolean) => {
        if (!resolved) {
          resolved = true
          resolve(value)
        }
      }

      try {
        const wsUrl = this.buildWebSocketUrl()
        this.websocket = new WebSocket(wsUrl)
        this.taskId = this.generateTaskId()

        this.websocket.onopen = () => {
          console.log('阿里云语音识别 WebSocket 已连接')
          this.sendStartCommand()
        }

        this.websocket.onmessage = (event) => {
          const data = event.data
          try {
            const message = JSON.parse(data)
            const headerName = message?.header?.name
            
            if (headerName === 'TranscriptionStarted') {
              doResolve(true)
            }
            if (headerName === 'TaskFailed') {
              doResolve(false)
            }
          } catch {
            // 忽略解析错误
          }
          this.handleMessage(data)
        }

        this.websocket.onerror = (error) => {
          console.error('阿里云语音识别 WebSocket 错误:', error)
          this.error = '语音识别服务连接失败'
          this.callbacks.onError?.(this.error)
          doResolve(false)
        }

        this.websocket.onclose = (event) => {
          console.log('阿里云语音识别 WebSocket 已关闭:', event.code, event.reason)
          doResolve(false)
          if (this.isListening) {
            this.isListening = false
            this.callbacks.onEnd?.()
          }
        }

        setTimeout(() => {
          if (!resolved) {
            this.error = '连接阿里云语音识别服务超时'
            this.callbacks.onError?.(this.error)
            doResolve(false)
          }
        }, 15000)
      } catch (err) {
        console.error('创建 WebSocket 连接失败:', err)
        this.error = '创建语音识别连接失败'
        this.callbacks.onError?.(this.error)
        doResolve(false)
      }
    })
  }

  private sendStartCommand(): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return

    const startParams = {
      header: {
        message_id: this.generateTaskId(),
        task_id: this.taskId,
        namespace: 'SpeechTranscriber',
        name: 'StartTranscription',
        appkey: this.providerConfig?.appKey
      },
      payload: {
        format: 'pcm',
        sample_rate: 16000,
        enable_intermediate_result: this.config.interimResults !== false,
        enable_punctuation_prediction: true,
        enable_inverse_text_normalization: true,
        enable_words: false
      }
    }

    this.websocket.send(JSON.stringify(startParams))
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      const { header, payload } = message

      switch (header?.name) {
        case 'TranscriptionStarted':
          console.log('阿里云语音识别已开始')
          this.isListening = true
          this.callbacks.onStart?.()
          break

        case 'TranscriptionResultChanged':
          if (payload?.result) {
            this.callbacks.onResult?.(payload.result, false)
          }
          break

        case 'SentenceEnd':
          if (payload?.result) {
            this.callbacks.onResult?.(payload.result, true)
          }
          break

        case 'TranscriptionCompleted':
          console.log('阿里云语音识别已完成')
          this.isListening = false
          this.callbacks.onEnd?.()
          break

        case 'TaskFailed':
          console.error('阿里云语音识别任务失败:', message)
          const statusCode = header?.status || payload?.status
          const statusText = header?.status_text || payload?.status_text || '语音识别任务失败'
          this.error = `错误码: ${statusCode}, ${statusText}`
          this.isListening = false
          this.callbacks.onError?.(this.error)
          this.callbacks.onEnd?.()
          break
      }
    } catch (err) {
      console.error('解析阿里云语音识别消息失败:', err)
    }
  }

  private async setupAudioCapture(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      this.audioContext = new AudioContext({ sampleRate: 16000 })
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)

      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isListening || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
          return
        }

        const inputData = event.inputBuffer.getChannelData(0)
        const pcmData = this.float32ToPcm16(inputData)
        this.websocket.send(pcmData)

        if (this.callbacks.onAudioLevel) {
          const level = this.calculateAudioLevel(inputData)
          this.callbacks.onAudioLevel(level)
        }
      }

      this.sourceNode.connect(this.scriptProcessor)
      this.scriptProcessor.connect(this.audioContext.destination)

      return true
    } catch (err) {
      console.error('音频捕获设置失败:', err)
      this.error = '无法访问麦克风，请确保已授予权限'
      this.callbacks.onError?.(this.error)
      return false
    }
  }

  private float32ToPcm16(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < float32Array.length; i++) {
      const sample = float32Array[i]
      if (sample !== undefined) {
        const s = Math.max(-1, Math.min(1, sample))
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      }
    }
    return buffer
  }

  private calculateAudioLevel(data: Float32Array): number {
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const sample = data[i]
      if (sample !== undefined) {
        sum += sample * sample
      }
    }
    return data.length > 0 ? Math.sqrt(sum / data.length) : 0
  }

  async start(): Promise<boolean> {
    if (!this.providerConfig) {
      this.error = '阿里云语音识别未配置'
      this.callbacks.onError?.(this.error)
      return false
    }

    const audioReady = await this.setupAudioCapture()
    if (!audioReady) {
      return false
    }

    const wsReady = await this.connectWebSocket()
    if (!wsReady) {
      this.cleanupAudio()
      return false
    }

    return true
  }

  stop(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const stopParams = {
        header: {
          message_id: this.generateTaskId(),
          task_id: this.taskId,
          namespace: 'SpeechTranscriber',
          name: 'StopTranscription',
          appkey: this.providerConfig?.appKey || ''
        }
      }
      this.websocket.send(JSON.stringify(stopParams))
    }

    this.isListening = false
    this.cleanupAudio()
    this.cleanupWebSocket()
  }

  private cleanupAudio(): void {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor = null
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
  }

  private cleanupWebSocket(): void {
    if (this.websocket) {
      this.websocket.onopen = null
      this.websocket.onmessage = null
      this.websocket.onerror = null
      this.websocket.onclose = null
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.close()
      }
      this.websocket = null
    }
  }

  reset(): void {
    this.stop()
    this.error = null
  }

  destroy(): void {
    this.stop()
    this.cleanupAudio()
    this.cleanupWebSocket()
  }
}
