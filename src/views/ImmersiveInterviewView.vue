<template>
  <div class="immersive-interview-view">
    <!-- 页面头部 -->
    <div v-if="isSessionActive" class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="candidate-info-header" v-if="session">
            <div class="info-item">
              <span class="info-label">候选人：</span>
              <span class="info-value">{{ session.candidate_name }}</span>
            </div>
            <el-divider direction="vertical" class="info-divider" />
            <div class="info-item">
              <span class="info-label">应聘岗位：</span>
              <span class="info-value">{{ session.position_title }}</span>
            </div>
          </div>
        </div>
        <div class="header-center">
        </div>
        <div class="header-right">
          <el-tag v-if="isRecording" type="danger" effect="dark" size="large" class="status-tag">
            <span class="status-dot"></span>
            面试进行中 · {{ formatDuration(stats.duration) }}
          </el-tag>
          <el-button 
            v-if="!isRecording"
            type="success"
            @click="handleStartInterview"
          >
            <el-icon><VideoPlay /></el-icon>
            开始面试
          </el-button>
          <el-button 
            v-else
            type="danger"
            @click="handleStopInterview"
          >
            <el-icon><VideoPause /></el-icon>
            结束面试
          </el-button>
          
          <!-- 语音转录控制按钮 -->
          <!-- 已移至右侧对话区域 -->
          
          <el-button type="danger" plain @click="handleEndSession">
            <el-icon><Close /></el-icon>
            退出会话
          </el-button>
        </div>
      </div>
    </div>

    <!-- 设置面板（未开始时显示） -->
    <transition name="fade">
      <div v-if="!isSessionActive" class="setup-panel">
        <div class="setup-card">
          <div class="setup-header">
            <el-icon class="setup-icon"><Setting /></el-icon>
            <h2>面试设置</h2>
          </div>
          
          <el-form label-position="top" class="setup-form">
            <!-- 选择候选人 -->
            <el-form-item label="选择候选人">
              <el-select 
                v-model="selectedApplicationId" 
                placeholder="请选择待面试的候选人"
                filterable
                class="full-width"
                :loading="isLoadingCandidates"
              >
                <el-option
                  v-for="app in applications"
                  :key="app.id"
                  :label="`${app.candidate_name} - ${app.position_title}`"
                  :value="app.id"
                >
                  <div class="candidate-option">
                    <span class="candidate-name">{{ app.candidate_name }}</span>
                    <span class="candidate-position">{{ app.position_title }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <!-- 推流设置（暂时隐藏）
            <el-form-item label="面试官视频源（可选）">
              <el-input
                v-model="config.streamUrl"
                placeholder="输入RTMP/HLS推流地址，或留空使用本地预览"
                clearable
              >
                <template #prefix>
                  <el-icon><VideoCameraFilled /></el-icon>
                </template>
              </el-input>
              <div class="form-tip">
                支持RTMP、HLS等常见推流协议，可连接远程面试官摄像头
              </div>
            </el-form-item>
            -->

            <!-- 功能开关 -->
            <el-form-item label="功能设置">
              <div class="feature-toggles">
                <el-checkbox v-model="config.localCameraEnabled">启用本地摄像头（候选人）</el-checkbox>
                <el-checkbox v-model="config.autoAnalyze">自动状态分析</el-checkbox>
                <el-checkbox v-model="config.showTranscript" :disabled="!speechSupported">
                  显示实时转录
                  <span v-if="!speechSupported" class="feature-tip">（浏览器不支持）</span>
                </el-checkbox>
                <el-checkbox v-model="config.showSuggestions">显示提问建议</el-checkbox>
              </div>
            </el-form-item>

            <!-- 分析间隔 -->
            <el-form-item label="数据更新间隔">
              <el-slider
                v-model="config.analyzeInterval"
                :min="3"
                :max="15"
                :step="1"
                :marks="{ 3: '3秒', 5: '5秒', 10: '10秒', 15: '15秒' }"
                show-stops
              />
            </el-form-item>
          </el-form>

          <div class="setup-actions">
            <el-button 
              type="primary" 
              size="large"
              :loading="isLoading"
              :disabled="!selectedApplicationId"
              @click="handleCreateSession"
            >
              <el-icon><VideoCamera /></el-icon>
              创建面试会话
            </el-button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 主面试界面 -->
    <transition name="slide-up">
      <div v-if="isSessionActive" class="main-interview-area">
        <!-- 主内容区 -->
        <div class="content-grid">
          <!-- 左侧：视频区 -->
          <div class="video-section">
            <DualCameraView
              :candidate-name="session?.candidate_name || undefined"
              :stream-url="config.streamUrl"
              :is-recording="isRecording"
              :candidate-state="currentState"
              :local-stream="localStream"
              :deception-score="cockpitData.deceptionScore"
              :duration="stats.duration"
              :speech-transcript="accumulatedTranscript"
              :speech-interim="speechInterim"
              :is-speech-listening="isSpeechListening"
              :show-transcript="config.showTranscript && isSessionActive"
              :big-five-data="cockpitData.bigFive"
              :depression-score="cockpitData.depressionScore"
              @init-camera="handleInitCamera"
              @clear-transcript="handleClearTranscript"
            />
          </div>

          <!-- 右侧：驾驶舱面板 -->
          <div class="analysis-section">
            <RealTimeAnalysisPanel
              :is-analyzing="isAnalyzing"
              :stats="stats"
              :cockpit-data="cockpitData"
              :suggestions="suggestions"
              :candidate-info="candidateInfo"
              :messages="chatMessages"
              :speech-supported="speechSupported"
              :is-speech-listening="isSpeechListening"
              :current-speaker="currentSpeaker"
              :is-loading-suggestions="isLoadingSuggestions"
              @refresh-suggestions="handleRefreshSuggestions"
              @use-suggestion="handleUseSuggestion"
              @toggle-speech="handleToggleSpeechRecognition"
              @send-question="handleSendQuestion"
              @send-question-and-switch="handleSendQuestionAndSwitch"
              @add-suggestion-to-chat="handleAddSuggestionToChat"
            />
          </div>
        </div>
      </div>
    </transition>

    <!-- 报告对话框 -->
    <el-dialog
      v-model="showReportDialog"
      title="面试报告"
      width="700px"
      class="report-dialog"
    >
      <div v-if="reportData" class="report-content">
        <div class="report-section">
          <h3>基本信息</h3>
          <div class="report-grid">
            <div class="report-item">
              <span class="item-label">面试时长</span>
              <span class="item-value">{{ (reportData.summary?.duration_minutes || 0).toFixed(1) }} 分钟</span>
            </div>
            <div class="report-item">
              <span class="item-label">问题数量</span>
              <span class="item-value">{{ reportData.summary?.total_questions || 0 }} 个</span>
            </div>
          </div>
        </div>
        
        <div class="report-section">
          <h3>候选人评估</h3>
          <div class="report-grid">
            <div class="report-item">
              <span class="item-label">沟通能力</span>
              <el-progress 
                :percentage="reportData.candidate_analysis?.communication_score || 0" 
                :color="getScoreColor(reportData.candidate_analysis?.communication_score)"
              />
            </div>
            <div class="report-item">
              <span class="item-label">技术深度</span>
              <el-progress 
                :percentage="reportData.candidate_analysis?.technical_depth || 0"
                :color="getScoreColor(reportData.candidate_analysis?.technical_depth)"
              />
            </div>
            <div class="report-item">
              <span class="item-label">文化契合度</span>
              <el-progress 
                :percentage="reportData.candidate_analysis?.cultural_fit || 0"
                :color="getScoreColor(reportData.candidate_analysis?.cultural_fit)"
              />
            </div>
          </div>
        </div>

        <div class="report-section" v-if="reportData.recommendations?.length">
          <h3>建议</h3>
          <ul class="recommendations-list">
            <li v-for="(rec, index) in reportData.recommendations" :key="index">
              {{ rec }}
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button @click="showReportDialog = false">关闭</el-button>
        <el-button type="primary" @click="handleDownloadReport">下载报告</el-button>
      </template>
    </el-dialog>

    <!-- 面试结果统计弹窗 -->
    <InterviewResultDialog
      v-model="showResultDialog"
      :result-data="interviewResult"
      :loading="isResultLoading"
      :error="resultError"
      @export-report="handleExportReport"
      @view-full-report="handleViewFullReport"
      @close="handleCloseResultDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  VideoCameraFilled,
  VideoCamera,
  VideoPlay,
  VideoPause,
  Close
} from '@element-plus/icons-vue'
import {
  DualCameraView,
  RealTimeAnalysisPanel,
  InterviewResultDialog
} from '@/components/immersive'
import { useImmersiveInterview } from '@/composables/useImmersiveInterview'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import type { QuestionSuggestion, CompleteSessionResponse } from '@/composables/useImmersiveInterview'

// 报告数据类型
interface ReportData {
  summary?: {
    duration_minutes?: number
    total_questions?: number
    interviewer_speak_ratio?: number
    candidate_speak_ratio?: number
  }
  candidate_analysis?: {
    overall_impression?: string
    communication_score?: number
    technical_depth?: number
    cultural_fit?: number
  }
  behavioral_indicators?: {
    avg_engagement?: number
    avg_confidence?: number
    emotional_stability?: string
  }
  recommendations?: string[]
  generated_at?: string
}

// 使用composable
const {
  config,
  sessionId,
  session,
  isLoading,
  isRecording,
  isAnalyzing,
  isSessionActive,
  localStream,
  currentState,
  emotionLabel,
  transcripts,
  suggestions,
  insights,
  stats,
  cockpitData,
  createSession,
  initLocalCamera,
  startInterview,
  stopInterview,
  fetchQuestionSuggestions,
  fetchInsights,
  addTranscript,
  generateReport,
  completeSession,
  deleteSession,
  cleanup,
  triggerDeceptionAlert,
  // 发言人切换相关
  currentSpeaker,
  switchSpeaker,
  getSpeakerLabel
} = useImmersiveInterview()

// 语音识别相关
const accumulatedTranscript = ref('') // 累积的完整转录文本

const {
  isSupported: speechSupported,
  isListening: isSpeechListening,
  interimTranscript: speechInterim,
  start: startSpeech,
  stop: stopSpeech,
  reset: resetSpeech
} = useSpeechRecognition({
  lang: 'zh-CN',
  continuous: true,
  interimResults: true,
  onResult: (text, isFinal) => {
    if (isFinal && text.trim()) {
      // 将最终识别结果追加到累积文本中
      if (accumulatedTranscript.value) {
        accumulatedTranscript.value += ' ' + text.trim()
      } else {
        accumulatedTranscript.value = text.trim()
      }
      
      // 根据当前发言人处理消息
      const speaker = currentSpeaker.value
      const role = speaker === 'interviewer' ? 'interviewer' : 'candidate'
      
      // 处理对话消息
      if (currentCandidateMessageId.value) {
        // 如果有当前消息，追加内容
        const existingMessage = chatMessages.value.find(msg => msg.id === currentCandidateMessageId.value)
        if (existingMessage && existingMessage.role === role) {
          existingMessage.content += ' ' + text.trim()
          existingMessage.timestamp = new Date()
        } else {
          // 角色变了，创建新消息
          const newMessageId = generateMessageId()
          chatMessages.value.push({
            id: newMessageId,
            role,
            content: text.trim(),
            timestamp: new Date()
          })
          currentCandidateMessageId.value = newMessageId
        }
      } else {
        // 创建新消息
        const newMessageId = generateMessageId()
        chatMessages.value.push({
          id: newMessageId,
          role,
          content: text.trim(),
          timestamp: new Date()
        })
        currentCandidateMessageId.value = newMessageId
      }
      
      // 添加到转录记录（使用当前发言人）
      addTranscript(speaker, text.trim())
    }
  },
  onError: (errorMsg) => {
    console.error('语音识别错误:', errorMsg)
  }
})

// 启用键盘快捷键
useKeyboardShortcuts({
  onTriggerDeception: () => {
    // 按键1：触发欺骗检测高值
    triggerDeceptionAlert()
    ElMessage.warning('已触发欺骗检测警告（10秒后恢复）')
  }
  // 可以在这里添加更多快捷键回调
  // onKey2: () => { ... },
  // onKey3: () => { ... },
})

// 本地状态
const selectedApplicationId = ref('')
const applications = ref<Array<{
  id: string
  candidate_name: string
  position_title: string
  resume_id?: string
  screening_task_id?: string
}>>([])
const isLoadingCandidates = ref(false)
const showReportDialog = ref(false)
const reportData = ref<ReportData | null>(null)

// 面试结果弹窗相关
const showResultDialog = ref(false)
const isResultLoading = ref(false)
const resultError = ref<string | null>(null) // 新增：错误状态
const interviewResult = ref<CompleteSessionResponse | null>(null)

// 问题建议加载状态（在父组件统一管理）
const isLoadingSuggestions = ref(false)

// 聊天消息
const chatMessages = ref<Array<{
  id: string
  role: 'interviewer' | 'candidate' | 'system'
  content: string
  timestamp: Date
}>>([])

// 当前候选人消息ID（用于追加内容）
const currentCandidateMessageId = ref<string | null>(null)

// 生成消息ID
const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

// 获取候选人列表
const fetchApplications = async () => {
  isLoadingCandidates.value = true
  try {
    const response = await fetch('/api/v1/applications?page_size=100')
    const result = await response.json()
    if (result.success && result.data?.items) {
      applications.value = result.data.items.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        candidate_name: (item.candidate_name as string) || '未知',
        position_title: (item.position_title as string) || '未知岗位',
        resume_id: (item.resume as Record<string, unknown>)?.id as string || undefined,
        screening_task_id: (item.screening_task as Record<string, unknown>)?.id as string || undefined
      }))
    }
  } catch (error) {
    console.error('获取候选人列表失败:', error)
    ElMessage.error('获取候选人列表失败')
  } finally {
    isLoadingCandidates.value = false
  }
}

// 候选人信息计算属性
const candidateInfo = computed(() => {
  const selectedApp = applications.value.find(app => app.id === selectedApplicationId.value)
  return {
    name: session.value?.candidate_name || selectedApp?.candidate_name || '',
    position: session.value?.position_title || selectedApp?.position_title || '',
    applicationId: selectedApplicationId.value,
    resumeId: selectedApp?.resume_id,
    screeningTaskId: selectedApp?.screening_task_id
  }
})

// 创建会话
const handleCreateSession = async () => {
  if (!selectedApplicationId.value) {
    ElMessage.warning('请选择候选人')
    return
  }
  
  const success = await createSession(selectedApplicationId.value)
  if (success) {
    // 重置累积转录文本和聊天记录
    accumulatedTranscript.value = ''
    chatMessages.value = []
    currentCandidateMessageId.value = null
    
    // 添加系统欢迎消息
    chatMessages.value.push({
      id: generateMessageId(),
      role: 'system',
      content: '面试会话已创建，点击"开始面试"后将自动启动语音转录',
      timestamp: new Date()
    })
    
    if (config.localCameraEnabled) {
      await handleInitCamera()
    }
    
    // 进入面试界面后立即申请第一次问题建议
    if (config.showSuggestions) {
      setTimeout(() => {
        handleFetchSuggestions()
      }, 500) // 延迟500ms，确保会话已完全创建
    }
  }
}

// 初始化摄像头
const handleInitCamera = async () => {
  await initLocalCamera()
}

// 开始面试
const handleStartInterview = async () => {
  await startInterview()
  
  // 添加系统消息
  chatMessages.value.push({
    id: generateMessageId(),
    role: 'system',
    content: '面试已开始',
    timestamp: new Date()
  })
  
  // 面试开始后自动启动语音识别
  if (speechSupported.value && config.showTranscript && !isSpeechListening.value) {
    const success = await startSpeech()
    if (success) {
      ElMessage.success('语音转录已启动')
    } else {
      ElMessage.warning('语音转录启动失败，请检查麦克风权限')
    }
  }
  
}

// 结束面试
const handleStopInterview = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要结束本次面试吗？系统将生成完整的面试报告。',
      '结束面试',
      {
        confirmButtonText: '确定结束',
        cancelButtonText: '继续面试',
        type: 'warning'
      }
    )
    
    console.log('[ImmersiveInterviewView] 开始结束面试流程')
    
    // 停止语音识别
    if (isSpeechListening.value) {
      stopSpeech()
      ElMessage.info('语音转录已停止')
    }
    
    // 同步最后一轮对话（确保最后的内容不会丢失）
    console.log('[ImmersiveInterviewView] 同步最后一轮对话')
    await switchSpeaker()
    
    // 添加系统消息
    chatMessages.value.push({
      id: generateMessageId(),
      role: 'system',
      content: '面试已结束，正在生成报告...',
      timestamp: new Date()
    })
    
    // 1. 先停止录制
    console.log('[ImmersiveInterviewView] 停止录制')
    await stopInterview()
    
    // 2. 完成会话并获取完整数据
    console.log('[ImmersiveInterviewView] 完成会话并获取数据')
    showResultDialog.value = true
    isResultLoading.value = true
    resultError.value = null // 重置错误状态
    interviewResult.value = null // 重置结果数据
    
    try {
      console.log('[ImmersiveInterviewView] 调用 completeSession...')
      
      // 添加超时机制，防止无限等待
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('API调用超时（30秒）')), 30000)
      })
      
      const completeResult = await Promise.race([
        completeSession(),
        timeoutPromise
      ])
      
      console.log('[ImmersiveInterviewView] completeSession 返回结果:', completeResult)
      
      if (completeResult) {
        console.log('[ImmersiveInterviewView] 获取到完整会话数据:', completeResult)
        interviewResult.value = completeResult
        ElMessage.success('面试报告已生成')
      } else {
        console.warn('[ImmersiveInterviewView] completeSession 返回 null')
        resultError.value = '无法获取面试数据，请检查网络连接或联系管理员'
        ElMessage.error('生成面试报告失败')
      }
    } catch (error) {
      console.error('[ImmersiveInterviewView] 获取完整会话数据失败:', error)
      resultError.value = `生成面试报告时发生错误: ${error instanceof Error ? error.message : '未知错误'}`
      ElMessage.error('生成面试报告时出现问题')
    } finally {
      // 确保loading状态总是被重置
      isResultLoading.value = false
      console.log('[ImmersiveInterviewView] loading状态已重置为false')
    }
    
  } catch (error) {
    // 用户取消或其他错误
    console.log('[ImmersiveInterviewView] 用户取消结束面试或发生错误:', error)
    // 如果弹窗已经显示，需要重置loading状态
    if (showResultDialog.value) {
      isResultLoading.value = false
      showResultDialog.value = false
    }
  }
}

// 退出会话
const handleEndSession = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出会话吗？所有未保存的数据将丢失。',
      '退出会话',
      {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 停止语音识别
    if (isSpeechListening.value) {
      stopSpeech()
    }
    
    // 清空累积转录文本和聊天记录
    accumulatedTranscript.value = ''
    chatMessages.value = []
    currentCandidateMessageId.value = null
    
    await deleteSession()
    selectedApplicationId.value = ''
  } catch {
    // 用户取消
  }
}

// 刷新建议 - 用于事件处理
const handleRefreshSuggestions = async () => {
  console.log('[ImmersiveInterviewView] 收到 refresh-suggestions 事件')
  // 调用实际的获取建议逻辑
  await handleFetchSuggestions()
}

// 获取建议
const handleFetchSuggestions = async () => {
  console.log('[ImmersiveInterviewView] 开始获取建议')
  
  // 设置加载状态
  isLoadingSuggestions.value = true
  
  try {
    await fetchQuestionSuggestions()
    console.log('[ImmersiveInterviewView] fetchQuestionSuggestions 调用完成，当前建议数量:', suggestions.value.length)
    
    // 如果API没有返回建议，根据候选人信息生成基于简历的建议
    if (suggestions.value.length === 0) {
      console.log('[ImmersiveInterviewView] API未返回建议，生成基于简历的建议')
      const resumeBasedSuggestions = generateResumeBasedSuggestions()
      suggestions.value = resumeBasedSuggestions
      console.log('[ImmersiveInterviewView] 生成了', resumeBasedSuggestions.length, '条基于简历的建议')
    }
  } catch (error) {
    console.error('[ImmersiveInterviewView] 获取建议时发生错误:', error)
    
    // 发生错误时也使用基于简历的建议
    const resumeBasedSuggestions = generateResumeBasedSuggestions()
    suggestions.value = resumeBasedSuggestions
    console.log('[ImmersiveInterviewView] 错误降级，生成了', resumeBasedSuggestions.length, '条基于简历的建议')
  } finally {
    // 重置加载状态
    isLoadingSuggestions.value = false
  }
}

// 生成基于简历的问题建议
const generateResumeBasedSuggestions = () => {
  const candidateName = candidateInfo.value.name || '候选人'
  const position = candidateInfo.value.position || '该岗位'
  
  const resumeQuestions = [
    {
      question: `请${candidateName}简单介绍一下自己，以及为什么对${position}感兴趣？`,
      type: 'behavioral' as const,
      priority: 1,
      reason: '开场自我介绍'
    },
    {
      question: `能否详细介绍一下您简历中提到的最有挑战性的项目经历？`,
      type: 'technical' as const,
      priority: 2,
      reason: '项目经验深挖'
    },
    {
      question: `在您的工作经历中，遇到过什么技术难题？是如何解决的？`,
      type: 'technical' as const,
      priority: 3,
      reason: '问题解决能力'
    },
    {
      question: `您认为自己在技术方面的优势是什么？有哪些需要提升的地方？`,
      type: 'behavioral' as const,
      priority: 4,
      reason: '自我认知评估'
    },
    {
      question: `对于${position}这个岗位，您有什么问题想了解的吗？`,
      type: 'situational' as const,
      priority: 5,
      reason: '反向提问'
    }
  ]
  
  // 随机选择3-4个问题
  const shuffled = resumeQuestions.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(4, resumeQuestions.length))
}

// 获取洞察
const handleFetchInsights = async () => {
  await fetchInsights()
}

// 使用建议问题
const handleUseSuggestion = (suggestion: QuestionSuggestion) => {
  addTranscript('interviewer', suggestion.question)
  ElMessage.success('问题已添加到转录')
}

// 发送面试官问题
const handleSendQuestion = (question: string) => {
  // 结束当前候选人消息（如果有的话）
  currentCandidateMessageId.value = null
  
  // 添加到聊天记录
  chatMessages.value.push({
    id: generateMessageId(),
    role: 'interviewer',
    content: question,
    timestamp: new Date()
  })
  
  // 添加到转录记录
  addTranscript('interviewer', question)
}

// 发送面试官问题并切换到候选人发言
const handleSendQuestionAndSwitch = async (question: string) => {
  // 清空累积的语音转录（被建议覆盖）
  accumulatedTranscript.value = ''
  
  // 结束当前消息
  currentCandidateMessageId.value = null
  
  // 添加到聊天记录
  chatMessages.value.push({
    id: generateMessageId(),
    role: 'interviewer',
    content: question,
    timestamp: new Date()
  })
  
  // 添加到转录记录
  addTranscript('interviewer', question)
  
  // 执行同步并切换到候选人发言
  await switchSpeaker()
  
  // 确保切换后是候选人发言
  if (currentSpeaker.value !== 'candidate') {
    await switchSpeaker()
  }
  
  ElMessage.success('已发送问题，切换到候选人发言')
}

// 将建议添加到聊天（预留接口）
const handleAddSuggestionToChat = (suggestion: QuestionSuggestion) => {
  handleSendQuestionAndSwitch(suggestion.question)
}

// 获取完整对话记录（用于保存）
const getConversationHistory = () => {
  return {
    sessionId: sessionId.value,
    candidateName: session.value?.candidate_name || '',
    positionTitle: session.value?.position_title || '',
    messages: chatMessages.value.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    })),
    transcripts: transcripts.value, // 原始转录记录
    stats: stats,
    exportedAt: new Date().toISOString()
  }
}

// 导出对话记录
const handleExportConversation = () => {
  const conversationData = getConversationHistory()
  
  const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `conversation_${sessionId.value}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('对话记录已导出')
}

// 切换发言人（原"开始转录"按钮改为切换发言人）
const handleToggleSpeechRecognition = async () => {
  // 如果语音识别未启动，先启动它
  if (!isSpeechListening.value) {
    const success = await startSpeech()
    if (!success) {
      ElMessage.error('语音转录启动失败，请检查麦克风权限')
      return
    }
    ElMessage.success('语音转录已启动，当前发言人：' + getSpeakerLabel())
    return
  }
  
  // 切换发言人并同步数据
  await switchSpeaker()
  
  // 重置当前消息ID，下一条消息将创建新的
  currentCandidateMessageId.value = null
  
  // 如果切换到面试官发言，自动请求问题建议
  if (currentSpeaker.value === 'interviewer' && config.showSuggestions) {
    handleFetchSuggestions()
  }
  
  ElMessage.success('已切换到：' + getSpeakerLabel())
}

// 清空转录文本
const handleClearTranscript = () => {
  accumulatedTranscript.value = ''
  chatMessages.value = []
  currentCandidateMessageId.value = null
  resetSpeech()
  ElMessage.info('转录文本和聊天记录已清空')
}

// 生成报告
const handleGenerateReport = async () => {
  const report = await generateReport()
  if (report) {
    reportData.value = report
    showReportDialog.value = true
  }
}

// 导出数据
const handleExportData = () => {
  const data = {
    session: session.value,
    transcripts: transcripts.value,
    insights: insights.value,
    stats: stats,
    exportedAt: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `immersive_interview_${sessionId.value}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('数据已导出')
}

// 面试结果弹窗事件处理
const handleExportReport = () => {
  if (interviewResult.value) {
    const blob = new Blob([JSON.stringify(interviewResult.value, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview_report_${interviewResult.value.session_id}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('面试报告已导出')
  }
}

const router = useRouter()

const handleCloseResultDialog = () => {
  showResultDialog.value = false
  resultError.value = null
  interviewResult.value = null
  
  // 清理会话资源
  cleanup()
  
  // 跳转到最终推荐界面
  router.push({ name: 'recommend' })
}

const handleViewFullReport = () => {
  // 这里可以跳转到详细报告页面或打开新的弹窗
  ElMessage.info('详细报告功能开发中...')
}

// 下载报告
const handleDownloadReport = () => {
  if (!reportData.value) return
  
  const blob = new Blob([JSON.stringify(reportData.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interview_report_${sessionId.value}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 格式化时长
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 获取分数颜色
const getScoreColor = (score: number | undefined) => {
  if (!score) return '#909399'
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

// 生命周期
onMounted(() => {
  fetchApplications()
})

onUnmounted(() => {
  // 清理语音识别
  if (isSpeechListening.value) {
    stopSpeech()
  }
  // 清空累积转录文本和聊天记录
  accumulatedTranscript.value = ''
  chatMessages.value = []
  currentCandidateMessageId.value = null
  cleanup()
})
</script>

<style scoped lang="scss">
.immersive-interview-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: calc(100vh - 140px);
}

// 页面头部
.page-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 20px 32px;
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
  }
  
  .header-left {
    flex-shrink: 0;
    
    .candidate-info-header {
      display: flex;
      align-items: center;
      gap: 16px;
      
      .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .info-label {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
        }
        
        .info-value {
          font-size: 24px;
          font-weight: 700;
          color: white;
        }
      }
      
      .info-divider {
        height: 30px;
        border-color: rgba(255, 255, 255, 0.3);
      }
    }
  }
  
  .header-center {
    flex-shrink: 0;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    
    .el-button {
      padding: 10px 20px;
    }
  }
  
  .status-tag {
    padding: 10px 20px;
    font-size: 14px;
    border-radius: 25px;
    
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: white;
      margin-right: 8px;
      animation: pulse 1.5s infinite;
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

// 设置面板
.setup-panel {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.setup-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  
  .setup-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
    
    .setup-icon {
      font-size: 28px;
      color: #667eea;
    }
    
    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a2e;
    }
  }
  
  .setup-form {
    .full-width {
      width: 100%;
    }
    
    .form-tip {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 6px;
    }
    
    .feature-toggles {
      display: flex;
      flex-direction: column;
      gap: 12px;
      
      .el-checkbox {
        .feature-tip {
          font-size: 12px;
          color: #f56c6c;
          margin-left: 4px;
        }
      }
    }
  }
  
  .setup-actions {
    margin-top: 32px;
    display: flex;
    justify-content: center;
    
    .el-button {
      padding: 14px 40px;
      font-size: 16px;
    }
  }
}

.candidate-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  
  .candidate-name {
    font-weight: 500;
  }
  
  .candidate-position {
    font-size: 12px;
    color: #9ca3af;
  }
}

// 主面试区域
.main-interview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 20px;
  min-height: 500px;
}

.video-section {
  background: #1a1a2e;
  border-radius: 20px;
  overflow: hidden;
}

.analysis-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

// 报告对话框
.report-dialog {
  .report-content {
    .report-section {
      margin-bottom: 24px;
      
      h3 {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a2e;
        margin: 0 0 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
    }
    
    .report-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .report-item {
      .item-label {
        display: block;
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 6px;
      }
      
      .item-value {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a2e;
      }
    }
    
    .recommendations-list {
      margin: 0;
      padding-left: 20px;
      
      li {
        margin-bottom: 8px;
        line-height: 1.6;
        color: #4b5563;
      }
    }
  }
}

// 动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

// 响应式
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
    
    .video-section {
      height: 400px;
    }
    
    .analysis-section {
      height: 500px;
    }
  }
}
</style>
