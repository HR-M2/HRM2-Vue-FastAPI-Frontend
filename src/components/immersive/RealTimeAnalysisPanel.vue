<template>
  <div class="cockpit-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <el-icon class="title-icon"><DataAnalysis /></el-icon>
        <span>驾驶舱</span>
      </div>
      <div class="header-actions">
        <el-tag :type="isAnalyzing ? 'success' : 'info'" size="small" effect="plain">
          {{ isAnalyzing ? '分析中' : '待机' }}
        </el-tag>
      </div>
    </div>

    <!-- 候选人信息卡片 -->
    <div class="candidate-info-card">
      <div class="candidate-header">
        <div class="candidate-avatar">
          <img v-if="candidateInfo.avatarUrl" :src="candidateInfo.avatarUrl" alt="候选人照片" />
          <div v-else class="avatar-placeholder">
            <el-icon :size="28"><User /></el-icon>
          </div>
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

    <!-- 大五人格分析 -->
    <div class="section-card">
      <h4 class="section-title">
        <span class="title-icon">🧠</span>
        大五人格分析
      </h4>
      <div class="personality-list">
        <div class="personality-item">
          <span class="trait-label">开放性</span>
          <div class="trait-bar-container">
            <div class="trait-bar openness" :style="{ width: `${cockpitData.bigFive.openness * 100}%` }"></div>
          </div>
          <span class="trait-value">{{ formatPercent(cockpitData.bigFive.openness) }}</span>
        </div>
        <div class="personality-item">
          <span class="trait-label">尽责性</span>
          <div class="trait-bar-container">
            <div class="trait-bar conscientiousness" :style="{ width: `${cockpitData.bigFive.conscientiousness * 100}%` }"></div>
          </div>
          <span class="trait-value">{{ formatPercent(cockpitData.bigFive.conscientiousness) }}</span>
        </div>
        <div class="personality-item">
          <span class="trait-label">外向性</span>
          <div class="trait-bar-container">
            <div class="trait-bar extraversion" :style="{ width: `${cockpitData.bigFive.extraversion * 100}%` }"></div>
          </div>
          <span class="trait-value">{{ formatPercent(cockpitData.bigFive.extraversion) }}</span>
        </div>
        <div class="personality-item">
          <span class="trait-label">宜人性</span>
          <div class="trait-bar-container">
            <div class="trait-bar agreeableness" :style="{ width: `${cockpitData.bigFive.agreeableness * 100}%` }"></div>
          </div>
          <span class="trait-value">{{ formatPercent(cockpitData.bigFive.agreeableness) }}</span>
        </div>
        <div class="personality-item">
          <span class="trait-label">神经质</span>
          <div class="trait-bar-container">
            <div class="trait-bar neuroticism" :style="{ width: `${cockpitData.bigFive.neuroticism * 100}%` }"></div>
          </div>
          <span class="trait-value">{{ formatPercent(cockpitData.bigFive.neuroticism) }}</span>
        </div>
      </div>
    </div>

    <!-- 欺骗检测 & 抑郁检测 -->
    <div class="section-card detection-grid" :class="{ 'warning-state': cockpitData.deceptionScore > 0.5 }">
      <!-- 欺骗检测 -->
      <div class="detection-item">
        <h4 class="section-title">
          <span class="title-icon">🔍</span>
          欺骗检测
          <el-tag v-if="cockpitData.deceptionScore > 0.5" type="warning" size="small" effect="dark" class="warning-tag">
            警告
          </el-tag>
        </h4>
        <div class="deception-meter">
          <div class="meter-bar-container">
            <div 
              class="meter-bar" 
              :class="deceptionLevelClass"
              :style="{ width: `${cockpitData.deceptionScore * 100}%` }"
            ></div>
          </div>
          <div class="meter-labels">
            <span>低</span>
            <span class="meter-value" :class="deceptionLevelClass">{{ formatPercent(cockpitData.deceptionScore) }}</span>
            <span>高</span>
          </div>
        </div>
      </div>

      <!-- 抑郁检测 -->
      <div class="detection-item">
        <h4 class="section-title">
          <span class="title-icon">😔</span>
          抑郁检测
        </h4>
        <div class="deception-meter">
          <div class="meter-bar-container">
            <div 
              class="meter-bar depression-bar" 
              :style="{ width: `${cockpitData.depressionScore * 100}%` }"
            ></div>
          </div>
          <div class="meter-labels">
            <span>低</span>
            <span class="meter-value depression-value">{{ formatPercent(cockpitData.depressionScore) }}</span>
            <span>高</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 候选提问建议 -->
    <div class="section-card suggestions-section">
      <h4 class="section-title">
        <span class="title-icon">💡</span>
        候选提问建议
        <el-button type="primary" link size="small" @click="$emit('refresh-suggestions')">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </h4>
      <div class="suggestions-list" v-if="suggestions.length > 0">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DataAnalysis, Refresh, User, InfoFilled, Document, DataLine } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ResumeDetailDialog } from '@/components/common'
import { getResume, getScreeningTask } from '@/api/sdk.gen'
import type { CockpitData, QuestionSuggestion } from '@/composables/useImmersiveInterview'
import type { ResumeData } from '@/types'

interface CandidateInfo {
  name: string
  position: string
  avatarUrl?: string
  applicationId?: string
  resumeId?: string
  screeningTaskId?: string
}

interface Props {
  isAnalyzing?: boolean
  stats: {
    duration: number
    interviewerRatio: number
    candidateRatio: number
    avgEngagement: number
    avgConfidence: number
  }
  cockpitData: CockpitData
  suggestions: QuestionSuggestion[]
  candidateInfo: CandidateInfo
}

const props = withDefaults(defineProps<Props>(), {
  isAnalyzing: false,
  suggestions: () => [],
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

const typeLabels: Record<string, string> = {
  followup: '追问',
  alternative: '备选',
  probe: '深挖'
}

const deceptionLevelClass = computed(() => {
  const score = props.cockpitData.deceptionScore
  if (score > 0.7) return 'level-danger'
  if (score > 0.5) return 'level-warning'
  return 'level-normal'
})

const formatPercent = (value: number) => {
  return `${Math.round(value * 100)}%`
}
</script>

<style scoped lang="scss">
.cockpit-panel {
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
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  
  .candidate-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .candidate-avatar {
    flex-shrink: 0;
    
    img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .avatar-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.3);
      
      .el-icon {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
  
  .candidate-details {
    flex: 1;
    min-width: 0;
    
    .candidate-name {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .candidate-position {
      font-size: 12px;
      opacity: 0.8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  
  .candidate-actions {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding-top: 8px;
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
  
  &.detection-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 12px;
    
    .detection-item {
      background: white;
      border-radius: 10px;
      padding: 12px;
    }
  }
  
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0 0 12px;
    
    .title-icon {
      font-size: 16px;
    }
    
    .warning-tag {
      margin-left: auto;
    }
  }
}

// 大五人格
.personality-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.personality-item {
  display: flex;
  align-items: center;
  gap: 10px;
  
  .trait-label {
    font-size: 12px;
    color: #4b5563;
    min-width: 50px;
  }
  
  .trait-bar-container {
    flex: 1;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .trait-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease;
    
    &.openness {
      background: linear-gradient(90deg, #667eea, #764ba2);
    }
    
    &.conscientiousness {
      background: linear-gradient(90deg, #10b981, #34d399);
    }
    
    &.extraversion {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }
    
    &.agreeableness {
      background: linear-gradient(90deg, #06b6d4, #22d3ee);
    }
    
    &.neuroticism {
      background: linear-gradient(90deg, #ef4444, #f87171);
    }
  }
  
  .trait-value {
    font-size: 12px;
    font-weight: 600;
    color: #1a1a2e;
    min-width: 36px;
    text-align: right;
  }
}

// 欺骗检测
.deception-meter {
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
    
    &.level-normal {
      background: linear-gradient(90deg, #10b981, #34d399);
    }
    
    &.level-warning {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }
    
    &.level-danger {
      background: linear-gradient(90deg, #ef4444, #f87171);
    }
    
    &.depression-bar {
      background: linear-gradient(90deg, #6b7280, #9ca3af);
    }
  }
  
  .meter-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
    font-size: 11px;
    color: #6b7280;
    
    .meter-value {
      font-weight: 700;
      font-size: 14px;
      
      &.level-normal {
        color: #10b981;
      }
      
      &.level-warning {
        color: #f59e0b;
      }
      
      &.level-danger {
        color: #ef4444;
      }
      
      &.depression-value {
        color: #6b7280;
      }
    }
  }
}

// 提问建议
.suggestions-section {
  flex: 1;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  
  .section-title {
    .el-button {
      margin-left: auto;
    }
  }
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
</style>
