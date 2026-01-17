<template>
  <div class="cockpit-panel">
    <!-- 候选人信息卡片 -->
    <div class="candidate-info-card">
      <div class="candidate-header">
        <div class="candidate-avatar">
          <img v-if="candidateInfo.avatarUrl" :src="candidateInfo.avatarUrl" alt="候选人照片" />
          <div v-else class="avatar-placeholder">
            <el-icon :size="28"><User /></el-icon>
          </div>
        </div>
        <div class="candidate-details">
          <div class="candidate-name">{{ candidateInfo.name || '未知候选人' }}</div>
          <div class="candidate-position">{{ candidateInfo.position || '暂无岗位' }}</div>
        </div>
      </div>
      <div class="candidate-actions">
        <div class="action-btn" @click="showBasicInfoDialog = true">
          <el-icon :size="16"><InfoFilled /></el-icon>
          <span>基本信息</span>
        </div>
        <div class="action-btn" @click="handleViewResume">
          <el-icon :size="16"><Document /></el-icon>
          <span>简历</span>
        </div>
        <div class="action-btn" @click="handleViewScreeningReport">
          <el-icon :size="16"><DataLine /></el-icon>
          <span>初筛报告</span>
        </div>
      </div>
    </div>

    <!-- 对话区域 -->
    <div class="chat-section">
      <!-- 消息列表 -->
      <div class="chat-container" ref="chatContainerRef">
        <div class="messages-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-item"
            :class="`message-${message.role}`"
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
        </div>
      </div>
      
      <!-- 输入控制区域 -->
      <div class="chat-controls">
        <div class="control-row">
          <!-- 语音转录控制 -->
          <div class="speech-controls">
            <el-button
              :type="isSpeechListening ? 'danger' : 'primary'"
              size="small"
              :icon="isSpeechListening ? VideoPause : Microphone"
              @click="$emit('toggle-speech')"
              :disabled="!speechSupported"
            >
              {{ isSpeechListening ? '停止转录' : '开始转录' }}
            </el-button>
            <span class="speech-status" :class="{ 'listening': isSpeechListening }">
              {{ isSpeechListening ? '🎤 录音中' : '⏸️ 已暂停' }}
            </span>
          </div>
          
          <!-- 问题建议区域 -->
          <div class="question-suggestions">
            <div class="suggestions-header">
              <span class="suggestions-title">💡 问题建议</span>
              <el-button 
                type="primary" 
                size="small"
                :loading="isLoadingSuggestions"
                @click="handleGetSuggestions"
              >
                {{ isLoadingSuggestions ? '生成中...' : '获取建议' }}
              </el-button>
            </div>
            
            <div v-if="isLoadingSuggestions" class="suggestions-loading">
              <div class="loading-text">正在根据候选人回答生成问题建议...</div>
            </div>
            
            <div v-else-if="suggestions.length > 0" class="suggestions-list">
              <div 
                v-for="suggestion in suggestions.slice(0, 3)" 
                :key="suggestion.question"
                class="suggestion-item"
                @click="handleUseSuggestion(suggestion)"
              >
                <span class="suggestion-type" :class="suggestion.type">{{ typeLabels[suggestion.type] }}</span>
                <span class="suggestion-text">{{ suggestion.question }}</span>
                <el-icon class="suggestion-arrow"><Right /></el-icon>
              </div>
            </div>
            
            <div v-else class="suggestions-empty">
              <div class="empty-icon">💭</div>
              <div class="empty-text">点击"获取建议"根据候选人简历和回答生成问题</div>
            </div>
          </div>
          
          <!-- 面试官提问输入 -->
          <div class="question-input-area">
            <el-input
              v-model="questionInput"
              placeholder="输入面试官问题..."
              size="small"
              @keydown.enter="sendQuestion"
            >
              <template #append>
                <el-button 
                  :icon="Promotion" 
                  @click="sendQuestion"
                  :disabled="!questionInput.trim()"
                  size="small"
                >
                  发送
                </el-button>
              </template>
            </el-input>
          </div>
        </div>
      </div>
    </div>
    <!-- 基本信息弹窗 -->
    <el-dialog v-model="showBasicInfoDialog" title="候选人基本信息" width="500px">
      <div class="basic-info-content">
        <div class="info-row">
          <span class="info-label">姓名：</span>
          <span class="info-value">{{ candidateInfo.name || '未知' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">应聘岗位：</span>
          <span class="info-value">{{ candidateInfo.position || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">申请ID：</span>
          <span class="info-value">{{ candidateInfo.applicationId || '-' }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBasicInfoDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 简历详情弹窗 -->
    <ResumeDetailDialog
      v-model="showResumeDialog"
      :resume="resumeDetailData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { User, InfoFilled, Document, DataLine, Microphone, VideoPause, Promotion, Right } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ResumeDetailDialog } from '@/components/common'
import { getResume, getScreeningTask } from '@/api/sdk.gen'
import type { CockpitData, QuestionSuggestion } from '@/composables/useImmersiveInterview'
import type { ResumeData } from '@/types'

// 消息类型定义
interface Message {
  id: string
  role: 'interviewer' | 'candidate' | 'system'
  content: string
  timestamp: Date
}

interface CandidateInfo {
  name: string
  position: string
  avatarUrl?: string
  applicationId?: string
  resumeId?: string
  screeningTaskId?: string
}

interface Props {
  isAnalyzing?: boolean
  stats: {
    duration: number
    interviewerRatio: number
    candidateRatio: number
    avgEngagement: number
    avgConfidence: number
  }
  cockpitData: CockpitData
  suggestions: QuestionSuggestion[]
  candidateInfo: CandidateInfo
  messages?: Message[]
  speechSupported?: boolean
  isSpeechListening?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isAnalyzing: false,
  suggestions: () => [],
  candidateInfo: () => ({ name: '', position: '' }),
  messages: () => [],
  speechSupported: false,
  isSpeechListening: false
})

// 弹窗状态
const showBasicInfoDialog = ref(false)
const showResumeDialog = ref(false)
const resumeDetailData = ref<ResumeData | null>(null)

// 对话相关状态
const questionInput = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

// 是否正在获取建议
const isLoadingSuggestions = ref(false)

// 发送面试官问题
const sendQuestion = () => {
  if (questionInput.value.trim()) {
    emit('send-question', questionInput.value.trim())
    questionInput.value = ''
  }
}

// 使用建议问题
const handleUseSuggestion = (suggestion: QuestionSuggestion) => {
  questionInput.value = suggestion.question
}

// 获取问题建议
const handleGetSuggestions = async () => {
  isLoadingSuggestions.value = true
  
  try {
    // 调用真实的API获取建议
    emit('refresh-suggestions')
    
    // 等待一段时间让API调用完成
    await new Promise(resolve => setTimeout(resolve, 1000))
    
  } catch (error) {
    console.error('获取问题建议失败:', error)
  } finally {
    isLoadingSuggestions.value = false
  }
}

// 格式化时间
const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 自动滚动到底部
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
})

// 查看简历
const handleViewResume = async () => {
  if (!props.candidateInfo.resumeId) {
    ElMessage.warning('暂无简历信息')
    return
  }
  
  try {
    const result = await getResume({ path: { resume_id: props.candidateInfo.resumeId } })
    if (result.data?.data) {
      const resume = result.data.data
      resumeDetailData.value = {
        id: resume.id,
        candidate_name: resume.candidate_name,
        position_title: props.candidateInfo.position,
        content: resume.content,
        resume_content: resume.content
      }
      showResumeDialog.value = true
    }
  } catch {
    ElMessage.error('获取简历失败')
  }
}

// 查看初筛报告
const handleViewScreeningReport = async () => {
  if (!props.candidateInfo.screeningTaskId) {
    ElMessage.warning('暂无初筛报告')
    return
  }
  
  try {
    const result = await getScreeningTask({ path: { task_id: props.candidateInfo.screeningTaskId } })
    if (result.data?.data) {
      const task = result.data.data
      resumeDetailData.value = {
        id: task.id,
        candidate_name: task.candidate_name || props.candidateInfo.name,
        position_title: task.position_title || props.candidateInfo.position,
        screening_score: task.score !== null ? {
          comprehensive_score: task.score,
          hr_score: (task.dimension_scores?.hr_score as number) || undefined,
          technical_score: (task.dimension_scores?.technical_score as number) || undefined,
          manager_score: (task.dimension_scores?.manager_score as number) || undefined
        } : undefined,
        screening_summary: task.summary || undefined,
        resume_content: task.resume_content || undefined
      }
      showResumeDialog.value = true
    }
  } catch {
    ElMessage.error('获取初筛报告失败')
  }
}

const emit = defineEmits<{
  (e: 'refresh-suggestions'): void
  (e: 'use-suggestion', suggestion: QuestionSuggestion): void
  (e: 'toggle-speech'): void
  (e: 'send-question', question: string): void
  (e: 'add-suggestion-to-chat', suggestion: QuestionSuggestion): void
}>()

const typeLabels: Record<string, string> = {
  followup: '追问',
  alternative: '备选',
  probe: '深挖'
}
</script>

<style scoped lang="scss">
.cockpit-panel {
  background: white;
  border-radius: 16px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

// 候选人信息卡片
.candidate-info-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  flex-shrink: 0;
  
  .candidate-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .candidate-avatar {
    flex-shrink: 0;
    
    img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .avatar-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.3);
      
      .el-icon {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
  
  .candidate-details {
    flex: 1;
    min-width: 0;
    
    .candidate-name {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .candidate-position {
      font-size: 12px;
      opacity: 0.8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  
  .candidate-actions {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    
    .action-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }
      
      .el-icon {
        opacity: 0.9;
      }
      
      span {
        font-size: 11px;
        opacity: 0.9;
        white-space: nowrap;
      }
    }
  }
}

// 对话区域
.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 200px;
  max-height: 400px; // 限制最大高度，超出时显示滚动条
  
  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
    
    &:hover {
      background: #a8a8a8;
    }
  }
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  gap: 10px;
  animation: slideIn 0.3s ease;
  
  &.message-interviewer {
    .message-body {
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
    }
  }
  
  &.message-candidate {
    .message-body {
      background: #f0fdf4;
      border-left: 3px solid #10b981;
    }
  }
  
  &.message-system {
    justify-content: center;
    
    .message-avatar { display: none; }
    
    .message-body {
      background: #fef3c7;
      border-radius: 8px;
      padding: 8px 12px;
      border-left: none;
      
      .message-header { display: none; }
      
      .message-content {
        color: #92400e;
        font-size: 12px;
        text-align: center;
      }
    }
  }
  
  .message-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }
  
  .message-body {
    flex: 1;
    padding: 10px 12px;
    border-radius: 10px;
    
    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      
      .role-name {
        font-weight: 600;
        color: #374151;
        font-size: 12px;
      }
      
      .timestamp {
        font-size: 10px;
        color: #9ca3af;
      }
    }
    
    .message-content {
      color: #4b5563;
      line-height: 1.5;
      font-size: 13px;
    }
  }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

// 控制区域
.chat-controls {
  border-top: 1px solid #e5e7eb;
  padding: 12px 16px;
  background: white;
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.speech-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .speech-status {
    font-size: 12px;
    color: #6b7280;
    padding: 4px 8px;
    background: #f3f4f6;
    border-radius: 6px;
    
    &.listening {
      color: #dc2626;
      background: #fef2f2;
      animation: pulse 1.5s infinite;
    }
  }
}

// 问题建议区域
.question-suggestions {
  margin: 12px 0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  
  .suggestions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    
    .suggestions-title {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
    
    .el-button {
      font-size: 12px;
      padding: 4px 12px;
      height: auto;
    }
  }
  
  .suggestions-loading {
    padding: 16px 0;
    text-align: center;
    
    .loading-text {
      font-size: 12px;
      color: #6b7280;
      font-style: italic;
    }
  }
  
  .suggestions-empty {
    padding: 16px 0;
    text-align: center;
    
    .empty-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .empty-text {
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.4;
    }
  }
  
  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 120px; // 限制建议区域高度
    overflow-y: auto;
    
    // 自定义滚动条
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 2px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 2px;
      
      &:hover {
        background: #9ca3af;
      }
    }
  }
  
  .suggestion-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s ease;
    
    &:hover {
      background: #eff6ff;
      border-color: #3b82f6;
      transform: translateX(2px);
      
      .suggestion-arrow {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .suggestion-type {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
      
      &.followup {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }
      
      &.alternative {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
      }
      
      &.probe {
        background: rgba(102, 126, 234, 0.15);
        color: #667eea;
      }
    }
    
    .suggestion-text {
      flex: 1;
      font-size: 12px;
      color: #374151;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .suggestion-arrow {
      font-size: 12px;
      color: #9ca3af;
      opacity: 0;
      transform: translateX(-4px);
      transition: all 0.2s ease;
    }
  }
}

.question-input-area {
  .el-input {
    :deep(.el-input__wrapper) {
      border-radius: 8px;
    }
    
    :deep(.el-input-group__append) {
      border-radius: 0 8px 8px 0;
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

// 基本信息弹窗
.basic-info-content {
  .info-row {
    display: flex;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .info-label {
      width: 100px;
      color: #6b7280;
      font-size: 14px;
    }
    
    .info-value {
      flex: 1;
      color: #1a1a2e;
      font-size: 14px;
      font-weight: 500;
    }
  }
}
</style>
