<template>
  <el-dialog
    v-model="visible"
    title="沉浸式面试分析报告"
    width="900px"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    :show-close="true"
    class="immersive-analysis-dialog"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="32" color="#409eff"><Loading /></el-icon>
      <p>加载中...</p>
    </div>
    
    <div v-else-if="!reportData" class="empty-container">
      <el-empty description="暂无分析报告" />
    </div>
    
    <div v-else class="report-content">
      <!-- 基本信息 -->
      <div class="section-card basic-info-card">
        <h3><el-icon><User /></el-icon> 面试基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">候选人：</span>
            <span class="value">{{ reportData.candidate_info?.name || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">应聘岗位：</span>
            <span class="value">{{ reportData.candidate_info?.position_title || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">面试时长：</span>
            <span class="value">{{ formatDuration(reportData.duration_seconds) }}</span>
          </div>
          <div class="info-item">
            <span class="label">面试时间：</span>
            <span class="value">{{ formatDateTime(reportData.start_time) }}</span>
          </div>
        </div>
      </div>

      <!-- 对话概要统计 -->
      <div class="section-card statistics-card">
        <h3><el-icon><DataAnalysis /></el-icon> 对话概要统计</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ getUtteranceTotal }}</div>
            <div class="stat-label">总发言数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ getUtteranceCandidate }}</div>
            <div class="stat-label">候选人发言</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ getUtteranceInterviewer }}</div>
            <div class="stat-label">面试官发言</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ getCharTotal }}</div>
            <div class="stat-label">总字数</div>
          </div>
        </div>
        
        <!-- 发言占比 -->
        <div class="speaking-ratio-section">
          <div class="ratio-row">
            <span class="ratio-label">发言占比（按次数）</span>
            <div class="ratio-bars">
              <div class="ratio-bar candidate" :style="{ width: getSpeakingRatioByCount.candidate + '%' }">
                候选人 {{ getSpeakingRatioByCount.candidate }}%
              </div>
              <div class="ratio-bar interviewer" :style="{ width: getSpeakingRatioByCount.interviewer + '%' }">
                面试官 {{ getSpeakingRatioByCount.interviewer }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 心理分析区域 -->
      <div class="section-card psychological-card">
        <h3><el-icon><TrendCharts /></el-icon> 心理分析报告</h3>
        
        <!-- 大五人格分析 -->
        <div v-if="psychologicalAnalysis?.big_five" class="analysis-block big-five-block">
          <h4>
            <span class="block-icon">🧠</span>
            大五人格分析
          </h4>
          
          <div class="personality-summary">
            <span class="summary-label">性格概括：</span>
            <span class="summary-text">{{ psychologicalAnalysis.big_five.personality_summary || '暂无' }}</span>
          </div>
          
          <div class="personality-chart">
            <BigFiveRadarChart 
              v-if="psychologicalAnalysis.big_five.scores"
              :data="psychologicalAnalysis.big_five.scores" 
              height="220px"
              color="#667eea"
            />
          </div>
          
          <div class="personality-details">
            <div v-if="psychologicalAnalysis.big_five.strengths?.length" class="detail-row">
              <span class="detail-label">性格优势：</span>
              <span class="detail-value success">{{ psychologicalAnalysis.big_five.strengths.join('、') }}</span>
            </div>
            <div v-if="psychologicalAnalysis.big_five.potential_concerns?.length" class="detail-row">
              <span class="detail-label">潜在关注：</span>
              <span class="detail-value warning">{{ psychologicalAnalysis.big_five.potential_concerns.join('、') }}</span>
            </div>
            <div v-if="psychologicalAnalysis.big_five.work_style" class="detail-row">
              <span class="detail-label">工作风格：</span>
              <span class="detail-value">{{ psychologicalAnalysis.big_five.work_style }}</span>
            </div>
            <div v-if="psychologicalAnalysis.big_five.team_fit" class="detail-row">
              <span class="detail-label">团队协作：</span>
              <span class="detail-value">{{ psychologicalAnalysis.big_five.team_fit }}</span>
            </div>
          </div>
          
          <div v-if="psychologicalAnalysis.big_five.detailed_analysis" class="detailed-analysis">
            <p>{{ psychologicalAnalysis.big_five.detailed_analysis }}</p>
          </div>
        </div>
        
        <!-- 可信度分析 -->
        <div v-if="psychologicalAnalysis?.credibility" class="analysis-block credibility-block">
          <h4>
            <span class="block-icon">🔍</span>
            面试可信度
          </h4>
          
          <div class="credibility-overview">
            <div class="score-circle" :class="getCredibilityClass(psychologicalAnalysis.credibility.overall_score)">
              <span class="score-value">{{ ((psychologicalAnalysis.credibility.overall_score || 0) * 100).toFixed(0) }}%</span>
            </div>
            <div class="score-info">
              <el-tag :type="getCredibilityTagType(psychologicalAnalysis.credibility.overall_score)" size="large">
                {{ psychologicalAnalysis.credibility.level || '未知' }}
              </el-tag>
              <p class="analysis-text">{{ psychologicalAnalysis.credibility.analysis }}</p>
            </div>
          </div>
          
          <div v-if="psychologicalAnalysis.credibility.low_credibility_responses?.length" class="response-list warning-list">
            <h5>低可信度回答 ({{ psychologicalAnalysis.credibility.low_credibility_responses.length }})</h5>
            <div 
              v-for="(resp, idx) in psychologicalAnalysis.credibility.low_credibility_responses" 
              :key="'low-' + idx"
              class="response-item"
            >
              <span class="response-text">"{{ resp.text }}"</span>
              <span class="response-score warning">欺骗分: {{ (resp.deception_score * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
        
        <!-- 抑郁风险分析 -->
        <div v-if="psychologicalAnalysis?.depression" class="analysis-block depression-block">
          <h4>
            <span class="block-icon">💚</span>
            抑郁风险评估
          </h4>
          
          <div class="depression-overview">
            <div class="risk-indicator" :class="'risk-' + (psychologicalAnalysis.depression.level || 'low')">
              <span class="risk-icon">{{ getDepressionIcon(psychologicalAnalysis.depression.level) }}</span>
              <span class="risk-label">{{ psychologicalAnalysis.depression.level_label || '未知' }}</span>
            </div>
            <div class="risk-info">
              <div class="score-row">
                <span class="score-label">平均分数：</span>
                <span class="score-num">{{ (psychologicalAnalysis.depression.overall_score || 0).toFixed(1) }}</span>
              </div>
              <p class="interpretation">{{ psychologicalAnalysis.depression.interpretation }}</p>
            </div>
          </div>
          
          <div v-if="psychologicalAnalysis.depression.level_distribution" class="level-distribution">
            <span class="dist-label">风险分布：</span>
            <el-tag type="success" size="small">低风险 {{ psychologicalAnalysis.depression.level_distribution.low || 0 }}</el-tag>
            <el-tag type="warning" size="small">中等风险 {{ psychologicalAnalysis.depression.level_distribution.medium || 0 }}</el-tag>
            <el-tag type="danger" size="small">高风险 {{ psychologicalAnalysis.depression.level_distribution.high || 0 }}</el-tag>
          </div>
        </div>
        
        <!-- 无心理分析数据 -->
        <div v-if="!psychologicalAnalysis" class="no-analysis">
          <el-empty description="暂无心理分析数据" :image-size="80" />
        </div>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Loading, User, DataAnalysis, TrendCharts } from '@element-plus/icons-vue'
import BigFiveRadarChart from '@/components/common/BigFiveRadarChart.vue'

interface BigFiveScores {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

interface BigFiveAnalysis {
  scores: BigFiveScores
  personality_summary: string
  strengths: string[]
  potential_concerns: string[]
  work_style: string
  team_fit: string
  detailed_analysis: string
}

interface CredibilityResponse {
  text: string
  deception_score: number
  confidence: number
}

interface CredibilityAnalysis {
  overall_score: number
  level: string
  low_credibility_responses: CredibilityResponse[]
  high_credibility_responses: CredibilityResponse[]
  analysis: string
}

interface DepressionAnalysis {
  overall_score: number
  level: string
  level_label: string
  level_distribution: { low: number; medium: number; high: number }
  interpretation: string
}

interface PsychologicalAnalysis {
  big_five?: BigFiveAnalysis
  credibility?: CredibilityAnalysis
  depression?: DepressionAnalysis
}

interface ImmersiveReportData {
  session_id: string
  duration_seconds: number
  start_time: string
  end_time?: string
  candidate_info?: {
    name: string
    position_title: string
  }
  statistics?: {
    // 新API结构
    utterance_count?: { total: number; interviewer: number; candidate: number }
    char_count?: { total: number; interviewer: number; candidate: number }
    speaking_ratio?: {
      by_count?: { interviewer: number; candidate: number }
      by_chars?: { interviewer: number; candidate: number }
    }
    big_five_average?: {
      openness: number
      conscientiousness: number
      extraversion: number
      agreeableness: number
      neuroticism: number
    }
    depression_average?: { score: number; level: string }
    // 旧API结构（向后兼容）
    total_utterances?: number
    interviewer_utterances?: number
    candidate_utterances?: number
    interviewer_ratio?: number
    candidate_ratio?: number
  }
  psychological_analysis?: PsychologicalAnalysis
}

interface Props {
  modelValue: boolean
  reportData?: ImmersiveReportData | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  reportData: null,
  loading: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const psychologicalAnalysis = computed(() => props.reportData?.psychological_analysis)

// 统计数据计算属性（兼容新旧API结构）
const getUtteranceTotal = computed(() => {
  const stats = props.reportData?.statistics
  if (!stats) return 0
  // 新API结构
  if (stats.utterance_count?.total !== undefined) return stats.utterance_count.total
  // 旧API结构
  return stats.total_utterances || 0
})

const getUtteranceCandidate = computed(() => {
  const stats = props.reportData?.statistics
  if (!stats) return 0
  if (stats.utterance_count?.candidate !== undefined) return stats.utterance_count.candidate
  return stats.candidate_utterances || 0
})

const getUtteranceInterviewer = computed(() => {
  const stats = props.reportData?.statistics
  if (!stats) return 0
  if (stats.utterance_count?.interviewer !== undefined) return stats.utterance_count.interviewer
  return stats.interviewer_utterances || 0
})

const getCharTotal = computed(() => {
  const stats = props.reportData?.statistics
  if (!stats) return 0
  if (stats.char_count?.total !== undefined) return stats.char_count.total
  return 0
})

const getSpeakingRatioByCount = computed(() => {
  const stats = props.reportData?.statistics
  if (!stats) return { candidate: 50, interviewer: 50 }
  
  // 新API结构
  if (stats.speaking_ratio?.by_count) {
    return {
      candidate: Math.round((stats.speaking_ratio.by_count.candidate || 0) * 100),
      interviewer: Math.round((stats.speaking_ratio.by_count.interviewer || 0) * 100)
    }
  }
  
  // 旧API结构
  if (stats.candidate_ratio !== undefined) {
    const candidateRatio = Math.round((stats.candidate_ratio || 0) * 100)
    return { candidate: candidateRatio, interviewer: 100 - candidateRatio }
  }
  
  // 从发言次数计算
  const total = getUtteranceTotal.value
  if (total > 0) {
    const candidateRatio = Math.round((getUtteranceCandidate.value / total) * 100)
    return { candidate: candidateRatio, interviewer: 100 - candidateRatio }
  }
  
  return { candidate: 50, interviewer: 50 }
})

// 格式化时长
const formatDuration = (seconds: number): string => {
  if (!seconds) return '0秒'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟${secs}秒`
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`
  } else {
    return `${secs}秒`
  }
}

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
  if (!dateString) return '未知'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 获取可信度样式类
const getCredibilityClass = (score: number): string => {
  if (score >= 0.8) return 'high'
  if (score >= 0.6) return 'medium'
  return 'low'
}

// 获取可信度标签类型
const getCredibilityTagType = (score: number): 'success' | 'warning' | 'danger' => {
  if (score >= 0.8) return 'success'
  if (score >= 0.6) return 'warning'
  return 'danger'
}

// 获取抑郁风险图标
const getDepressionIcon = (level: string): string => {
  switch (level) {
    case 'low': return '🟢'
    case 'medium': return '🟡'
    case 'high': return '🔴'
    default: return '⚪'
  }
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  emit('close')
}
</script>

<style scoped lang="scss">
.immersive-analysis-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 75vh;
    overflow-y: auto;
  }
}

.loading-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  
  p {
    margin: 12px 0 0;
    color: #666;
    font-size: 14px;
  }
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  
  h3 {
    margin: 0 0 16px 0;
    color: #1f2937;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    
    .el-icon { color: #3b82f6; }
  }
}

.basic-info-card {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    
    .info-item {
      display: flex;
      .label { color: #6b7280; margin-right: 8px; min-width: 80px; }
      .value { color: #1f2937; font-weight: 500; }
    }
  }
}

.statistics-card {
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    
    .stat-item {
      text-align: center;
      .stat-value { font-size: 24px; font-weight: 600; color: #3b82f6; margin-bottom: 4px; }
      .stat-label { font-size: 12px; color: #6b7280; }
    }
  }
  
  .speaking-ratio-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #e5e7eb;
    
    .ratio-row {
      .ratio-label { font-size: 12px; color: #6b7280; margin-bottom: 6px; display: block; }
      .ratio-bars {
        display: flex;
        height: 24px;
        border-radius: 4px;
        overflow: hidden;
        .ratio-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 500;
          color: white;
          min-width: 60px;
          &.candidate { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }
          &.interviewer { background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%); }
        }
      }
    }
  }
}

.psychological-card {
  .analysis-block {
    background: #f9fafb;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    
    &:last-child { margin-bottom: 0; }
    
    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .block-icon { font-size: 16px; }
    }
  }
  
  .no-analysis {
    padding: 20px 0;
  }
}

// 大五人格分析
.big-five-block {
  .personality-summary {
    margin-bottom: 16px;
    padding: 12px;
    background: #fff;
    border-radius: 6px;
    
    .summary-label { color: #6b7280; }
    .summary-text { color: #1f2937; font-weight: 500; }
  }
  
  .personality-chart {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
    background: #fff;
    border-radius: 8px;
    padding: 12px;
  }
  
  .personality-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    
    .detail-row {
      display: flex;
      font-size: 13px;
      
      .detail-label {
        color: #6b7280;
        min-width: 80px;
      }
      
      .detail-value {
        color: #374151;
        &.success { color: #10b981; }
        &.warning { color: #f59e0b; }
      }
    }
  }
  
  .detailed-analysis {
    padding: 12px;
    background: #fff;
    border-radius: 6px;
    border-left: 3px solid #667eea;
    
    p {
      margin: 0;
      font-size: 13px;
      color: #4b5563;
      line-height: 1.6;
    }
  }
}

// 可信度分析
.credibility-block {
  .credibility-overview {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    margin-bottom: 16px;
    
    .score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      &.high { background: linear-gradient(135deg, #10b981, #34d399); }
      &.medium { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
      &.low { background: linear-gradient(135deg, #ef4444, #f87171); }
      
      .score-value {
        font-size: 20px;
        font-weight: 700;
        color: white;
      }
    }
    
    .score-info {
      flex: 1;
      
      .analysis-text {
        margin: 12px 0 0;
        font-size: 13px;
        color: #4b5563;
        line-height: 1.6;
      }
    }
  }
  
  .response-list {
    padding: 12px;
    background: #fff;
    border-radius: 6px;
    
    &.warning-list {
      border-left: 3px solid #f59e0b;
    }
    
    h5 {
      margin: 0 0 12px 0;
      font-size: 13px;
      color: #6b7280;
    }
    
    .response-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
      
      &:last-child { border-bottom: none; }
      
      .response-text {
        flex: 1;
        font-size: 13px;
        color: #374151;
        font-style: italic;
      }
      
      .response-score {
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        
        &.warning { color: #f59e0b; }
      }
    }
  }
}

// 抑郁风险分析
.depression-block {
  .depression-overview {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    margin-bottom: 16px;
    
    .risk-indicator {
      padding: 16px 24px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      
      &.risk-low { background: #d1fae5; }
      &.risk-medium { background: #fef3c7; }
      &.risk-high { background: #fee2e2; }
      
      .risk-icon { font-size: 24px; }
      .risk-label {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }
    }
    
    .risk-info {
      flex: 1;
      
      .score-row {
        margin-bottom: 8px;
        
        .score-label { color: #6b7280; font-size: 13px; }
        .score-num { font-weight: 600; color: #374151; }
      }
      
      .interpretation {
        margin: 0;
        font-size: 13px;
        color: #4b5563;
        line-height: 1.6;
      }
    }
  }
  
  .level-distribution {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .dist-label {
      font-size: 13px;
      color: #6b7280;
    }
  }
}
</style>
