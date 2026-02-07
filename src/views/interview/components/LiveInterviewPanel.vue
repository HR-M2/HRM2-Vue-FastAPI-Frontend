<template>
  <div class="live-interview-panel">
    <!-- 面试准备区域 -->
    <InterviewSetup
      v-if="!isActive"
      :config="config"
      @start="$emit('start')"
      @update-config="$emit('updateConfig', $event)"
      @select-candidate="$emit('selectCandidate', $event)"
    />
    
    <!-- 面试进行中 -->
    <div class="interview-active" v-else>
      <!-- 顶部状态栏 -->
      <InterviewStatusBar
        :total-questions="stats.totalQuestions"
        :total-followups="stats.totalFollowups"
        :start-time="stats.startTime"
      />
      
      <!-- 主内容区：两栏布局 -->
      <div class="main-content">
        <!-- 左侧：对话区 -->
        <ChatPanel
          ref="chatPanelRef"
          :messages="messages"
          :is-paused="isPaused"
          @ask="$emit('ask', $event)"
          @submit="$emit('submit', $event)"
        />
        
        <!-- 右侧：问题推荐区 -->
        <div class="suggestion-section">
          <QuestionSuggestion
            :suggestions="suggestedQuestions"
            :visible="showSuggestions"
            :loading="isLoadingQuestions"
            :waiting-for-answer="isWaitingForAnswer"
            :followup-count="config.followupCount"
            :alternative-count="config.alternativeCount"
            :interest-points="interestPoints"
            @use="handleUseSuggestion"
            @edit="handleEditSuggestion"
            @use-interest-point="handleUseInterestPoint"
            @dismiss="$emit('clearSuggestions')"
          />
        </div>
      </div>
      
      <!-- 底部控制栏 -->
      <InterviewControlBar
        :is-paused="isPaused"
        @pause="$emit('pause')"
        @resume="$emit('resume')"
        @quit="$emit('quit')"
        @end-save-only="$emit('endSaveOnly')"
        @end-and-save="$emit('endAndSave')"
        @export="$emit('export')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import InterviewSetup from './InterviewSetup.vue'
import InterviewStatusBar from './InterviewStatusBar.vue'
import ChatPanel from './ChatPanel.vue'
import InterviewControlBar from './InterviewControlBar.vue'
import QuestionSuggestion from './QuestionSuggestion.vue'
import type { Message, SuggestedQuestion, InterviewConfig, ResumeInterestPoint } from '../composables/useInterviewAssist'

const chatPanelRef = ref<InstanceType<typeof ChatPanel> | null>(null)

const props = defineProps<{
  isActive: boolean
  isPaused: boolean
  messages: Message[]
  suggestedQuestions: SuggestedQuestion[]
  showSuggestions: boolean
  isLoadingQuestions?: boolean
  isWaitingForAnswer?: boolean
  config: InterviewConfig
  interestPoints: ResumeInterestPoint[]
  stats: {
    totalQuestions: number
    totalFollowups: number
    startTime: Date | null
  }
}>()

const emit = defineEmits<{
  start: []
  pause: []
  resume: []
  quit: []
  endSaveOnly: []
  endAndSave: []
  export: []
  ask: [question: string]
  submit: [answer: string]
  useSuggestion: [suggestion: SuggestedQuestion]
  useInterestPoint: [pointId: string]
  clearSuggestions: []
  updateConfig: [config: Partial<InterviewConfig>]
  selectCandidate: [candidate: { name: string; position: string; applicationId: string }]
}>()

const handleUseSuggestion = (suggestion: SuggestedQuestion) => {
  emit('useSuggestion', suggestion)
}

const handleEditSuggestion = (suggestion: SuggestedQuestion) => {
  chatPanelRef.value?.setQuestionInput(suggestion.question)
}

const handleUseInterestPoint = (point: ResumeInterestPoint) => {
  emit('useInterestPoint', point.id)
}
</script>

<style scoped lang="scss">
.live-interview-panel {
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
