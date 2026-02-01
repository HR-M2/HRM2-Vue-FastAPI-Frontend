<template>
  <div class="immersive-interview-view">

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

            <!-- 功能开关 -->
            <el-form-item label="功能设置">
              <div class="feature-toggles">
                <el-checkbox v-model="config.localCameraEnabled">启用摄像头（用于行为分析）</el-checkbox>
                <el-checkbox v-model="config.autoAnalyze">自动行为分析</el-checkbox>
              </div>
            </el-form-item>

            <!-- 分析间隔 -->
            <el-form-item label="分析帧间隔">
              <el-slider
                v-model="config.analyzeInterval"
                :min="1"
                :max="10"
                :step="1"
                :marks="{ 1: '1秒', 3: '3秒', 5: '5秒', 10: '10秒' }"
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
        <!-- 控制栏 -->
        <div class="control-bar">
          <div class="control-left">
            <div class="candidate-info" v-if="session">
              <span class="info-label">候选人：</span>
              <span class="info-value">{{ session.candidate_name }}</span>
              <el-divider direction="vertical" />
              <span class="info-label">应聘岗位：</span>
              <span class="info-value">{{ session.position_title }}</span>
            </div>
          </div>
          <div class="control-center">
            <el-button-group>
              <el-button
                v-if="!isRecording"
                type="success"
                size="large"
                @click="handleStartInterview"
              >
                <el-icon><VideoPlay /></el-icon>
                开始面试
              </el-button>
              <el-button
                v-else
                type="danger"
                size="large"
                @click="handleStopInterview"
              >
                <el-icon><VideoPause /></el-icon>
                结束面试
              </el-button>
            </el-button-group>
          </div>
          <div class="control-right">
            <!-- 语音转写控制 -->
            <el-button
              v-if="isRecording && !isSpeechListening"
              :type="isSpeechConfigured ? 'primary' : 'warning'"
              @click="handleToggleSpeech"
              :disabled="!speechSupported"
            >
              <el-icon><Microphone /></el-icon>
              {{ isSpeechConfigured ? '开始转写' : '配置语音' }}
            </el-button>
            <el-button
              v-if="isRecording && isSpeechListening"
              type="success"
              @click="handleToggleSpeech"
            >
              <el-icon><Switch /></el-icon>
              切换发言人
            </el-button>
            <el-button
              v-if="isRecording && isSpeechListening"
              type="warning"
              @click="handleStopSpeech"
            >
              停止转写
            </el-button>
            <el-button type="danger" plain @click="handleEndSession">
              <el-icon><Close /></el-icon>
              退出会话
            </el-button>
          </div>
        </div>

        <!-- 主内容区 -->
        <div class="content-grid" :style="{ gridTemplateColumns: contentGridColumns }">
          <!-- 左侧：态势感知面板 -->
          <div class="situation-section">
            <SituationAwarenessPanel
              :is-expanded="isLeftPanelExpanded"
              :assessment="situationAssessment"
              :suggestions="situationSuggestions"
              :is-loading-assessment="isLoadingAssessment"
              :is-loading-suggestions="isLoadingSuggestions"
              :can-refresh="isRecording && messages.length > 0"
              @toggle="toggleLeftPanel"
              @refresh-assessment="handleRefreshAssessment"
              @refresh-suggestions="handleRefreshSituationSuggestions"
              @use-suggestion="handleUseSituationSuggestion"
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
          <div class="video-section">
            <div class="video-container">
              <video
                v-if="config.localCameraEnabled"
                ref="localVideoRef"
                class="interview-video"
                autoplay
                playsinline
                muted
              ></video>
              <div v-else class="video-placeholder">
                <el-icon :size="64"><VideoCamera /></el-icon>
                <p>摄像头未启用</p>
              </div>

              <!-- 情绪状态浮层 -->
              <div v-if="isRecording && currentEmotionLabel" class="emotion-overlay">
                <span class="emotion-label">{{ currentEmotionLabel }}</span>
              </div>

              <!-- 分析状态指示器 -->
              <div v-if="isRecording" class="analysis-indicator" :class="{ active: isWsConnected }">
                <span class="indicator-dot"></span>
                <span class="indicator-text">{{ isWsConnected ? '分析中' : '连接中...' }}</span>
              </div>
            </div>
          </div>

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
              :is-connected="isWsConnected"
              :emotions="currentBehavior?.emotions || []"
              :gaze="currentBehavior?.gaze || null"
              :suggestions="suggestions"
              :stats="stats"
              :candidate-info="candidateInfo"
              :messages="messages"
              :current-speaker="currentSpeaker"
              :is-speech-listening="isSpeechListening"
              :speech-interim="speechInterim || ''"
              @refresh-suggestions="handleFetchSuggestions"
              @use-suggestion="handleUseSuggestion"
              @send-question="handlePanelSendQuestion"
            />
          </div>
        </div>
      </div>
    </transition>

    <!-- 阿里云语音配置弹窗 -->
    <el-dialog v-model="showAliyunConfigDialog" title="阿里云语音识别配置" width="500px">
      <el-form label-position="top">
        <el-form-item label="AppKey" required>
          <el-input v-model="aliyunConfig.appKey" placeholder="从阿里云智能语音交互控制台获取" />
        </el-form-item>
        <el-form-item label="Token" required>
          <el-input v-model="aliyunConfig.token" type="password" placeholder="从阿里云控制台或CLI获取，有效期24小时" show-password />
        </el-form-item>
        <el-alert type="info" :closable="false" class="config-tip">
          <template #title>
            <p style="margin: 0;">获取方式：</p>
            <ol style="margin: 8px 0 0; padding-left: 20px;">
              <li>登录阿里云控制台，进入智能语音交互</li>
              <li>创建项目获取 AppKey</li>
              <li>使用 CLI 命令或控制台获取 Token（有效期24小时）</li>
            </ol>
          </template>
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="showAliyunConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveAliyunConfig">保存配置</el-button>
      </template>
    </el-dialog>
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
  Promotion
} from '@element-plus/icons-vue'
import RealTimeAnalysisPanel from '@/components/immersive/RealTimeAnalysisPanel.vue'
import SituationAwarenessPanel from '@/components/immersive/SituationAwarenessPanel.vue'
import type { SituationAssessment, QuestionSuggestion as SAPanelSuggestion } from '@/components/immersive/SituationAwarenessPanel.vue'
import { useImmersiveInterview, type QuestionSuggestion } from '@/composables/useImmersiveInterview'
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
  localVideoRef,
  currentBehavior,
  currentEmotionLabel,
  suggestions,
  stats,
  currentSpeaker,
  messages,
  createSession,
  initLocalCamera,
  startInterview,
  stopInterview,
  fetchSuggestions,
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

// 阿里云配置
const showAliyunConfigDialog = ref(false)
const aliyunConfig = ref({
  appKey: '',
  token: ''
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
    return `${leftPanelWidth.value}px 8px 1fr 8px ${analysisPanelWidth.value}px`
  }
  return `40px 1fr 8px ${analysisPanelWidth.value}px`
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

// 创建会话
const handleCreateSession = async () => {
  if (!selectedApplicationId.value) {
    ElMessage.warning('请选择候选人')
    return
  }

  const success = await createSession(selectedApplicationId.value)
  if (success && config.localCameraEnabled) {
    await initLocalCamera()
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

// 获取建议
const handleFetchSuggestions = async () => {
  await fetchSuggestions()
}

// 使用建议 - 直接发送到对话
const handleUseSuggestion = (suggestion: QuestionSuggestion) => {
  addInterviewerMessage(suggestion.question)
  syncMessages()
  ElMessage.success('已添加问题到对话')
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
        followup_count: 2,
        alternative_count: 2
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

// 使用态势面板的建议
const handleUseSituationSuggestion = (suggestion: SAPanelSuggestion) => {
  addInterviewerMessage(suggestion.question)
  syncMessages()
  ElMessage.success('已添加问题到对话')
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

    .feature-toggles {
      display: flex;
      flex-direction: column;
      gap: 12px;
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

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 16px;
  padding: 16px 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);

  .control-left {
    .candidate-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .info-label {
        font-size: 13px;
        color: #6b7280;
      }

      .info-value {
        font-size: 14px;
        font-weight: 600;
        color: #1a1a2e;
      }
    }
  }

  .control-center {
    .el-button {
      padding: 12px 28px;
    }
  }

  .control-right {
    display: flex;
    gap: 10px;
  }
}

.content-grid {
  flex: 1;
  display: grid;
  gap: 12px;
  min-height: 500px;
}

.situation-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

// 拖拽分隔条
.resize-bar {
  width: 8px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  border-radius: 4px;

  &:hover,
  &.dragging {
    background: rgba(102, 126, 234, 0.15);

    .resize-handle {
      background: #667eea;
    }
  }

  .resize-handle {
    width: 4px;
    height: 40px;
    background: #d1d5db;
    border-radius: 2px;
    transition: background 0.2s;
  }
}

.video-section {
  background: #1a1a2e;
  border-radius: 20px;
  overflow: hidden;

  .video-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .interview-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: rgba(255, 255, 255, 0.5);

    p {
      font-size: 14px;
    }
  }

  // 情绪浮层
  .emotion-overlay {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    padding: 8px 16px;
    border-radius: 20px;

    .emotion-label {
      color: white;
      font-size: 14px;
      font-weight: 500;
    }
  }

  // 分析状态指示器
  .analysis-indicator {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    padding: 8px 16px;
    border-radius: 20px;

    .indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
    }

    .indicator-text {
      color: white;
      font-size: 12px;
    }

    &.active {
      .indicator-dot {
        background: #10b981;
        animation: pulse 1.5s infinite;
      }
    }
  }
}

.analysis-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

// 配置提示
.config-tip {
  margin-top: 16px;
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

    .video-section {
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
