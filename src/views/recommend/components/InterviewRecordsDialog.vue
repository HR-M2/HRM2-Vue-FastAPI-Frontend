<template>
  <el-dialog
    :model-value="visible"
    title="面试问答记录"
    width="700px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="session" class="interview-records">
      <div v-if="session.messages?.length">
        <div 
          v-for="(msg, index) in session.messages" 
          :key="index"
          class="message-item"
          :class="msg.role"
        >
          <div class="message-header">
            <span class="message-label">{{ msg.role === 'interviewer' ? '面试官' : '候选人' }}</span>
          </div>
          <div class="message-content">{{ msg.content }}</div>
          <div v-if="msg.behavior && msg.role === 'candidate'" class="message-behavior">
            <span v-if="msg.behavior.gaze" class="behavior-tag gaze">
              专注 {{ Math.round((msg.behavior.gaze.ratio || 0) * 100) }}%
            </span>
            <span 
              v-for="e in (msg.behavior.emotions || []).slice(0, 3)" 
              :key="e.emotion" 
              class="behavior-tag emotion"
            >
              {{ getEmotionLabel(e.emotion) }} {{ Math.round((e.ratio || 0) * 100) }}%
            </span>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无问答记录" />
    </div>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { InterviewSessionResponseOutput } from '@/api/types.gen'

defineProps<{
  visible: boolean
  session: InterviewSessionResponseOutput | null
}>()

defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

// 情绪标签映射
const emotionLabelMap: Record<string, string> = {
  neutral: '平静',
  happiness: '愉悦',
  happy: '愉悦',
  sadness: '悲伤',
  sad: '悲伤',
  anger: '愤怒',
  angry: '愤怒',
  fear: '恐惧',
  surprise: '惊讶',
  disgust: '厌恶',
  contempt: '鄙视'
}

const getEmotionLabel = (emotion: string): string => {
  return emotionLabelMap[emotion.toLowerCase()] || emotion
}
</script>

<style scoped lang="scss">
.interview-records {
  max-height: 500px;
  overflow-y: auto;
  
  .message-item {
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 8px;
    
    &.interviewer {
      background: #ede9fe;
      
      .message-label {
        color: #667eea;
      }
    }
    
    &.candidate {
      background: #ecfdf5;
      
      .message-label {
        color: #10b981;
      }
    }
    
    .message-header {
      margin-bottom: 6px;
    }
    
    .message-label {
      font-weight: 600;
      font-size: 13px;
    }
    
    .message-content {
      color: #374151;
      line-height: 1.6;
      font-size: 14px;
    }
    
    .message-behavior {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      flex-wrap: wrap;

      .behavior-tag {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 10px;

        &.gaze {
          background: rgba(16, 185, 129, 0.15);
          color: #059669;
        }

        &.emotion {
          background: rgba(102, 126, 234, 0.15);
          color: #667eea;
        }
      }
    }
  }
}
</style>
