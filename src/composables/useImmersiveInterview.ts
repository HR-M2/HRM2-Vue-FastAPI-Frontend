/**
 * 沉浸式面试系统 composable
 * 支持双摄像头、说话人识别、实时状态分析
 */
import { ref, reactive, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

// 标准化数据类型定义

// 大五人格数据
export interface BigFivePersonality {
  openness: number        // 开放性 0-1
  conscientiousness: number // 尽责性 0-1
  extraversion: number     // 外向性 0-1
  agreeableness: number    // 宜人性 0-1
  neuroticism: number      // 神经质 0-1
}

// 抑郁风险评估
export interface DepressionRisk {
  score: number           // 抑郁可能性 0-100
  level: 'low' | 'medium' | 'high'  // 风险等级
  confidence: number      // 分析置信度 0-1
}

// 情绪数据
export interface EmotionData {
  emotion: string         // 情绪类型
  confidence: number      // 置信度 0-1
  valence: number        // 效价 0-1
  arousal: number        // 唤醒度 0-1
}

// 转录记录
export interface TranscriptRecord {
  speaker: 'interviewer' | 'candidate'
  text: string
  is_final: boolean
}

// 说话人片段
export interface SpeakerSegment {
  speaker: 'interviewer' | 'candidate'
  start_time: number
  end_time: number
  text: string
  confidence: number
  big_five_personality?: BigFivePersonality
  depression_risk?: DepressionRisk
}

// 状态记录
export interface StateRecord {
  segment_id: string
  emotion: EmotionData
  engagement: number
  nervousness: number
  confidence_level: number
  eye_contact: number
  posture_score: number
  speech_clarity: number
  speech_pace: 'slow' | 'normal' | 'fast'
}

// 候选人状态（向后兼容）
export interface CandidateState {
  timestamp: string
  emotion: EmotionData
  engagement: number
  nervousness: number
  confidence_level: number
  eye_contact: number
  posture_score: number
  speech_clarity: number
  speech_pace: 'slow' | 'normal' | 'fast'
}

// 转录文本（向后兼容）
export interface Transcript {
  speaker: 'interviewer' | 'candidate' | 'unknown'
  text: string
  timestamp: string
  is_final: boolean
}

// 问题建议
export interface QuestionSuggestion {
  question: string
  type: 'technical' | 'behavioral' | 'situational'
  priority: number
  reason?: string
  psychological_context?: string
  timing_suggestion?: string
  expected_response_indicators?: string[]
}

// 面试洞察
export interface InterviewInsight {
  category: string
  content: string
  severity: 'info' | 'warning' | 'alert'
  timestamp: string
}

// 洞察警报
export interface InsightAlert {
  category: string
  content: string
  severity: 'info' | 'warning' | 'alert'
  timestamp: string
}

// 质量指标
export interface QualityMetrics {
  session_quality_score: number
  psychological_wellness_score: number
}

// 批量同步数据请求
export interface SyncDataRequest {
  transcripts?: TranscriptRecord[]
  speaker_segments?: SpeakerSegment[]
  state_records?: StateRecord[]
}

// 问题建议选项
export interface QuestionOptions {
  count?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  focus_areas?: string[]
  use_psychological_context?: boolean
  use_conversation_history?: boolean
  question_type?: 'technical' | 'behavioral' | 'situational' | 'mixed'
}

// 问题建议响应
export interface QuestionSuggestionsResponse {
  suggestions: QuestionSuggestion[]
}

// 洞察响应
export interface InsightsResponse {
  insights: InterviewInsight[]
  alerts: InsightAlert[]
  suggestions: string[]
  session_quality_score: number
  psychological_wellness_score: number
}

// 会话统计
export interface SessionStatistics {
  duration_seconds: number
  interviewer_speak_ratio: number
  candidate_speak_ratio: number
  avg_engagement: number
  avg_confidence: number
  total_transcripts: number
  total_segments: number
  session_quality_score: number // 新增：会话质量评分
}

// 心理摘要
export interface PsychologicalSummary {
  overall_big_five: BigFivePersonality
  overall_depression_risk: DepressionRisk
  emotional_stability: number
  stress_indicators: string[]
  positive_traits: string[]
  areas_of_concern: string[]
  psychological_wellness_score: number // 新增：心理健康评分
}

// 创建会话请求
export interface CreateSessionRequest {
  application_id: string
  local_camera_enabled: boolean
  stream_url?: string | null
  config?: Record<string, unknown>
}

// 完整会话响应 - 匹配后端实际返回的数据结构
export interface CompleteSessionResponse {
  id: string
  created_at: string
  updated_at: string
  application_id: string
  local_camera_enabled: boolean
  stream_url: string | null
  config: Record<string, unknown>
  is_recording: boolean
  is_completed: boolean
  transcripts: TranscriptRecord[]
  speaker_segments: SpeakerSegment[]
  state_history: StateRecord[]
  duration_seconds: number
  interviewer_speak_ratio: number
  candidate_speak_ratio: number
  final_analysis: Record<string, unknown> | null
  candidate_name: string
  position_title: string
  statistics: {
    total_segments: number
    candidate_segments: number
    interviewer_segments: number
    candidate_speak_ratio: number
    interviewer_speak_ratio: number
    session_quality_score: number
    avg_engagement: number
    avg_confidence: number
    avg_nervousness: number
  }
  psychological_summary: {
    final_big_five: BigFivePersonality | null
    depression_assessment: {
      score: number
      level: string
      confidence: number
    } | null
    psychological_wellness_score: number
    trend_analysis: {
      depression_risk_trend: string
      latest_state: Record<string, unknown> | null
    }
  }
  full_transcripts: TranscriptRecord[]
  full_speaker_segments: SpeakerSegment[]
  full_state_history: StateRecord[]
}

// 驾驶舱数据类型
export interface CockpitData {
  bigFive: BigFivePersonality
  deceptionScore: number   // 欺骗检测分数 0-1
  depressionScore: number  // 抑郁检测分数 0-1
  overallScore: number     // 综合评分 0-100
  faceOutOfFrame: boolean  // 面部是否离框
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
  psychologicalAnalysisEnabled: boolean // 新增：心理分析功能开关
  syncInterval: number // 新增：同步间隔（秒）
  maxBatchSize: number // 新增：最大批量大小
}

import { DataSyncManager } from './DataSyncManager'

// 新的API端点常量
const API_BASE = '/api/v1/immersive'

// API错误处理器
class APIErrorHandler {
  private retryAttempts = new Map<string, number>()
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAYS: number[] = [1000, 2000, 4000] // 指数退避
  
  async handleAPICall<T>(
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    try {
      const result = await operation()
      this.retryAttempts.delete(operationId)
      return result
    } catch (error) {
      return this.handleError(error, operation, operationId)
    }
  }
  
  private async handleError<T>(
    error: any,
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    const attempts = this.retryAttempts.get(operationId) || 0
    
    if (attempts < this.MAX_RETRIES && this.isRetryableError(error)) {
      this.retryAttempts.set(operationId, attempts + 1)
      const delayIndex = Math.min(attempts, this.RETRY_DELAYS.length - 1)
      const delay = this.RETRY_DELAYS[delayIndex] ?? 4000 // 默认4秒
      await this.delay(delay)
      return this.handleAPICall(operation, operationId)
    }
    
    throw error
  }
  
  private isRetryableError(error: any): boolean {
    // 网络错误、超时、5xx错误等可重试
    return error.code === 'NETWORK_ERROR' || 
           error.status >= 500 || 
           error.code === 'TIMEOUT'
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 降级管理器
class FallbackManager {
  async getQuestionSuggestionsWithFallback(
    options: QuestionOptions
  ): Promise<QuestionSuggestion[]> {
    // 基于简历和配置生成本地问题建议
    return [
      {
        question: "请详细介绍一下您最有挑战性的项目经历？",
        type: 'behavioral',
        priority: 1,
        reason: "本地生成 - 项目经验探索"
      },
      {
        question: "您如何处理工作中的压力和挑战？",
        type: 'behavioral',
        priority: 2,
        reason: "本地生成 - 抗压能力评估"
      },
      {
        question: "描述一次您需要学习新技术或技能的经历。",
        type: 'behavioral',
        priority: 3,
        reason: "本地生成 - 学习能力评估"
      }
    ]
  }

  // 生成模拟的完整会话响应（当API不可用时的降级方案）
  generateMockCompleteSessionResponse(
    sessionId: string,
    candidateName: string,
    positionTitle: string,
    durationSeconds: number,
    cockpitData: CockpitData
  ): CompleteSessionResponse {
    const now = new Date()
    const startTime = new Date(now.getTime() - durationSeconds * 1000)
    
    return {
      id: sessionId,
      created_at: startTime.toISOString(),
      updated_at: now.toISOString(),
      application_id: 'mock-application',
      local_camera_enabled: true,
      stream_url: null,
      config: {},
      is_recording: false,
      is_completed: true,
      transcripts: [],
      speaker_segments: [],
      state_history: [],
      duration_seconds: durationSeconds,
      interviewer_speak_ratio: 0.35,
      candidate_speak_ratio: 0.65,
      final_analysis: null,
      candidate_name: candidateName,
      position_title: positionTitle,
      statistics: {
        total_segments: 8,
        candidate_segments: 5,
        interviewer_segments: 3,
        candidate_speak_ratio: 0.65,
        interviewer_speak_ratio: 0.35,
        session_quality_score: 75,
        avg_engagement: 72,
        avg_confidence: 68,
        avg_nervousness: 20
      },
      psychological_summary: {
        final_big_five: cockpitData.bigFive,
        depression_assessment: {
          score: cockpitData.depressionScore * 100,
          level: cockpitData.depressionScore < 0.3 ? 'low' : cockpitData.depressionScore < 0.6 ? 'medium' : 'high',
          confidence: 0.85
        },
        psychological_wellness_score: 80,
        trend_analysis: {
          depression_risk_trend: 'stable',
          latest_state: null
        }
      },
      full_transcripts: [],
      full_speaker_segments: [],
      full_state_history: []
    }
  }
}

export function useImmersiveInterview() {
  // 配置
  const config = reactive<ImmersiveConfig>({
    localCameraEnabled: true,
    streamUrl: '',
    autoAnalyze: true,
    analyzeInterval: 5,
    showTranscript: true,
    showSuggestions: true,
    psychologicalAnalysisEnabled: true, // 默认启用心理分析
    syncInterval: 5, // 5秒同步间隔
    maxBatchSize: 10 // 最大批量大小
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

  // 发言人切换相关
  const currentSpeaker = ref<'interviewer' | 'candidate'>('interviewer')
  const pendingTranscript = ref<string>('')
  const speakerStartTime = ref<Date | null>(null)

  // 新增：批量同步队列和质量指标
  const syncQueue = ref<SyncDataRequest>({
    transcripts: [],
    speaker_segments: [],
    state_records: []
  })
  const qualityMetrics = ref<QualityMetrics>({
    session_quality_score: 0,
    psychological_wellness_score: 0
  })

  // 统计
  const stats = reactive({
    duration: 0,
    interviewerRatio: 0,
    candidateRatio: 0,
    avgEngagement: 0,
    avgConfidence: 0
  })

  // 管理器实例
  let dataSyncManager: DataSyncManager | null = null
  const errorHandler = new APIErrorHandler()
  const fallbackManager = new FallbackManager()

  // 驾驶舱模拟数据
  const cockpitData = reactive<CockpitData>({
    bigFive: {
      openness: 0.65,
      conscientiousness: 0.60,
      extraversion: 0.70,
      agreeableness: 0.55,
      neuroticism: 0.30
    },
    deceptionScore: 0.2,
    depressionScore: 0.15,
    overallScore: 68,
    faceOutOfFrame: false
  })

  // 驾驶舱定时器
  let cockpitTimer: number | null = null
  let overallScoreTimer: number | null = null
  let deceptionResetTimer: number | null = null // 欺骗检测重置定时器

  // 定时器
  let analyzeTimer: number | null = null
  let durationTimer: number | null = null
  let startTime: Date | null = null

  // ========== 驾驶舱模拟数据生成函数 ==========
  
  // 带记忆性的随机数生成（平滑过渡）
  const smoothRandom = (currentValue: number, min: number, max: number, volatility: number = 0.3): number => {
    const randomComponent = min + Math.random() * (max - min)
    const newValue = currentValue * (1 - volatility) + randomComponent * volatility
    return Math.max(min, Math.min(max, newValue))
  }

  // 生成大五人格数据
  const generateBigFiveData = (): BigFivePersonality => {
    return {
      openness: smoothRandom(cockpitData.bigFive.openness, 0.5, 0.85, 0.3),
      conscientiousness: smoothRandom(cockpitData.bigFive.conscientiousness, 0.45, 0.75, 0.3),
      extraversion: smoothRandom(cockpitData.bigFive.extraversion, 0.5, 0.85, 0.3),
      agreeableness: smoothRandom(cockpitData.bigFive.agreeableness, 0.45, 0.75, 0.3),
      neuroticism: smoothRandom(cockpitData.bigFive.neuroticism, 0.15, 0.45, 0.3)
    }
  }

  // 生成欺骗检测分数
  const generateDeceptionScore = (): number => {
    const random = Math.random()
    let targetRange: [number, number]
    
    if (random < 0.85) {
      // 85% 概率: 正常范围 0.1-0.4
      targetRange = [0.1, 0.4]
    } else {
      // 15% 概率: 偶尔峰值 0.5-0.7
      targetRange = [0.4, 0.6]
    }
    
    return smoothRandom(cockpitData.deceptionScore, targetRange[0], targetRange[1], 0.4)
  }

  // 生成抑郁检测分数（始终保持在0.4以下）
  const generateDepressionScore = (): number => {
    // 抑郁检测值保持在较低范围，更加平滑
    const targetRange: [number, number] = [0.05, 0.35]
    return smoothRandom(cockpitData.depressionScore, targetRange[0], targetRange[1], 0.2)
  }

  // 生成综合评分
  const generateOverallScore = (): number => {
    const fluctuation = (Math.random() - 0.5) * 2 * 8 // ±3-8分波动
    let newScore = cockpitData.overallScore + fluctuation
    // 限制在45-95区间
    newScore = Math.max(45, Math.min(95, newScore))
    return Math.round(newScore)
  }

  // 生成面部离框状态
  const generateFaceOutOfFrame = (): boolean => {
    // 5%概率触发离框，离框后80%概率保持离框状态
    if (cockpitData.faceOutOfFrame) {
      return Math.random() < 0.2 // 20%概率回到画面
    } else {
      return Math.random() < 0.05 // 5%概率离框
    }
  }

  // 启动驾驶舱数据更新定时器
  const startCockpitTimers = () => {
    // 使用配置的分析间隔统一更新所有数据
    const intervalMs = config.analyzeInterval * 1000

    // 大五人格 + 欺骗检测 + 抑郁检测 + 面部检测: 使用配置的间隔更新
    cockpitTimer = window.setInterval(() => {
      cockpitData.bigFive = generateBigFiveData()
      cockpitData.deceptionScore = generateDeceptionScore()
      cockpitData.depressionScore = generateDepressionScore()
      cockpitData.faceOutOfFrame = generateFaceOutOfFrame()
    }, intervalMs)

    // 综合评分: 使用配置间隔的 4 倍（相对较慢的更新）
    overallScoreTimer = window.setInterval(() => {
      cockpitData.overallScore = generateOverallScore()
    }, intervalMs * 4)

    // 立即生成初始数据
    cockpitData.bigFive = generateBigFiveData()
    cockpitData.deceptionScore = generateDeceptionScore()
    cockpitData.depressionScore = generateDepressionScore()
    cockpitData.overallScore = Math.round(60 + Math.random() * 15) // 初始值60-75
  }

  // 停止驾驶舱定时器
  const stopCockpitTimers = () => {
    if (cockpitTimer) {
      clearInterval(cockpitTimer)
      cockpitTimer = null
    }
    if (overallScoreTimer) {
      clearInterval(overallScoreTimer)
      overallScoreTimer = null
    }
    if (deceptionResetTimer) {
      clearTimeout(deceptionResetTimer)
      deceptionResetTimer = null
    }
  }

  // 手动触发欺骗检测高值（用于快捷键调试）
  const triggerDeceptionAlert = () => {
    // 清除之前的重置定时器
    if (deceptionResetTimer) {
      clearTimeout(deceptionResetTimer)
      deceptionResetTimer = null
    }

    // 设置欺骗检测为高值 0.7-0.85
    cockpitData.deceptionScore = 0.7 + Math.random() * 0.15
    console.log(`[欺骗检测] 手动触发高值: ${cockpitData.deceptionScore.toFixed(2)}`)

    // 10秒后恢复正常
    deceptionResetTimer = window.setTimeout(() => {
      cockpitData.deceptionScore = 0.1 + Math.random() * 0.3 // 恢复到正常范围
      console.log(`[欺骗检测] 已恢复正常: ${cockpitData.deceptionScore.toFixed(2)}`)
      deceptionResetTimer = null
    }, 3000)
  }

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
    console.log('[apiCall] 发送请求:', {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body
    })

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })
      
      console.log('[apiCall] 收到响应:', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
          console.error('[apiCall] 错误响应内容:', errorText)
        } catch (e) {
          console.error('[apiCall] 无法读取错误响应内容:', e)
        }
        
        console.error('[apiCall] 请求失败:', {
          url,
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        return { 
          success: false, 
          message: `HTTP ${response.status}: ${response.statusText}. ${errorText}` 
        }
      }
      
      let result
      try {
        result = await response.json()
        console.log('[apiCall] 请求成功，响应数据:', result)
      } catch (e) {
        console.error('[apiCall] 解析JSON失败:', e)
        return { 
          success: false, 
          message: '响应数据格式错误，无法解析JSON' 
        }
      }
      
      return result
    } catch (error: any) {
      console.error('[apiCall] 网络错误:', { url, error })
      return { success: false, message: `网络错误: ${error?.message || String(error)}` }
    }
  }

  // 创建会话 - 使用新的 POST /api/v1/immersive 端点
  const createSession = async (applicationId: string): Promise<boolean> => {
    isLoading.value = true
    try {
      const requestBody: CreateSessionRequest = {
        application_id: applicationId,
        local_camera_enabled: config.localCameraEnabled,
        stream_url: config.streamUrl || null,
        config: {
          autoAnalyze: config.autoAnalyze,
          analyzeInterval: config.analyzeInterval,
          psychologicalAnalysisEnabled: config.psychologicalAnalysisEnabled
        }
      }
      
      const result = await errorHandler.handleAPICall(
        () => apiCall<ImmersiveSession>(`${API_BASE}`, {
          method: 'POST',
          body: JSON.stringify(requestBody)
        }),
        'createSession'
      )

      if (result.success && result.data) {
        sessionId.value = result.data.id
        session.value = result.data
        
        // 初始化数据同步管理器
        dataSyncManager = new DataSyncManager({
          sessionId: result.data.id,
          config,
          apiCall,
          onSyncSuccess: (data) => {
            console.log('数据同步成功:', data)
          },
          onSyncError: (error, data) => {
            console.error('数据同步失败:', error, data)
          },
          onRetryExhausted: (data) => {
            console.error('数据同步重试次数耗尽:', data)
          }
        })
        
        ElMessage.success('沉浸式面试会话已创建')
        return true
      } else {
        ElMessage.error(result.message || '创建会话失败')
        return false
      }
    } catch (error) {
      console.error('创建会话异常:', error)
      ElMessage.error('创建会话时发生异常')
      return false
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

  // 开始面试 - 使用新的 POST /api/v1/immersive/{session_id}/start 端点
  const startInterview = async (): Promise<boolean> => {
    if (!sessionId.value) {
      ElMessage.warning('请先创建会话')
      return false
    }

    try {
      const result = await errorHandler.handleAPICall(
        () => apiCall(`${API_BASE}/${sessionId.value}/start`, {
          method: 'POST'
        }),
        'startInterview'
      )

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

        // 启动数据同步
        if (dataSyncManager) {
          dataSyncManager.startAutoSync()
        }

        // 启动驾驶舱数据模拟
        startCockpitTimers()

        ElMessage.success('面试已开始')
        return true
      } else {
        ElMessage.error(result.message || '开始面试失败')
      }
    } catch (error) {
      console.error('开始面试异常:', error)
      ElMessage.error('开始面试时发生异常')
    }

    return false
  }

  // 停止面试 - 使用新的 POST /api/v1/immersive/{session_id}/stop 端点
  const stopInterview = async (): Promise<boolean> => {
    if (!sessionId.value) return false

    try {
      const result = await errorHandler.handleAPICall(
        () => apiCall(`${API_BASE}/${sessionId.value}/stop`, {
          method: 'POST'
        }),
        'stopInterview'
      )

      if (result.success) {
        isRecording.value = false
        stopAutoAnalyze()
        stopCockpitTimers()
        
        // 停止数据同步
        if (dataSyncManager) {
          await dataSyncManager.forceSyncNow() // 最后一次同步
          dataSyncManager.stopAutoSync()
        }
        
        if (durationTimer) {
          clearInterval(durationTimer)
          durationTimer = null
        }
        
        // 重置开始时间
        startTime = null

        ElMessage.success('面试已结束')
        return true
      } else {
        ElMessage.error(result.message || '停止面试失败')
      }
    } catch (error) {
      console.error('停止面试异常:', error)
      ElMessage.error('停止面试时发生异常')
    }

    return false
  }

  // 已移除：自动分析定时轮询
  // 改为在发言人切换时手动触发同步
  const startAutoAnalyze = () => {
    // 不再使用定时轮询
    console.log('[startAutoAnalyze] 已禁用定时轮询，改为发言人切换时同步')
  }

  const stopAutoAnalyze = () => {
    // 清理遗留的定时器（如果有）
    if (analyzeTimer) {
      clearInterval(analyzeTimer)
      analyzeTimer = null
    }
  }

  // 已移除：定时分析
  const analyzeCurrentState = async (): Promise<void> => {
    // 不再自动调用，保留方法签名以兼容现有代码
    console.log('[analyzeCurrentState] 已禁用自动分析')
  }

  // 获取提问建议 - 使用新的 POST /api/v1/immersive/{session_id}/questions 端点
  const fetchQuestionSuggestions = async (options?: QuestionOptions): Promise<void> => {
    if (!sessionId.value) {
      console.warn('[fetchQuestionSuggestions] 没有会话ID，跳过请求')
      return
    }

    console.log('[fetchQuestionSuggestions] 开始获取问题建议，会话ID:', sessionId.value)

    try {
      const requestOptions: QuestionOptions = {
        count: 5,
        question_type: 'mixed',
        use_psychological_context: config.psychologicalAnalysisEnabled,
        use_conversation_history: true,
        ...options
      }

      console.log('[fetchQuestionSuggestions] 请求参数:', requestOptions)
      console.log('[fetchQuestionSuggestions] 请求URL:', `${API_BASE}/${sessionId.value}/questions`)

      const result = await errorHandler.handleAPICall(
        () => apiCall<QuestionSuggestionsResponse>(
          `${API_BASE}/${sessionId.value}/questions`,
          {
            method: 'POST',
            body: JSON.stringify(requestOptions)
          }
        ),
        'fetchQuestionSuggestions'
      )

      console.log('[fetchQuestionSuggestions] API响应:', result)

      if (result.success && result.data) {
        suggestions.value = result.data.suggestions
        console.log('[fetchQuestionSuggestions] 成功获取建议:', result.data.suggestions.length, '条')
      } else {
        console.warn('[fetchQuestionSuggestions] API调用失败:', result.message)
      }
    } catch (error) {
      console.error('[fetchQuestionSuggestions] 获取问题建议失败，使用降级方案:', error)
      // 使用降级方案
      suggestions.value = await fallbackManager.getQuestionSuggestionsWithFallback(options || {})
      console.log('[fetchQuestionSuggestions] 使用降级方案生成建议:', suggestions.value.length, '条')
    }
  }

  // 获取面试洞察 - 使用新的 GET /api/v1/immersive/{session_id}/insights 端点
  const fetchInsights = async (): Promise<void> => {
    if (!sessionId.value) return

    try {
      const result = await errorHandler.handleAPICall(
        () => apiCall<InsightsResponse>(`${API_BASE}/${sessionId.value}/insights`),
        'fetchInsights'
      )

      if (result.success && result.data) {
        insights.value = result.data.insights
        
        // 处理警报
        if (result.data.alerts?.length) {
          result.data.alerts.forEach(alert => {
            insights.value.unshift({
              category: alert.category,
              content: alert.content,
              severity: alert.severity,
              timestamp: alert.timestamp
            })
          })
        }
        
        // 更新质量指标
        qualityMetrics.value = {
          session_quality_score: result.data.session_quality_score,
          psychological_wellness_score: result.data.psychological_wellness_score
        }
      }
    } catch (error) {
      console.error('获取洞察失败，使用本地模拟数据:', error)
      // 使用本地模拟数据（基于驾驶舱数据生成状态）
      generateMockCurrentState()
    }
  }

  // 生成模拟的当前状态数据（当后端API不可用时）
  const generateMockCurrentState = () => {
    if (!isRecording.value) return

    // 基于驾驶舱数据生成候选人状态
    const mockState: CandidateState = {
      timestamp: new Date().toISOString(),
      emotion: {
        emotion: cockpitData.deceptionScore > 0.5 ? 'nervous' : 'confident',
        confidence: 1 - cockpitData.deceptionScore,
        valence: cockpitData.bigFive.extraversion,
        arousal: cockpitData.bigFive.neuroticism
      },
      engagement: Math.max(0.3, 1 - cockpitData.bigFive.neuroticism),
      nervousness: cockpitData.bigFive.neuroticism,
      confidence_level: cockpitData.bigFive.conscientiousness,
      eye_contact: cockpitData.faceOutOfFrame ? 0.2 : 0.8 + Math.random() * 0.2,
      posture_score: 0.7 + Math.random() * 0.2,
      speech_clarity: 0.8 + Math.random() * 0.15,
      speech_pace: cockpitData.bigFive.neuroticism > 0.6 ? 'fast' : 'normal'
    }

    currentState.value = mockState

    // 更新统计数据
    if (session.value?.state_history) {
      const history = [...session.value.state_history, mockState]
      stats.avgEngagement = history.reduce((sum, s) => sum + s.engagement, 0) / history.length
      stats.avgConfidence = history.reduce((sum, s) => sum + s.confidence_level, 0) / history.length
    }

    // 生成一些模拟洞察
    if (cockpitData.deceptionScore > 0.6) {
      insights.value.unshift({
        category: '行为分析',
        content: '检测到候选人可能存在紧张情绪，建议营造轻松氛围',
        severity: 'warning',
        timestamp: new Date().toISOString()
      })
    }

    if (cockpitData.faceOutOfFrame) {
      insights.value.unshift({
        category: '视频质量',
        content: '候选人面部离开画面，请提醒调整摄像头位置',
        severity: 'alert',
        timestamp: new Date().toISOString()
      })
    }
  }

  // 完成会话 - 使用新的 POST /api/v1/immersive/{session_id}/complete 端点
  const completeSession = async (): Promise<CompleteSessionResponse | null> => {
    if (!sessionId.value) {
      console.error('[completeSession] 没有会话ID')
      return null
    }

    console.log('[completeSession] 开始完成会话，会话ID:', sessionId.value)

    try {
      // 最后一次数据同步（不再重复停止录制，因为调用方已经停止了）
      if (dataSyncManager) {
        console.log('[completeSession] 执行最后一次数据同步...')
        try {
          await dataSyncManager.forceSyncNow()
        } catch (syncError) {
          console.warn('[completeSession] 数据同步失败，继续完成会话:', syncError)
        }
      }

      const apiUrl = `${API_BASE}/${sessionId.value}/complete`
      console.log('[completeSession] 调用API:', apiUrl)

      // 使用带超时的 API 调用，避免无限等待
      const timeoutMs = 10000 // 10秒超时
      const apiPromise = apiCall<CompleteSessionResponse>(apiUrl, { method: 'POST' })
      const timeoutPromise = new Promise<{ success: false; message: string }>((resolve) => {
        setTimeout(() => resolve({ success: false, message: 'API调用超时' }), timeoutMs)
      })

      const result = await Promise.race([apiPromise, timeoutPromise])

      console.log('[completeSession] API调用结果:', result)

      if (result.success && result.data) {
        console.log('[completeSession] 成功获取会话数据:', result.data)
        ElMessage.success('面试会话已完成')
        return result.data
      } else {
        console.warn('[completeSession] API调用失败，使用降级方案:', result.message)
        // 使用降级方案生成模拟数据
        return generateFallbackSessionResponse()
      }
    } catch (error) {
      console.error('[completeSession] 完成会话异常，使用降级方案:', error)
      // 使用降级方案生成模拟数据
      return generateFallbackSessionResponse()
    }
  }

  // 生成降级会话响应数据
  const generateFallbackSessionResponse = (): CompleteSessionResponse => {
    console.log('[completeSession] 生成降级响应数据')
    ElMessage.warning('后端服务暂不可用，显示本地模拟数据')
    
    return fallbackManager.generateMockCompleteSessionResponse(
      sessionId.value || 'mock-session',
      session.value?.candidate_name || '候选人',
      session.value?.position_title || '未知岗位',
      stats.duration,
      cockpitData
    )
  }

  // 添加转录文本 - 累积到当前发言人的待处理文本
  const addTranscript = async (
    speaker: 'interviewer' | 'candidate',
    text: string,
    isFinal: boolean = true
  ): Promise<void> => {
    if (!text.trim()) return

    // 累积到待处理文本
    if (pendingTranscript.value) {
      pendingTranscript.value += ' ' + text.trim()
    } else {
      pendingTranscript.value = text.trim()
      speakerStartTime.value = new Date()
    }

    // 添加到本地显示（实时显示）
    transcripts.value.push({
      speaker: currentSpeaker.value,
      text,
      timestamp: new Date().toISOString(),
      is_final: isFinal
    })
  }

  // 切换发言人 - 同步上一轮对话并切换
  const switchSpeaker = async (): Promise<void> => {
    console.log('[switchSpeaker] 切换发言人，当前:', currentSpeaker.value)
    
    // 同步上一轮对话
    if (pendingTranscript.value.trim() && sessionId.value && dataSyncManager) {
      const transcriptRecord: TranscriptRecord = {
        speaker: currentSpeaker.value,
        text: pendingTranscript.value.trim(),
        is_final: true
      }
      
      // 添加到同步队列
      dataSyncManager.addTranscript(transcriptRecord)
      
      // 如果有开始时间，添加说话人片段
      if (speakerStartTime.value) {
        const segment: SpeakerSegment = {
          speaker: currentSpeaker.value,
          start_time: speakerStartTime.value.getTime(),
          end_time: Date.now(),
          text: pendingTranscript.value.trim(),
          confidence: 0.9
        }
        dataSyncManager.addSpeakerSegment(segment)
      }
      
      // 立即执行同步
      console.log('[switchSpeaker] 执行同步，文本长度:', pendingTranscript.value.length)
      await dataSyncManager.forceSyncNow()
    }
    
    // 切换发言人
    currentSpeaker.value = currentSpeaker.value === 'interviewer' ? 'candidate' : 'interviewer'
    console.log('[switchSpeaker] 切换后:', currentSpeaker.value)
    
    // 重置待处理文本
    pendingTranscript.value = ''
    speakerStartTime.value = new Date()
  }

  // 获取当前发言人显示文本
  const getSpeakerLabel = (): string => {
    return currentSpeaker.value === 'interviewer' ? '面试官' : '候选人'
  }

  // 添加说话人片段 - 使用批量同步
  const addSpeakerSegment = async (segment: SpeakerSegment): Promise<void> => {
    if (!sessionId.value || !dataSyncManager) return

    // 添加到本地显示
    speakerSegments.value.push(segment)

    // 添加到同步队列
    dataSyncManager.addSpeakerSegment(segment)
  }

  // 添加状态记录 - 使用批量同步
  const addStateRecord = async (state: CandidateState): Promise<void> => {
    if (!sessionId.value || !dataSyncManager) return

    const stateRecord: StateRecord = {
      segment_id: `segment_${Date.now()}`,
      emotion: state.emotion,
      engagement: state.engagement,
      nervousness: state.nervousness,
      confidence_level: state.confidence_level,
      eye_contact: state.eye_contact,
      posture_score: state.posture_score,
      speech_clarity: state.speech_clarity,
      speech_pace: state.speech_pace
    }

    // 添加到同步队列
    dataSyncManager.addStateRecord(stateRecord)
  }

  // 手动触发数据同步
  const syncDataNow = async (): Promise<void> => {
    if (dataSyncManager) {
      await dataSyncManager.forceSyncNow()
    }
  }

  // 获取同步队列状态
  const getSyncQueueStatus = () => {
    return dataSyncManager?.getQueueStatus() || {
      totalItems: 0,
      transcripts: 0,
      speakerSegments: 0,
      stateRecords: 0,
      isEmpty: true
    }
  }

  // 获取同步统计信息
  const getSyncStats = () => {
    return dataSyncManager?.getSyncStats() || {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalRetries: 0,
      avgSyncTime: 0,
      lastSyncTime: 0
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

  // 删除会话 - 使用新的 DELETE /api/v1/immersive/{session_id} 端点
  const deleteSession = async (): Promise<boolean> => {
    if (!sessionId.value) return false

    try {
      const result = await errorHandler.handleAPICall(
        () => apiCall(`${API_BASE}/${sessionId.value}`, {
          method: 'DELETE'
        }),
        'deleteSession'
      )

      if (result.success) {
        cleanup()
        ElMessage.success('会话已删除')
        return true
      } else {
        ElMessage.error(result.message || '删除会话失败')
      }
    } catch (error) {
      console.error('删除会话异常:', error)
      ElMessage.error('删除会话时发生异常')
    }

    return false
  }

  // 心理分析功能开关
  const enablePsychologicalAnalysis = (enabled: boolean): void => {
    config.psychologicalAnalysisEnabled = enabled
    
    // 如果当前有会话，立即应用设置
    if (sessionId.value) {
      // 更新问题建议的心理上下文参数
      if (config.showSuggestions) {
        fetchQuestionSuggestions()
      }
    }
  }

  // 获取心理分析配置
  const getPsychologicalAnalysisConfig = () => {
    return {
      enabled: config.psychologicalAnalysisEnabled,
      showEmotionLabels: config.psychologicalAnalysisEnabled,
      showBigFiveData: config.psychologicalAnalysisEnabled,
      showDepressionAnalysis: config.psychologicalAnalysisEnabled,
      includeInQuestionSuggestions: config.psychologicalAnalysisEnabled
    }
  }

  // 清理资源
  const cleanup = () => {
    stopAutoAnalyze()
    stopCockpitTimers()
    stopLocalCamera()
    
    // 停止数据同步
    if (dataSyncManager) {
      dataSyncManager.destroy()
      dataSyncManager = null
    }
    
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
    
    // 清理新增的状态
    syncQueue.value = {
      transcripts: [],
      speaker_segments: [],
      state_records: []
    }
    qualityMetrics.value = {
      session_quality_score: 0,
      psychological_wellness_score: 0
    }
    
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
    cockpitData,

    // 发言人切换相关
    currentSpeaker,
    pendingTranscript,
    switchSpeaker,
    getSpeakerLabel,

    // 新增：批量同步和质量指标
    syncQueue,
    qualityMetrics,

    // 操作
    createSession,
    startInterview,
    stopInterview,
    analyzeCurrentState,
    
    // 更新的方法名
    fetchQuestionSuggestions, // 替代 fetchSuggestions
    fetchInsights,
    
    // 新增的数据管理方法
    addTranscript,
    addSpeakerSegment,
    addStateRecord,
    syncDataNow,
    getSyncQueueStatus,
    getSyncStats,
    
    // 新增的会话管理方法
    completeSession, // 新增
    deleteSession,
    cleanup,

    // 新增的心理分析配置方法
    enablePsychologicalAnalysis,
    getPsychologicalAnalysisConfig,

    // 保留的方法（向后兼容）
    generateReport,

    // 调试功能
    triggerDeceptionAlert
  }
}
