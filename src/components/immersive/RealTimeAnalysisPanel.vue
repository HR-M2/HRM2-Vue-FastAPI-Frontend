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

    <!-- 综合评分卡片 -->
    <div class="overall-score-card">
      <div class="score-content">
        <div class="score-value">{{ cockpitData.overallScore }}</div>
        <div class="score-label">综合评分</div>
      </div>
      <div class="score-indicator">
        <div class="score-ring" :style="scoreRingStyle"></div>
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

    <!-- 欺骗检测 -->
    <div class="section-card" :class="{ 'warning-state': cockpitData.deceptionScore > 0.5 }">
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

    <!-- 底部统计 -->
    <div class="stats-footer">
      <div class="stat-item duration">
        <el-icon><Timer /></el-icon>
        <span class="stat-value">{{ formatTime(stats.duration) }}</span>
        <span class="stat-label">面试时长</span>
      </div>
      <div class="stat-item score">
        <el-icon><TrendCharts /></el-icon>
        <span class="stat-value">{{ cockpitData.overallScore }}</span>
        <span class="stat-label">综合评分</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DataAnalysis, Refresh, Timer, TrendCharts } from '@element-plus/icons-vue'
import type { BigFivePersonality, CockpitData, QuestionSuggestion } from '@/composables/useImmersiveInterview'

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
}

const props = withDefaults(defineProps<Props>(), {
  isAnalyzing: false,
  suggestions: () => []
})

defineEmits<{
  (e: 'refresh-suggestions'): void
  (e: 'use-suggestion', suggestion: QuestionSuggestion): void
}>()

const typeLabels: Record<string, string> = {
  followup: '追问',
  alternative: '备选',
  probe: '深挖'
}

const scoreRingStyle = computed(() => {
  const score = props.cockpitData.overallScore
  const percentage = score / 100
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#667eea' : '#f59e0b'
  return {
    background: `conic-gradient(${color} ${percentage * 360}deg, #e5e7eb ${percentage * 360}deg)`
  }
})

const deceptionLevelClass = computed(() => {
  const score = props.cockpitData.deceptionScore
  if (score > 0.7) return 'level-danger'
  if (score > 0.5) return 'level-warning'
  return 'level-normal'
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

// 综合评分卡片
.overall-score-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  
  .score-content {
    .score-value {
      font-size: 48px;
      font-weight: 700;
      line-height: 1;
    }
    
    .score-label {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 4px;
    }
  }
  
  .score-indicator {
    .score-ring {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      position: relative;
      
      &::after {
        content: '';
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        bottom: 8px;
        background: white;
        border-radius: 50%;
      }
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
