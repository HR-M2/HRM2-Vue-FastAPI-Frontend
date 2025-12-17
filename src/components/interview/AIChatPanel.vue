<template>
  <div class="ai-chat-section">
    <!-- 消息列表 -->
    <div class="chat-container" ref="chatContainerRef">
      <transition-group name="message" tag="div" class="messages-list">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="[`message-${message.role}`, { 'typing': message.isTyping }]"
        >
          <div class="message-avatar">
            <span v-if="message.role === 'interviewer'">👔</span>
            <span v-else-if="message.role === 'candidate'">{{ candidateEmoji }}</span>
            <span v-else>🔔</span>
          </div>
          <div class="message-body">
            <div class="message-header">
              <span class="role-name">
                {{ message.role === 'interviewer' ? '面试官' : message.role === 'candidate' ? candidateName : '系统' }}
              </span>
              <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-content">
              {{ message.content }}
              <span v-if="message.isTyping" class="typing-cursor">|</span>
            </div>
          </div>
        </div>
      </transition-group>
      
      <!-- AI 正在输入指示器 -->
      <transition name="fade">
        <div v-if="isAITyping" class="typing-indicator">
          <div class="typing-avatar">{{ candidateEmoji }}</div>
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="typing-text">{{ candidateName }} 正在回答...</span>
        </div>
      </transition>
    </div>
    
    <!-- 输入区域 - 只有面试官提问 -->
    <div class="input-panel">
      <div class="input-card interviewer-card">
        <div class="card-header">
          <div class="card-icon interviewer">
            <el-icon><Edit /></el-icon>
          </div>
          <div class="card-title">
            <span class="title">面试官提问</span>
            <span class="hint">输入问题或从右侧选择推荐问题，AI 将模拟候选人回答</span>
          </div>
        </div>
        <div class="card-body">
          <el-input
            v-model="questionInput"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="输入您要问候选人的问题..."
            :disabled="isPaused || isAITyping"
            @keydown.enter.ctrl="sendQuestion"
            class="question-input"
          />
        </div>
        <div class="card-footer">
          <el-button
            type="primary"
            :icon="Promotion"
            :disabled="!questionInput.trim() || isPaused || isAITyping"
            @click="sendQuestion"
            class="action-btn"
          >
            发送提问
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Edit, Promotion } from '@element-plus/icons-vue'
import type { Message } from '@/composables/useInterviewAssist'

const props = defineProps<{
  messages: Message[]
  isPaused: boolean
  isAITyping: boolean
  candidateName: string
  candidateEmoji: string
}>()

const emit = defineEmits<{
  ask: [question: string]
}>()

// 输入状态
const questionInput = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

// 方法
const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const sendQuestion = () => {
  if (questionInput.value.trim() && !props.isAITyping) {
    emit('ask', questionInput.value.trim())
    questionInput.value = ''
  }
}

// 设置问题输入（用于从推荐问题编辑）
const setQuestionInput = (question: string) => {
  questionInput.value = question
}

// 自动滚动
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
})

// 监听 AI 打字状态变化时也滚动
watch(() => props.isAITyping, () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
})

defineExpose({
  setQuestionInput
})
</script>

<style scoped lang="scss">
.ai-chat-section {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  height: 100%;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f8fafc;
  min-height: 300px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-item {
  display: flex;
  gap: 14px;
  animation: slideIn 0.3s ease;
  
  &.message-system {
    justify-content: center;
    
    .message-avatar { display: none; }
    
    .message-body {
      background: #fef3c7;
      border-radius: 8px;
      padding: 10px 16px;
      border-left: none;
      
      .message-header { display: none; }
      
      .message-content {
        color: #92400e;
        font-size: 14px;
        text-align: center;
      }
    }
  }
  
  &.message-interviewer {
    .message-body {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
    }
    
    .role-name { color: #374151; }
  }
  
  &.message-candidate {
    .message-body {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
    }
    
    .role-name { color: #374151; }
  }
  
  .message-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    flex-shrink: 0;
  }
  
  .message-body {
    flex: 1;
    padding: 16px;
    border-radius: 12px;
    max-width: 85%;
    
    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      .role-name {
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }
      
      .timestamp {
        font-size: 12px;
        color: #9ca3af;
      }
    }
    
    .message-content {
      color: #4b5563;
      line-height: 1.6;
      font-size: 14px;
      
      .typing-cursor {
        animation: blink 0.8s infinite;
      }
    }
  }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// AI 打字指示器
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  width: fit-content;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-top: 16px;
  
  .typing-avatar {
    font-size: 20px;
  }
  
  .typing-dots {
    display: flex;
    gap: 4px;
    
    span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #667eea;
      animation: bounce 1.4s infinite ease-in-out;
      
      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }
  
  .typing-text {
    font-size: 13px;
    color: #9ca3af;
  }
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

// 输入面板样式
.input-panel {
  padding: 16px 20px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 1px solid #e5e7eb;
}

.input-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  overflow: hidden;
  
  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }
  
  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15);
  }
  
  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px 10px;
    border-bottom: 1px solid #f3f4f6;
    
    .card-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      &.interviewer {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      }
      
      .el-icon {
        font-size: 18px;
        color: white;
      }
    }
    
    .card-title {
      flex: 1;
      
      .title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: #1a1a2e;
      }
      
      .hint {
        display: block;
        font-size: 12px;
        color: #9ca3af;
        margin-top: 2px;
      }
    }
  }
  
  .card-body {
    padding: 12px 16px;
    
    :deep(.el-textarea__inner) {
      border: none;
      background: #fafbfc;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 14px;
      line-height: 1.6;
      resize: none;
      
      &:focus {
        background: white;
        box-shadow: inset 0 0 0 1px #e5e7eb;
      }
    }
  }
  
  .card-footer {
    padding: 10px 16px 14px;
    display: flex;
    justify-content: flex-end;
    
    .action-btn {
      min-width: 120px;
      border-radius: 10px;
      font-weight: 500;
      transition: all 0.3s ease;
      
      &:not(:disabled):hover {
        transform: translateY(-1px);
      }
    }
  }
}

.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
