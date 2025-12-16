<template>
  <div class="chat-section">
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
            <span v-else-if="message.role === 'candidate'">👤</span>
            <span v-else>🔔</span>
          </div>
          <div class="message-body">
            <div class="message-header">
              <span class="role-name">
                {{ message.role === 'interviewer' ? '面试官' : message.role === 'candidate' ? '候选人' : '系统' }}
              </span>
              <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>
      </transition-group>
    </div>
    
    <!-- 输入区域 -->
    <div class="input-panel">
      <!-- 左侧：面试官提问 -->
      <div class="input-card interviewer-card">
        <div class="card-header">
          <div class="card-icon interviewer">
            <el-icon><Edit /></el-icon>
          </div>
          <div class="card-title">
            <span class="title">面试官提问</span>
            <span class="hint">Ctrl + Enter 快速发送</span>
          </div>
        </div>
        <div class="card-body">
          <el-input
            v-model="questionInput"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="输入您要问候选人的问题..."
            :disabled="isPaused"
            @keydown.enter.ctrl="sendQuestion"
            class="question-input"
          />
        </div>
        <div class="card-footer">
          <el-button
            type="primary"
            :icon="Promotion"
            :disabled="!questionInput.trim() || isPaused"
            @click="sendQuestion"
            class="action-btn"
          >
            发送提问
          </el-button>
        </div>
      </div>
      
      <!-- 右侧：候选人回答 -->
      <div class="input-card candidate-card">
        <div class="card-header">
          <div class="card-icon candidate">
            <el-icon><Microphone /></el-icon>
          </div>
          <div class="card-title">
            <span class="title">候选人回答</span>
            <span class="hint">输入或语音转录候选人回答</span>
          </div>
        </div>
        <div class="card-body">
          <el-input
            v-model="answerInput"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="输入候选人的回答内容..."
            :disabled="isPaused"
            class="answer-input"
          />
        </div>
        <div class="card-footer">
          <el-button
            type="success"
            :icon="Check"
            :disabled="!answerInput.trim() || isPaused"
            @click="submitAnswer"
            class="action-btn"
          >
            提交回答
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Microphone, Check, Edit, Promotion } from '@element-plus/icons-vue'
import type { Message } from '@/composables/useInterviewAssist'

const props = defineProps<{
  messages: Message[]
  isPaused: boolean
}>()

const emit = defineEmits<{
  ask: [question: string]
  submit: [answer: string]
}>()

// 输入状态
const questionInput = ref('')
const answerInput = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

// 方法
const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const sendQuestion = () => {
  if (questionInput.value.trim()) {
    emit('ask', questionInput.value.trim())
    questionInput.value = ''
  }
}

const submitAnswer = () => {
  if (answerInput.value.trim()) {
    emit('submit', answerInput.value.trim())
    answerInput.value = ''
  }
}

// 自动滚动
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
})

// 暴露方法：设置面试官提问输入框内容
const setQuestionInput = (question: string) => {
  questionInput.value = question
}

defineExpose({
  setQuestionInput
})
</script>

<style scoped lang="scss">
.chat-section {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8fafc;
  min-height: 300px;
  max-height: 400px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  
  &.message-system {
    justify-content: center;
    
    .message-avatar { display: none; }
    
    .message-body {
      background: #fef3c7;
      color: #92400e;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      text-align: center;
      max-width: 80%;
    }
    
    .message-header { display: none; }
  }
  
  &.message-interviewer {
    .message-body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .role-name { color: rgba(255, 255, 255, 0.8); }
    .timestamp { color: rgba(255, 255, 255, 0.6); }
  }
  
  &.message-candidate {
    .message-body {
      background: white;
      border: 1px solid #e5e7eb;
    }
  }
  
  .message-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  
  .message-body {
    flex: 1;
    padding: 14px 18px;
    border-radius: 16px;
    max-width: 85%;
    
    .message-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      
      .role-name {
        font-size: 13px;
        font-weight: 600;
        color: #6b7280;
      }
      
      .timestamp {
        font-size: 12px;
        color: #9ca3af;
      }
    }
    
    .message-content {
      font-size: 14px;
      line-height: 1.6;
      color: inherit;
    }
  }
}

// 输入面板样式
.input-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
    border-color: #667eea;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
  }
  
  &.interviewer-card:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15);
  }
  
  &.candidate-card:focus-within {
    border-color: #10b981;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.15);
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
      
      &.candidate {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
      min-width: 100px;
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
</style>
