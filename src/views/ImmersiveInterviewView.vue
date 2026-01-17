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
          <el-button 
            v-if="isSessionActive && speechSupported && config.showTranscript"
            :type="isSpeechListening ? 'warning' : 'primary'"
            @click="handleToggleSpeechRecognition"
          >
            <el-icon><Microphone /></el-icon>
            {{ isSpeechListening ? '停止转录' : '开始转录' }}
          </el-button>
          
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

            <!-- 推流设置 -->
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
              :emotion-label="emotionLabel"
              :local-stream="localStream"
              :deception-score="cockpitData.deceptionScore"
              :face-out-of-frame="cockpitData.faceOutOfFrame"
              :duration="stats.duration"
              :speech-transcript="accumulatedTranscript"
              :speech-interim="speechInterim"
              :is-speech-listening="isSpeechListening"
              :show-transcript="config.showTranscript && isSessionActive"
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
              @refresh-suggestions="handleFetchSuggestions"
              @use-suggestion="handleUseSuggestion"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  VideoCameraFilled,
  VideoCamera,
  VideoPlay,
  VideoPause,
  MagicStick,
  DataAnalysis,
  Close
} from '@element-plus/icons-vue'
import {
  DualCameraView,
  RealTimeAnalysisPanel
} from '@/components/immersive'
import { useImmersiveInterview } from '@/composables/useImmersiveInterview'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import type { QuestionSuggestion } from '@/composables/useImmersiveInterview'

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
  fetchSuggestions,
  fetchInsights,
  addTranscript,
  generateReport,
  deleteSession,
  cleanup,
  triggerDeceptionAlert
} = useImmersiveInterview()

// 语音识别相关
const accumulatedTranscript = ref('') // 累积的完整转录文本

const {
  isSupported: speechSupported,
  isListening: isSpeechListening,
  transcript: speechTranscript,
  interimTranscript: speechInterim,
  finalTranscript: speechFinal,
  error: speechError,
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
      
      // 同时添加到转录记录
      addTranscript('candidate', text.trim())
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
    // 重置累积转录文本
    accumulatedTranscript.value = ''
    
    if (config.localCameraEnabled) {
      await handleInitCamera()
    }
    
    // 如果启用了转录功能，立即开始语音识别
    if (speechSupported.value && config.showTranscript) {
      const speechSuccess = await startSpeech()
      if (speechSuccess) {
        ElMessage.success('语音转录已启动')
      } else {
        ElMessage.warning('语音转录启动失败，请检查麦克风权限')
      }
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
  
  // 如果语音识别还没启动且已启用，现在启动
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
      '确定要结束本次面试吗？',
      '结束面试',
      {
        confirmButtonText: '确定结束',
        cancelButtonText: '继续面试',
        type: 'warning'
      }
    )
    
    // 停止语音识别
    if (isSpeechListening.value) {
      stopSpeech()
    }
    
    await stopInterview()
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
    
    // 停止语音识别
    if (isSpeechListening.value) {
      stopSpeech()
    }
    
    // 清空累积转录文本
    accumulatedTranscript.value = ''
    
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

// 获取洞察
const handleFetchInsights = async () => {
  await fetchInsights()
}

// 使用建议问题
const handleUseSuggestion = (suggestion: QuestionSuggestion) => {
  addTranscript('interviewer', suggestion.question)
  ElMessage.success('问题已添加到转录')
}

// 手动切换语音识别
const handleToggleSpeechRecognition = async () => {
  if (isSpeechListening.value) {
    stopSpeech()
    ElMessage.info('语音转录已停止')
  } else {
    const success = await startSpeech()
    if (success) {
      ElMessage.success('语音转录已启动')
    } else {
      ElMessage.error('语音转录启动失败，请检查麦克风权限')
    }
  }
}

// 清空转录文本
const handleClearTranscript = () => {
  accumulatedTranscript.value = ''
  resetSpeech()
  ElMessage.info('转录文本已清空')
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
  // 清空累积转录文本
  accumulatedTranscript.value = ''
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
