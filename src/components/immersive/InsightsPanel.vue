<template>
  <div class="insights-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <el-icon class="title-icon"><TrendCharts /></el-icon>
        <span>面试洞察</span>
      </div>
      <el-button type="primary" link size="small" @click="$emit('refresh')">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 洞察列表 -->
    <div class="insights-list" v-if="insights.length > 0">
      <transition-group name="insight-item">
        <div 
          v-for="(insight, index) in insights" 
          :key="`${insight.timestamp}-${index}`"
          class="insight-card"
          :class="insight.severity"
        >
          <div class="insight-icon">
            <el-icon v-if="insight.severity === 'info'"><InfoFilled /></el-icon>
            <el-icon v-else-if="insight.severity === 'warning'"><WarningFilled /></el-icon>
            <el-icon v-else><CircleCloseFilled /></el-icon>
          </div>
          <div class="insight-content">
            <div class="insight-header">
              <span class="insight-category">{{ insight.category }}</span>
              <span class="insight-time">{{ formatTime(insight.timestamp) }}</span>
            </div>
            <p class="insight-text">{{ insight.content }}</p>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-icon class="empty-icon"><DataLine /></el-icon>
      <p>暂无洞察</p>
      <span class="empty-hint">面试进行中将自动生成分析洞察</span>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <el-button type="primary" plain size="small" @click="$emit('generate-report')">
        <el-icon><Document /></el-icon>
        生成报告
      </el-button>
      <el-button plain size="small" @click="$emit('export')">
        <el-icon><Download /></el-icon>
        导出数据
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  TrendCharts, 
  Refresh, 
  InfoFilled, 
  WarningFilled, 
  CircleCloseFilled, 
  DataLine,
  Document,
  Download
} from '@element-plus/icons-vue'
import type { InterviewInsight } from '@/composables/useImmersiveInterview'

interface Props {
  insights: InterviewInsight[]
}

withDefaults(defineProps<Props>(), {
  insights: () => []
})

defineEmits<{
  (e: 'refresh'): void
  (e: 'generate-report'): void
  (e: 'export'): void
}>()

const formatTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
</script>

<style scoped lang="scss">
.insights-panel {
  background: white;
  border-radius: 16px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.insights-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.insight-card {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f8fafc;
  border-left: 3px solid transparent;
  
  &.info {
    border-left-color: #3b82f6;
    
    .insight-icon {
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
    
    .insight-category {
      color: #3b82f6;
    }
  }
  
  &.warning {
    border-left-color: #f59e0b;
    background: rgba(245, 158, 11, 0.05);
    
    .insight-icon {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
    }
    
    .insight-category {
      color: #f59e0b;
    }
  }
  
  &.alert {
    border-left-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
    
    .insight-icon {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    
    .insight-category {
      color: #ef4444;
    }
  }
  
  .insight-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    .el-icon {
      font-size: 16px;
    }
  }
  
  .insight-content {
    flex: 1;
    min-width: 0;
    
    .insight-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      
      .insight-category {
        font-size: 12px;
        font-weight: 600;
      }
      
      .insight-time {
        font-size: 11px;
        color: #9ca3af;
      }
    }
    
    .insight-text {
      margin: 0;
      font-size: 13px;
      color: #4b5563;
      line-height: 1.5;
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

.quick-actions {
  display: flex;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;
  
  .el-button {
    flex: 1;
  }
}

.insight-item-enter-active,
.insight-item-leave-active {
  transition: all 0.3s ease;
}

.insight-item-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.insight-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
