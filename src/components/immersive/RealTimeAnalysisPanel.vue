<template>
  <div class="analysis-panel">
    <!-- 候选人信息卡片 -->
    <div class="candidate-info-card">
      <div class="candidate-header">
        <div class="candidate-avatar">
          <el-icon :size="24"><User /></el-icon>
        </div>
        <div class="candidate-details">
          <div class="candidate-name">{{ candidateInfo.name || '未知候选人' }}</div>
          <div class="candidate-position">{{ candidateInfo.position || '暂无岗位' }}</div>
        </div>
        <div class="candidate-quick-actions">
          <el-tooltip content="基本信息" placement="top">
            <el-button circle size="small" @click="showBasicInfoDialog = true">
              <el-icon><InfoFilled /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="简历" placement="top">
            <el-button circle size="small" @click="handleViewResume">
              <el-icon><Document /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="初筛报告" placement="top">
            <el-button circle size="small" @click="handleViewScreeningReport">
              <el-icon><DataLine /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- 行为分析卡片（可折叠） -->
    <div class="behavior-card" :class="{ collapsed: isBehaviorCollapsed }">
      <div class="behavior-header" @click="isBehaviorCollapsed = !isBehaviorCollapsed">
        <div class="behavior-summary">
          <span class="summary-item emotion">
            <span class="summary-icon">😊</span>
            <span class="summary-label">{{ currentEmotion || '等待' }}</span>
            <span v-if="topEmotionRatio" class="summary-value">{{ topEmotionRatio }}%</span>
          </span>
          <span class="summary-divider">|</span>
          <span class="summary-item gaze" :class="gazeLevelClass">
            <span class="summary-icon">👁️</span>
            <span class="summary-label">专注</span>
            <span class="summary-value">{{ Math.round(gazeRatio * 100) }}%</span>
          </span>
        </div>
        <el-icon class="collapse-icon">
          <component :is="isBehaviorCollapsed ? 'ArrowDown' : 'ArrowUp'" />
        </el-icon>
      </div>
      
      <transition name="collapse">
        <div v-show="!isBehaviorCollapsed" class="behavior-details">
          <!-- 情绪列表 -->
          <div class="detail-section">
            <div v-if="emotions.length > 0" class="emotion-list">
              <div v-for="(emotion, index) in emotions" :key="index" class="emotion-item">
                <span class="emotion-label">{{ getEmotionLabel(emotion.emotion) }}</span>
                <div class="emotion-bar-container">
                  <div class="emotion-bar" :class="getEmotionBarClass(emotion.emotion)"
                    :style="{ width: `${Math.round((emotion.ratio || 0) * 100)}%` }"></div>
                </div>
                <span class="emotion-value">{{ Math.round((emotion.ratio || 0) * 100) }}%</span>
              </div>
            </div>
          </div>
          <!-- 注视详情 -->
          <div class="detail-section gaze-detail">
            <div class="gaze-meter">
              <div class="meter-bar-container">
                <div class="meter-bar" :class="gazeLevelClass"
                  :style="{ width: `${Math.round(gazeRatio * 100)}%` }"></div>
              </div>
            </div>
            <div class="gaze-stats">
              <span>游离警告: <strong :class="{ 'warning-text': gazeWarnings > 0 }">{{ gazeWarnings }} 次</strong></span>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 对话记录区域（主体） -->
    <div class="chat-section">
      <div class="chat-header">
        <span class="chat-title">📝 对话记录</span>
        <span class="message-count">{{ messages.length }} 条</span>
      </div>
      
      <div class="chat-container" ref="chatContainerRef">
        <div v-if="messages.length === 0" class="chat-empty">
          <span>开始语音转写后，对话将显示在这里</span>
        </div>
        <div v-else class="messages-list">
          <div v-for="msg in messages" :key="msg.seq" class="message-item" :class="`message-${msg.role}`">
            <div class="message-avatar">{{ msg.role === 'interviewer' ? '👔' : '👤' }}</div>
            <div class="message-body">
              <div class="message-meta">
                <span class="role-name">{{ msg.role === 'interviewer' ? '面试官' : candidateInfo.name || '候选人' }}</span>
                <div v-if="msg.behavior" class="message-behavior-inline">
                  <span v-if="msg.behavior.gaze" class="behavior-tag gaze">
                    专注 {{ Math.round((msg.behavior.gaze.ratio || 0) * 100) }}%
                  </span>
                  <span v-for="e in (msg.behavior.emotions || []).slice(0, 3)" :key="e.emotion" class="behavior-tag emotion">
                    {{ getEmotionLabel(e.emotion) }} {{ Math.round((e.ratio || 0) * 100) }}%
                  </span>
                </div>
                <span class="timestamp">{{ formatMessageTime(msg.timestamp) }}</span>
              </div>
              <div class="message-content">{{ msg.content }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 语音控制栏 -->
      <div v-if="isSpeechListening" class="speech-status">
        <div class="speaker-indicator" :class="currentSpeaker">
          <span>{{ currentSpeaker === 'interviewer' ? '👔' : '👤' }} {{ currentSpeaker === 'interviewer' ? '面试官' : '候选人' }}发言中</span>
          <span class="recording-dot"></span>
        </div>
        <div v-if="speechInterim" class="live-text">{{ speechInterim }}</div>
      </div>
      
      <!-- 输入区 -->
      <div class="chat-input">
        <el-input v-model="questionInputLocal" placeholder="输入面试官问题..." size="small"
          @keydown.enter="handleSendQuestion">
          <template #append>
            <el-button :icon="Promotion" @click="handleSendQuestion" :disabled="!questionInputLocal.trim()" size="small">
              发送
            </el-button>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 底部统计 -->
    <div class="stats-footer">
      <span class="stat-item">
        <el-icon><Timer /></el-icon>
        {{ formatTime(stats.duration) }}
      </span>
      <span class="stat-item" :class="isConnected ? 'connected' : ''">
        <el-icon><Connection /></el-icon>
        {{ isConnected ? '分析中' : '未连接' }}
      </span>
    </div>

    <!-- 弹窗 -->
    <el-dialog v-model="showBasicInfoDialog" title="候选人基本信息" width="500px">
      <div class="basic-info-content">
        <div class="info-row">
          <span class="info-label">姓名：</span>
          <span class="info-value">{{ candidateInfo.name || '未知' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">应聘岗位：</span>
          <span class="info-value">{{ candidateInfo.position || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">申请ID：</span>
          <span class="info-value">{{ candidateInfo.applicationId || '-' }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBasicInfoDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <ResumeDetailDialog v-model="showResumeDialog" :resume="resumeDetailData" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  Refresh,
  Timer,
  User,
  InfoFilled,
  Connection,
  Document,
  DataLine,
  ArrowDown,
  ArrowUp,
  Promotion
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ResumeDetailDialog } from '@/components/common'
import { getResume, getScreeningTask } from '@/api/sdk.gen'
import type { EmotionItem, GazeData } from '@/api/types.gen'
import type { InterviewStats, QuestionSuggestion, QAMessage } from '@/composables/useImmersiveInterview'
import type { ResumeData } from '@/types'

interface CandidateInfo {
  name: string
  position: string
  applicationId?: string
  resumeId?: string
  screeningTaskId?: string
}

interface Props {
  isConnected: boolean
  emotions: EmotionItem[]
  gaze: GazeData | null
  suggestions: QuestionSuggestion[]
  stats: InterviewStats
  candidateInfo: CandidateInfo
  messages: QAMessage[]
  currentSpeaker: 'interviewer' | 'candidate'
  isSpeechListening: boolean
  speechInterim: string
}

const props = withDefaults(defineProps<Props>(), {
  isConnected: false,
  emotions: () => [],
  gaze: null,
  suggestions: () => [],
  stats: () => ({ duration: 0, messageCount: 0 }),
  candidateInfo: () => ({ name: '', position: '' }),
  messages: () => [],
  currentSpeaker: 'interviewer',
  isSpeechListening: false,
  speechInterim: ''
})

const emit = defineEmits<{
  (e: 'refresh-suggestions'): void
  (e: 'use-suggestion', suggestion: QuestionSuggestion): void
  (e: 'send-question', question: string): void
}>()

// 本地状态
const isBehaviorCollapsed = ref(false)
const showBasicInfoDialog = ref(false)
const showResumeDialog = ref(false)
const resumeDetailData = ref<ResumeData | null>(null)
const questionInputLocal = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

// 查看简历
const handleViewResume = async () => {
  if (!props.candidateInfo.resumeId) {
    ElMessage.warning('暂无简历信息')
    return
  }
  
  try {
    const result = await getResume({ path: { resume_id: props.candidateInfo.resumeId } })
    if (result.data?.data) {
      const resume = result.data.data
      resumeDetailData.value = {
        id: resume.id,
        candidate_name: resume.candidate_name,
        position_title: props.candidateInfo.position,
        content: resume.content,
        resume_content: resume.content
      }
      showResumeDialog.value = true
    }
  } catch {
    ElMessage.error('获取简历失败')
  }
}

// 查看初筛报告
const handleViewScreeningReport = async () => {
  if (!props.candidateInfo.screeningTaskId) {
    ElMessage.warning('暂无初筛报告')
    return
  }
  
  try {
    const result = await getScreeningTask({ path: { task_id: props.candidateInfo.screeningTaskId } })
    if (result.data?.data) {
      const task = result.data.data
      resumeDetailData.value = {
        id: task.id,
        candidate_name: task.candidate_name || props.candidateInfo.name,
        position_title: task.position_title || props.candidateInfo.position,
        screening_score: task.score !== null ? {
          comprehensive_score: task.score,
          hr_score: (task.dimension_scores?.hr_score as number) || undefined,
          technical_score: (task.dimension_scores?.technical_score as number) || undefined,
          manager_score: (task.dimension_scores?.manager_score as number) || undefined
        } : undefined,
        screening_summary: task.summary || undefined,
        resume_content: task.resume_content || undefined
      }
      showResumeDialog.value = true
    }
  } catch {
    ElMessage.error('获取初筛报告失败')
  }
}

// 发送问题
const handleSendQuestion = () => {
  if (!questionInputLocal.value.trim()) return
  emit('send-question', questionInputLocal.value.trim())
  questionInputLocal.value = ''
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
}

// 监听消息变化
watch(() => props.messages.length, scrollToBottom)

// 格式化消息时间
const formatMessageTime = (timestamp?: string) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 情绪标签映射
const emotionLabelMap: Record<string, string> = {
  neutral: '平静',
  happiness: '愉悦',
  happy: '愉悦',
  sadness: '悲伤',
  sad: '悲伤',
  anger: '愤怒',
  angry: '愤怒',
  fear: '恐惧',
  surprise: '惊讶',
  disgust: '厌恶',
  contempt: '鄙视'
}

// 计算当前主要情绪
const currentEmotion = computed(() => {
  if (!props.emotions.length) return null
  const firstEmotion = props.emotions[0]
  if (!firstEmotion) return null
  return getEmotionLabel(firstEmotion.emotion)
})

// Top 情绪比例
const topEmotionRatio = computed(() => {
  if (!props.emotions.length || !props.emotions[0]) return null
  return Math.round((props.emotions[0].ratio || 0) * 100)
})

// 注视比例
const gazeRatio = computed(() => props.gaze?.ratio ?? 0)

// 游离警告次数
const gazeWarnings = computed(() => props.gaze?.warnings ?? 0)

// 注视等级样式
const gazeLevelClass = computed(() => {
  const ratio = gazeRatio.value
  if (ratio >= 0.7) return 'level-good'
  if (ratio >= 0.4) return 'level-warning'
  return 'level-danger'
})

// 获取情绪标签
const getEmotionLabel = (emotion: string): string => {
  return emotionLabelMap[emotion.toLowerCase()] || emotion
}

// 获取情绪条样式
const getEmotionBarClass = (emotion: string): string => {
  const map: Record<string, string> = {
    happiness: 'bar-happy',
    happy: 'bar-happy',
    neutral: 'bar-neutral',
    sadness: 'bar-sad',
    sad: 'bar-sad',
    anger: 'bar-angry',
    angry: 'bar-angry',
    fear: 'bar-fear',
    surprise: 'bar-surprise',
    disgust: 'bar-disgust',
    contempt: 'bar-contempt'
  }
  return map[emotion.toLowerCase()] || 'bar-neutral'
}

// 格式化时间
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.analysis-panel {
  background: white;
  border-radius: 16px;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

// 候选人信息卡片（紧凑版）
.candidate-info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 12px;
  color: white;

  .candidate-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .candidate-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .candidate-details {
    flex: 1;
    min-width: 0;

    .candidate-name {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .candidate-position {
      font-size: 12px;
      opacity: 0.85;
    }
  }

  .candidate-quick-actions {
    display: flex;
    gap: 4px;

    .el-button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
}

// 行为分析卡片（可折叠）
.behavior-card {
  background: #f8fafc;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;

  .behavior-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    cursor: pointer;
    user-select: none;

    &:hover {
      background: #f1f5f9;
    }
  }

  .behavior-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;

    .summary-item {
      display: flex;
      align-items: center;
      gap: 4px;

      .summary-icon { font-size: 14px; }
      .summary-label { color: #4b5563; }
      .summary-value { font-weight: 600; color: #1a1a2e; }

      &.level-good .summary-value { color: #10b981; }
      &.level-warning .summary-value { color: #f59e0b; }
      &.level-danger .summary-value { color: #ef4444; }
    }

    .summary-divider {
      color: #d1d5db;
    }
  }

  .collapse-icon {
    color: #9ca3af;
    transition: transform 0.3s;
  }

  &.collapsed .collapse-icon {
    transform: rotate(180deg);
  }

  .behavior-details {
    padding: 0 14px 14px;
  }

  .detail-section {
    margin-top: 10px;

    &.gaze-detail {
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
    }
  }
}

// 情绪列表
.emotion-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.emotion-item {
  display: flex;
  align-items: center;
  gap: 8px;

  .emotion-label {
    font-size: 11px;
    color: #4b5563;
    min-width: 40px;
  }

  .emotion-bar-container {
    flex: 1;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }

  .emotion-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;

    &.bar-happy { background: linear-gradient(90deg, #10b981, #34d399); }
    &.bar-neutral { background: linear-gradient(90deg, #6b7280, #9ca3af); }
    &.bar-sad { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    &.bar-angry { background: linear-gradient(90deg, #ef4444, #f87171); }
    &.bar-fear { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    &.bar-surprise { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
    &.bar-disgust { background: linear-gradient(90deg, #84cc16, #a3e635); }
    &.bar-contempt { background: linear-gradient(90deg, #ec4899, #f472b6); }
  }

  .emotion-value {
    font-size: 11px;
    font-weight: 600;
    color: #1a1a2e;
    min-width: 32px;
    text-align: right;
  }
}

// 注视检测
.gaze-meter {
  .meter-bar-container {
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .meter-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease;

    &.level-good { background: linear-gradient(90deg, #10b981, #34d399); }
    &.level-warning { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    &.level-danger { background: linear-gradient(90deg, #ef4444, #f87171); }
  }
}

.gaze-stats {
  margin-top: 6px;
  font-size: 11px;
  color: #6b7280;

  .warning-text { color: #f59e0b; }
}

// 对话区域（主体）
.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border-radius: 10px;
  overflow: hidden;
  min-height: 200px;

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: white;
    border-bottom: 1px solid #e5e7eb;

    .chat-title {
      font-size: 13px;
      font-weight: 600;
      color: #1a1a2e;
    }

    .message-count {
      font-size: 11px;
      color: #9ca3af;
    }
  }

  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    max-height: 350px;
  }

  .chat-empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 12px;
  }

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message-item {
    display: flex;
    gap: 8px;

    .message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    .message-body {
      flex: 1;
      background: white;
      border-radius: 10px;
      padding: 8px 12px;
      min-width: 0;
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      flex-wrap: wrap;

      .role-name {
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
      }

      .message-behavior-inline {
        display: flex;
        gap: 4px;
        flex: 1;
        flex-wrap: wrap;

        .behavior-tag {
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 6px;

          &.gaze {
            background: rgba(16, 185, 129, 0.15);
            color: #059669;
          }

          &.emotion {
            background: rgba(102, 126, 234, 0.15);
            color: #667eea;
          }
        }
      }

      .timestamp {
        font-size: 10px;
        color: #9ca3af;
        margin-left: auto;
      }
    }

    .message-content {
      font-size: 13px;
      color: #1a1a2e;
      line-height: 1.4;
      word-break: break-word;
    }

    &.message-interviewer .message-avatar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    &.message-candidate .message-avatar {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
  }

  .speech-status {
    padding: 8px 12px;
    background: white;
    border-top: 1px solid #e5e7eb;

    .speaker-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 500;

      &.interviewer { color: #667eea; }
      &.candidate { color: #10b981; }

      .recording-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse 1.5s infinite;
      }
    }

    .live-text {
      margin-top: 4px;
      font-size: 12px;
      color: #6b7280;
      font-style: italic;
    }
  }

  .chat-input {
    padding: 10px 12px;
    background: white;
    border-top: 1px solid #e5e7eb;
  }
}

// 建议栏
.suggestions-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;

  .suggestions-label {
    font-size: 12px;
    color: #4b5563;
    flex-shrink: 0;
  }

  .suggestions-scroll {
    flex: 1;
    display: flex;
    gap: 6px;
    overflow-x: auto;

    &::-webkit-scrollbar { display: none; }
  }

  .suggestion-chip {
    font-size: 11px;
    padding: 4px 10px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;

    &:hover {
      border-color: #667eea;
      color: #667eea;
    }
  }

  .no-suggestion {
    font-size: 11px;
    color: #9ca3af;
  }
}

// 底部统计
.stats-footer {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #6b7280;

    .el-icon { font-size: 14px; }

    &.connected { color: #10b981; }
  }
}

// 基本信息弹窗
.basic-info-content {
  .info-row {
    display: flex;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child { border-bottom: none; }

    .info-label {
      width: 100px;
      color: #6b7280;
      font-size: 14px;
    }

    .info-value {
      flex: 1;
      color: #1a1a2e;
      font-size: 14px;
      font-weight: 500;
    }
  }
}

// 折叠动画
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 200px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
