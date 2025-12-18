<template>
  <div class="realtime-analysis-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <el-icon class="title-icon"><DataAnalysis /></el-icon>
        <span>实时分析</span>
      </div>
      <div class="header-actions">
        <el-tag :type="isAnalyzing ? 'success' : 'info'" size="small" effect="plain">
          {{ isAnalyzing ? '分析中' : '待机' }}
        </el-tag>
      </div>
    </div>

    <!-- 当前状态概览 -->
    <div class="state-overview" v-if="currentState">
      <div class="overview-grid">
        <div class="state-card emotion-card">
          <div class="card-icon" :class="emotionColorClass">
            {{ emotionEmoji }}
          </div>
          <div class="card-content">
            <span class="card-label">情绪状态</span>
            <span class="card-value">{{ emotionLabel }}</span>
          </div>
        </div>
        
        <div class="state-card">
          <div class="card-icon engagement">📊</div>
          <div class="card-content">
            <span class="card-label">参与度</span>
            <span class="card-value">{{ formatPercent(currentState.engagement) }}</span>
          </div>
          <div class="mini-progress">
            <div class="progress-fill" :style="{ width: `${currentState.engagement * 100}%` }"></div>
          </div>
        </div>
        
        <div class="state-card">
          <div class="card-icon confidence">💪</div>
          <div class="card-content">
            <span class="card-label">自信程度</span>
            <span class="card-value">{{ formatPercent(currentState.confidence_level) }}</span>
          </div>
          <div class="mini-progress">
            <div class="progress-fill confidence" :style="{ width: `${currentState.confidence_level * 100}%` }"></div>
          </div>
        </div>
        
        <div class="state-card">
          <div class="card-icon nervousness">😰</div>
          <div class="card-content">
            <span class="card-label">紧张程度</span>
            <span class="card-value">{{ formatPercent(currentState.nervousness) }}</span>
          </div>
          <div class="mini-progress warning">
            <div class="progress-fill" :style="{ width: `${currentState.nervousness * 100}%` }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详细指标 -->
    <div class="metrics-section">
      <h4 class="section-title">行为指标</h4>
      <div class="metrics-list">
        <div class="metric-item">
          <span class="metric-icon">👁️</span>
          <span class="metric-label">眼神接触</span>
          <div class="metric-bar-container">
            <div class="metric-bar" :style="{ width: `${(currentState?.eye_contact || 0) * 100}%` }"></div>
          </div>
          <span class="metric-value">{{ formatPercent(currentState?.eye_contact || 0) }}</span>
        </div>
        
        <div class="metric-item">
          <span class="metric-icon">🧍</span>
          <span class="metric-label">姿态评分</span>
          <div class="metric-bar-container">
            <div class="metric-bar" :style="{ width: `${(currentState?.posture_score || 0) * 100}%` }"></div>
          </div>
          <span class="metric-value">{{ formatPercent(currentState?.posture_score || 0) }}</span>
        </div>
        
        <div class="metric-item">
          <span class="metric-icon">🗣️</span>
          <span class="metric-label">语言清晰度</span>
          <div class="metric-bar-container">
            <div class="metric-bar" :style="{ width: `${(currentState?.speech_clarity || 0) * 100}%` }"></div>
          </div>
          <span class="metric-value">{{ formatPercent(currentState?.speech_clarity || 0) }}</span>
        </div>
        
        <div class="metric-item">
          <span class="metric-icon">⏱️</span>
          <span class="metric-label">语速</span>
          <div class="speech-pace">
            <span 
              v-for="pace in ['slow', 'normal', 'fast']"
              :key="pace"
              class="pace-option"
              :class="{ active: currentState?.speech_pace === pace }"
            >
              {{ paceLabels[pace] }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 说话比例 -->
    <div class="speak-ratio-section">
      <h4 class="section-title">对话比例</h4>
      <div class="ratio-bar">
        <div 
          class="ratio-segment interviewer" 
          :style="{ width: `${stats.interviewerRatio * 100}%` }"
        >
          <span v-if="stats.interviewerRatio > 0.15">面试官 {{ formatPercent(stats.interviewerRatio) }}</span>
        </div>
        <div 
          class="ratio-segment candidate" 
          :style="{ width: `${stats.candidateRatio * 100}%` }"
        >
          <span v-if="stats.candidateRatio > 0.15">候选人 {{ formatPercent(stats.candidateRatio) }}</span>
        </div>
      </div>
      <div class="ratio-legend">
        <div class="legend-item">
          <span class="legend-dot interviewer"></span>
          <span>面试官</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot candidate"></span>
          <span>候选人</span>
        </div>
      </div>
    </div>

    <!-- 统计摘要 -->
    <div class="stats-summary">
      <div class="stat-item">
        <span class="stat-value">{{ formatTime(stats.duration) }}</span>
        <span class="stat-label">面试时长</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ formatPercent(stats.avgEngagement) }}</span>
        <span class="stat-label">平均参与度</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ formatPercent(stats.avgConfidence) }}</span>
        <span class="stat-label">平均自信度</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DataAnalysis } from '@element-plus/icons-vue'
import type { CandidateState } from '@/composables/useImmersiveInterview'

interface Props {
  currentState?: CandidateState | null
  isAnalyzing?: boolean
  stats: {
    duration: number
    interviewerRatio: number
    candidateRatio: number
    avgEngagement: number
    avgConfidence: number
  }
}

const props = withDefaults(defineProps<Props>(), {
  currentState: null,
  isAnalyzing: false
})

const paceLabels: Record<string, string> = {
  slow: '较慢',
  normal: '正常',
  fast: '较快'
}

const emotionMap: Record<string, { label: string; emoji: string; color: string }> = {
  neutral: { label: '平静', emoji: '😐', color: 'neutral' },
  happy: { label: '愉悦', emoji: '😊', color: 'positive' },
  focused: { label: '专注', emoji: '🎯', color: 'positive' },
  thinking: { label: '思考', emoji: '🤔', color: 'neutral' },
  nervous: { label: '紧张', emoji: '😰', color: 'warning' },
  confident: { label: '自信', emoji: '💪', color: 'positive' }
}

const emotionLabel = computed(() => {
  const emotion = props.currentState?.emotion?.emotion || 'neutral'
  return emotionMap[emotion]?.label || '未知'
})

const emotionEmoji = computed(() => {
  const emotion = props.currentState?.emotion?.emotion || 'neutral'
  return emotionMap[emotion]?.emoji || '😐'
})

const emotionColorClass = computed(() => {
  const emotion = props.currentState?.emotion?.emotion || 'neutral'
  return `emotion-${emotionMap[emotion]?.color || 'neutral'}`
})

const formatPercent = (value: number) => {
  return `${Math.round(value * 100)}%`
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.realtime-analysis-panel {
  background: white;
  border-radius: 16px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.state-overview {
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

.state-card {
  padding: 14px;
  background: #f8fafc;
  border-radius: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  position: relative;
  
  .card-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    background: #e5e7eb;
    
    &.emotion-positive {
      background: linear-gradient(135deg, #10b981, #34d399);
    }
    
    &.emotion-neutral {
      background: linear-gradient(135deg, #6b7280, #9ca3af);
    }
    
    &.emotion-warning {
      background: linear-gradient(135deg, #f59e0b, #fbbf24);
    }
  }
  
  .card-content {
    flex: 1;
    min-width: 60px;
    
    .card-label {
      display: block;
      font-size: 11px;
      color: #6b7280;
    }
    
    .card-value {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a2e;
    }
  }
  
  .mini-progress {
    width: 100%;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 2px;
      transition: width 0.5s ease;
      
      &.confidence {
        background: linear-gradient(90deg, #10b981, #34d399);
      }
    }
    
    &.warning .progress-fill {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }
  }
}

.metrics-section {
  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 10px;
  
  .metric-icon {
    font-size: 16px;
  }
  
  .metric-label {
    font-size: 13px;
    color: #4b5563;
    min-width: 70px;
  }
  
  .metric-bar-container {
    flex: 1;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
    
    .metric-bar {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 3px;
      transition: width 0.5s ease;
    }
  }
  
  .metric-value {
    font-size: 12px;
    font-weight: 600;
    color: #1a1a2e;
    min-width: 36px;
    text-align: right;
  }
}

.speech-pace {
  display: flex;
  gap: 6px;
  
  .pace-option {
    padding: 4px 10px;
    font-size: 11px;
    border-radius: 12px;
    background: #e5e7eb;
    color: #6b7280;
    
    &.active {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }
  }
}

.speak-ratio-section {
  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.ratio-bar {
  display: flex;
  height: 28px;
  border-radius: 14px;
  overflow: hidden;
  background: #e5e7eb;
  
  .ratio-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.5s ease;
    
    span {
      font-size: 11px;
      font-weight: 600;
      color: white;
      white-space: nowrap;
    }
    
    &.interviewer {
      background: linear-gradient(90deg, #667eea, #764ba2);
    }
    
    &.candidate {
      background: linear-gradient(90deg, #10b981, #34d399);
    }
  }
}

.ratio-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #6b7280;
    
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      
      &.interviewer {
        background: #667eea;
      }
      
      &.candidate {
        background: #10b981;
      }
    }
  }
}

.stats-summary {
  display: flex;
  justify-content: space-around;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;
  
  .stat-item {
    text-align: center;
    
    .stat-value {
      display: block;
      font-size: 20px;
      font-weight: 700;
      color: #1a1a2e;
    }
    
    .stat-label {
      font-size: 11px;
      color: #6b7280;
    }
  }
}
</style>
