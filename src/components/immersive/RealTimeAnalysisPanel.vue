<template>
  <div class="analysis-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <el-icon class="title-icon"><DataAnalysis /></el-icon>
        <span>实时行为分析</span>
      </div>
      <div class="header-status">
        <el-tag :type="isConnected ? 'success' : 'info'" size="small" effect="plain">
          {{ isConnected ? '分析中' : '未连接' }}
        </el-tag>
      </div>
    </div>

    <!-- 候选人信息卡片 -->
    <div class="candidate-info-card">
      <div class="candidate-header">
        <div class="candidate-avatar">
          <el-icon :size="28"><User /></el-icon>
        </div>
        <div class="candidate-details">
          <div class="candidate-name">{{ candidateInfo.name || '未知候选人' }}</div>
          <div class="candidate-position">{{ candidateInfo.position || '暂无岗位' }}</div>
        </div>
      </div>
      <div class="candidate-actions">
        <div class="action-btn" @click="showBasicInfoDialog = true">
          <el-icon :size="16"><InfoFilled /></el-icon>
          <span>基本信息</span>
        </div>
        <div class="action-btn" @click="handleViewResume">
          <el-icon :size="16"><Document /></el-icon>
          <span>简历</span>
        </div>
        <div class="action-btn" @click="handleViewScreeningReport">
          <el-icon :size="16"><DataLine /></el-icon>
          <span>初筛报告</span>
        </div>
      </div>
    </div>

    <!-- 基本信息弹窗 -->
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

    <!-- 简历详情弹窗 -->
    <ResumeDetailDialog
      v-model="showResumeDialog"
      :resume="resumeDetailData"
    />

    <!-- 情绪识别 -->
    <div class="section-card">
      <h4 class="section-title">
        <span class="title-icon">😊</span>
        情绪识别
        <span v-if="currentEmotion" class="emotion-badge" :class="getEmotionClass(currentEmotion)">
          {{ currentEmotion }}
        </span>
      </h4>
      <div v-if="emotions.length > 0" class="emotion-list">
        <div
          v-for="(emotion, index) in emotions"
          :key="index"
          class="emotion-item"
        >
          <span class="emotion-label">{{ getEmotionLabel(emotion.emotion) }}</span>
          <div class="emotion-bar-container">
            <div
              class="emotion-bar"
              :class="getEmotionBarClass(emotion.emotion)"
              :style="{ width: `${Math.round((emotion.ratio || 0) * 100)}%` }"
            ></div>
          </div>
          <span class="emotion-value">{{ Math.round((emotion.ratio || 0) * 100) }}%</span>
        </div>
      </div>
      <div v-else class="no-data">
        <el-icon :size="24"><InfoFilled /></el-icon>
        <span>等待检测...</span>
      </div>
    </div>

    <!-- 注视检测 -->
    <div class="section-card" :class="{ 'warning-state': isGazeWarning }">
      <h4 class="section-title">
        <span class="title-icon">👁️</span>
        注视检测
        <el-tag v-if="isGazeWarning" type="warning" size="small" effect="dark" class="warning-tag">
          眼神游离
        </el-tag>
      </h4>
      <div class="gaze-content">
        <div class="gaze-meter">
          <div class="meter-labels">
            <span>游离</span>
            <span>专注</span>
          </div>
          <div class="meter-bar-container">
            <div
              class="meter-bar"
              :class="gazeLevelClass"
              :style="{ width: `${Math.round(gazeRatio * 100)}%` }"
            ></div>
          </div>
        </div>
        <div class="gaze-stats">
          <div class="stat-item">
            <span class="stat-label">注视比例</span>
            <span class="stat-value" :class="gazeLevelClass">{{ Math.round(gazeRatio * 100) }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">游离警告</span>
            <span class="stat-value" :class="{ 'warning-text': gazeWarnings > 0 }">{{ gazeWarnings }} 次</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 提问建议 -->
    <div class="section-card suggestions-section">
      <h4 class="section-title">
        <span class="title-icon">💡</span>
        候选提问建议
        <el-button type="primary" link size="small" @click="$emit('refresh-suggestions')">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </h4>
      <div v-if="suggestions.length > 0" class="suggestions-list">
        <div
          v-for="suggestion in suggestions.slice(0, 3)"
          :key="suggestion.question"
          class="suggestion-item"
          @click="$emit('use-suggestion', suggestion)"
        >
          <span class="suggestion-type" :class="suggestion.type">{{ typeLabels[suggestion.type] }}</span>
          <span class="suggestion-text">{{ suggestion.question }}</span>
        </div>
      </div>
      <div v-else class="no-suggestions">
        <span>开始面试后自动推荐问题</span>
      </div>
    </div>

    <!-- 底部统计 -->
    <div class="stats-footer">
      <div class="stat-item duration">
        <el-icon><Timer /></el-icon>
        <span class="stat-value">{{ formatTime(stats.duration) }}</span>
        <span class="stat-label">面试时长</span>
      </div>
      <div class="stat-item connection">
        <el-icon><Connection /></el-icon>
        <span class="stat-value" :class="isConnected ? 'connected' : 'disconnected'">
          {{ isConnected ? '已连接' : '未连接' }}
        </span>
        <span class="stat-label">分析状态</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DataAnalysis,
  Refresh,
  Timer,
  User,
  InfoFilled,
  Connection,
  Document,
  DataLine
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ResumeDetailDialog } from '@/components/common'
import { getResume, getScreeningTask } from '@/api/sdk.gen'
import type { EmotionItem, GazeData } from '@/api/types.gen'
import type { InterviewStats, QuestionSuggestion } from '@/composables/useImmersiveInterview'
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
}

const props = withDefaults(defineProps<Props>(), {
  isConnected: false,
  emotions: () => [],
  gaze: null,
  suggestions: () => [],
  stats: () => ({ duration: 0, messageCount: 0 }),
  candidateInfo: () => ({ name: '', position: '' })
})

// 弹窗状态
const showBasicInfoDialog = ref(false)
const showResumeDialog = ref(false)
const resumeDetailData = ref<ResumeData | null>(null)

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

defineEmits<{
  (e: 'refresh-suggestions'): void
  (e: 'use-suggestion', suggestion: QuestionSuggestion): void
}>()

// 情绪标签映射（支持后端返回的大写格式）
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

const typeLabels: Record<string, string> = {
  followup: '追问',
  alternative: '备选',
  probe: '深挖'
}

// 计算当前主要情绪
const currentEmotion = computed(() => {
  if (!props.emotions.length) return null
  const firstEmotion = props.emotions[0]
  if (!firstEmotion) return null
  return getEmotionLabel(firstEmotion.emotion)
})

// 注视比例
const gazeRatio = computed(() => props.gaze?.ratio ?? 0)

// 游离警告次数
const gazeWarnings = computed(() => props.gaze?.warnings ?? 0)

// 是否眼神游离警告
const isGazeWarning = computed(() => gazeRatio.value < 0.5 || gazeWarnings.value > 3)

// 注视等级样式
const gazeLevelClass = computed(() => {
  const ratio = gazeRatio.value
  if (ratio >= 0.7) return 'level-good'
  if (ratio >= 0.4) return 'level-warning'
  return 'level-danger'
})

// 获取情绪标签（转小写匹配）
const getEmotionLabel = (emotion: string): string => {
  return emotionLabelMap[emotion.toLowerCase()] || emotion
}

// 获取情绪样式类
const getEmotionClass = (emotion: string): string => {
  const map: Record<string, string> = {
    '愉悦': 'happy',
    '平静': 'neutral',
    '专注': 'neutral',
    '悲伤': 'sad',
    '愤怒': 'angry',
    '恐惧': 'fear'
  }
  return map[emotion] || 'neutral'
}

// 获取情绪条样式（支持后端不同命名格式）
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
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a2e;

    .title-icon {
      color: #667eea;
    }
  }
}

// 候选人信息卡片
.candidate-info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 16px;
  color: white;

  .candidate-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .candidate-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255, 255, 255, 0.3);

    .el-icon {
      color: rgba(255, 255, 255, 0.9);
    }
  }

  .candidate-details {
    flex: 1;

    .candidate-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .candidate-position {
      font-size: 13px;
      opacity: 0.85;
    }
  }

  .candidate-actions {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.15);

    .action-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      .el-icon {
        opacity: 0.9;
      }

      span {
        font-size: 11px;
        opacity: 0.9;
        white-space: nowrap;
      }
    }
  }
}

// 基本信息弹窗
.basic-info-content {
  .info-row {
    display: flex;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

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

// 区块卡片
.section-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;

  &.warning-state {
    background: #fef3cd;
    border: 1px solid #ffc107;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0 0 12px;

    .title-icon {
      font-size: 18px;
    }

    .emotion-badge {
      margin-left: auto;
      font-size: 12px;
      padding: 2px 10px;
      border-radius: 12px;
      font-weight: 500;

      &.happy { background: #d4edda; color: #155724; }
      &.neutral { background: #e2e3e5; color: #383d41; }
      &.sad { background: #cce5ff; color: #004085; }
      &.angry { background: #f8d7da; color: #721c24; }
      &.fear { background: #fff3cd; color: #856404; }
    }

    .warning-tag {
      margin-left: auto;
    }

    .el-button {
      margin-left: auto;
    }
  }
}

// 情绪列表
.emotion-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.emotion-item {
  display: flex;
  align-items: center;
  gap: 10px;

  .emotion-label {
    font-size: 12px;
    color: #4b5563;
    min-width: 50px;
  }

  .emotion-bar-container {
    flex: 1;
    height: 10px;
    background: #e5e7eb;
    border-radius: 5px;
    overflow: hidden;
  }

  .emotion-bar {
    height: 100%;
    border-radius: 5px;
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
    font-size: 12px;
    font-weight: 600;
    color: #1a1a2e;
    min-width: 40px;
    text-align: right;
  }
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: #9ca3af;
  font-size: 13px;
}

// 注视检测
.gaze-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gaze-meter {
  .meter-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 6px;
  }

  .meter-bar-container {
    height: 12px;
    background: #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
  }

  .meter-bar {
    height: 100%;
    border-radius: 6px;
    transition: width 0.5s ease;

    &.level-good { background: linear-gradient(90deg, #10b981, #34d399); }
    &.level-warning { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    &.level-danger { background: linear-gradient(90deg, #ef4444, #f87171); }
  }
}

.gaze-stats {
  display: flex;
  justify-content: space-around;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;

    .stat-label {
      font-size: 11px;
      color: #6b7280;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 600;

      &.level-good { color: #10b981; }
      &.level-warning { color: #f59e0b; }
      &.level-danger { color: #ef4444; }
      &.warning-text { color: #f59e0b; }
    }
  }
}

// 提问建议
.suggestions-section {
  flex: 1;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;

  &:hover {
    border-color: #667eea;
    transform: translateX(4px);
  }

  .suggestion-type {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;

    &.followup {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    &.alternative {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    &.probe {
      background: rgba(102, 126, 234, 0.15);
      color: #667eea;
    }
  }

  .suggestion-text {
    font-size: 12px;
    color: #1a1a2e;
    line-height: 1.4;
  }
}

.no-suggestions {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 12px;
}

// 底部统计
.stats-footer {
  display: flex;
  justify-content: space-around;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    .el-icon {
      font-size: 20px;
      color: #667eea;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;

      &.connected { color: #10b981; }
      &.disconnected { color: #ef4444; }
    }

    .stat-label {
      font-size: 11px;
      color: #6b7280;
    }
  }
}
</style>
