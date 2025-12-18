<template>
  <div class="transcript-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <el-icon class="title-icon"><Document /></el-icon>
        <span>实时转录</span>
      </div>
      <div class="header-actions">
        <el-switch
          v-model="autoScroll"
          size="small"
          active-text="自动滚动"
        />
      </div>
    </div>

    <!-- 转录内容 -->
    <div class="transcript-content" ref="contentRef">
      <transition-group name="transcript-item">
        <div 
          v-for="(item, index) in transcripts" 
          :key="`${item.timestamp}-${index}`"
          class="transcript-item"
          :class="item.speaker"
        >
          <div class="item-avatar">
            <span v-if="item.speaker === 'interviewer'">🎤</span>
            <span v-else-if="item.speaker === 'candidate'">👤</span>
            <span v-else>❓</span>
          </div>
          <div class="item-content">
            <div class="item-header">
              <span class="speaker-name">{{ speakerLabels[item.speaker] }}</span>
              <span class="timestamp">{{ formatTime(item.timestamp) }}</span>
            </div>
            <p class="item-text" :class="{ 'is-interim': !item.is_final }">
              {{ item.text }}
              <span v-if="!item.is_final" class="interim-indicator">...</span>
            </p>
          </div>
        </div>
      </transition-group>

      <!-- 空状态 -->
      <div v-if="transcripts.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Microphone /></el-icon>
        <p>等待语音输入...</p>
        <span class="empty-hint">开始面试后将自动转录对话内容</span>
      </div>
    </div>

    <!-- 手动输入 -->
    <div class="manual-input">
      <div class="input-tabs">
        <el-radio-group v-model="inputSpeaker" size="small">
          <el-radio-button value="interviewer">面试官</el-radio-button>
          <el-radio-button value="candidate">候选人</el-radio-button>
        </el-radio-group>
      </div>
      <div class="input-area">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="2"
          placeholder="手动输入转录文本..."
          resize="none"
          @keydown.enter.ctrl="handleSubmit"
        />
        <el-button 
          type="primary" 
          :disabled="!inputText.trim()"
          @click="handleSubmit"
        >
          添加
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Document, Microphone } from '@element-plus/icons-vue'
import type { Transcript } from '@/composables/useImmersiveInterview'

interface Props {
  transcripts: Transcript[]
}

const props = withDefaults(defineProps<Props>(), {
  transcripts: () => []
})

const emit = defineEmits<{
  (e: 'add-transcript', speaker: 'interviewer' | 'candidate', text: string): void
}>()

const contentRef = ref<HTMLElement | null>(null)
const autoScroll = ref(true)
const inputSpeaker = ref<'interviewer' | 'candidate'>('interviewer')
const inputText = ref('')

const speakerLabels: Record<string, string> = {
  interviewer: '面试官',
  candidate: '候选人',
  unknown: '未知'
}

const formatTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

const handleSubmit = () => {
  if (!inputText.value.trim()) return
  emit('add-transcript', inputSpeaker.value, inputText.value.trim())
  inputText.value = ''
}

// 监听转录更新，自动滚动
watch(() => props.transcripts.length, async () => {
  if (autoScroll.value && contentRef.value) {
    await nextTick()
    contentRef.value.scrollTop = contentRef.value.scrollHeight
  }
})
</script>

<style scoped lang="scss">
.transcript-panel {
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

.transcript-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 8px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
    
    &:hover {
      background: #94a3b8;
    }
  }
}

.transcript-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  
  &.interviewer {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
    
    .item-avatar {
      background: linear-gradient(135deg, #667eea, #764ba2);
    }
    
    .speaker-name {
      color: #667eea;
    }
  }
  
  &.candidate {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(52, 211, 153, 0.08));
    
    .item-avatar {
      background: linear-gradient(135deg, #10b981, #34d399);
    }
    
    .speaker-name {
      color: #10b981;
    }
  }
  
  .item-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
    background: #e5e7eb;
  }
  
  .item-content {
    flex: 1;
    min-width: 0;
    
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      
      .speaker-name {
        font-size: 12px;
        font-weight: 600;
      }
      
      .timestamp {
        font-size: 11px;
        color: #9ca3af;
      }
    }
    
    .item-text {
      margin: 0;
      font-size: 14px;
      color: #1a1a2e;
      line-height: 1.5;
      word-break: break-word;
      
      &.is-interim {
        color: #6b7280;
        font-style: italic;
      }
      
      .interim-indicator {
        animation: blink 1s infinite;
      }
    }
  }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
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

.manual-input {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
  
  .input-tabs {
    margin-bottom: 10px;
  }
  
  .input-area {
    display: flex;
    gap: 10px;
    
    .el-input {
      flex: 1;
    }
    
    .el-button {
      align-self: flex-end;
    }
  }
}

.transcript-item-enter-active,
.transcript-item-leave-active {
  transition: all 0.3s ease;
}

.transcript-item-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.transcript-item-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
