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
            <div class="stat-value">{{ sessionData.statistics?.total_utterances || 0 }}</div>
            <div class="stat-label">总发言数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ sessionData.statistics?.candidate_utterances || 0 }}</div>
            <div class="stat-label">候选人发言</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ sessionData.statistics?.interviewer_utterances || 0 }}</div>
            <div class="stat-label">面试官发言</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ ((sessionData.statistics?.candidate_ratio || 0) * 100).toFixed(0) }}%</div>
            <div class="stat-label">候选人占比</div>
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
import { Loading, User, DataAnalysis, Clock } from '@element-plus/icons-vue'

interface ConversationHistoryItem {
  speaker: 'interviewer' | 'candidate'
  text: string
  timestamp: string
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
    total_utterances: number
    interviewer_utterances: number
    candidate_utterances: number
    interviewer_ratio: number
    candidate_ratio: number
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
  
  .empty-timeline { padding: 20px 0; }
}
</style>
