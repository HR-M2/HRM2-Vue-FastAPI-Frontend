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
          <!-- 发言人切换控制 -->
          <div class="speech-controls">
            <el-button
              :type="isSpeechListening ? 'success' : 'primary'"
              size="small"
              :icon="isSpeechListening ? Switch : Microphone"
              @click="$emit('toggle-speech')"
              :disabled="!speechSupported"
            >
              {{ isSpeechListening ? '切换发言人' : '开始转录' }}
            </el-button>
            <span v-if="isSpeechListening" class="current-speaker" :class="currentSpeaker">
              {{ currentSpeaker === 'interviewer' ? '👔' : '👤' }} {{ speakerLabel }}发言中
            </span>
            <span v-else class="speech-status">
              ⏸️ 未开始
            </span>
          </div>
          
          <!-- 问题建议区域 -->
          <div class="question-suggestions" :class="{ 'expanded': isSuggestionsExpanded }">
            <div class="suggestions-header">
              <span class="suggestions-title">💡 问题建议</span>
              <div class="header-actions">
                <el-button 
                  type="primary" 
                  size="small"
                  :loading="isLoadingSuggestions"
                  @click="handleGetSuggestions"
                >
                  {{ isLoadingSuggestions ? '生成中...' : '获取建议' }}
                </el-button>
                <el-button 
                  v-if="suggestions.length > 1"
                  type="text" 
                  size="small"
                  @click="isSuggestionsExpanded = !isSuggestionsExpanded"
                  class="expand-btn"
                >
                  <el-icon>
                    <component :is="isSuggestionsExpanded ? 'ArrowDown' : 'ArrowUp'" />
                  </el-icon>
                  {{ isSuggestionsExpanded ? '收起' : `展开 (${suggestions.length - 1}条)` }}
                </el-button>
              </div>
            </div>
            
            <div v-if="isLoadingSuggestions" class="suggestions-loading">
              <div class="loading-text">正在根据候选人回答生成问题建议...</div>
            </div>
            
            <div v-else-if="suggestions.length > 0" class="suggestions-container">
              <!-- 默认显示的第一条建议 -->
              <div v-if="suggestions[0]" class="suggestions-list primary">
                <div 
                  class="suggestion-item primary-item"
                  @click="handleUseSuggestion(suggestions[0])"
                >
                  <span class="suggestion-type" :class="suggestions[0].type">{{ typeLabels[suggestions[0].type] || '其他' }}</span>
                  <span class="suggestion-text">{{ suggestions[0].question }}</span>
                  <el-icon class="suggestion-arrow"><Right /></el-icon>
                </div>
              </div>
            </div>
            
            <div v-else class="suggestions-empty">
              <div class="empty-icon">💭</div>
              <div class="empty-text">点击"获取建议"根据候选人简历和回答生成问题</div>
            </div>
          </div>

          <!-- 展开的建议覆盖层 -->
          <teleport to="body">
            <transition name="overlay-fade">
              <div v-if="isSuggestionsExpanded && suggestions.length > 1" class="suggestions-overlay">
                <div class="overlay-backdrop" @click="isSuggestionsExpanded = false"></div>
                <div class="suggestions-expanded-panel">
                  <div class="expanded-header">
                    <h3>💡 智能问题建议</h3>
                    <div class="header-info">
                      <span class="suggestions-count">共 {{ suggestions.length }} 条建议</span>
                      <el-button 
                        type="text" 
                        size="small"
                        @click="isSuggestionsExpanded = false"
                        class="close-btn"
                      >
                        <el-icon><Close /></el-icon>
                        收起
                      </el-button>
                    </div>
                  </div>
                  
                  <div class="expanded-content">
                    <div class="suggestions-grid">
                      <div 
                        v-for="(suggestion, index) in suggestions" 
                        :key="suggestion.question"
                        class="suggestion-card"
                        :class="{ 'primary': index === 0 }"
                        @click="handleUseSuggestionAndClose(suggestion)"
                      >
                        <div class="card-header">
                          <span class="suggestion-type" :class="suggestion.type">
                            {{ typeLabels[suggestion.type] || '其他' }}
                          </span>
                          <span v-if="index === 0" class="primary-badge">推荐</span>
                          <span class="priority-badge" :class="`priority-${suggestion.priority || 3}`">
                            优先级 {{ suggestion.priority || 3 }}
                          </span>
                        </div>
                        
                        <div class="card-content">
                          <p class="suggestion-question">{{ suggestion.question }}</p>
                          <div v-if="suggestion.reason" class="suggestion-reason">
                            <span class="reason-label">建议理由：</span>
                            <span class="reason-text">{{ suggestion.reason }}</span>
                          </div>
                          <div v-if="suggestion.psychological_context" class="psychological-context">
                            <span class="context-label">心理背景：</span>
                            <span class="context-text">{{ suggestion.psychological_context }}</span>
                          </div>
                        </div>
                        
                        <div class="card-footer">
                          <el-button type="primary" size="small" class="use-btn">
                            <el-icon><Right /></el-icon>
                            使用此问题
                          </el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </teleport>
          
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
import { User, InfoFilled, Document, DataLine, Microphone, VideoPause, Promotion, Right, ArrowUp, ArrowDown, Close, Switch } from '@element-plus/icons-vue'
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
  currentSpeaker?: 'interviewer' | 'candidate'
}

const props = withDefaults(defineProps<Props>(), {
  isAnalyzing: false,
  suggestions: () => [],
  candidateInfo: () => ({ name: '', position: '' }),
  messages: () => [],
  speechSupported: false,
  isSpeechListening: false,
  currentSpeaker: 'interviewer'
})

// 当前发言人显示文本
const speakerLabel = computed(() => {
  return props.currentSpeaker === 'interviewer' ? '面试官' : '候选人'
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

// 问题建议展开状态
const isSuggestionsExpanded = ref(false)

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

// 使用建议问题并关闭展开面板
const handleUseSuggestionAndClose = (suggestion: QuestionSuggestion) => {
  questionInput.value = suggestion.question
  isSuggestionsExpanded.value = false
  ElMessage.success('问题已填入输入框')
}

// 获取问题建议
const handleGetSuggestions = async () => {
  console.log('[RealTimeAnalysisPanel] 用户点击获取建议按钮')
  isLoadingSuggestions.value = true
  
  try {
    // 记录当前建议的数量和内容，用于检测变化
    const initialSuggestionsCount = props.suggestions.length
    const initialSuggestionsContent = JSON.stringify(props.suggestions)
    
    console.log('[RealTimeAnalysisPanel] 当前建议数量:', initialSuggestionsCount)
    
    // 发出事件通知父组件开始获取建议
    console.log('[RealTimeAnalysisPanel] 发出 refresh-suggestions 事件')
    emit('refresh-suggestions')
    
    // 等待建议数据真正更新
    await new Promise<void>((resolve) => {
      let checkCount = 0
      const maxChecks = 1000 // 最多检查1000次
      
      const checkForUpdates = () => {
        checkCount++
        
        // 检查建议是否真正发生了变化
        const currentSuggestionsContent = JSON.stringify(props.suggestions)
        const hasNewSuggestions = currentSuggestionsContent !== initialSuggestionsContent
        
        console.log(`[RealTimeAnalysisPanel] 检查更新 ${checkCount}/${maxChecks}, 有新建议:`, hasNewSuggestions)
        
        if (hasNewSuggestions) {
          // 建议内容发生了变化，说明API调用完成
          console.log('[RealTimeAnalysisPanel] 检测到建议更新，结束等待')
          resolve()
        } else if (checkCount >= maxChecks) {
          // 超时，强制结束
          console.warn('[RealTimeAnalysisPanel] 获取建议超时')
          resolve()
        } else {
          // 继续检查
          setTimeout(checkForUpdates, 300) // 每100ms检查一次
        }
      }
      
      // 延迟开始检查，给API调用一些时间
      setTimeout(checkForUpdates, 200)
    })
    
  } catch (error) {
    console.error('[RealTimeAnalysisPanel] 获取问题建议失败:', error)
  } finally {
    console.log('[RealTimeAnalysisPanel] 获取建议完成，最终建议数量:', props.suggestions.length)
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
  probe: '深挖',
  technical: '技术',
  behavioral: '行为',
  situational: '情境',
  mixed: '综合'
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
  }
  
  .current-speaker {
    font-size: 12px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 6px;
    animation: pulse 1.5s infinite;
    
    &.interviewer {
      color: #1d4ed8;
      background: #dbeafe;
    }
    
    &.candidate {
      color: #047857;
      background: #d1fae5;
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
  position: relative;
  
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
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .el-button {
        font-size: 12px;
        padding: 4px 12px;
        height: auto;
      }
      
      .expand-btn {
        padding: 4px 8px;
        color: #6b7280;
        
        &:hover {
          color: #3b82f6;
        }
        
        .el-icon {
          margin-right: 4px;
        }
      }
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
  
  .suggestions-container {
    position: relative;
  }
  
  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    
    &.primary {
      margin-bottom: 4px;
    }
  }
  
  .suggestion-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s ease;
    
    &.primary-item {
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
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
      
      &.technical {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
      }
      
      &.behavioral {
        background: rgba(139, 92, 246, 0.15);
        color: #8b5cf6;
      }
      
      &.situational {
        background: rgba(236, 72, 153, 0.15);
        color: #ec4899;
      }
    }
    
    .suggestion-text {
      flex: 1;
      font-size: 12px;
      color: #374151;
      line-height: 1.4;
      word-wrap: break-word;
      white-space: normal;
    }
    
    .suggestion-arrow {
      font-size: 12px;
      color: #9ca3af;
      opacity: 0;
      transform: translateX(-4px);
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
  }
}

// 覆盖层样式
.suggestions-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .overlay-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }
  
  .suggestions-expanded-panel {
    position: relative;
    width: 90vw;
    max-width: 1000px;
    max-height: 80vh;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .expanded-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      
      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .header-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .suggestions-count {
          font-size: 14px;
          opacity: 0.9;
        }
        
        .close-btn {
          color: white;
          padding: 4px 8px;
          
          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }
          
          .el-icon {
            margin-right: 4px;
          }
        }
      }
    }
    
    .expanded-content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      
      // 自定义滚动条
      &::-webkit-scrollbar {
        width: 8px;
      }
      
      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
        
        &:hover {
          background: #a8a8a8;
        }
      }
    }
    
    .suggestions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      
      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }
    
    .suggestion-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      
      &:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        transform: translateY(-2px);
      }
      
      &.primary {
        border-color: #10b981;
        background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
        
        &:hover {
          border-color: #059669;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
      }
      
      .card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
        
        .suggestion-type {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          
          &.technical {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
          }
          
          &.behavioral {
            background: rgba(139, 92, 246, 0.15);
            color: #8b5cf6;
          }
          
          &.situational {
            background: rgba(236, 72, 153, 0.15);
            color: #ec4899;
          }
          
          &.mixed {
            background: rgba(107, 114, 128, 0.15);
            color: #6b7280;
          }
        }
        
        .primary-badge {
          background: #10b981;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .priority-badge {
          font-size: 10px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: auto;
          
          &.priority-1, &.priority-2 {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
          }
          
          &.priority-3, &.priority-4 {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
          }
          
          &.priority-5 {
            background: rgba(107, 114, 128, 0.15);
            color: #6b7280;
          }
        }
      }
      
      .card-content {
        margin-bottom: 16px;
        
        .suggestion-question {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          line-height: 1.5;
          margin: 0 0 12px 0;
        }
        
        .suggestion-reason {
          margin-bottom: 8px;
          
          .reason-label {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
          }
          
          .reason-text {
            font-size: 12px;
            color: #374151;
            margin-left: 4px;
          }
        }
        
        .psychological-context {
          .context-label {
            font-size: 12px;
            color: #7c3aed;
            font-weight: 500;
          }
          
          .context-text {
            font-size: 12px;
            color: #5b21b6;
            margin-left: 4px;
            font-style: italic;
          }
        }
      }
      
      .card-footer {
        display: flex;
        justify-content: flex-end;
        
        .use-btn {
          font-size: 12px;
          padding: 6px 12px;
          height: auto;
          
          .el-icon {
            margin-right: 4px;
          }
        }
      }
    }
  }
}

// 覆盖层动画
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: all 0.3s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
  
  .suggestions-expanded-panel {
    transform: scale(0.9) translateY(20px);
  }
}

.overlay-fade-enter-to,
.overlay-fade-leave-from {
  opacity: 1;
  
  .suggestions-expanded-panel {
    transform: scale(1) translateY(0);
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
