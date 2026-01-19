<template>
  <el-dialog
    v-model="visible"
    title="沉浸式面试问答记录"
    width="800px"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    :show-close="true"
    class="immersive-records-dialog"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="32" color="#409eff"><Loading /></el-icon>
      <p>加载中...</p>
    </div>
    
    <div v-else-if="!sessionData" class="empty-container">
      <el-empty description="暂无面试记录" />
    </div>
    
    <div v-else class="records-content">
      <!-- 基本信息 -->
      <div class="section-card basic-info-card">
        <h3><el-icon><User /></el-icon> 面试基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">候选人：</span>
            <span class="value">{{ sessionData.candidate_info?.name || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">应聘岗位：</span>
            <span class="value">{{ sessionData.candidate_info?.position_title || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">面试时长：</span>
            <span class="value">{{ formatDuration(sessionData.duration_seconds) }}</span>
          </div>
          <div class="info-item">
            <span class="label">开始时间：</span>
            <span class="value">{{ formatDateTime(sessionData.start_time) }}</span>
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
        
        <!-- 发言占比进度条 -->
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
          <div class="ratio-row">
            <span class="ratio-label">发言占比（按字数）</span>
            <div class="ratio-bars">
              <div class="ratio-bar candidate" :style="{ width: getSpeakingRatioByChars.candidate + '%' }">
                候选人 {{ getSpeakingRatioByChars.candidate }}%
              </div>
              <div class="ratio-bar interviewer" :style="{ width: getSpeakingRatioByChars.interviewer + '%' }">
                面试官 {{ getSpeakingRatioByChars.interviewer }}%
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 心理分析概览 -->
      <div v-if="getBigFiveAverage || sessionData.statistics?.depression_average" class="section-card psychological-card">
        <h3><el-icon><TrendCharts /></el-icon> 心理分析概览</h3>
        <div class="psychological-grid">
          <!-- 大五人格雷达图 -->
          <div class="big-five-section">
            <div class="sub-title">大五人格平均值</div>
            <BigFiveRadarChart 
              v-if="getBigFiveAverage"
              :data="getBigFiveAverage" 
              height="200px"
              color="#667eea"
            />
            <div v-else class="no-data">暂无数据</div>
          </div>
          
          <!-- 抑郁风险指示器 -->
          <div class="depression-section">
            <div class="sub-title">抑郁风险评估</div>
            <div class="depression-indicator">
              <div class="depression-gauge">
                <div class="gauge-track">
                  <div class="gauge-fill" :style="{ width: getDepressionPercent + '%' }"></div>
                </div>
                <div class="gauge-labels">
                  <span>低风险</span>
                  <span>中风险</span>
                  <span>高风险</span>
                </div>
              </div>
              <div class="depression-result">
                <div class="depression-score">{{ getDepressionScore.toFixed(1) }}</div>
                <el-tag :type="getDepressionTagType(getDepressionLevel)" size="large">
                  {{ getRiskLevelText(getDepressionLevel) }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 面试时间轴 -->
      <div class="section-card timeline-card">
        <h3><el-icon><Clock /></el-icon> 面试时间轴</h3>
        
        <div v-if="sessionData.conversation_history?.length" class="timeline-container">
          <div 
            v-for="(item, index) in sessionData.conversation_history" 
            :key="index"
            class="timeline-item"
            :class="{ 'is-candidate': item.speaker === 'candidate' }"
          >
            <!-- 时间轴线 -->
            <div class="timeline-line">
              <div class="timeline-dot" :class="item.speaker"></div>
            </div>
            
            <!-- 内容区 -->
            <div class="timeline-content">
              <!-- 发言头部 -->
              <div class="content-header">
                <span class="speaker-tag" :class="item.speaker">
                  {{ item.speaker === 'interviewer' ? '面试官' : '候选人' }}
                </span>
                <span class="timestamp">{{ formatTime(item.timestamp) }}</span>
              </div>
              
              <!-- 发言内容 -->
              <div class="content-text">{{ item.text }}</div>
              
              <!-- 心理评分指标（仅候选人发言显示） -->
              <div v-if="item.speaker === 'candidate' && item.candidate_scores" class="scores-panel">
                <!-- 大五人格 -->
                <div v-if="item.candidate_scores.big_five" class="score-group big-five">
                  <div class="group-title">大五人格</div>
                  <div class="mini-bars">
                    <div class="mini-bar-item" title="开放性">
                      <span class="bar-label">开</span>
                      <div class="bar-track">
                        <div class="bar-fill" :style="{ width: (item.candidate_scores.big_five.openness * 100) + '%' }"></div>
                      </div>
                      <span class="bar-value">{{ (item.candidate_scores.big_five.openness * 100).toFixed(0) }}</span>
                    </div>
                    <div class="mini-bar-item" title="尽责性">
                      <span class="bar-label">责</span>
                      <div class="bar-track">
                        <div class="bar-fill" :style="{ width: (item.candidate_scores.big_five.conscientiousness * 100) + '%' }"></div>
                      </div>
                      <span class="bar-value">{{ (item.candidate_scores.big_five.conscientiousness * 100).toFixed(0) }}</span>
                    </div>
                    <div class="mini-bar-item" title="外向性">
                      <span class="bar-label">外</span>
                      <div class="bar-track">
                        <div class="bar-fill" :style="{ width: (item.candidate_scores.big_five.extraversion * 100) + '%' }"></div>
                      </div>
                      <span class="bar-value">{{ (item.candidate_scores.big_five.extraversion * 100).toFixed(0) }}</span>
                    </div>
                    <div class="mini-bar-item" title="宜人性">
                      <span class="bar-label">宜</span>
                      <div class="bar-track">
                        <div class="bar-fill" :style="{ width: (item.candidate_scores.big_five.agreeableness * 100) + '%' }"></div>
                      </div>
                      <span class="bar-value">{{ (item.candidate_scores.big_five.agreeableness * 100).toFixed(0) }}</span>
                    </div>
                    <div class="mini-bar-item neuroticism" title="神经质">
                      <span class="bar-label">神</span>
                      <div class="bar-track">
                        <div class="bar-fill warning" :style="{ width: (item.candidate_scores.big_five.neuroticism * 100) + '%' }"></div>
                      </div>
                      <span class="bar-value">{{ (item.candidate_scores.big_five.neuroticism * 100).toFixed(0) }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- 欺骗检测 -->
                <div v-if="item.candidate_scores.deception" class="score-group deception">
                  <div class="group-title">欺骗检测</div>
                  <div class="score-indicator" :class="getDeceptionClass(item.candidate_scores.deception.score)">
                    <span class="score-value">{{ (item.candidate_scores.deception.score * 100).toFixed(0) }}%</span>
                    <span class="confidence">(置信度: {{ (item.candidate_scores.deception.confidence * 100).toFixed(0) }}%)</span>
                  </div>
                </div>
                
                <!-- 抑郁风险 -->
                <div v-if="item.candidate_scores.depression" class="score-group depression">
                  <div class="group-title">抑郁风险</div>
                  <div class="score-indicator">
                    <el-tag size="small" :type="getDepressionTagType(item.candidate_scores.depression.level)">
                      {{ getRiskLevelText(item.candidate_scores.depression.level) }}
                    </el-tag>
                    <span class="score-num">{{ item.candidate_scores.depression.score.toFixed(0) }}/100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <el-empty v-else description="暂无对话记录" class="empty-timeline" />
      </div>
    </div>
    
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Loading, User, DataAnalysis, Clock, TrendCharts } from '@element-plus/icons-vue'
import BigFiveRadarChart from '@/components/common/BigFiveRadarChart.vue'

interface CandidateScores {
  big_five?: {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    neuroticism: number
  }
  deception?: {
    score: number
    confidence: number
  }
  depression?: {
    score: number
    level: 'low' | 'medium' | 'high'
    confidence: number
  }
}

interface ConversationHistoryItem {
  speaker: 'interviewer' | 'candidate'
  text: string
  timestamp: string
  candidate_scores?: CandidateScores | null
}

interface ImmersiveSessionData {
  session_id: string
  duration_seconds: number
  start_time: string
  end_time?: string
  candidate_info?: {
    name: string
    position_title: string
  }
  statistics?: {
    total_utterances?: number
    interviewer_utterances?: number
    candidate_utterances?: number
    interviewer_ratio?: number
    candidate_ratio?: number
    utterance_count?: { total: number; interviewer: number; candidate: number }
    char_count?: { total: number; interviewer: number; candidate: number }
    speaking_ratio?: {
      by_count: { interviewer: number; candidate: number }
      by_chars: { interviewer: number; candidate: number }
    }
    big_five_average?: {
      openness: number
      conscientiousness: number
      extraversion: number
      agreeableness: number
      neuroticism: number
    }
    depression_average?: {
      score: number
      level: 'low' | 'medium' | 'high'
    }
  }
  conversation_history?: ConversationHistoryItem[]
}

interface Props {
  modelValue: boolean
  sessionData?: ImmersiveSessionData | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  sessionData: null,
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

// 格式化时间（仅时分秒）
const formatTime = (dateString: string): string => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('zh-CN')
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  emit('close')
}

// 兼容新旧API的统计数据计算属性
const getUtteranceTotal = computed(() => {
  if (!props.sessionData?.statistics) return 0
  return props.sessionData.statistics.utterance_count?.total 
    ?? props.sessionData.statistics.total_utterances 
    ?? 0
})

const getUtteranceCandidate = computed(() => {
  if (!props.sessionData?.statistics) return 0
  return props.sessionData.statistics.utterance_count?.candidate 
    ?? props.sessionData.statistics.candidate_utterances 
    ?? 0
})

const getUtteranceInterviewer = computed(() => {
  if (!props.sessionData?.statistics) return 0
  return props.sessionData.statistics.utterance_count?.interviewer 
    ?? props.sessionData.statistics.interviewer_utterances 
    ?? 0
})

const getCharTotal = computed(() => {
  if (!props.sessionData?.statistics?.char_count) return '-'
  return props.sessionData.statistics.char_count.total.toLocaleString()
})

const getSpeakingRatioByCount = computed(() => {
  if (!props.sessionData?.statistics) return { candidate: 50, interviewer: 50 }
  if (props.sessionData.statistics.speaking_ratio?.by_count) {
    return {
      candidate: Math.round(props.sessionData.statistics.speaking_ratio.by_count.candidate * 100),
      interviewer: Math.round(props.sessionData.statistics.speaking_ratio.by_count.interviewer * 100)
    }
  }
  const candidateRatio = props.sessionData.statistics.candidate_ratio ?? 0.5
  return {
    candidate: Math.round(candidateRatio * 100),
    interviewer: Math.round((1 - candidateRatio) * 100)
  }
})

const getSpeakingRatioByChars = computed(() => {
  if (!props.sessionData?.statistics?.speaking_ratio?.by_chars) {
    return getSpeakingRatioByCount.value
  }
  return {
    candidate: Math.round(props.sessionData.statistics.speaking_ratio.by_chars.candidate * 100),
    interviewer: Math.round(props.sessionData.statistics.speaking_ratio.by_chars.interviewer * 100)
  }
})

const getBigFiveAverage = computed(() => {
  return props.sessionData?.statistics?.big_five_average ?? null
})

const getDepressionScore = computed(() => {
  return props.sessionData?.statistics?.depression_average?.score ?? 0
})

const getDepressionLevel = computed(() => {
  return props.sessionData?.statistics?.depression_average?.level ?? 'low'
})

const getDepressionPercent = computed(() => {
  return Math.min(100, Math.max(0, getDepressionScore.value))
})

const getRiskLevelText = (level: string): string => {
  switch (level) {
    case 'low': return '低风险'
    case 'medium': return '中等风险'
    case 'high': return '高风险'
    default: return '未知'
  }
}

const getDepressionTagType = (level: string): 'success' | 'warning' | 'danger' | 'info' => {
  switch (level) {
    case 'low': return 'success'
    case 'medium': return 'warning'
    case 'high': return 'danger'
    default: return 'info'
  }
}

const getDeceptionClass = (score: number): string => {
  if (score < 0.3) return 'level-low'
  if (score < 0.6) return 'level-medium'
  return 'level-high'
}
</script>

<style scoped lang="scss">
.immersive-records-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
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

.records-content {
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
      margin-bottom: 12px;
      &:last-child { margin-bottom: 0; }
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
  .psychological-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .sub-title { font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 12px; text-align: center; }
  .big-five-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    .no-data { color: #9ca3af; font-size: 13px; padding: 40px 0; }
  }
  .depression-section {
    .depression-indicator { display: flex; flex-direction: column; gap: 16px; }
    .depression-gauge {
      .gauge-track {
        height: 12px;
        background: linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%);
        border-radius: 6px;
        position: relative;
      }
      .gauge-fill {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        background: rgba(255, 255, 255, 0.6);
        border-right: 3px solid #1f2937;
      }
      .gauge-labels { display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px; color: #9ca3af; }
    }
    .depression-result {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      .depression-score { font-size: 32px; font-weight: 700; color: #1f2937; }
    }
  }
}

.timeline-card {
  .timeline-container {
    max-height: 400px;
    overflow-y: auto;
    padding-right: 8px;
  }
  
  .timeline-item {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    &:last-child { margin-bottom: 0; }
  }
  
  .timeline-line {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 20px;
    flex-shrink: 0;
    
    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #9ca3af;
      &.interviewer { background: #3b82f6; }
      &.candidate { background: #10b981; }
    }
    
    &::after {
      content: '';
      flex: 1;
      width: 2px;
      background: #e5e7eb;
      margin-top: 4px;
    }
  }
  
  .timeline-item:last-child .timeline-line::after { display: none; }
  
  .timeline-content {
    flex: 1;
    background: #f9fafb;
    border-radius: 8px;
    padding: 12px;
    
    .content-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      
      .speaker-tag {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        &.interviewer { background: #dbeafe; color: #1d4ed8; }
        &.candidate { background: #d1fae5; color: #047857; }
      }
      
      .timestamp { color: #9ca3af; font-size: 12px; }
    }
    
    .content-text { color: #374151; line-height: 1.6; font-size: 14px; }
  }
  
  .scores-panel {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e5e7eb;
    flex-wrap: wrap;
    
    .score-group {
      flex: 1;
      min-width: 150px;
      .group-title { font-size: 11px; color: #9ca3af; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    }
    
    .big-five {
      min-width: 200px;
      .mini-bars { display: flex; flex-direction: column; gap: 4px; }
      .mini-bar-item {
        display: flex;
        align-items: center;
        gap: 6px;
        .bar-label { width: 14px; font-size: 10px; color: #6b7280; text-align: center; }
        .bar-track { flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
        .bar-fill { height: 100%; background: #3b82f6; border-radius: 3px; &.warning { background: #f59e0b; } }
        .bar-value { width: 24px; font-size: 10px; color: #6b7280; text-align: right; }
      }
    }
    
    .deception .score-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      .score-value { font-weight: 600; font-size: 16px; }
      .confidence { font-size: 11px; color: #9ca3af; }
      &.level-low .score-value { color: #10b981; }
      &.level-medium .score-value { color: #f59e0b; }
      &.level-high .score-value { color: #ef4444; }
    }
    
    .depression .score-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      .score-num { font-size: 12px; color: #6b7280; }
    }
  }
  
  .empty-timeline { padding: 20px 0; }
}
</style>
