<template>
  <div class="question-suggestions-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <el-icon class="title-icon"><ChatLineSquare /></el-icon>
        <span>提问建议</span>
      </div>
      <el-button 
        type="primary" 
        link 
        size="small"
        :loading="isLoading"
        @click="$emit('refresh')"
      >
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 建议列表 -->
    <div class="suggestions-list" v-if="suggestions.length > 0">
      <transition-group name="suggestion-list">
        <div 
          v-for="suggestion in suggestions" 
          :key="suggestion.question"
          class="suggestion-card"
          :class="suggestion.type"
          @click="$emit('use-suggestion', suggestion)"
        >
          <div class="suggestion-header">
            <span class="suggestion-type" :class="suggestion.type">
              {{ typeLabels[suggestion.type] }}
            </span>
            <span class="suggestion-priority">
              <el-icon><Star /></el-icon>
              {{ suggestion.priority }}
            </span>
          </div>
          <p class="suggestion-question">{{ suggestion.question }}</p>
          <p v-if="suggestion.reason" class="suggestion-reason">
            <el-icon><InfoFilled /></el-icon>
            {{ suggestion.reason }}
          </p>
        </div>
      </transition-group>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-icon class="empty-icon"><QuestionFilled /></el-icon>
      <p>暂无提问建议</p>
      <span class="empty-hint">开始面试后系统将自动推荐问题</span>
    </div>

    <!-- 快捷问题 -->
    <div class="quick-questions">
      <h4 class="section-title">快捷提问</h4>
      <div class="quick-tags">
        <el-tag 
          v-for="q in quickQuestions" 
          :key="q"
          class="quick-tag"
          effect="plain"
          @click="$emit('use-quick', q)"
        >
          {{ q }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatLineSquare, Refresh, Star, InfoFilled, QuestionFilled } from '@element-plus/icons-vue'
import type { QuestionSuggestion } from '@/composables/useImmersiveInterview'

interface Props {
  suggestions: QuestionSuggestion[]
  isLoading?: boolean
}

withDefaults(defineProps<Props>(), {
  suggestions: () => [],
  isLoading: false
})

defineEmits<{
  (e: 'refresh'): void
  (e: 'use-suggestion', suggestion: QuestionSuggestion): void
  (e: 'use-quick', question: string): void
}>()

const typeLabels: Record<string, string> = {
  followup: '追问',
  alternative: '备选',
  probe: '深挖'
}

const quickQuestions = [
  '能详细说明一下吗？',
  '有具体案例吗？',
  '遇到过什么困难？',
  '如何解决的？',
  '有什么收获？'
]
</script>

<style scoped lang="scss">
.question-suggestions-panel {
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

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

.suggestion-card {
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
    border-color: #667eea;
    transform: translateX(4px);
  }
  
  &.probe {
    border-left: 3px solid #667eea;
  }
  
  &.followup {
    border-left: 3px solid #10b981;
  }
  
  &.alternative {
    border-left: 3px solid #f59e0b;
  }
  
  .suggestion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .suggestion-type {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
    
    &.probe {
      background: rgba(102, 126, 234, 0.15);
      color: #667eea;
    }
    
    &.followup {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }
    
    &.alternative {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }
  }
  
  .suggestion-priority {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #9ca3af;
    
    .el-icon {
      color: #fbbf24;
    }
  }
  
  .suggestion-question {
    margin: 0;
    font-size: 14px;
    color: #1a1a2e;
    line-height: 1.5;
  }
  
  .suggestion-reason {
    margin: 8px 0 0;
    font-size: 12px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 4px;
    
    .el-icon {
      color: #9ca3af;
    }
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #9ca3af;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }
  
  p {
    margin: 0 0 4px;
    font-size: 14px;
    color: #6b7280;
  }
  
  .empty-hint {
    font-size: 12px;
  }
}

.quick-questions {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
  margin-top: auto;
  
  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .quick-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    
    .quick-tag {
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: #667eea;
        color: white;
        border-color: #667eea;
      }
    }
  }
}

.suggestion-list-enter-active,
.suggestion-list-leave-active {
  transition: all 0.3s ease;
}

.suggestion-list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.suggestion-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
