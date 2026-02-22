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
      <div class="input-card candidate-card" :class="{ 'recording-mode': isSpeechListening }">
        <div class="card-header">
          <div class="card-icon candidate">
            <el-icon><Microphone /></el-icon>
          </div>
          <div class="card-title">
            <span class="title">
              候选人回答
              <el-tag v-if="isSpeechListening" type="danger" size="small" effect="dark" class="recording-tag">
                <span class="rec-dot"></span>
                录音中
              </el-tag>
            </span>
            <span class="hint">支持语音输入</span>
          </div>
          <el-tooltip :content="speechSupported ? (isSpeechListening ? '停止录音' : '开始语音输入') : '浏览器不支持语音'" placement="top">
            <el-button
              :type="isSpeechListening ? 'danger' : 'default'"
              circle
              :icon="isSpeechListening ? VideoPause : Microphone"
              @click="toggleRecording"
              class="voice-btn"
              :class="{ 'recording': isSpeechListening }"
              :disabled="!speechSupported || isPaused"
            />
          </el-tooltip>
        </div>
        <div class="card-body">
          <el-input
            v-model="answerInput"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            :placeholder="isSpeechListening ? '🎤 正在录音，请说话...' : '输入候选人的回答内容...'"
            :disabled="isPaused"
            :class="{ 'recording-active': isSpeechListening }"
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
import { Microphone, VideoPause, Check, Edit, Promotion } from '@element-plus/icons-vue'
import type { Message } from '../composables/useInterviewAssist'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'

const props = defineProps<{
  messages: Message[]
  isPaused: boolean
}>()

const emit = defineEmits<{
  ask: [question: string]
  submit: [answer: string]
  toggleRecording: [isRecording: boolean]
}>()

// 输入状态
const questionInput = ref('')
const answerInput = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

// 语音识别相关
const recognizedTextBeforeStart = ref('')

const {
  isSupported: speechSupported,
  isListening: isSpeechListening,
  finalTranscript: speechFinal,
  interimTranscript: speechInterim,
  start: startSpeech,
  stop: stopSpeech,
  reset: resetSpeech
} = useSpeechRecognition({
  lang: 'zh-CN',
  continuous: true,
  interimResults: true
})

// 监听语音识别结果
watch([speechFinal, speechInterim], ([final, interim]) => {
  if (isSpeechListening.value) {
    answerInput.value = recognizedTextBeforeStart.value + final + interim
  }
})

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
    if (isSpeechListening.value) {
      stopSpeech()
    }
    emit('submit', answerInput.value.trim())
    answerInput.value = ''
    resetSpeech()
    recognizedTextBeforeStart.value = ''
  }
}

const toggleRecording = async () => {
  if (isSpeechListening.value) {
    stopSpeech()
    emit('toggleRecording', false)
  } else {
    recognizedTextBeforeStart.value = answerInput.value
    resetSpeech()
    const success = await startSpeech()
    if (success) {
      emit('toggleRecording', true)
    }
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
  padding: 24px;
  background: #f8fafc;
  min-height: 300px;
  max-height: 400px;
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
    }
  }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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
  
  &.recording-mode {
    border-color: #ef4444;
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15);
    animation: recording-glow 2s infinite;
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
    
    .voice-btn {
      width: 36px;
      height: 36px;
      transition: all 0.3s ease;
      
      &.recording {
        animation: pulse-recording 1.5s infinite;
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
    
    .recording-active {
      :deep(.el-textarea__inner) {
        background: #fef2f2;
        box-shadow: inset 0 0 0 2px #ef4444;
        animation: recording-input 2s infinite;
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

@keyframes recording-glow {
  0%, 100% { 
    border-color: #ef4444;
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15);
  }
  50% { 
    border-color: #f87171;
    box-shadow: 0 4px 30px rgba(239, 68, 68, 0.25);
  }
}

@keyframes recording-input {
  0%, 100% { background: #fef2f2; }
  50% { background: #fee2e2; }
}

@keyframes pulse-recording {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.15);
  }
}

.recording-tag {
  .rec-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    margin-right: 4px;
    animation: blink 1s infinite;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
