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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
import type { SetupConfig } from '@/components/immersive/SetupPanel.vue'
import { useImmersiveInterview } from '@/composables/useImmersiveInterview'
import { useResizePanel } from '@/composables/useResizePanel'
import { useSpeechHandler } from '@/composables/useSpeechHandler'
import { useSituationAwareness } from '@/composables/useSituationAwareness'
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

// 语音转写
const {
  showAliyunConfigDialog,
  aliyunConfig,
  speechSupported,
  isSpeechListening,
  isSpeechConfigured,
  speechInterim,
  loadAliyunConfig,
  handleUpdateAliyunConfig,
  handleSaveAliyunConfig,
  handleToggleSpeech,
  handleStopSpeech,
  flushAndStopSpeech
} = useSpeechHandler({
  switchSpeaker,
  syncMessages
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

// 面板拖拽调整
const {
  analysisPanelWidth,
  resizeBarDragging,
  startResize,
  isLeftPanelExpanded,
  leftPanelWidth,
  leftResizeBarDragging,
  startLeftResize,
  toggleLeftPanel,
  contentGridColumns
} = useResizePanel(isFullscreen)

// 更新配置的处理函数
const handleUpdateConfig = (key: keyof SetupConfig, value: any) => {
  ;(config as any)[key] = value
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

// 自动切换环节开关，默认开启
const autoStageSwitch = ref(true)

// 态势感知
const {
  situationAssessment,
  situationSuggestions,
  isLoadingAssessment,
  isLoadingSuggestions,
  autoRefreshEnabled,
  interestPoints,
  isLoadingInterestPoints,
  handleRefreshAssessment,
  handleRefreshSituationSuggestions,
  handleUseSituationSuggestion,
  handleUseInterestPoint,
  handleEditInterestPoint,
  handleEditSituationSuggestion,
  generateInterestPoints
} = useSituationAwareness({
  sessionId,
  messages,
  isLeftPanelExpanded,
  isFullscreen,
  currentStage,
  currentStageConfig,
  stages,
  config,
  autoStageSwitch,
  advanceStage,
  addInterviewerMessage,
  syncMessages,
  analysisPanelRef,
  applications,
  selectedApplicationId
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
    flushAndStopSpeech()
    
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
@use '@/styles/immersive-fullscreen.scss';

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
</style>
