<template>
  <div class="ai-simulation-panel">
    <!-- 面试准备区域 -->
    <AISimulationSetup
      v-if="!isActive"
      @start="handleStart"
    />
    
    <!-- 面试进行中 -->
    <div class="interview-active" v-else>
      <!-- 顶部状态栏 -->
      <AIInterviewStatusBar
        :candidate-name="selectedCandidate?.name || ''"
        :candidate-emoji="getAvatarEmoji(selectedCandidate?.type || 'ideal')"
        :total-questions="stats.totalQuestions"
        :total-followups="stats.totalFollowups"
        :start-time="stats.startTime"
      />
      
      <!-- 主内容区：两栏布局 -->
      <div class="main-content">
        <!-- 左侧：对话区 -->
        <AIChatPanel
          ref="chatPanelRef"
          :messages="messages"
          :is-paused="isPaused"
          :is-a-i-typing="isAITyping"
          :candidate-name="selectedCandidate?.name || 'AI 候选人'"
          :candidate-emoji="getAvatarEmoji(selectedCandidate?.type || 'ideal')"
          @ask="handleAsk"
        />
        
        <!-- 右侧：问题推荐区 -->
        <div class="suggestion-section">
          <QuestionSuggestion
            :suggestions="suggestedQuestions"
            :visible="showSuggestions"
            :loading="isLoadingQuestions"
            :waiting-for-answer="isAITyping"
            :followup-count="2"
            :alternative-count="3"
            :interest-points="[]"
            @use="handleUseSuggestion"
            @edit="handleEditSuggestion"
            @dismiss="$emit('clearSuggestions')"
          />
        </div>
      </div>
      
      <!-- 底部控制栏 -->
      <AIInterviewControlBar
        :is-paused="isPaused"
        @pause="$emit('pause')"
        @resume="$emit('resume')"
        @end="$emit('end')"
        @export="$emit('export')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AISimulationSetup from './AISimulationSetup.vue'
import AIChatPanel from './AIChatPanel.vue'
import AIInterviewStatusBar from './AIInterviewStatusBar.vue'
import AIInterviewControlBar from './AIInterviewControlBar.vue'
import QuestionSuggestion from './QuestionSuggestion.vue'
import type { CandidateProfile, Message, SuggestedQuestion } from '../composables/useInterviewAssist'

const chatPanelRef = ref<InstanceType<typeof AIChatPanel> | null>(null)

const props = defineProps<{
  isActive: boolean
  isPaused: boolean
  messages: Message[]
  isAITyping: boolean
  selectedCandidate: CandidateProfile | null
  candidatePresets: Record<string, CandidateProfile>
  suggestedQuestions: SuggestedQuestion[]
  showSuggestions: boolean
  isLoadingQuestions: boolean
  stats: {
    totalQuestions: number
    totalFollowups: number
    startTime: Date | null
  }
}>()

const emit = defineEmits<{
  start: [type: string, candidateInfo: { name: string; position: string; applicationId: string } | null]
  pause: []
  resume: []
  end: []
  export: []
  ask: [question: string]
  useSuggestion: [suggestion: SuggestedQuestion]
  clearSuggestions: []
  selectCandidate: [candidate: { name: string; position: string; applicationId: string }]
}>()

// 获取头像 emoji
const getAvatarEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    ideal: '⭐',
    junior: '👶',
    nervous: '😰',
    overconfident: '😎'
  }
  return emojis[type] || '👤'
}

// 开始面试
const handleStart = (candidateType: string, candidateInfo: { name: string; position: string; applicationId: string } | null) => {
  // 如果选择了候选人，先触发候选人选择事件
  if (candidateInfo) {
    emit('selectCandidate', candidateInfo)
  }
  emit('start', candidateType, candidateInfo)
}

// 发送问题
const handleAsk = (question: string) => {
  emit('ask', question)
}

// 使用推荐问题
const handleUseSuggestion = (suggestion: SuggestedQuestion) => {
  emit('useSuggestion', suggestion)
}

// 编辑推荐问题
const handleEditSuggestion = (suggestion: SuggestedQuestion) => {
  chatPanelRef.value?.setQuestionInput(suggestion.question)
}
</script>

<style scoped lang="scss">
.ai-simulation-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.interview-active {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border-radius: 16px;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 0;
  overflow: hidden;
}

.suggestion-section {
  background: white;
  overflow-y: auto;
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    
    .suggestion-section {
      display: none;
    }
  }
}
</style>
