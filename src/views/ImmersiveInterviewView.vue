<template>
  <div class="immersive-interview-view">

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
        <InterviewControlBar
          :session="session"
          :is-recording="isRecording"
          :is-speech-listening="isSpeechListening"
          :is-speech-configured="isSpeechConfigured"
          :speech-supported="speechSupported"
          @start-interview="handleStartInterview"
          @stop-interview="handleStopInterview"
          @toggle-speech="handleToggleSpeech"
          @stop-speech="handleStopSpeech"
          @open-speech-config="showAliyunConfigDialog = true"
          @end-session="handleEndSession"
        />

        <!-- 主内容区 -->
        <div class="content-grid" :style="{ gridTemplateColumns: contentGridColumns }">
          <!-- 左侧：态势感知面板 -->
          <div class="situation-section">
            <SituationAwarenessPanel
              :is-expanded="isLeftPanelExpanded"
              :assessment="situationAssessment"
              :suggestions="situationSuggestions"
              :interest-points="interestPoints"
              :is-loading-assessment="isLoadingAssessment"
              :is-loading-suggestions="isLoadingSuggestions"
              :is-loading-interest-points="isLoadingInterestPoints"
              :can-refresh="isRecording && messages.length > 0"
              v-model:auto-refresh="autoRefreshEnabled"
              @toggle="toggleLeftPanel"
              @refresh-assessment="handleRefreshAssessment"
              @refresh-suggestions="handleRefreshSituationSuggestions"
              @use-suggestion="handleUseSituationSuggestion"
              @edit-suggestion="handleEditSituationSuggestion"
              @use-interest-point="handleUseInterestPoint"
            />
          </div>

          <!-- 左侧拖拽分隔条（仅展开时显示） -->
          <div 
            v-if="isLeftPanelExpanded"
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
            class="resize-bar"
            :class="{ dragging: resizeBarDragging }"
            @mousedown="startResize"
          >
            <div class="resize-handle"></div>
          </div>

          <!-- 右侧：实时分析面板 -->
          <div class="analysis-section">
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
              @send-question="handlePanelSendQuestion"
            />
          </div>
        </div>
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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
  Link
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
  syncMessages
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
        count: 3,
        interest_point_count: config.interestPointCount
      })
    })
    
    const result = await response.json()
    if (result.success && result.data) {
      // 存储兴趣点
      if (result.data.interest_points) {
        interestPoints.value = result.data.interest_points.map((p: any) => ({
          content: p.content || '',
          reason: p.reason || '',
          question: p.question || ''
        }))
      }
      // 存储初始问题
      if (result.data.questions) {
        initialQuestions.value = result.data.questions.map((q: any) => ({
          question: q.question || '',
          category: q.category || ''
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

// 刷新局面评估（仅在面板展开时调用）
const handleRefreshAssessment = async () => {
  if (!isLeftPanelExpanded.value || !sessionId.value || messages.value.length === 0) return
  
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
        conversation_history: conversationHistory
      })
    })
    
    const result = await response.json()
    if (result.success && result.data) {
      situationAssessment.value = result.data
    }
  } catch (error) {
    console.error('获取局面评估失败:', error)
  } finally {
    isLoadingAssessment.value = false
  }
}

// 刷新提问建议（仅在面板展开时调用）
const handleRefreshSituationSuggestions = async () => {
  if (!isLeftPanelExpanded.value || !sessionId.value) return
  
  isLoadingSuggestions.value = true
  try {
    // 获取最近的问答
    const recentMessages = messages.value.slice(-4)
    const lastQuestion = recentMessages.find(m => m.role === 'interviewer')?.content || ''
    const lastAnswer = recentMessages.find(m => m.role === 'candidate')?.content || ''
    
    if (!lastQuestion || !lastAnswer) {
      isLoadingSuggestions.value = false
      return
    }
    
    const conversationHistory = messages.value.map(m => ({
      role: m.role,
      content: m.content
    }))
    
    const response = await fetch(`/api/v1/ai/interview/adaptive-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId.value,
        current_question: lastQuestion,
        current_answer: lastAnswer,
        conversation_history: conversationHistory,
        followup_count: config.followupCount,
        alternative_count: config.alternativeCount
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

// 编辑态势面板的建议（添加到输入框）
const handleEditSituationSuggestion = (suggestion: SAPanelSuggestion) => {
  analysisPanelRef.value?.setQuestionInput(suggestion.question)
  ElMessage.info('已添加到输入框，可编辑后发送')
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

// 从面板发送问题
const handlePanelSendQuestion = (question: string) => {
  addInterviewerMessage(question)
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
</style>
