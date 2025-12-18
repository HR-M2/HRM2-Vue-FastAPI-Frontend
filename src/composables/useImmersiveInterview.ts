/**
 * 沉浸式面试系统 composable
 * 支持双摄像头、说话人识别、实时状态分析
 */
import { ref, reactive, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

// 类型定义
export interface CandidateState {
  timestamp: string
  emotion: {
    emotion: string
    confidence: number
    valence: number
    arousal: number
  }
  engagement: number
  nervousness: number
  confidence_level: number
  eye_contact: number
  posture_score: number
  speech_clarity: number
  speech_pace: 'slow' | 'normal' | 'fast'
}

export interface SpeakerSegment {
  speaker: 'interviewer' | 'candidate'
  start_time: number
  end_time: number
  text: string
  confidence: number
}

export interface Transcript {
  speaker: 'interviewer' | 'candidate' | 'unknown'
  text: string
  timestamp: string
  is_final: boolean
}

export interface QuestionSuggestion {
  question: string
  type: 'followup' | 'alternative' | 'probe'
  priority: number
  reason?: string
}

export interface InterviewInsight {
  category: string
  content: string
  severity: 'info' | 'warning' | 'alert'
  timestamp: string
}

export interface ImmersiveSession {
  id: string
  application_id: string
  local_camera_enabled: boolean
  stream_url: string | null
  config: Record<string, unknown>
  is_recording: boolean
  is_completed: boolean
  transcripts: Transcript[]
  speaker_segments: SpeakerSegment[]
  state_history: CandidateState[]
  duration_seconds: number
  interviewer_speak_ratio: number
  candidate_speak_ratio: number
  final_analysis: Record<string, unknown> | null
  candidate_name: string | null
  position_title: string | null
}

export interface ImmersiveConfig {
  localCameraEnabled: boolean
  streamUrl: string
  autoAnalyze: boolean
  analyzeInterval: number // 秒
  showTranscript: boolean
  showSuggestions: boolean
}

const API_BASE = '/api/v1/immersive'

export function useImmersiveInterview() {
  // 配置
  const config = reactive<ImmersiveConfig>({
    localCameraEnabled: true,
    streamUrl: '',
    autoAnalyze: true,
    analyzeInterval: 5,
    showTranscript: true,
    showSuggestions: true
  })

  // 会话状态
  const sessionId = ref<string | null>(null)
  const session = ref<ImmersiveSession | null>(null)
  const isLoading = ref(false)
  const isRecording = ref(false)
  const isAnalyzing = ref(false)

  // 媒体状态
  const localStream = ref<MediaStream | null>(null)
  const localVideoRef = ref<HTMLVideoElement | null>(null)
  const remoteVideoRef = ref<HTMLVideoElement | null>(null)

  // 实时数据
  const currentState = ref<CandidateState | null>(null)
  const transcripts = ref<Transcript[]>([])
  const suggestions = ref<QuestionSuggestion[]>([])
  const insights = ref<InterviewInsight[]>([])
  const speakerSegments = ref<SpeakerSegment[]>([])

  // 统计
  const stats = reactive({
    duration: 0,
    interviewerRatio: 0,
    candidateRatio: 0,
    avgEngagement: 0,
    avgConfidence: 0
  })

  // 定时器
  let analyzeTimer: number | null = null
  let durationTimer: number | null = null
  let startTime: Date | null = null

  // 计算属性
  const isSessionActive = computed(() => sessionId.value !== null && !session.value?.is_completed)
  const canStart = computed(() => sessionId.value !== null && !isRecording.value)
  const emotionLabel = computed(() => {
    const emotions: Record<string, string> = {
      neutral: '平静',
      happy: '愉悦',
      focused: '专注',
      thinking: '思考',
      nervous: '紧张',
      confident: '自信'
    }
    return emotions[currentState.value?.emotion?.emotion || 'neutral'] || '未知'
  })

  // API 调用封装
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

  // 创建会话
  const createSession = async (applicationId: string): Promise<boolean> => {
    isLoading.value = true
    try {
      const result = await apiCall<ImmersiveSession>(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          application_id: applicationId,
          local_camera_enabled: config.localCameraEnabled,
          stream_url: config.streamUrl || null,
          config: {
            autoAnalyze: config.autoAnalyze,
            analyzeInterval: config.analyzeInterval
          }
        })
      })

      if (result.success && result.data) {
        sessionId.value = result.data.id
        session.value = result.data
        ElMessage.success('沉浸式面试会话已创建')
        return true
      } else {
        ElMessage.error(result.message || '创建会话失败')
        return false
      }
    } finally {
      isLoading.value = false
    }
  }

  // 初始化本地摄像头
  const initLocalCamera = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      })
      
      localStream.value = stream
      
      if (localVideoRef.value) {
        localVideoRef.value.srcObject = stream
        await localVideoRef.value.play()
      }
      
      return true
    } catch (error) {
      console.error('摄像头初始化失败:', error)
      ElMessage.error('无法访问摄像头，请检查权限设置')
      return false
    }
  }

  // 停止本地摄像头
  const stopLocalCamera = () => {
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => track.stop())
      localStream.value = null
    }
    if (localVideoRef.value) {
      localVideoRef.value.srcObject = null
    }
  }

  // 初始化远程推流（使用HLS或WebRTC）
  const initRemoteStream = async (url: string): Promise<boolean> => {
    if (!url) return false
    
    config.streamUrl = url
    
    // 对于实验性功能，这里预留推流播放器接口
    // 实际实现可以使用 hls.js 或 flv.js 等库
    if (remoteVideoRef.value) {
      // 简单的视频源设置（支持直接播放的URL）
      remoteVideoRef.value.src = url
      try {
        await remoteVideoRef.value.play()
        return true
      } catch (error) {
        console.error('远程流播放失败:', error)
        return false
      }
    }
    
    return false
  }

  // 开始面试
  const startInterview = async (): Promise<boolean> => {
    if (!sessionId.value) {
      ElMessage.warning('请先创建会话')
      return false
    }

    const result = await apiCall(`${API_BASE}/${sessionId.value}/start`, {
      method: 'POST'
    })

    if (result.success) {
      isRecording.value = true
      startTime = new Date()
      
      // 启动时长计时器
      durationTimer = window.setInterval(() => {
        if (startTime) {
          stats.duration = Math.floor((Date.now() - startTime.getTime()) / 1000)
        }
      }, 1000)

      // 启动自动分析
      if (config.autoAnalyze) {
        startAutoAnalyze()
      }

      ElMessage.success('面试已开始')
      return true
    }

    return false
  }

  // 停止面试
  const stopInterview = async (): Promise<boolean> => {
    if (!sessionId.value) return false

    const result = await apiCall(`${API_BASE}/${sessionId.value}/stop`, {
      method: 'POST'
    })

    if (result.success) {
      isRecording.value = false
      stopAutoAnalyze()
      
      if (durationTimer) {
        clearInterval(durationTimer)
        durationTimer = null
      }

      ElMessage.success('面试已结束')
      return true
    }

    return false
  }

  // 启动自动分析
  const startAutoAnalyze = () => {
    if (analyzeTimer) return
    
    analyzeTimer = window.setInterval(async () => {
      if (isRecording.value && !isAnalyzing.value) {
        await analyzeCurrentState()
      }
    }, config.analyzeInterval * 1000)
  }

  // 停止自动分析
  const stopAutoAnalyze = () => {
    if (analyzeTimer) {
      clearInterval(analyzeTimer)
      analyzeTimer = null
    }
  }

  // 分析当前状态
  const analyzeCurrentState = async (): Promise<void> => {
    if (!sessionId.value || isAnalyzing.value) return
    
    isAnalyzing.value = true
    
    try {
      // 获取视频帧（实际实现需要canvas截图）
      const result = await apiCall<{ state: CandidateState; suggestions: string[]; alerts: string[] }>(
        `${API_BASE}/${sessionId.value}/state-analysis`,
        {
          method: 'POST',
          body: JSON.stringify({
            context: { timestamp: Date.now() }
          })
        }
      )

      if (result.success && result.data) {
        currentState.value = result.data.state
        
        // 更新平均值
        if (session.value?.state_history) {
          const history = [...session.value.state_history, result.data.state]
          stats.avgEngagement = history.reduce((sum, s) => sum + s.engagement, 0) / history.length
          stats.avgConfidence = history.reduce((sum, s) => sum + s.confidence_level, 0) / history.length
        }

        // 处理提醒
        if (result.data.alerts?.length) {
          result.data.alerts.forEach(alert => {
            insights.value.unshift({
              category: '提醒',
              content: alert,
              severity: 'alert',
              timestamp: new Date().toISOString()
            })
          })
        }
      }
    } finally {
      isAnalyzing.value = false
    }
  }

  // 获取提问建议
  const fetchSuggestions = async (): Promise<void> => {
    if (!sessionId.value) return

    const result = await apiCall<{ suggestions: QuestionSuggestion[] }>(
      `${API_BASE}/${sessionId.value}/suggestions`
    )

    if (result.success && result.data) {
      suggestions.value = result.data.suggestions
    }
  }

  // 获取面试洞察
  const fetchInsights = async (): Promise<void> => {
    if (!sessionId.value) return

    const result = await apiCall<{ insights: InterviewInsight[] }>(
      `${API_BASE}/${sessionId.value}/insights`
    )

    if (result.success && result.data) {
      insights.value = result.data.insights
    }
  }

  // 添加转录文本
  const addTranscript = async (
    speaker: 'interviewer' | 'candidate',
    text: string,
    isFinal: boolean = true
  ): Promise<void> => {
    if (!sessionId.value) return

    const result = await apiCall<Transcript>(
      `${API_BASE}/${sessionId.value}/transcript?speaker=${speaker}&text=${encodeURIComponent(text)}&is_final=${isFinal}`,
      { method: 'POST' }
    )

    if (result.success && result.data) {
      transcripts.value.push(result.data)
    }
  }

  // 生成报告
  const generateReport = async (): Promise<Record<string, unknown> | null> => {
    if (!sessionId.value) return null

    const result = await apiCall<{ report: Record<string, unknown> }>(
      `${API_BASE}/${sessionId.value}/generate-report`,
      { method: 'POST' }
    )

    if (result.success && result.data) {
      ElMessage.success('面试报告已生成')
      return result.data.report
    }

    return null
  }

  // 删除会话
  const deleteSession = async (): Promise<boolean> => {
    if (!sessionId.value) return false

    const result = await apiCall(`${API_BASE}/${sessionId.value}`, {
      method: 'DELETE'
    })

    if (result.success) {
      cleanup()
      ElMessage.success('会话已删除')
      return true
    }

    return false
  }

  // 清理资源
  const cleanup = () => {
    stopAutoAnalyze()
    stopLocalCamera()
    
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }

    sessionId.value = null
    session.value = null
    isRecording.value = false
    currentState.value = null
    transcripts.value = []
    suggestions.value = []
    insights.value = []
    speakerSegments.value = []
    startTime = null
    
    Object.assign(stats, {
      duration: 0,
      interviewerRatio: 0,
      candidateRatio: 0,
      avgEngagement: 0,
      avgConfidence: 0
    })
  }

  // 更新配置
  const updateConfig = (updates: Partial<ImmersiveConfig>) => {
    Object.assign(config, updates)
  }

  // 设置视频元素引用
  const setLocalVideoRef = (el: HTMLVideoElement | null) => {
    localVideoRef.value = el
  }

  const setRemoteVideoRef = (el: HTMLVideoElement | null) => {
    remoteVideoRef.value = el
  }

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    // 配置
    config,
    updateConfig,

    // 状态
    sessionId,
    session,
    isLoading,
    isRecording,
    isAnalyzing,
    isSessionActive,
    canStart,

    // 媒体
    localStream,
    setLocalVideoRef,
    setRemoteVideoRef,
    initLocalCamera,
    stopLocalCamera,
    initRemoteStream,

    // 实时数据
    currentState,
    emotionLabel,
    transcripts,
    suggestions,
    insights,
    speakerSegments,
    stats,

    // 操作
    createSession,
    startInterview,
    stopInterview,
    analyzeCurrentState,
    fetchSuggestions,
    fetchInsights,
    addTranscript,
    generateReport,
    deleteSession,
    cleanup
  }
}
