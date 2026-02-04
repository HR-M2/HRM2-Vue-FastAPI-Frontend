/**
 * 沉浸式面试 composable
 * 处理面试会话、视频采集和实时行为分析 WebSocket 连接
 */
import { ref, reactive, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { BehaviorData, EmotionItem, GazeData } from '@/api/types.gen'

// 面试会话类型
export interface InterviewSession {
  id: string
  application_id: string
  candidate_name?: string | null
  position_title?: string | null
  is_recording: boolean
  is_completed: boolean
}

// 提问建议类型
export interface QuestionSuggestion {
  question: string
  type: 'followup' | 'alternative' | 'probe'
  priority: number
  reason?: string
}

// 实时统计
export interface InterviewStats {
  duration: number
  messageCount: number
}

// 对话消息类型（匹配后端 QAMessage）
export interface QAMessage {
  seq: number
  role: 'interviewer' | 'candidate'
  content: string
  timestamp?: string
  behavior?: {
    emotions: EmotionItem[]
    gaze: GazeData | null
  }
}

// 同步请求消息类型
export interface QAMessageSync {
  role: 'interviewer' | 'candidate'
  content: string
  behavior?: {
    emotions: EmotionItem[]
    gaze: GazeData | null
  }
}

// 行为分析结果
export interface BehaviorAnalysisResult {
  emotions: EmotionItem[]
  gaze: GazeData | null
  timestamp: number
}

// WebSocket 消息类型
interface WSMessage {
  type: string
  data?: unknown
  timestamp_ms?: number
  message?: string
}

const API_BASE = '/api/v1'
// WebSocket 使用后端实际地址，避免 Vite 开发服务器端口
const WS_BASE = `ws://localhost:8000/api/v1/behavior/ws`

export function useImmersiveInterview() {
  // 配置
  const config = reactive({
    localCameraEnabled: true,
    autoAnalyze: true,
    analyzeInterval: 5, // 帧发送间隔(秒)
    // 多摄像头配置
    cameraMode: 'local' as 'local' | 'stream' | 'dual', // local=仅本地, stream=仅推流, dual=双摄像头
    streamUrl: '', // 网络摄像头推流地址（RTSP/HLS/HTTP-FLV）
    analyzeSource: 'local' as 'local' | 'stream' // 用于行为分析的视频源
  })

  // 会话状态
  const sessionId = ref<string | null>(null)
  const session = ref<InterviewSession | null>(null)
  const isLoading = ref(false)
  const isRecording = ref(false)

  // 视频流
  const localStream = ref<MediaStream | null>(null)
  const localVideoRef = ref<HTMLVideoElement | null>(null)

  // 实时数据
  const currentBehavior = ref<BehaviorAnalysisResult | null>(null)
  const suggestions = ref<QuestionSuggestion[]>([])

  // 统计
  const stats = reactive<InterviewStats>({
    duration: 0,
    messageCount: 0
  })

  // 发言人切换相关
  const currentSpeaker = ref<'interviewer' | 'candidate'>('interviewer')
  const messages = ref<QAMessage[]>([])
  
  // 候选人回答期间收集的行为数据
  const candidateBehaviorHistory = ref<BehaviorAnalysisResult[]>([])

  // WebSocket
  const ws = ref<WebSocket | null>(null)
  const isWsConnected = ref(false)

  // 视频帧捕获定时器
  let captureTimer: number | null = null
  let durationTimer: number | null = null
  let startTime: Date | null = null

  // 计算属性
  const isSessionActive = computed(() => sessionId.value !== null && !session.value?.is_completed)

  // 情绪标签映射
  const emotionLabelMap: Record<string, string> = {
    neutral: '平静',
    happy: '愉悦',
    sad: '悲伤',
    angry: '愤怒',
    fear: '恐惧',
    surprise: '惊讶',
    disgust: '厌恶'
  }

  const currentEmotionLabel = computed(() => {
    if (!currentBehavior.value?.emotions?.length) return '未检测'
    const emotions = currentBehavior.value.emotions
    if (!emotions[0]) return '未检测'
    return emotionLabelMap[emotions[0].emotion] || emotions[0].emotion
  })

  // ==================== API 调用 ====================

  const apiCall = async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; message?: string }> => {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })
      const result = await response.json()
      return result
    } catch (error) {
      console.error('API调用失败:', error)
      return { success: false, message: String(error) }
    }
  }

  // 创建面试会话
  const createSession = async (applicationId: string): Promise<boolean> => {
    isLoading.value = true
    try {
      const result = await apiCall<InterviewSession>(`${API_BASE}/interview/`, {
        method: 'POST',
        body: JSON.stringify({
          application_id: applicationId,
          interview_type: 'immersive',
          config: { auto_analyze: config.autoAnalyze }
        })
      })

      if (result.success && result.data) {
        sessionId.value = result.data.id
        session.value = result.data
        ElMessage.success('面试会话已创建')
        return true
      } else {
        ElMessage.error(result.message || '创建会话失败')
        return false
      }
    } finally {
      isLoading.value = false
    }
  }

  // ==================== 摄像头 ====================

  const initLocalCamera = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false // 行为分析只需要视频
      })

      localStream.value = stream
      // 视频绑定和播放由 VideoSection 组件的 watch 处理，避免冲突
      return true
    } catch (error) {
      console.error('摄像头初始化失败:', error)
      ElMessage.error('无法访问摄像头，请检查权限设置')
      return false
    }
  }

  const stopLocalCamera = () => {
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => track.stop())
      localStream.value = null
    }
    if (localVideoRef.value) {
      localVideoRef.value.srcObject = null
    }
  }

  // ==================== WebSocket 行为分析 ====================

  const connectBehaviorWebSocket = () => {
    if (!sessionId.value || ws.value) return

    const wsUrl = `${WS_BASE}/${sessionId.value}`
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      isWsConnected.value = true
      console.log('行为分析 WebSocket 已连接')
    }

    socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        handleWsMessage(message)
      } catch (error) {
        console.error('WebSocket 消息解析失败:', error)
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket 错误:', error)
      isWsConnected.value = false
    }

    socket.onclose = () => {
      isWsConnected.value = false
      console.log('行为分析 WebSocket 已断开')
    }

    ws.value = socket
  }

  const disconnectBehaviorWebSocket = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isWsConnected.value = false
  }

  const handleWsMessage = (message: WSMessage) => {
    switch (message.type) {
      case 'behavior':
        if (message.data) {
          const behaviorData = message.data as BehaviorData
          const result: BehaviorAnalysisResult = {
            emotions: behaviorData.emotions || [],
            gaze: behaviorData.gaze || null,
            timestamp: message.timestamp_ms || Date.now()
          }
          currentBehavior.value = result
          
          // 如果当前是候选人发言，收集行为数据
          if (currentSpeaker.value === 'candidate') {
            candidateBehaviorHistory.value.push(result)
          }
        }
        break
      case 'error':
        console.error('行为分析错误:', message.message)
        break
      case 'pong':
        // 心跳响应，无需处理
        break
    }
  }

  // 发送视频帧到 WebSocket
  const sendFrameToAnalysis = () => {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN || !localVideoRef.value) return

    try {
      const video = localVideoRef.value
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 压缩并转换为 base64
      const base64Data = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]

      ws.value.send(JSON.stringify({
        type: 'frame',
        data: base64Data,
        timestamp_ms: Date.now()
      }))
    } catch (error) {
      console.error('发送视频帧失败:', error)
    }
  }

  // 启动帧捕获
  const startFrameCapture = () => {
    if (captureTimer) return

    captureTimer = window.setInterval(() => {
      if (isRecording.value && isWsConnected.value) {
        sendFrameToAnalysis()
      }
    }, config.analyzeInterval * 1000)
  }

  // 停止帧捕获
  const stopFrameCapture = () => {
    if (captureTimer) {
      clearInterval(captureTimer)
      captureTimer = null
    }
  }

  // ==================== 面试控制 ====================

  const startInterview = async (): Promise<boolean> => {
    if (!sessionId.value) {
      ElMessage.warning('请先创建会话')
      return false
    }

    // 开始面试仅需前端状态切换，无需后端API调用
    isRecording.value = true
    startTime = new Date()

    // 启动时长计时器
    durationTimer = window.setInterval(() => {
      if (startTime) {
        stats.duration = Math.floor((Date.now() - startTime.getTime()) / 1000)
      }
    }, 1000)

    // 连接 WebSocket 并启动分析
    if (config.autoAnalyze) {
      connectBehaviorWebSocket()
      startFrameCapture()
    }

    ElMessage.success('面试已开始，行为分析已启动')
    return true
  }

  const stopInterview = async (): Promise<boolean> => {
    if (!sessionId.value) return false

    // 调用 complete 端点标记会话完成
    const result = await apiCall(`${API_BASE}/interview/${sessionId.value}/complete`, {
      method: 'POST'
    })

    if (result.success) {
      isRecording.value = false
      stopFrameCapture()
      disconnectBehaviorWebSocket()

      if (durationTimer) {
        clearInterval(durationTimer)
        durationTimer = null
      }

      ElMessage.success('面试已结束')
      return true
    }

    return false
  }

  // 获取提问建议
  const fetchSuggestions = async (resumeContent?: string): Promise<void> => {
    if (!sessionId.value) return

    const result = await apiCall<{ suggestions: QuestionSuggestion[] }>(
      `${API_BASE}/interview/${sessionId.value}/suggestions?${resumeContent ? `resume_content=${encodeURIComponent(resumeContent)}` : ''}`
    )

    if (result.success && result.data) {
      suggestions.value = result.data.suggestions
    }
  }

  // 删除会话
  const deleteSession = async (): Promise<boolean> => {
    if (!sessionId.value) return false

    const result = await apiCall(`${API_BASE}/interview/${sessionId.value}`, {
      method: 'DELETE'
    })

    if (result.success) {
      cleanup()
      ElMessage.success('会话已删除')
      return true
    }

    return false
  }

  // ==================== 发言人切换与对话记录 ====================

  // 计算候选人回答期间的平均行为数据
  const calculateAverageBehavior = (): { emotions: EmotionItem[], gaze: GazeData | null } | null => {
    const history = candidateBehaviorHistory.value
    if (history.length === 0) return null

    // 计算平均注视比例和警告次数
    let totalGazeRatio = 0
    let totalWarnings = 0
    let gazeCount = 0
    
    history.forEach(item => {
      if (item.gaze) {
        totalGazeRatio += item.gaze.ratio
        totalWarnings += item.gaze.warnings ?? 0
        gazeCount++
      }
    })

    const avgGaze: GazeData | null = gazeCount > 0 ? {
      ratio: totalGazeRatio / gazeCount,
      warnings: Math.round(totalWarnings / gazeCount)
    } : null

    // 计算平均情绪（收集所有情绪，按类型聚合后取平均）
    const emotionMap = new Map<string, number[]>()
    history.forEach(item => {
      item.emotions.forEach(e => {
        if (!emotionMap.has(e.emotion)) {
          emotionMap.set(e.emotion, [])
        }
        emotionMap.get(e.emotion)!.push(e.ratio)
      })
    })

    // 计算每种情绪的平均值并排序取 Top3
    const avgEmotions: EmotionItem[] = []
    emotionMap.forEach((ratios, emotion) => {
      const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length
      avgEmotions.push({ emotion, ratio: avgRatio })
    })
    avgEmotions.sort((a, b) => b.ratio - a.ratio)
    const top3Emotions = avgEmotions.slice(0, 3)

    return { emotions: top3Emotions, gaze: avgGaze }
  }

  // 添加面试官问题
  const addInterviewerMessage = (content: string) => {
    if (!content.trim()) return
    
    const msg: QAMessage = {
      seq: messages.value.length + 1,
      role: 'interviewer',
      content: content.trim(),
      timestamp: new Date().toISOString()
    }
    messages.value.push(msg)
    stats.messageCount = messages.value.length
  }

  // 添加候选人回答（带行为数据）
  const addCandidateMessage = (content: string, behavior?: { emotions: EmotionItem[], gaze: GazeData | null }) => {
    if (!content.trim()) return
    
    const msg: QAMessage = {
      seq: messages.value.length + 1,
      role: 'candidate',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      behavior: behavior || undefined
    }
    messages.value.push(msg)
    stats.messageCount = messages.value.length
  }

  // 切换发言人
  const switchSpeaker = (transcriptContent?: string) => {
    const previousSpeaker = currentSpeaker.value
    
    // 如果之前是候选人在说话，保存其回答和行为数据
    if (previousSpeaker === 'candidate' && transcriptContent?.trim()) {
      const avgBehavior = calculateAverageBehavior()
      addCandidateMessage(transcriptContent, avgBehavior || undefined)
    }
    
    // 如果之前是面试官在说话，保存其问题
    if (previousSpeaker === 'interviewer' && transcriptContent?.trim()) {
      addInterviewerMessage(transcriptContent)
    }
    
    // 切换发言人
    currentSpeaker.value = previousSpeaker === 'interviewer' ? 'candidate' : 'interviewer'
    
    // 清空候选人行为历史（准备下一轮收集）
    candidateBehaviorHistory.value = []
    
    return currentSpeaker.value
  }

  // 获取发言人标签
  const getSpeakerLabel = (speaker: 'interviewer' | 'candidate') => {
    return speaker === 'interviewer' ? '面试官' : '候选人'
  }

  // 同步对话记录到后端
  const syncMessages = async (): Promise<boolean> => {
    if (!sessionId.value || messages.value.length === 0) return false

    const syncData: QAMessageSync[] = messages.value.map(msg => ({
      role: msg.role,
      content: msg.content,
      behavior: msg.behavior
    }))

    const result = await apiCall(`${API_BASE}/interview/${sessionId.value}/sync`, {
      method: 'POST',
      body: JSON.stringify({ messages: syncData })
    })

    if (result.success) {
      console.log('对话记录同步成功')
      return true
    } else {
      console.error('对话记录同步失败:', result.message)
      return false
    }
  }

  // 清理资源
  const cleanup = () => {
    stopFrameCapture()
    disconnectBehaviorWebSocket()
    stopLocalCamera()

    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }

    sessionId.value = null
    session.value = null
    isRecording.value = false
    currentBehavior.value = null
    suggestions.value = []
    messages.value = []
    currentSpeaker.value = 'interviewer'
    candidateBehaviorHistory.value = []
    startTime = null

    stats.duration = 0
    stats.messageCount = 0
  }

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    // 配置
    config,

    // 状态
    sessionId,
    session,
    isLoading,
    isRecording,
    isSessionActive,
    isWsConnected,

    // 视频
    localStream,
    localVideoRef,

    // 实时数据
    currentBehavior,
    currentEmotionLabel,
    suggestions,
    stats,

    // 发言人与对话
    currentSpeaker,
    messages,

    // 操作
    createSession,
    initLocalCamera,
    stopLocalCamera,
    startInterview,
    stopInterview,
    fetchSuggestions,
    deleteSession,
    cleanup,

    // 发言人切换与对话
    switchSpeaker,
    getSpeakerLabel,
    addInterviewerMessage,
    addCandidateMessage,
    syncMessages
  }
}
