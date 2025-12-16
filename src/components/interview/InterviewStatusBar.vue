<template>
  <div class="status-bar">
    <div class="status-left">
      <el-tag type="success" effect="light" class="status-tag">
        <span class="status-dot"></span>
        面试进行中
      </el-tag>
    </div>
    <div class="status-right">
      <div class="stat-item">
        <el-icon><QuestionFilled /></el-icon>
        <span>{{ totalQuestions }} 问题</span>
      </div>
      <div class="stat-item">
        <el-icon><ChatLineRound /></el-icon>
        <span>{{ totalFollowups }} 追问</span>
      </div>
      <div class="stat-item">
        <el-icon><Timer /></el-icon>
        <span>{{ formatDuration }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { QuestionFilled, ChatLineRound, Timer } from '@element-plus/icons-vue'

const props = defineProps<{
  totalQuestions: number
  totalFollowups: number
  startTime: Date | null
}>()

const formatDuration = computed(() => {
  if (!props.startTime) return '00:00'
  const seconds = Math.floor((Date.now() - props.startTime.getTime()) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})
</script>

<style scoped lang="scss">
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  
  .status-left {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .status-tag {
      .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        margin-right: 6px;
        animation: pulse 1.5s infinite;
      }
    }
  }
  
  .status-right {
    display: flex;
    gap: 24px;
    
    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #6b7280;
      font-size: 14px;
      
      .el-icon {
        color: #9ca3af;
      }
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
