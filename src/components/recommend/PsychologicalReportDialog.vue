<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="900px"
    class="psychological-report-dialog"
    destroy-on-close
    @close="handleClose"
  >
    <!-- 加载状态 -->
    <div v-if="loading || isGenerating" class="loading-container">
      <el-icon class="is-loading" :size="40" color="#409eff"><Loading /></el-icon>
      <p>{{ isGenerating ? '正在生成心理分析报告，预计需要 10-30 秒...' : '加载中...' }}</p>
    </div>
    
    <!-- 无数据状态 -->
    <div v-else-if="!reportData" class="empty-container">
      <el-empty description="暂无心理分析报告">
        <el-button type="primary" @click="handleGenerate" :loading="isGenerating">
          生成心理分析报告
        </el-button>
      </el-empty>
    </div>
    
    <!-- 报告内容 -->
    <div v-else class="report-content">
      <!-- 综合评分卡片 -->
      <div class="section-card score-card">
        <div class="score-circle" :class="overallRiskClass">
          <span class="score-value">{{ reportData.overall_score?.toFixed(0) || 0 }}</span>
          <span class="score-label">/100</span>
        </div>
        <div class="score-info">
          <h3>心理健康综合评分</h3>
          <div class="risk-badge" :class="overallRiskClass">
            {{ getRiskIcon(reportData.risk_level) }} {{ getRiskLabel(reportData.risk_level) }}
          </div>
          <p class="summary-text">{{ reportData.overall_summary }}</p>
        </div>
      </div>
      
      <!-- 大五人格分析 -->
      <div class="section-card big-five-card">
        <h3><span class="section-icon">🧠</span> 大五人格分析</h3>
        <div class="big-five-content">
          <div class="radar-chart-container">
            <BigFiveRadarChart 
              v-if="reportData.big_five_scores"
              :data="reportData.big_five_scores" 
              height="220px"
              color="#667eea"
            />
          </div>
          <div class="big-five-details">
            <div v-if="reportData.big_five_analysis?.personality_type" class="detail-item">
              <span class="detail-label">人格类型：</span>
              <el-tag type="primary">{{ reportData.big_five_analysis.personality_type }}</el-tag>
            </div>
            <div v-if="reportData.big_five_analysis?.strengths?.length" class="detail-item">
              <span class="detail-label">性格优势：</span>
              <div class="tags-container">
                <el-tag v-for="s in reportData.big_five_analysis.strengths" :key="s" type="success" size="small">{{ s }}</el-tag>
              </div>
            </div>
            <div v-if="reportData.big_five_analysis?.potential_concerns?.length" class="detail-item">
              <span class="detail-label">潜在关注：</span>
              <div class="tags-container">
                <el-tag v-for="c in reportData.big_five_analysis.potential_concerns" :key="c" type="warning" size="small">{{ c }}</el-tag>
              </div>
            </div>
            <div v-if="reportData.big_five_analysis?.work_style" class="detail-item">
              <span class="detail-label">工作风格：</span>
              <span class="detail-value">{{ reportData.big_five_analysis.work_style }}</span>
            </div>
            <div v-if="reportData.big_five_analysis?.team_fit" class="detail-item">
              <span class="detail-label">团队适配：</span>
              <span class="detail-value">{{ reportData.big_five_analysis.team_fit }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 可信度评估 -->
      <div class="section-card credibility-card">
        <h3><span class="section-icon">🎯</span> 可信度评估</h3>
        <div class="credibility-content">
          <div class="credibility-gauge">
            <el-progress 
              type="dashboard" 
              :percentage="credibilityPercent"
              :color="getCredibilityColor"
              :stroke-width="12"
              :width="120"
            >
              <template #default>
                <div class="gauge-content">
                  <span class="gauge-value">{{ credibilityPercent }}%</span>
                  <span class="gauge-label">可信度</span>
                </div>
              </template>
            </el-progress>
          </div>
          <div class="credibility-details">
            <div class="credibility-level" :class="credibilityLevelClass">
              {{ getCredibilityLevelIcon(reportData.deception_analysis?.credibility_level) }}
              {{ getCredibilityLevelLabel(reportData.deception_analysis?.credibility_level) }}
            </div>
            <p class="credibility-summary">{{ reportData.deception_analysis?.analysis_summary }}</p>
            <div v-if="reportData.deception_analysis?.suspicious_responses?.length" class="suspicious-responses">
              <span class="warning-label">⚠️ 可疑回答：</span>
              <ul>
                <li v-for="(resp, idx) in reportData.deception_analysis.suspicious_responses" :key="idx">
                  {{ resp }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 抑郁风险评估 -->
      <div class="section-card depression-card">
        <h3><span class="section-icon">💚</span> 心理健康风险评估</h3>
        <div class="depression-content">
          <div class="depression-indicator">
            <div class="indicator-track">
              <div class="indicator-zones">
                <div class="zone low">低风险</div>
                <div class="zone medium">中风险</div>
                <div class="zone high">高风险</div>
              </div>
              <div class="indicator-marker" :style="{ left: depressionMarkerPosition + '%' }">
                <span class="marker-value">{{ reportData.depression_score?.toFixed(1) || 0 }}</span>
              </div>
            </div>
          </div>
          <div class="depression-details">
            <div class="depression-level" :class="depressionLevelClass">
              {{ getDepressionIcon(reportData.depression_level) }}
              {{ getDepressionLabel(reportData.depression_level) }}
            </div>
            <div v-if="reportData.depression_analysis?.trend" class="trend-info">
              趋势：{{ getTrendLabel(reportData.depression_analysis.trend) }}
            </div>
            <p class="depression-interpretation">{{ reportData.depression_analysis?.interpretation }}</p>
          </div>
        </div>
      </div>
      
      <!-- 发言模式分析 -->
      <div v-if="reportData.speech_pattern_analysis" class="section-card speech-card">
        <h3><span class="section-icon">💬</span> 发言模式分析</h3>
        <div class="speech-content">
          <div class="speech-stats">
            <div class="stat-item">
              <div class="stat-value">{{ (reportData.speech_pattern_analysis.speaking_ratio * 100).toFixed(0) }}%</div>
              <div class="stat-label">发言占比</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ reportData.speech_pattern_analysis.total_chars }}</div>
              <div class="stat-label">总字数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ reportData.speech_pattern_analysis.avg_response_length?.toFixed(0) }}</div>
              <div class="stat-label">平均回答长度</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ reportData.speech_pattern_analysis.response_count }}</div>
              <div class="stat-label">回答次数</div>
            </div>
          </div>
          <div class="speech-analysis">
            <div v-if="reportData.speech_pattern_analysis.communication_style" class="analysis-item">
              <span class="analysis-label">沟通风格：</span>
              <span>{{ reportData.speech_pattern_analysis.communication_style }}</span>
            </div>
            <div v-if="reportData.speech_pattern_analysis.fluency_assessment" class="analysis-item">
              <span class="analysis-label">流畅度：</span>
              <span>{{ reportData.speech_pattern_analysis.fluency_assessment }}</span>
            </div>
            <div v-if="reportData.speech_pattern_analysis.confidence_level" class="analysis-item">
              <span class="analysis-label">自信程度：</span>
              <el-tag :type="getConfidenceTagType(reportData.speech_pattern_analysis.confidence_level)" size="small">
                {{ getConfidenceLabel(reportData.speech_pattern_analysis.confidence_level) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 建议列表 -->
      <div v-if="reportData.recommendations?.length" class="section-card recommendations-card">
        <h3><span class="section-icon">💡</span> 评估建议</h3>
        <ul class="recommendations-list">
          <li v-for="(rec, idx) in reportData.recommendations" :key="idx">
            {{ rec }}
          </li>
        </ul>
      </div>
      
      <!-- 完整报告（Markdown） -->
      <div v-if="reportData.report_markdown" class="section-card markdown-card">
        <div class="markdown-header">
          <h3><span class="section-icon">📋</span> 完整分析报告</h3>
          <el-button size="small" text type="primary" @click="toggleMarkdownExpand">
            {{ isMarkdownExpanded ? '收起' : '展开' }}
          </el-button>
        </div>
        <transition name="expand">
          <div v-if="isMarkdownExpanded" class="markdown-content" v-html="renderedMarkdown"></div>
        </transition>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="reportData" type="warning" plain @click="handleGenerate" :loading="isGenerating">
          <el-icon><Refresh /></el-icon>
          重新生成
        </el-button>
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Loading, Refresh } from '@element-plus/icons-vue'
import { marked } from 'marked'
import BigFiveRadarChart from '@/components/common/BigFiveRadarChart.vue'

interface BigFiveScores {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

interface BigFiveAnalysis {
  scores?: BigFiveScores
  personality_type?: string
  strengths?: string[]
  potential_concerns?: string[]
  work_style?: string
  team_fit?: string
}

interface DeceptionAnalysis {
  overall_score?: number
  credibility_level?: string
  suspicious_responses?: string[]
  analysis_summary?: string
}

interface DepressionAnalysis {
  average_score?: number
  risk_level?: string
  trend?: string
  high_risk_moments?: string[]
  interpretation?: string
}

interface SpeechPatternAnalysis {
  speaking_ratio: number
  total_chars: number
  avg_response_length: number
  response_count: number
  communication_style?: string
  fluency_assessment?: string
  confidence_level?: string
}

interface PsychologicalReportData {
  id: string
  session_id: string
  application_id: string
  big_five_scores?: BigFiveScores
  big_five_analysis?: BigFiveAnalysis
  deception_score?: number
  deception_analysis?: DeceptionAnalysis
  depression_score?: number
  depression_level?: string
  depression_analysis?: DepressionAnalysis
  speech_pattern_analysis?: SpeechPatternAnalysis
  overall_score?: number
  risk_level?: string
  overall_summary?: string
  recommendations?: string[]
  report_markdown?: string
  created_at?: string
  updated_at?: string
}

interface Props {
  modelValue: boolean
  reportData?: PsychologicalReportData | null
  loading?: boolean
  isGenerating?: boolean
  candidateName?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  reportData: null,
  loading: false,
  isGenerating: false,
  candidateName: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'generate'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const dialogTitle = computed(() => {
  return props.candidateName ? `心理分析报告 - ${props.candidateName}` : '心理分析报告'
})

const isMarkdownExpanded = ref(false)

const toggleMarkdownExpand = () => {
  isMarkdownExpanded.value = !isMarkdownExpanded.value
}

// 渲染Markdown
const renderedMarkdown = computed(() => {
  if (!props.reportData?.report_markdown) return ''
  return marked(props.reportData.report_markdown)
})

// 综合风险等级样式
const overallRiskClass = computed(() => {
  const level = props.reportData?.risk_level
  if (level === 'low') return 'risk-low'
  if (level === 'medium') return 'risk-medium'
  if (level === 'high') return 'risk-high'
  return ''
})

// 可信度百分比
const credibilityPercent = computed(() => {
  const score = props.reportData?.deception_score ?? 0
  return Math.round((1 - score) * 100)
})

// 可信度颜色
const getCredibilityColor = computed(() => {
  const percent = credibilityPercent.value
  if (percent >= 70) return '#10b981'
  if (percent >= 40) return '#f59e0b'
  return '#ef4444'
})

// 可信度等级样式
const credibilityLevelClass = computed(() => {
  const level = props.reportData?.deception_analysis?.credibility_level
  if (level === 'high') return 'level-high'
  if (level === 'medium') return 'level-medium'
  return 'level-low'
})

// 抑郁风险等级样式
const depressionLevelClass = computed(() => {
  const level = props.reportData?.depression_level
  if (level === 'low') return 'level-low'
  if (level === 'medium') return 'level-medium'
  return 'level-high'
})

// 抑郁指示器位置
const depressionMarkerPosition = computed(() => {
  const score = props.reportData?.depression_score ?? 0
  return Math.min(100, Math.max(0, score))
})

// 辅助函数
const getRiskIcon = (level?: string) => {
  if (level === 'low') return '🟢'
  if (level === 'medium') return '🟡'
  if (level === 'high') return '🔴'
  return '⚪'
}

const getRiskLabel = (level?: string) => {
  if (level === 'low') return '低风险'
  if (level === 'medium') return '中等风险'
  if (level === 'high') return '高风险'
  return '未知'
}

const getCredibilityLevelIcon = (level?: string) => {
  if (level === 'high') return '✅'
  if (level === 'medium') return '⚠️'
  return '❌'
}

const getCredibilityLevelLabel = (level?: string) => {
  if (level === 'high') return '高可信度'
  if (level === 'medium') return '中等可信度'
  if (level === 'low') return '低可信度'
  return '未知'
}

const getDepressionIcon = (level?: string) => {
  if (level === 'low') return '🟢'
  if (level === 'medium') return '🟡'
  if (level === 'high') return '🔴'
  return '⚪'
}

const getDepressionLabel = (level?: string) => {
  if (level === 'low') return '低风险'
  if (level === 'medium') return '中等风险'
  if (level === 'high') return '高风险'
  return '未知'
}

const getTrendLabel = (trend?: string) => {
  if (trend === 'stable') return '稳定'
  if (trend === 'increasing') return '上升'
  if (trend === 'decreasing') return '下降'
  return '未知'
}

const getConfidenceTagType = (level?: string): 'success' | 'warning' | 'danger' => {
  if (level === 'high') return 'success'
  if (level === 'medium') return 'warning'
  return 'danger'
}

const getConfidenceLabel = (level?: string) => {
  if (level === 'high') return '高自信'
  if (level === 'medium') return '中等自信'
  if (level === 'low') return '低自信'
  return '未知'
}

const handleClose = () => {
  visible.value = false
  emit('close')
}

const handleGenerate = () => {
  emit('generate')
}
</script>

<style scoped lang="scss">
.psychological-report-dialog {
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
  padding: 60px 0;
  
  p {
    margin: 16px 0 0;
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
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  
  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 8px;
    
    .section-icon { font-size: 18px; }
  }
}

// 综合评分卡片
.score-card {
  display: flex;
  gap: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  
  .score-circle {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    
    &.risk-low { border: 4px solid #10b981; }
    &.risk-medium { border: 4px solid #f59e0b; }
    &.risk-high { border: 4px solid #ef4444; }
    
    .score-value { font-size: 28px; font-weight: 700; color: #1f2937; }
    .score-label { font-size: 12px; color: #6b7280; }
  }
  
  .score-info {
    flex: 1;
    
    h3 { margin-bottom: 8px; }
    
    .risk-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 12px;
      
      &.risk-low { background: #d1fae5; color: #065f46; }
      &.risk-medium { background: #fef3c7; color: #92400e; }
      &.risk-high { background: #fee2e2; color: #991b1b; }
    }
    
    .summary-text {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.6;
      margin: 0;
    }
  }
}

// 大五人格卡片
.big-five-content {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  
  .radar-chart-container {
    display: flex;
    justify-content: center;
    align-items: center;
    background: white;
    border-radius: 8px;
    padding: 12px;
  }
  
  .big-five-details {
    display: flex;
    flex-direction: column;
    gap: 12px;
    
    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      
      .detail-label {
        color: #6b7280;
        font-size: 13px;
        min-width: 70px;
      }
      
      .detail-value {
        color: #1f2937;
        font-size: 13px;
      }
      
      .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
    }
  }
}

// 可信度卡片
.credibility-content {
  display: flex;
  gap: 24px;
  align-items: center;
  
  .credibility-gauge {
    .gauge-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      .gauge-value { font-size: 20px; font-weight: 600; color: #1f2937; }
      .gauge-label { font-size: 12px; color: #6b7280; }
    }
  }
  
  .credibility-details {
    flex: 1;
    
    .credibility-level {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      
      &.level-high { color: #10b981; }
      &.level-medium { color: #f59e0b; }
      &.level-low { color: #ef4444; }
    }
    
    .credibility-summary {
      font-size: 14px;
      color: #4b5563;
      margin: 0 0 8px 0;
    }
    
    .suspicious-responses {
      background: #fef3c7;
      border-radius: 6px;
      padding: 12px;
      
      .warning-label { font-weight: 500; color: #92400e; }
      
      ul {
        margin: 8px 0 0;
        padding-left: 20px;
        color: #78350f;
        font-size: 13px;
      }
    }
  }
}

// 抑郁风险卡片
.depression-content {
  .depression-indicator {
    margin-bottom: 16px;
    
    .indicator-track {
      position: relative;
      height: 40px;
      
      .indicator-zones {
        display: flex;
        height: 24px;
        border-radius: 4px;
        overflow: hidden;
        
        .zone {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 500;
          color: white;
          
          &.low { background: linear-gradient(90deg, #10b981, #34d399); }
          &.medium { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
          &.high { background: linear-gradient(90deg, #ef4444, #f87171); }
        }
      }
      
      .indicator-marker {
        position: absolute;
        top: 28px;
        transform: translateX(-50%);
        
        .marker-value {
          display: block;
          background: #1f2937;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          
          &::before {
            content: '';
            position: absolute;
            top: -4px;
            left: 50%;
            transform: translateX(-50%);
            border: 4px solid transparent;
            border-bottom-color: #1f2937;
          }
        }
      }
    }
  }
  
  .depression-details {
    .depression-level {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      
      &.level-low { color: #10b981; }
      &.level-medium { color: #f59e0b; }
      &.level-high { color: #ef4444; }
    }
    
    .trend-info {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .depression-interpretation {
      font-size: 14px;
      color: #4b5563;
      margin: 0;
    }
  }
}

// 发言模式卡片
.speech-content {
  .speech-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 16px;
    
    .stat-item {
      text-align: center;
      background: white;
      padding: 12px;
      border-radius: 8px;
      
      .stat-value { font-size: 20px; font-weight: 600; color: #3b82f6; }
      .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    }
  }
  
  .speech-analysis {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .analysis-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      
      .analysis-label { color: #6b7280; min-width: 70px; }
    }
  }
}

// 建议列表卡片
.recommendations-card {
  .recommendations-list {
    margin: 0;
    padding-left: 20px;
    
    li {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.8;
      
      &::marker { color: #3b82f6; }
    }
  }
}

// Markdown卡片
.markdown-card {
  .markdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0;
    
    h3 { margin-bottom: 0; }
  }
  
  .markdown-content {
    margin-top: 16px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.8;
    
    :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
      margin-top: 16px;
      margin-bottom: 8px;
      color: #1f2937;
    }
    
    :deep(p) { margin: 8px 0; color: #4b5563; }
    :deep(ul), :deep(ol) { padding-left: 20px; }
    :deep(li) { margin: 4px 0; }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 展开动画
.expand-enter-active, .expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>
