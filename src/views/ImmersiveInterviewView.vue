<template>
  <div class="immersive-interview-view" ref="fullscreenRef" :class="{ 'fullscreen-mode': isFullscreen }">

    <!-- 设置面板（未开始时显示） -->
    <transition name="fade">
      <SetupPanel
        v-if="!isSessionActive"
        :config="config"
        :selected-application-id="selectedApplicationId"
        :applications="applications"
        :is-loading-candidates="isLoadingCandidates"
        :is-loading="isLoading"
        @update:selected-application-id="selectedApplicationId = $event"
        @update:config="handleUpdateConfig"
        @create-session="handleCreateSession"
      />
    </transition>

    <!-- 主面试界面 -->
    <transition name="slide-up">
      <div v-if="isSessionActive" class="main-interview-area">
        <!-- 控制栏 -->
        <div class="control-bar-wrapper" v-show="!isFullscreen || fsShowControlBar">
          <InterviewControlBar
            :session="session"
            :is-recording="isRecording"
            :is-speech-listening="isSpeechListening"
            :is-speech-configured="isSpeechConfigured"
            :speech-supported="speechSupported"
            :stages="stages"
            :current-stage="currentStage"
            v-model:auto-stage-switch="autoStageSwitch"
            @start-interview="handleStartInterview"
            @stop-interview="handleStopInterview"
            @toggle-speech="handleToggleSpeech"
            @stop-speech="handleStopSpeech"
            @open-speech-config="showAliyunConfigDialog = true"
            @end-session="handleEndSession"
            @set-stage="setStage"
          />
          <!-- 全屏进入按钮 -->
          <button
            v-if="!isFullscreen"
            class="fullscreen-enter-btn"
            @click="enterFullscreen"
            title="进入全屏沉浸模式"
          >
            <el-icon :size="16"><FullScreen /></el-icon>
          </button>
        </div>


        <!-- 主内容区 -->
        <div class="content-grid" :style="{ gridTemplateColumns: contentGridColumns }">
          <!-- 左侧：态势感知面板 -->
          <div class="situation-section" v-show="!isFullscreen || fsShowSituationPanel">
            <SituationAwarenessPanel
              :is-expanded="isFullscreen || isLeftPanelExpanded"
              :assessment="situationAssessment"
              :suggestions="situationSuggestions"
              :interest-points="interestPoints"
              :is-loading-assessment="isLoadingAssessment"
              :is-loading-suggestions="isLoadingSuggestions"
              :is-loading-interest-points="isLoadingInterestPoints"
              :can-refresh="isRecording"
              v-model:auto-refresh="autoRefreshEnabled"
              @toggle="isFullscreen ? (fsShowSituationPanel = false) : toggleLeftPanel()"
              @refresh-assessment="handleRefreshAssessment"
              @refresh-suggestions="handleRefreshSituationSuggestions"
              @use-suggestion="handleUseSituationSuggestion"
              @edit-suggestion="handleEditSituationSuggestion"
              @use-interest-point="handleUseInterestPoint"
              @edit-interest-point="handleEditInterestPoint"
            />
          </div>

          <!-- 左侧拖拽分隔条（仅展开时显示） -->
          <div 
            v-if="isLeftPanelExpanded && !isFullscreen"
            class="resize-bar left-resize"
            :class="{ dragging: leftResizeBarDragging }"
            @mousedown="startLeftResize"
          >
            <div class="resize-handle"></div>
          </div>

          <!-- 中间：视频区 -->
          <VideoSection
            ref="videoSectionRef"
            :camera-mode="config.cameraMode"
            :local-camera-enabled="config.localCameraEnabled"
            :stream-url="config.streamUrl"
            :analyze-source="config.analyzeSource"
            :is-recording="isRecording"
            :is-ws-connected="isWsConnected"
            :is-gaze-drifting="isGazeDrifting"
            :pip-swapped="pipSwapped"
            :local-video-stream="localStream"
            @toggle-pip="togglePipSwap"
          />

          <!-- 右侧拖拽分隔条 -->
          <div 
            v-if="!isFullscreen"
            class="resize-bar"
            :class="{ dragging: resizeBarDragging }"
            @mousedown="startResize"
          >
            <div class="resize-handle"></div>
          </div>

          <!-- 右侧：实时分析面板 -->
          <div class="analysis-section" v-show="!isFullscreen || fsShowAnalysisPanel">
            <RealTimeAnalysisPanel
              ref="analysisPanelRef"
              :is-connected="isWsConnected"
              :emotions="currentBehavior?.emotions || []"
              :gaze="currentBehavior?.gaze || null"
              :stats="stats"
              :candidate-info="candidateInfo"
              :messages="messages"
              :current-speaker="currentSpeaker"
              :is-speech-listening="isSpeechListening"
              :speech-interim="speechInterim || ''"
              :session-id="sessionId || ''"
              @send-question="handlePanelSendQuestion"
              @send-answer="handlePanelSendAnswer"
              @ai-answer-generated="handleAiAnswerGenerated"
            />
          </div>
        </div>

        <!-- 全屏底部控制台 -->
        <transition name="dock-slide">
          <div v-if="isFullscreen" class="fullscreen-dock">
            <div class="dock-container">
              <button
                class="dock-btn dock-blue"
                :class="{ active: fsShowControlBar }"
                @click="fsShowControlBar = !fsShowControlBar"
                title="控制栏"
              >
                <el-icon :size="22"><Monitor /></el-icon>
              </button>
              <button
                class="dock-btn dock-purple"
                :class="{ active: fsShowSituationPanel }"
                @click="toggleFsSituationPanel"
                title="态势感知"
              >
                <el-icon :size="22"><DataAnalysis /></el-icon>
              </button>
              <button
                class="dock-btn dock-green"
                :class="{ active: fsShowAnalysisPanel }"
                @click="fsShowAnalysisPanel = !fsShowAnalysisPanel"
                title="对话分析"
              >
                <el-icon :size="22"><ChatLineRound /></el-icon>
              </button>
              <div class="dock-divider"></div>
              <button
                class="dock-btn dock-red"
                @click="exitFullscreen"
                title="退出全屏"
              >
                <el-icon :size="22"><ScaleToOriginal /></el-icon>
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>

    <!-- 阿里云语音配置弹窗 -->
    <AliyunConfigDialog
      v-model:visible="showAliyunConfigDialog"
      :config="aliyunConfig"
      @update:config="handleUpdateAliyunConfig"
      @save="handleSaveAliyunConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  VideoCamera,
  VideoPlay,
  VideoPause,
  MagicStick,
  Close,
  Microphone,
  Switch,
  Promotion,
  Link,
  FullScreen,
  Monitor,
  DataAnalysis,
  ChatLineRound,
  ScaleToOriginal
} from '@element-plus/icons-vue'
import RealTimeAnalysisPanel from '@/components/immersive/RealTimeAnalysisPanel.vue'
import SituationAwarenessPanel from '@/components/immersive/SituationAwarenessPanel.vue'
import SetupPanel from '@/components/immersive/SetupPanel.vue'
import InterviewControlBar from '@/components/immersive/InterviewControlBar.vue'
import VideoSection from '@/components/immersive/VideoSection.vue'
import AliyunConfigDialog from '@/components/immersive/AliyunConfigDialog.vue'
import type { SituationAssessment, QuestionSuggestion as SAPanelSuggestion, InterestPoint } from '@/components/immersive/SituationAwarenessPanel.vue'
import type { SetupConfig } from '@/components/immersive/SetupPanel.vue'
import { useImmersiveInterview } from '@/composables/useImmersiveInterview'
import { useSpeechRecognition, getAliyunConfig, saveAliyunConfig } from '@/composables/useSpeechRecognition'
import { getApplications } from '@/api/sdk.gen'
import type { ApplicationDetailResponse } from '@/api/types.gen'

// 使用 composable
const {
  config,
  sessionId,
  session,
  isLoading,
  isRecording,
  isSessionActive,
  isWsConnected,
  localStream,
  localVideoRef,
  streamVideoRef,
  currentBehavior,
  currentEmotionLabel,
  stats,
  currentSpeaker,
  messages,
  createSession,
  initLocalCamera,
  startInterview,
  stopInterview,
  deleteSession,
  cleanup,
  switchSpeaker,
  getSpeakerLabel,
  addInterviewerMessage,
  addCandidateMessage,
  syncMessages,
  // 面试环节
  currentStage,
  stages,
  currentStageConfig,
  loadStageConfig,
  setStage,
  advanceStage
} = useImmersiveInterview()

// 语音识别
const accumulatedTranscript = ref('')
const {
  isSupported: speechSupported,
  isListening: isSpeechListening,
  isConfigured: isSpeechConfigured,
  interimTranscript: speechInterim,
  start: startSpeech,
  stop: stopSpeech,
  reset: resetSpeech,
  updateConfig: updateSpeechConfig
} = useSpeechRecognition({
  lang: 'zh-CN',
  continuous: true,
  interimResults: true,
  onResult: (text, isFinal) => {
    if (isFinal && text.trim()) {
      if (accumulatedTranscript.value) {
        accumulatedTranscript.value += ' ' + text.trim()
      } else {
        accumulatedTranscript.value = text.trim()
      }
    }
  },
  onError: (errorMsg) => {
    console.error('语音识别错误:', errorMsg)
  }
})

// 组件引用
const analysisPanelRef = ref<InstanceType<typeof RealTimeAnalysisPanel> | null>(null)
const videoSectionRef = ref<InstanceType<typeof VideoSection> | null>(null)

// 将 VideoSection 的 localVideoRef 绑定到 composable 的 localVideoRef
watch(
  () => videoSectionRef.value?.localVideoRef,
  (videoEl) => {
    if (videoEl) {
      localVideoRef.value = videoEl
    }
  },
  { immediate: true }
)

// 将 VideoSection 的 streamVideoRef 绑定到 composable 的 streamVideoRef
watch(
  () => videoSectionRef.value?.streamVideoRef,
  (videoEl) => {
    if (videoEl) {
      streamVideoRef.value = videoEl
    }
  },
  { immediate: true }
)

// 画中画模式状态
const pipSwapped = ref(false)
const togglePipSwap = () => {
  pipSwapped.value = !pipSwapped.value
}

// ==================== 全屏模式 ====================
const fullscreenRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const fsShowControlBar = ref(true)
const fsShowSituationPanel = ref(false)
const fsShowAnalysisPanel = ref(true)

const enterFullscreen = async () => {
  try {
    await document.documentElement.requestFullscreen()
  } catch (e) {
    // 回退到CSS全屏
    isFullscreen.value = true
    document.body.style.overflow = 'hidden'
  }
}

const exitFullscreen = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      isFullscreen.value = false
      document.body.style.overflow = ''
    }
  } catch (e) {
    isFullscreen.value = false
    document.body.style.overflow = ''
  }
}

const toggleFsSituationPanel = () => {
  fsShowSituationPanel.value = !fsShowSituationPanel.value
}

const onFullscreenChange = () => {
  const isFull = !!document.fullscreenElement
  isFullscreen.value = isFull
  document.body.style.overflow = isFull ? 'hidden' : ''
}

// 阿里云配置
const showAliyunConfigDialog = ref(false)
const aliyunConfig = ref({
  appKey: '',
  token: ''
})

// 更新配置的处理函数
const handleUpdateConfig = (key: keyof SetupConfig, value: any) => {
  ;(config as any)[key] = value
}

const handleUpdateAliyunConfig = (key: 'appKey' | 'token', value: string) => {
  aliyunConfig.value[key] = value
}

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

// 右侧面板拖拽调整宽度
const analysisPanelWidth = ref(420)
const resizeBarDragging = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 左侧态势感知面板状态
const isLeftPanelExpanded = ref(false)
const leftPanelWidth = ref(320)
const leftResizeBarDragging = ref(false)
const leftStartX = ref(0)
const leftStartWidth = ref(0)

// 态势感知数据
const situationAssessment = ref<SituationAssessment>({
  assessment: ''
})
const situationSuggestions = ref<SAPanelSuggestion[]>([])
const isLoadingAssessment = ref(false)
const isLoadingSuggestions = ref(false)
const autoRefreshEnabled = ref(false)
const autoStageSwitch = ref(true) // 自动切换环节开关，默认开启

// 简历兴趣点（面试开始前生成一次）
const interestPoints = ref<InterestPoint[]>([])
const initialQuestions = ref<Array<{ question: string; category: string }>>([])
const isLoadingInterestPoints = ref(false)

const startResize = (e: MouseEvent) => {
  resizeBarDragging.value = true
  startX.value = e.clientX
  startWidth.value = analysisPanelWidth.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onResize = (e: MouseEvent) => {
  if (!resizeBarDragging.value) return
  const diff = startX.value - e.clientX
  // 获取容器宽度，计算最大允许宽度（视频最小保留30%）
  const container = document.querySelector('.content-grid') as HTMLElement
  const containerWidth = container?.offsetWidth || 1200
  const maxWidth = Math.floor(containerWidth * 0.7) - 20 // 70% - gap
  const newWidth = Math.min(Math.max(startWidth.value + diff, 320), maxWidth)
  analysisPanelWidth.value = newWidth
}

const stopResize = () => {
  resizeBarDragging.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 左侧面板拖拽
const startLeftResize = (e: MouseEvent) => {
  leftResizeBarDragging.value = true
  leftStartX.value = e.clientX
  leftStartWidth.value = leftPanelWidth.value
  document.addEventListener('mousemove', onLeftResize)
  document.addEventListener('mouseup', stopLeftResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onLeftResize = (e: MouseEvent) => {
  if (!leftResizeBarDragging.value) return
  const diff = e.clientX - leftStartX.value
  const container = document.querySelector('.content-grid') as HTMLElement
  const containerWidth = container?.offsetWidth || 1200
  const maxWidth = Math.floor(containerWidth * 0.4) - 20
  const newWidth = Math.min(Math.max(leftStartWidth.value + diff, 280), maxWidth)
  leftPanelWidth.value = newWidth
}

const stopLeftResize = () => {
  leftResizeBarDragging.value = false
  document.removeEventListener('mousemove', onLeftResize)
  document.removeEventListener('mouseup', stopLeftResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 切换左侧面板
const toggleLeftPanel = () => {
  isLeftPanelExpanded.value = !isLeftPanelExpanded.value
}

// 计算内容区域网格列
const contentGridColumns = computed(() => {
  if (isFullscreen.value) {
    return '1fr'
  }
  if (isLeftPanelExpanded.value) {
    return `${leftPanelWidth.value}px 6px 1fr 6px ${analysisPanelWidth.value}px`
  }
  return `40px 1fr 6px ${analysisPanelWidth.value}px`
})

// 获取候选人列表
const fetchApplications = async () => {
  isLoadingCandidates.value = true
  try {
    const result = await getApplications({ query: { page_size: 100 } })
    if (result.data?.data?.items) {
      applications.value = result.data.data.items.map((item: ApplicationDetailResponse) => ({
        id: item.id,
        candidate_name: item.candidate_name || '未知',
        position_title: item.position_title || '未知岗位',
        resume_id: item.resume?.id,
        screening_task_id: item.screening_task?.id
      }))
    }
  } catch (error) {
    console.error('获取候选人列表失败:', error)
    ElMessage.error('获取候选人列表失败')
  } finally {
    isLoadingCandidates.value = false
  }
}

// 候选人信息
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

// 视线游离检测（一旦 ratio < 1 即视为游离，立即显示警告）
const isGazeDrifting = computed(() => {
  if (!currentBehavior.value?.gaze) return false
  return currentBehavior.value.gaze.ratio < 1
})

// 生成简历兴趣点和初始问题
const generateInterestPoints = async () => {
  if (!sessionId.value) return
  
  isLoadingInterestPoints.value = true
  try {
    // 获取候选人简历内容
    const selectedApp = applications.value.find(app => app.id === selectedApplicationId.value)
    if (!selectedApp?.resume_id) {
      console.warn('未找到简历ID')
      return
    }
    
    const response = await fetch(`/api/v1/ai/interview/initial-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId.value,
        interest_point_count: config.interestPointCount
      })
    })
    
    const result = await response.json()
    if (result.success && result.data) {
      // 存储兴趣点
      if (result.data.interest_points) {
        interestPoints.value = result.data.interest_points.map((p: any) => ({
          source: p.source || '',
          question: p.question || ''
        }))
      }
      ElMessage.success(`已生成 ${interestPoints.value.length} 个简历兴趣点`)
    }
  } catch (error) {
    console.error('生成兴趣点失败:', error)
  } finally {
    isLoadingInterestPoints.value = false
  }
}

// 创建会话
const handleCreateSession = async () => {
  if (!selectedApplicationId.value) {
    ElMessage.warning('请选择候选人')
    return
  }

  // 加载面试环节配置
  await loadStageConfig(config.interviewType)

  const success = await createSession(selectedApplicationId.value)
  if (success) {
    // 创建会话后立即生成简历兴趣点
    generateInterestPoints()
    
    if (config.localCameraEnabled) {
      await initLocalCamera()
    }
  }
}

// 开始面试
const handleStartInterview = async () => {
  const success = await startInterview()
  if (success && config.localCameraEnabled) {
    // 确保视频流已初始化
    if (!localVideoRef.value?.srcObject) {
      await initLocalCamera()
    }
  }
}

// 结束面试
const handleStopInterview = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要结束本次面试吗？',
      '结束面试',
      {
        confirmButtonText: '确定结束',
        cancelButtonText: '继续面试',
        type: 'warning'
      }
    )
    
    // 1. 如果语音转写正在进行，先停止并保存最后的内容
    if (isSpeechListening.value) {
      const content = accumulatedTranscript.value.trim()
      if (content) {
        switchSpeaker(content)
      }
      stopSpeech()
      accumulatedTranscript.value = ''
    }
    
    // 2. 同步所有对话记录到后端
    if (messages.value.length > 0) {
      await syncMessages()
    }
    
    // 3. 调用后端 complete 端点标记会话完成
    const success = await stopInterview()
    
    // 4. 结束后自动退出并重置界面
    if (success) {
      cleanup()
      selectedApplicationId.value = ''
    }
  } catch {
    // 用户取消
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
    await deleteSession()
    selectedApplicationId.value = ''
  } catch {
    // 用户取消
  }
}

// ==================== 态势感知相关 ====================

// 解析局面评估文本，分离显示内容和切换指示
const parseAssessmentResponse = (rawAssessment: string): { displayText: string; shouldSwitch: boolean } => {
  const marker = '---STAGE_SWITCH---'
  const parts = rawAssessment.split(marker)
  
  if (parts.length >= 2 && parts[0] && parts[1]) {
    const displayText = parts[0].trim()
    const switchPart = parts[1].trim().toUpperCase()
    const shouldSwitch = switchPart.startsWith('YES')
    return { displayText, shouldSwitch }
  }
  
  return { displayText: rawAssessment.trim(), shouldSwitch: false }
}

// 刷新局面评估（仅在面板展开时调用，支持无对话时基于简历评估）
const handleRefreshAssessment = async () => {
  if ((!isLeftPanelExpanded.value && !isFullscreen.value) || !sessionId.value) return
  
  isLoadingAssessment.value = true
  try {
    const conversationHistory = messages.value.map(m => ({
      role: m.role,
      content: m.content
    }))
    
    const response = await fetch(`/api/v1/ai/interview/situation-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId.value,
        conversation_history: conversationHistory,
        current_stage_index: currentStage.value,
        current_stage_name: currentStageConfig.value?.name || '开场寒暄',
        total_stages: stages.value.length || 4,
        all_stages: stages.value.map(s => ({ name: s.name, description: s.description }))
      })
    })
    
    const result = await response.json()
    if (result.success && result.data?.assessment) {
      const { displayText, shouldSwitch } = parseAssessmentResponse(result.data.assessment)
      
      // 只显示前两段给 HR
      situationAssessment.value = { assessment: displayText }
      
      // 自动切换环节（如果开启且 LLM 建议切换且未到最后一个环节）
      if (autoStageSwitch.value && shouldSwitch && currentStage.value < stages.value.length) {
        advanceStage()
        ElMessage.success(`已自动进入下一环节：${currentStageConfig.value?.name || ''}`)
      }
    }
  } catch (error) {
    console.error('获取局面评估失败:', error)
  } finally {
    isLoadingAssessment.value = false
  }
}

// 刷新提问建议（仅在面板展开时调用，支持无对话时生成开场建议）
const handleRefreshSituationSuggestions = async () => {
  if ((!isLeftPanelExpanded.value && !isFullscreen.value) || !sessionId.value) return
  
  isLoadingSuggestions.value = true
  try {
    // 获取最近的候选人回答（无对话时为空字符串）
    const lastAnswer = [...messages.value].reverse().find((m: { role: string }) => m.role === 'candidate')?.content || ''
    
    const conversationHistory = messages.value.map(m => ({
      role: m.role,
      content: m.content
    }))
    
    const response = await fetch(`/api/v1/ai/interview/adaptive-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId.value,
        current_answer: lastAnswer,
        conversation_history: conversationHistory,
        followup_count: config.followupCount,
        normal_count: config.alternativeCount,
        current_stage_name: currentStageConfig.value?.name || '开场寒暄',
        current_stage_description: currentStageConfig.value?.description || ''
      })
    })
    
    const result = await response.json()
    if (result.success && result.data) {
      const suggestions: SAPanelSuggestion[] = []
      
      // 追问
      if (result.data.followups) {
        result.data.followups.forEach((q: { question: string; purpose?: string }, i: number) => {
          suggestions.push({
            question: q.question,
            type: 'followup',
            purpose: q.purpose,
            priority: i + 1
          })
        })
      }
      
      // 候选问题
      if (result.data.alternatives) {
        result.data.alternatives.forEach((q: { question: string; purpose?: string }, i: number) => {
          suggestions.push({
            question: q.question,
            type: 'alternative',
            purpose: q.purpose,
            priority: i + 10
          })
        })
      }
      
      situationSuggestions.value = suggestions
    }
  } catch (error) {
    console.error('获取建议失败:', error)
  } finally {
    isLoadingSuggestions.value = false
  }
}

// 使用态势面板的建议（直接发送）
const handleUseSituationSuggestion = (suggestion: SAPanelSuggestion) => {
  addInterviewerMessage(suggestion.question)
  syncMessages()
  ElMessage.success('已添加问题到对话')
}

// 使用简历兴趣点（直接发送问题）
const handleUseInterestPoint = (point: InterestPoint) => {
  if (point.question) {
    addInterviewerMessage(point.question)
    syncMessages()
    ElMessage.success('已添加兴趣点问题到对话')
  }
}

// 编辑简历兴趣点（添加到输入框）
const handleEditInterestPoint = (point: InterestPoint) => {
  if (point.question) {
    analysisPanelRef.value?.setQuestionInput(point.question)
    ElMessage.info('已添加到输入框，可编辑后发送')
  }
}

// 编辑态势面板的建议（添加到输入框）
const handleEditSituationSuggestion = (suggestion: SAPanelSuggestion) => {
  analysisPanelRef.value?.setQuestionInput(suggestion.question)
  ElMessage.info('已添加到输入框，可编辑后发送')
}

// 处理 AI 生成的受试者回答
const handleAiAnswerGenerated = (answer: string) => {
  addCandidateMessage(answer)
  syncMessages()
}

// 格式化时长
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ==================== 语音转写相关 ====================

// 加载阿里云配置
const loadAliyunConfig = () => {
  const saved = getAliyunConfig()
  if (saved) {
    aliyunConfig.value.appKey = saved.appKey || ''
    aliyunConfig.value.token = saved.token || ''
  }
}

// 保存阿里云配置
const handleSaveAliyunConfig = async () => {
  if (!aliyunConfig.value.appKey || !aliyunConfig.value.token) {
    ElMessage.warning('请填写完整的阿里云配置')
    return
  }
  
  saveAliyunConfig({
    type: 'aliyun',
    appKey: aliyunConfig.value.appKey,
    token: aliyunConfig.value.token
  })
  
  const success = await updateSpeechConfig({
    type: 'aliyun',
    appKey: aliyunConfig.value.appKey,
    token: aliyunConfig.value.token
  })
  
  if (success) {
    ElMessage.success('阿里云配置已保存')
    showAliyunConfigDialog.value = false
  }
}

// 切换语音识别
const handleToggleSpeech = async () => {
  if (isSpeechListening.value) {
    // 正在录音，切换发言人
    handleSwitchSpeaker()
  } else {
    // 未录音，开始录音
    if (!isSpeechConfigured.value) {
      showAliyunConfigDialog.value = true
      return
    }
    
    const success = await startSpeech()
    if (success) {
      accumulatedTranscript.value = ''
      ElMessage.success('语音转写已开始')
    }
  }
}

// 切换发言人
const handleSwitchSpeaker = () => {
  // 保存当前转录内容
  const content = accumulatedTranscript.value.trim()
  if (content) {
    switchSpeaker(content)
    // 同步到后端
    syncMessages()
  } else {
    // 即使没有内容也切换发言人
    switchSpeaker()
  }
  
  // 重置累积文本
  accumulatedTranscript.value = ''
  resetSpeech()
  
  // 重新开始语音识别
  startSpeech()
}

// 从面板发送问题（面试官）
const handlePanelSendQuestion = (question: string) => {
  addInterviewerMessage(question)
  syncMessages()
}

// 从面板发送回答（受试者）
const handlePanelSendAnswer = (answer: string) => {
  addCandidateMessage(answer)
  syncMessages()
}

// 停止语音转写
const handleStopSpeech = () => {
  // 保存最后的内容
  const content = accumulatedTranscript.value.trim()
  if (content) {
    switchSpeaker(content)
    syncMessages()
  }
  
  stopSpeech()
  accumulatedTranscript.value = ''
  ElMessage.info('语音转写已停止')
}

// 监听消息变化，自动刷新态势感知
watch(
  () => messages.value.length,
  (newLen, oldLen) => {
    if (newLen > oldLen && autoRefreshEnabled.value && isLeftPanelExpanded.value) {
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg?.role === 'candidate') {
        // 候选人回答完成，自动刷新评估和建议
        handleRefreshAssessment()
        handleRefreshSituationSuggestions()
      }
    }
  }
)

// 生命周期
onMounted(() => {
  fetchApplications()
  loadAliyunConfig()
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.body.style.overflow = ''
})
</script>

<style scoped lang="scss">
.immersive-interview-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: calc(100vh - 140px);
}

// 主面试区域
.main-interview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
}

.content-grid {
  flex: 1;
  display: grid;
  gap: 4px;
  min-height: 500px;
}

.situation-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

// 拖拽分隔条
.resize-bar {
  width: 6px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  border-radius: 3px;

  &:hover,
  &.dragging {
    background: rgba(102, 126, 234, 0.15);

    .resize-handle {
      background: #667eea;
    }
  }

  .resize-handle {
    width: 3px;
    height: 32px;
    background: #d1d5db;
    border-radius: 2px;
    transition: background 0.2s;
  }
}

.analysis-section {
  display: flex;
  flex-direction: column;
  height: 100%;
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
    grid-template-columns: 1fr !important;

    .situation-section {
      display: none;
    }

    :deep(.video-section) {
      height: 400px;
    }

    .analysis-section {
      height: 500px;
    }
  }

  .resize-bar {
    display: none;
  }
}

// 控制栏包裹器
.control-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 0;

  :deep(.control-bar) {
    flex: 1;
    min-width: 0;
  }
}

// ==================== 全屏进入按钮（控制栏内） ====================
.fullscreen-enter-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
  color: #4b5563;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  margin-left: 8px;
  flex-shrink: 0;

  &:hover {
    background: rgba(102, 126, 234, 0.15);
    border-color: rgba(102, 126, 234, 0.3);
    color: #667eea;
    transform: scale(1.05);
  }
}

// ==================== 全屏模式 ====================
.fullscreen-mode {
  position: fixed !important;
  inset: 0;
  z-index: 999;
  background: #000;
  min-height: auto !important;
  gap: 0 !important;
  overflow: hidden;

  .main-interview-area {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    gap: 0 !important;
  }

  // 控制栏浮层
  .control-bar-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);

    :deep(.control-bar) {
      background: rgba(15, 23, 42, 0.55) !important;
      backdrop-filter: blur(28px) saturate(1.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0 !important;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
      color: white;

      .control-left {
        .stage-item {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);

          &.active {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.7), rgba(118, 75, 162, 0.7));
            color: white;
          }

          &.completed {
            background: rgba(16, 185, 129, 0.25);
            border-color: rgba(16, 185, 129, 0.5);
          }

          .stage-number {
            background: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.9);
          }

          .stage-name {
            color: rgba(255, 255, 255, 0.85);
          }
        }
      }
    }
  }

  // 全屏进入按钮隐藏
  .fullscreen-enter-btn {
    display: none;
  }

  // 内容区变为定位上下文
  .content-grid {
    position: absolute !important;
    inset: 0;
    display: block !important;
    min-height: auto !important;
    overflow: visible;
  }

  // 视频占满背景
  :deep(.video-section) {
    position: absolute !important;
    inset: 0;
    z-index: 0;
    border-radius: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }

  // 左侧态势面板浮层
  .situation-section {
    position: absolute !important;
    left: 20px;
    top: 76px;
    bottom: 10px;
    height: auto !important;
    width: 360px;
    z-index: 10;
    background: rgba(15, 23, 42, 0.5) !important;
    backdrop-filter: blur(28px) saturate(1.3);
    border-radius: 20px !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

    :deep(.situation-panel) {
      background: transparent !important;
      border-radius: 0 !important;
      height: 100%;
      max-height: 100%;
      overflow-y: auto;

      .panel-content {
        background: transparent !important;
        overflow-y: auto;
      }

      .collapsed-bar {
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.7);
        .expand-trigger { color: rgba(255, 255, 255, 0.7); }
        &:hover {
          background: rgba(255, 255, 255, 0.12) !important;
        }
      }

      .panel-header {
        .header-title {
          color: rgba(255, 255, 255, 0.95);
          .el-icon { color: #818cf8; }
        }
        .mode-label {
          color: rgba(255, 255, 255, 0.5);
          &.active { color: rgba(255, 255, 255, 0.9); }
        }
        .el-button {
          color: rgba(255, 255, 255, 0.7) !important;
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          &:hover {
            background: rgba(255, 255, 255, 0.15) !important;
          }
        }
      }

      .section-title { color: rgba(255, 255, 255, 0.9); }
      .section-header .el-button { color: rgba(255, 255, 255, 0.7); }

      .assessment-content {
        background: rgba(255, 255, 255, 0.06) !important;
        .assessment-text p { color: rgba(255, 255, 255, 0.8); }
      }

      .empty-state, .loading-state { color: rgba(255, 255, 255, 0.5); }

      .suggestion-card {
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 255, 255, 0.08);
        .card-question { color: rgba(255, 255, 255, 0.8); }
        .card-tag { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.7); }
        .card-tag.interests-tag { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
        &:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.15);
        }
      }

      .group-header:hover { background: rgba(255, 255, 255, 0.06); }
      .group-label { color: rgba(255, 255, 255, 0.6); }
      .collapse-arrow { color: rgba(255, 255, 255, 0.4); }

      .el-divider { border-color: rgba(255, 255, 255, 0.08); }

      .suggestions-content {
        max-height: none;
      }
    }
  }

  // 右侧分析面板浮层
  .analysis-section {
    position: absolute !important;
    right: 20px;
    top: 76px;
    bottom: 10px;
    height: auto !important;
    width: 420px;
    z-index: 10;
    background: rgba(15, 23, 42, 0.5) !important;
    backdrop-filter: blur(28px) saturate(1.3);
    border-radius: 20px !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

    :deep(.analysis-panel) {
      background: transparent !important;
      border-radius: 0 !important;
      height: 100%;
      max-height: 100%;
      overflow-y: auto;
      color: rgba(255, 255, 255, 0.85);

      .candidate-info-card {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3)) !important;
        .candidate-name { color: rgba(255, 255, 255, 0.95); }
        .candidate-position { color: rgba(255, 255, 255, 0.7); }
        .candidate-avatar { background: rgba(255, 255, 255, 0.15); }
        .candidate-quick-actions .el-button {
          background: rgba(255, 255, 255, 0.15) !important;
          border: none !important;
          color: white !important;
          &:hover { background: rgba(255, 255, 255, 0.25) !important; }
        }
      }

      .behavior-card {
        background: rgba(255, 255, 255, 0.06) !important;
        color: rgba(255, 255, 255, 0.8);
        .behavior-header { color: rgba(255, 255, 255, 0.85); }
        .behavior-header:hover { background: rgba(255, 255, 255, 0.06) !important; }
        .summary-label, .summary-value { color: rgba(255, 255, 255, 0.8); }
        .summary-divider { color: rgba(255, 255, 255, 0.3); }
        .collapse-icon { color: rgba(255, 255, 255, 0.5); }
        .emotion-label { color: rgba(255, 255, 255, 0.7); }
        .emotion-value { color: rgba(255, 255, 255, 0.7); }
        .emotion-bar-container { background: rgba(255, 255, 255, 0.1); }
        .meter-bar-container { background: rgba(255, 255, 255, 0.1); }
        .gaze-stats-inline { color: rgba(255, 255, 255, 0.6); }
      }

      .chat-section {
        background: rgba(255, 255, 255, 0.04) !important;
        overflow: hidden;
      }

      .chat-header {
        background: rgba(255, 255, 255, 0.06) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        .chat-title { color: rgba(255, 255, 255, 0.9); }
        .message-count { color: rgba(255, 255, 255, 0.5); }
      }

      .chat-container {
        background: transparent !important;
      }

      .chat-empty {
        color: rgba(255, 255, 255, 0.4);
      }

      .message-item {
        .message-body {
          background: rgba(255, 255, 255, 0.08) !important;
          .role-name { color: rgba(255, 255, 255, 0.7); }
          .timestamp { color: rgba(255, 255, 255, 0.4); }
          .message-content { color: rgba(255, 255, 255, 0.9); }
        }
        &.message-interviewer .message-body {
          background: rgba(102, 126, 234, 0.2) !important;
        }
        &.message-candidate .message-body {
          background: rgba(16, 185, 129, 0.15) !important;
        }
        .behavior-tag {
          &.gaze { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
          &.emotion { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
        }
      }

      .typing-indicator {
        background: rgba(255, 255, 255, 0.08) !important;
        color: rgba(255, 255, 255, 0.7);
        .typing-text { color: rgba(255, 255, 255, 0.6); }
      }

      .chat-input {
        background: rgba(255, 255, 255, 0.06) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;

        .el-textarea .el-textarea__inner {
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.9) !important;
          &::placeholder { color: rgba(255, 255, 255, 0.35) !important; }
          &:focus {
            border-color: rgba(102, 126, 234, 0.5) !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15) !important;
          }
        }

        .input-hint { color: rgba(255, 255, 255, 0.4); }
      }

      .speech-status {
        background: rgba(255, 255, 255, 0.06) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        .speaker-indicator { color: rgba(255, 255, 255, 0.8); }
        .live-text { color: rgba(255, 255, 255, 0.5); }
      }

      .suggestions-bar {
        background: rgba(255, 255, 255, 0.06);
        .suggestions-label { color: rgba(255, 255, 255, 0.6); }
        .suggestion-chip {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.8);
          &:hover {
            border-color: #818cf8;
            color: #a5b4fc;
          }
        }
      }

      .stats-footer {
        border-color: rgba(255, 255, 255, 0.08);
        .stat-item { color: rgba(255, 255, 255, 0.5); }
      }
    }
  }

  // 隐藏拖拽条
  .resize-bar {
    display: none !important;
  }
}

// ==================== 全屏底部控制台 ====================
.fullscreen-dock {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;

  .dock-container {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(32px) saturate(1.4);
    border-radius: 40px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .dock-divider {
    width: 1px;
    height: 32px;
    background: rgba(255, 255, 255, 0.12);
    margin: 0 4px;
  }

  .dock-btn {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: rgba(255, 255, 255, 0.85);
    position: relative;
    outline: none;

    &:hover {
      transform: translateY(-4px) scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    &:active {
      transform: translateY(-2px) scale(1.05);
    }

    // 蓝色 - 控制栏
    &.dock-blue {
      background: rgba(59, 130, 246, 0.3);
      &.active {
        background: rgba(59, 130, 246, 0.6);
        border-color: rgba(59, 130, 246, 0.4);
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.25);
      }
      &:hover { background: rgba(59, 130, 246, 0.45); }
    }

    // 紫色 - 态势感知
    &.dock-purple {
      background: rgba(139, 92, 246, 0.3);
      &.active {
        background: rgba(139, 92, 246, 0.6);
        border-color: rgba(139, 92, 246, 0.4);
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
      }
      &:hover { background: rgba(139, 92, 246, 0.45); }
    }

    // 绿色 - 对话分析
    &.dock-green {
      background: rgba(16, 185, 129, 0.3);
      &.active {
        background: rgba(16, 185, 129, 0.6);
        border-color: rgba(16, 185, 129, 0.4);
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);
      }
      &:hover { background: rgba(16, 185, 129, 0.45); }
    }

    // 红色 - 退出全屏
    &.dock-red {
      background: rgba(239, 68, 68, 0.3);
      &:hover {
        background: rgba(239, 68, 68, 0.5);
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.25);
      }
    }
  }
}

// 控制台滑入动画
.dock-slide-enter-active,
.dock-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-slide-enter-from,
.dock-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
