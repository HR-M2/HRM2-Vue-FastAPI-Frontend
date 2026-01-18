<template>
  <el-dialog
    v-model="visible"
    title="面试结果统计"
    width="900px"
    :close-on-click-modal="!loading"
    :close-on-press-escape="true"
    :show-close="true"
    class="interview-result-dialog"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <el-icon class="is-loading" :size="48" color="#409eff"><Loading /></el-icon>
      </div>
      <p>正在生成面试报告...</p>
      <el-button class="cancel-btn" @click="handleClose">退出面试界面</el-button>
    </div>
    
    <div v-else-if="error" class="error-container">
      <el-icon class="error-icon" color="#f56c6c" size="48"><CircleClose /></el-icon>
      <h3 class="error-title">面试报告生成失败</h3>
      <p class="error-message">{{ error }}</p>
      <div class="error-actions">
        <el-button type="primary" @click="handleClose">确定</el-button>
      </div>
    </div>
    
    <div v-else-if="resultData" class="result-content">
      <!-- 1. 基本信息 -->
      <div class="section-card basic-info-card">
        <h3><el-icon><User /></el-icon> 面试基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">候选人：</span>
            <span class="value">{{ resultData.candidate_info?.name || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">应聘岗位：</span>
            <span class="value">{{ resultData.candidate_info?.position_title || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">面试时长：</span>
            <span class="value">{{ formatDuration(resultData.duration_seconds) }}</span>
          </div>
          <div class="info-item">
            <span class="label">开始时间：</span>
            <span class="value">{{ formatDateTime(resultData.start_time) }}</span>
          </div>
        </div>
      </div>

      <!-- 2. 对话概要统计 -->
      <div class="section-card statistics-card">
        <h3><el-icon><DataAnalysis /></el-icon> 对话概要统计</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ resultData.statistics.total_utterances }}</div>
            <div class="stat-label">总发言数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ resultData.statistics.candidate_utterances }}</div>
            <div class="stat-label">候选人发言</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ resultData.statistics.interviewer_utterances }}</div>
            <div class="stat-label">面试官发言</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ (resultData.statistics.candidate_ratio * 100).toFixed(0) }}%</div>
            <div class="stat-label">候选人占比</div>
          </div>
        </div>
        
        <!-- 抑郁风险概览 -->
        <div class="depression-summary">
          <div class="depression-item">
            <span class="label">整体抑郁风险：</span>
            <el-tag :type="getDepressionTagType(resultData.statistics.overall_depression.final_level)">
              {{ getRiskLevelText(resultData.statistics.overall_depression.final_level) }}
            </el-tag>
            <span class="score">(平均评分: {{ resultData.statistics.overall_depression.avg_score.toFixed(1) }})</span>
          </div>
        </div>
      </div>

      <!-- 3. 面试时间轴 -->
      <div class="section-card timeline-card">
        <h3><el-icon><Clock /></el-icon> 面试时间轴</h3>
        
        <div v-if="resultData.conversation_history?.length" class="timeline-container">
          <div 
            v-for="(item, index) in resultData.conversation_history" 
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
                <div class="score-group big-five">
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
                <div class="score-group deception">
                  <div class="group-title">欺骗检测</div>
                  <div class="score-indicator" :class="getDeceptionClass(item.candidate_scores.deception.score)">
                    <span class="score-value">{{ (item.candidate_scores.deception.score * 100).toFixed(0) }}%</span>
                    <span class="confidence">(置信度: {{ (item.candidate_scores.deception.confidence * 100).toFixed(0) }}%)</span>
                  </div>
                </div>
                
                <!-- 抑郁风险 -->
                <div class="score-group depression">
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
        
        <div v-else class="empty-timeline">
          <el-empty description="暂无对话记录" :image-size="80" />
        </div>
      </div>
    </div>

    <template v-if="!loading" #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">退出面试界面</el-button>
        <el-button v-if="resultData" type="primary" @click="handleExport">导出报告</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleClose, Loading, User, DataAnalysis, Clock } from '@element-plus/icons-vue'
import type { CompleteSessionResponse } from '@/composables/useImmersiveInterview'

interface Props {
  modelValue: boolean
  resultData?: CompleteSessionResponse | null
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  resultData: null,
  loading: false,
  error: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'export-report'): void
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

// 获取风险等级文本
const getRiskLevelText = (level: string): string => {
  switch (level) {
    case 'low': return '低风险'
    case 'medium': return '中等风险'
    case 'high': return '高风险'
    default: return '未知'
  }
}

// 获取抑郁风险标签类型
const getDepressionTagType = (level: string): 'success' | 'warning' | 'danger' | 'info' => {
  switch (level) {
    case 'low': return 'success'
    case 'medium': return 'warning'
    case 'high': return 'danger'
    default: return 'info'
  }
}

// 获取欺骗检测样式类
const getDeceptionClass = (score: number): string => {
  if (score < 0.3) return 'level-low'
  if (score < 0.6) return 'level-medium'
  return 'level-high'
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  emit('close')
}

// 导出报告
const handleExport = () => {
  emit('export-report')
  ElMessage.success('报告导出功能开发中...')
}

</script>

<style scoped lang="scss">
.interview-result-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  
  .loading-spinner {
    margin-bottom: 16px;
    
    .is-loading {
      animation: rotating 2s linear infinite;
    }
  }
  
  p {
    margin: 0 0 20px 0;
    color: #666;
    font-size: 14px;
  }
  
  .cancel-btn {
    margin-top: 8px;
  }
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
  
  .error-icon { margin-bottom: 16px; }
  .error-title { margin: 0 0 12px 0; color: #f56c6c; font-size: 18px; font-weight: 600; }
  .error-message { margin: 0 0 24px 0; color: #666; line-height: 1.6; max-width: 400px; }
  .error-actions { display: flex; gap: 12px; }
}

.result-content {
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
}

.depression-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e5e7eb;
  
  .depression-item {
    display: flex;
    align-items: center;
    gap: 8px;
    .label { color: #6b7280; }
    .score { color: #9ca3af; font-size: 13px; }
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
        .bar-fill { height: 100%; background: #3b82f6; border-radius: 3px; transition: width 0.3s ease; &.warning { background: #f59e0b; } }
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>