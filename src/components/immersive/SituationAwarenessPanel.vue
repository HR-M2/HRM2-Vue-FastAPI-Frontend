<template>
  <div class="situation-panel" :class="{ expanded: isExpanded }">
    <!-- 收起状态：只显示展开按钮 -->
    <div v-if="!isExpanded" class="collapsed-bar" @click="$emit('toggle')">
      <div class="expand-trigger">
        <el-icon><ArrowRight /></el-icon>
        <span class="trigger-label">态势感知</span>
      </div>
    </div>

    <!-- 展开状态：显示完整内容 -->
    <div v-else class="panel-content">
      <!-- 头部 -->
      <div class="panel-header">
        <div class="header-title">
          <el-icon><DataAnalysis /></el-icon>
          <span>综合态势感知</span>
        </div>
        <el-button circle size="small" @click="$emit('toggle')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
      </div>

      <!-- 局面评估区域 -->
      <div class="assessment-section">
        <div class="section-header">
          <span class="section-title">📊 局面评估</span>
          <el-button 
            type="primary" 
            link 
            size="small" 
            :loading="isLoadingAssessment"
            :disabled="!canRefresh"
            @click="$emit('refresh-assessment')"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        
        <div class="assessment-content">
          <div v-if="isLoadingAssessment" class="loading-state">
            <el-icon class="loading-icon"><Loading /></el-icon>
            <span>正在分析面试局面...</span>
          </div>
          <div v-else-if="assessment.assessment" class="assessment-text">
            <p>{{ assessment.assessment }}</p>
          </div>
          <div v-else class="empty-state">
            <span>点击刷新获取局面评估</span>
          </div>
        </div>
      </div>

      <!-- 分隔线 -->
      <el-divider />

      <!-- 建议区域 -->
      <div class="suggestions-section">
        <div class="section-header">
          <span class="section-title">💡 提问建议</span>
          <el-button 
            type="primary" 
            link 
            size="small" 
            :loading="isLoadingSuggestions"
            :disabled="!canRefresh"
            @click="$emit('refresh-suggestions')"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <div class="suggestions-content">
          <div v-if="isLoadingSuggestions" class="loading-state">
            <el-icon class="loading-icon"><Loading /></el-icon>
            <span>正在生成建议...</span>
          </div>
          <template v-else-if="suggestions.length > 0">
            <!-- 追问建议 -->
            <div v-if="followupSuggestions.length > 0" class="suggestion-group">
              <div class="group-label">追问建议</div>
              <div 
                v-for="suggestion in followupSuggestions" 
                :key="suggestion.question"
                class="suggestion-item followup"
                @click="$emit('use-suggestion', suggestion)"
              >
                <div class="suggestion-question">{{ suggestion.question }}</div>
                <div v-if="suggestion.purpose" class="suggestion-purpose">{{ suggestion.purpose }}</div>
              </div>
            </div>
            
            <!-- 候选问题 -->
            <div v-if="alternativeSuggestions.length > 0" class="suggestion-group">
              <div class="group-label">候选问题</div>
              <div 
                v-for="suggestion in alternativeSuggestions" 
                :key="suggestion.question"
                class="suggestion-item alternative"
                @click="$emit('use-suggestion', suggestion)"
              >
                <div class="suggestion-question">{{ suggestion.question }}</div>
                <div v-if="suggestion.purpose" class="suggestion-purpose">{{ suggestion.purpose }}</div>
              </div>
            </div>

          </template>
          <div v-else class="empty-state">
            <span>点击刷新获取建议</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, ArrowLeft, DataAnalysis, Refresh, Loading } from '@element-plus/icons-vue'

export interface SituationAssessment {
  assessment: string
}

export interface QuestionSuggestion {
  question: string
  type: 'followup' | 'alternative' | 'probe'
  purpose?: string
  priority: number
}

interface Props {
  isExpanded: boolean
  assessment: SituationAssessment
  suggestions: QuestionSuggestion[]
  isLoadingAssessment: boolean
  isLoadingSuggestions: boolean
  canRefresh: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isExpanded: false,
  assessment: () => ({ assessment: '' }),
  suggestions: () => [],
  isLoadingAssessment: false,
  isLoadingSuggestions: false,
  canRefresh: true
})

defineEmits<{
  (e: 'toggle'): void
  (e: 'refresh-assessment'): void
  (e: 'refresh-suggestions'): void
  (e: 'use-suggestion', suggestion: QuestionSuggestion): void
}>()

// 追问建议
const followupSuggestions = computed(() => 
  props.suggestions.filter(s => s.type === 'followup')
)

// 候选问题
const alternativeSuggestions = computed(() => 
  props.suggestions.filter(s => s.type === 'alternative' || s.type === 'probe')
)

</script>

<style scoped lang="scss">
.situation-panel {
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;

  &.expanded {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }
}

// 收起状态
.collapsed-bar {
  height: 100%;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  transition: all 0.2s;

  &:hover {
    width: 48px;
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .expand-trigger {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #6b7280;

    .el-icon {
      font-size: 16px;
    }

    .trigger-label {
      writing-mode: vertical-rl;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 2px;
      transition: all 0.2s;
    }
  }
}

// 展开状态
.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a2e;

    .el-icon {
      color: #667eea;
      font-size: 20px;
    }
  }
}

// 区域通用样式
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #1a1a2e;
  }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #9ca3af;
  font-size: 13px;

  .loading-icon {
    animation: spin 1s linear infinite;
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #9ca3af;
  font-size: 13px;
}

// 局面评估区域
.assessment-section {
  .assessment-content {
    background: #f8fafc;
    border-radius: 10px;
    padding: 14px;
  }

  .assessment-text {
    p {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: #374151;
      white-space: pre-wrap;
    }
  }
}

// 建议区域
.suggestions-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .suggestions-content {
    flex: 1;
    overflow-y: auto;
    padding-right: 4px;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 2px;
    }
  }
}

.suggestion-group {
  margin-bottom: 16px;

  .group-label {
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 8px;
    padding-left: 4px;
  }
}

.suggestion-item {
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;

  &:hover {
    background: white;
    border-color: #667eea;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  }

  &.followup {
    border-left: 3px solid #667eea;
  }

  &.alternative {
    border-left: 3px solid #10b981;
  }

  .suggestion-question {
    font-size: 13px;
    color: #1a1a2e;
    line-height: 1.5;
  }

  .suggestion-purpose {
    font-size: 11px;
    color: #9ca3af;
    margin-top: 4px;
  }
}

.direction-item {
  padding: 10px 12px;
  background: #fef3c7;
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid #f59e0b;

  .direction-text {
    font-size: 13px;
    color: #92400e;
    line-height: 1.5;
  }

  .direction-reason {
    font-size: 11px;
    color: #b45309;
    margin-top: 4px;
  }
}

.el-divider {
  margin: 16px 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
