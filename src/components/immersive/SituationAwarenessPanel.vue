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
        <!-- 手动/自动刷新切换 -->
        <div class="refresh-mode-switch">
          <span 
            class="mode-label" 
            :class="{ active: !autoRefresh }"
            @click="$emit('update:autoRefresh', false)"
          >手动</span>
          <div 
            class="switch-track" 
            :class="{ auto: autoRefresh }"
            @click="$emit('update:autoRefresh', !autoRefresh)"
          >
            <div class="switch-thumb"></div>
          </div>
          <span 
            class="mode-label" 
            :class="{ active: autoRefresh }"
            @click="$emit('update:autoRefresh', true)"
          >自动</span>
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
                v-for="(suggestion, index) in followupSuggestions" 
                :key="suggestion.question"
                class="suggestion-card followup"
              >
                <div class="card-header">
                  <span class="card-number">{{ index + 1 }}</span>
                  <div class="card-actions">
                    <el-tooltip content="编辑后发送" placement="top">
                      <el-button type="info" text size="small" :icon="Edit" @click="$emit('edit-suggestion', suggestion)" />
                    </el-tooltip>
                    <el-tooltip content="直接发送" placement="top">
                      <el-button type="primary" text size="small" :icon="Promotion" @click="$emit('use-suggestion', suggestion)" />
                    </el-tooltip>
                  </div>
                </div>
                <div class="card-question">{{ suggestion.question }}</div>
              </div>
            </div>
            
            <!-- 候选问题 -->
            <div v-if="alternativeSuggestions.length > 0" class="suggestion-group">
              <div class="group-label">候选问题</div>
              <div 
                v-for="(suggestion, index) in alternativeSuggestions" 
                :key="suggestion.question"
                class="suggestion-card alternative"
              >
                <div class="card-header">
                  <span v-if="suggestion.purpose" class="card-tag">{{ suggestion.purpose }}</span>
                  <span v-else class="card-number alt">{{ index + 1 }}</span>
                  <div class="card-actions">
                    <el-tooltip content="编辑后发送" placement="top">
                      <el-button type="info" text size="small" :icon="Edit" @click="$emit('edit-suggestion', suggestion)" />
                    </el-tooltip>
                    <el-tooltip content="直接发送" placement="top">
                      <el-button type="primary" text size="small" :icon="Promotion" @click="$emit('use-suggestion', suggestion)" />
                    </el-tooltip>
                  </div>
                </div>
                <div class="card-question">{{ suggestion.question }}</div>
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
import { ArrowRight, ArrowLeft, DataAnalysis, Refresh, Loading, Edit, Promotion } from '@element-plus/icons-vue'

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
  autoRefresh: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isExpanded: false,
  assessment: () => ({ assessment: '' }),
  suggestions: () => [],
  isLoadingAssessment: false,
  isLoadingSuggestions: false,
  canRefresh: true,
  autoRefresh: false
})

defineEmits<{
  (e: 'toggle'): void
  (e: 'refresh-assessment'): void
  (e: 'refresh-suggestions'): void
  (e: 'use-suggestion', suggestion: QuestionSuggestion): void
  (e: 'edit-suggestion', suggestion: QuestionSuggestion): void
  (e: 'update:autoRefresh', value: boolean): void
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
  padding: 10px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;

  .header-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a2e;
    white-space: nowrap;

    .el-icon {
      color: #667eea;
      font-size: 18px;
    }
  }

  .el-button {
    margin-left: auto;
  }
}

// 刷新模式切换
.refresh-mode-switch {
  display: flex;
  align-items: center;
  gap: 6px;

  .mode-label {
    font-size: 11px;
    color: #9ca3af;
    cursor: pointer;
    transition: color 0.2s;

    &.active {
      color: #374151;
      font-weight: 500;
    }

    &:hover {
      color: #667eea;
    }
  }

  .switch-track {
    width: 32px;
    height: 16px;
    background: #667eea;
    border-radius: 8px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;

    &.auto {
      background: #10b981;

      .switch-thumb {
        transform: translateX(16px);
      }
    }

    .switch-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
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
    border-radius: 8px;
    padding: 8px 10px;
  }

  .assessment-text {
    p {
      margin: 0;
      font-size: 11px;
      line-height: 1.5;
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
  margin-bottom: 10px;

  .group-label {
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 4px;
    padding-left: 2px;
  }
}

// 建议卡片样式
.suggestion-card {
  padding: 6px 8px 6px 12px;
  background: white;
  border-radius: 8px;
  margin-bottom: 5px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  // 左侧颜色装饰条
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 3px 0 0 3px;
    transition: width 0.2s;
  }

  &.followup::before {
    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  }

  &.alternative::before {
    background: linear-gradient(180deg, #10b981 0%, #059669 100%);
  }

  &:hover {
    border-color: #667eea;
    box-shadow: 0 2px 6px rgba(102, 126, 234, 0.1);
    transform: translateX(2px);

    &::before {
      width: 4px;
    }
  }

  &.followup:hover {
    border-color: #667eea;
  }

  &.alternative:hover {
    border-color: #10b981;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.1);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3px;
  }

  .card-number {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;

    &.alt {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
  }

  .card-tag {
    font-size: 10px;
    color: #6b7280;
    background: #f3f4f6;
    padding: 1px 5px;
    border-radius: 3px;
  }

  .card-actions {
    display: flex;
    gap: 2px;

    .el-button {
      width: 20px;
      height: 20px;
      border-radius: 4px;

      &:first-child {
        background: #f3f4f6;
        &:hover { background: #e5e7eb; }
      }

      &:last-child {
        background: #eff6ff;
        &:hover { background: #dbeafe; }
      }
    }
  }

  .card-question {
    font-size: 11px;
    color: #374151;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
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
  margin: 8px 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
