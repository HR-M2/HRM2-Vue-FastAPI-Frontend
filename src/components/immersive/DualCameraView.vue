<template>
  <div class="dual-camera-view">
    <!-- 主视图区 - 候选人 -->
    <div class="main-video-container">
      <div class="video-wrapper candidate-video">
        <video
          ref="candidateVideoRef"
          autoplay
          playsinline
          muted
          class="video-element"
        ></video>
        <div class="video-overlay">
          <div class="video-info-left">
            <div class="video-label">
              <span class="label-icon">👤</span>
              <span class="label-text">{{ candidateName || '候选人' }}</span>
            </div>
            <div v-if="duration !== undefined" class="duration-badge">
              <el-icon class="duration-icon"><Timer /></el-icon>
              <span class="duration-text">{{ formatDuration(duration) }}</span>
            </div>
          </div>
          <div v-if="isRecording" class="recording-indicator">
            <span class="rec-dot"></span>
            <span>REC</span>
          </div>
        </div>
        
        <!-- 状态指示器（暂时隐藏）
        <div v-if="candidateState" class="state-indicators">
          <div class="indicator" :class="getEngagementClass(candidateState.engagement)">
            <span class="indicator-label">参与度</span>
            <div class="indicator-bar">
              <div class="indicator-fill" :style="{ width: `${candidateState.engagement * 100}%` }"></div>
            </div>
          </div>
          <div class="indicator" :class="getConfidenceClass(candidateState.confidence_level)">
            <span class="indicator-label">自信度</span>
            <div class="indicator-bar">
              <div class="indicator-fill" :style="{ width: `${candidateState.confidence_level * 100}%` }"></div>
            </div>
          </div>
        </div>
        -->

        <!-- 情绪标签 -->
        <transition name="fade">
          <div v-if="emotionLabel" class="emotion-badge" :class="emotionClass">
            {{ emotionLabel }}
          </div>
        </transition>

        <!-- 警告横幅区域 -->
        <div class="warning-banners">
          <!-- 读稿检测警告 -->
          <transition name="slide-down">
            <div v-if="showDeceptionWarning" class="warning-banner deception-warning">
              <span class="warning-icon">⚠️</span>
              <span class="warning-text">检测到候选人可能正在读稿</span>
            </div>
          </transition>
          
          <!-- 面部离框警告 -->
          <transition name="slide-down">
            <div v-if="faceOutOfFrame" class="warning-banner face-warning">
              <span class="warning-icon">⚠️</span>
              <span class="warning-text">候选人面部不在画面中</span>
            </div>
          </transition>
        </div>

        <!-- 左侧分析面板 -->
        <div class="left-analysis-panel">
          <!-- 大五人格分析 -->
          <div class="analysis-card personality-card">
            <h4 class="card-title">
              <span class="title-icon">🧠</span>
              大五人格
            </h4>
            <div class="personality-mini-list">
              <div class="personality-mini-item">
                <span class="trait-label">开放性</span>
                <div class="trait-mini-bar">
                  <div class="trait-fill openness" :style="{ width: `${(bigFiveData?.openness || 0) * 100}%` }"></div>
                </div>
                <span class="trait-percent">{{ Math.round((bigFiveData?.openness || 0) * 100) }}%</span>
              </div>
              <div class="personality-mini-item">
                <span class="trait-label">尽责性</span>
                <div class="trait-mini-bar">
                  <div class="trait-fill conscientiousness" :style="{ width: `${(bigFiveData?.conscientiousness || 0) * 100}%` }"></div>
                </div>
                <span class="trait-percent">{{ Math.round((bigFiveData?.conscientiousness || 0) * 100) }}%</span>
              </div>
              <div class="personality-mini-item">
                <span class="trait-label">外向性</span>
                <div class="trait-mini-bar">
                  <div class="trait-fill extraversion" :style="{ width: `${(bigFiveData?.extraversion || 0) * 100}%` }"></div>
                </div>
                <span class="trait-percent">{{ Math.round((bigFiveData?.extraversion || 0) * 100) }}%</span>
              </div>
              <div class="personality-mini-item">
                <span class="trait-label">宜人性</span>
                <div class="trait-mini-bar">
                  <div class="trait-fill agreeableness" :style="{ width: `${(bigFiveData?.agreeableness || 0) * 100}%` }"></div>
                </div>
                <span class="trait-percent">{{ Math.round((bigFiveData?.agreeableness || 0) * 100) }}%</span>
              </div>
              <div class="personality-mini-item">
                <span class="trait-label">神经质</span>
                <div class="trait-mini-bar">
                  <div class="trait-fill neuroticism" :style="{ width: `${(bigFiveData?.neuroticism || 0) * 100}%` }"></div>
                </div>
                <span class="trait-percent">{{ Math.round((bigFiveData?.neuroticism || 0) * 100) }}%</span>
              </div>
            </div>
          </div>

          <!-- 检测区域 -->
          <div class="detection-cards">
            <!-- 欺骗检测 -->
            <div class="analysis-card detection-card" :class="{ 'warning-state': deceptionScore > 0.5 }">
              <h4 class="card-title">
                <span class="title-icon">🔍</span>
                欺骗检测
              </h4>
              <div class="detection-meter">
                <div class="meter-circle" :class="deceptionLevelClass">
                  <span class="meter-value">{{ Math.round(deceptionScore * 100) }}%</span>
                </div>
              </div>
            </div>

            <!-- 抑郁检测 -->
            <div class="analysis-card detection-card">
              <h4 class="card-title">
                <span class="title-icon">😔</span>
                抑郁检测
              </h4>
              <div class="detection-meter">
                <div class="meter-circle depression-meter">
                  <span class="meter-value">{{ Math.round((depressionScore || 0) * 100) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- 无视频提示 -->
    <div v-if="!hasLocalVideo" class="no-video-overlay">
      <div class="no-video-content">
        <el-icon class="no-video-icon"><VideoCameraFilled /></el-icon>
        <p>等待摄像头连接...</p>
        <el-button type="primary" @click="$emit('init-camera')">
          启用摄像头
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { FullScreen, ScaleToOriginal, Switch, VideoCameraFilled, Timer, Microphone } from '@element-plus/icons-vue'
import type { CandidateState } from '@/composables/useImmersiveInterview'

interface Props {
  candidateName?: string
  streamUrl?: string
  isRecording?: boolean
  candidateState?: CandidateState | null
  emotionLabel?: string
  localStream?: MediaStream | null
  deceptionScore?: number
  faceOutOfFrame?: boolean
  duration?: number
  speechTranscript?: string
  speechInterim?: string
  isSpeechListening?: boolean
  showTranscript?: boolean
  bigFiveData?: {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    neuroticism: number
  }
  depressionScore?: number
}

const props = withDefaults(defineProps<Props>(), {
  candidateName: '候选人',
  streamUrl: '',
  isRecording: false,
  candidateState: null,
  emotionLabel: '',
  localStream: null,
  deceptionScore: 0,
  faceOutOfFrame: false,
  duration: undefined,
  speechTranscript: '',
  speechInterim: '',
  isSpeechListening: false,
  showTranscript: false,
  bigFiveData: () => ({
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0
  }),
  depressionScore: 0
})

// 欺骗警告显示（分数 > 0.5）
const showDeceptionWarning = computed(() => props.deceptionScore > 0.5)

// 欺骗检测等级样式
const deceptionLevelClass = computed(() => {
  const score = props.deceptionScore
  if (score > 0.7) return 'level-danger'
  if (score > 0.5) return 'level-warning'
  return 'level-normal'
})

const emit = defineEmits<{
  (e: 'init-camera'): void
  (e: 'clearTranscript'): void
}>()

const candidateVideoRef = ref<HTMLVideoElement | null>(null)
const interviewerVideoRef = ref<HTMLVideoElement | null>(null)
const transcriptContentRef = ref<HTMLElement | null>(null)
const isPipExpanded = ref(false)
const isSwapped = ref(false)

const hasLocalVideo = computed(() => props.localStream !== null)

const emotionClass = computed(() => {
  const emotion = props.candidateState?.emotion?.emotion || 'neutral'
  const classMap: Record<string, string> = {
    neutral: 'emotion-neutral',
    happy: 'emotion-positive',
    focused: 'emotion-positive',
    thinking: 'emotion-neutral',
    nervous: 'emotion-warning',
    confident: 'emotion-positive'
  }
  return classMap[emotion] || 'emotion-neutral'
})

const getEngagementClass = (value: number) => {
  if (value >= 0.8) return 'level-high'
  if (value >= 0.5) return 'level-medium'
  return 'level-low'
}

const getConfidenceClass = (value: number) => {
  if (value >= 0.7) return 'level-high'
  if (value >= 0.4) return 'level-medium'
  return 'level-low'
}

const togglePipExpand = () => {
  isPipExpanded.value = !isPipExpanded.value
}

const swapVideos = () => {
  isSwapped.value = !isSwapped.value
}

// 格式化时长
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 监听本地流变化
watch(() => props.localStream, (stream) => {
  if (candidateVideoRef.value && stream) {
    candidateVideoRef.value.srcObject = stream
  }
}, { immediate: true })

// 监听转录文本变化，自动滚动到底部
watch([() => props.speechTranscript, () => props.speechInterim], () => {
  nextTick(() => {
    if (transcriptContentRef.value) {
      transcriptContentRef.value.scrollTop = transcriptContentRef.value.scrollHeight
    }
  })
})

onMounted(() => {
  if (candidateVideoRef.value && props.localStream) {
    candidateVideoRef.value.srcObject = props.localStream
  }
})

// 暴露视频元素引用
defineExpose({
  candidateVideoRef,
  interviewerVideoRef
})
</script>

<style scoped lang="scss">
.dual-camera-view {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  overflow: hidden;
}

.main-video-container {
  position: absolute;
  inset: 0;
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  
  .video-element {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%);
  backdrop-filter: blur(8px);
  
  &.mini {
    padding: 8px 12px;
  }
}

.video-info-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.video-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  
  .label-icon {
    font-size: 20px;
  }
  
  .label-text {
    font-size: 14px;
  }
}

.duration-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(102, 126, 234, 0.85);
  border-radius: 20px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  
  .duration-icon {
    font-size: 14px;
  }
  
  .duration-text {
    letter-spacing: 0.5px;
  }
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(239, 68, 68, 0.9);
  border-radius: 20px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  
  .rec-dot {
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    animation: blink 1s infinite;
  }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

.state-indicators {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  .indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    min-width: 160px;
    
    .indicator-label {
      font-size: 12px;
      color: rgba(255,255,255,0.8);
      min-width: 50px;
    }
    
    .indicator-bar {
      flex: 1;
      height: 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
      overflow: hidden;
      
      .indicator-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s ease;
      }
    }
    
    &.level-high .indicator-fill {
      background: linear-gradient(90deg, #10b981, #34d399);
    }
    
    &.level-medium .indicator-fill {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }
    
    &.level-low .indicator-fill {
      background: linear-gradient(90deg, #ef4444, #f87171);
    }
  }
}

.emotion-badge {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  backdrop-filter: blur(10px);
  
  &.emotion-positive {
    background: rgba(16, 185, 129, 0.9);
    color: white;
  }
  
  &.emotion-neutral {
    background: rgba(107, 114, 128, 0.9);
    color: white;
  }
  
  &.emotion-warning {
    background: rgba(245, 158, 11, 0.9);
    color: white;
  }
}

.pip-video-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 240px;
  height: 180px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  border: 3px solid rgba(255,255,255,0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  
  &.expanded {
    width: 400px;
    height: 300px;
  }
  
  &:hover {
    border-color: rgba(255,255,255,0.4);
    
    .pip-controls {
      opacity: 1;
    }
  }
  
  .video-wrapper {
    background: #0f0f23;
  }
}

.pip-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
  
  .pip-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: rgba(0,0,0,0.6);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    
    &:hover {
      background: rgba(102, 126, 234, 0.8);
    }
  }
}

.no-video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.8);
  
  .no-video-content {
    text-align: center;
    color: white;
    
    .no-video-icon {
      font-size: 64px;
      color: rgba(255,255,255,0.3);
      margin-bottom: 16px;
    }
    
    p {
      margin-bottom: 20px;
      color: rgba(255,255,255,0.7);
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 警告横幅
.warning-banners {
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px;
  z-index: 20;
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  
  .warning-icon {
    font-size: 18px;
  }
  
  .warning-text {
    flex: 1;
  }
  
  &.deception-warning {
    background: rgba(245, 158, 11, 0.95);
    color: #1a1a2e;
    border: 1px solid rgba(255, 193, 7, 0.5);
  }
  
  &.face-warning {
    background: rgba(239, 68, 68, 0.95);
    color: white;
    border: 1px solid rgba(248, 113, 113, 0.5);
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

// 左侧分析面板
.left-analysis-panel {
  position: absolute;
  top: 80px;
  left: 20px;
  width: 22%;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 25;
}

.analysis-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  
  &.warning-state {
    background: rgba(245, 158, 11, 0.2);
    border-color: rgba(245, 158, 11, 0.4);
  }
  
  .card-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: white;
    margin: 0 0 10px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    
    .title-icon {
      font-size: 14px;
    }
  }
}

// 大五人格分析
.personality-card {
  .personality-mini-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .personality-mini-item {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .trait-label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.9);
      min-width: 36px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
    
    .trait-mini-bar {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
      
      .trait-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s ease;
        
        &.openness {
          background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        &.conscientiousness {
          background: linear-gradient(90deg, #10b981, #34d399);
        }
        
        &.extraversion {
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
        }
        
        &.agreeableness {
          background: linear-gradient(90deg, #06b6d4, #22d3ee);
        }
        
        &.neuroticism {
          background: linear-gradient(90deg, #ef4444, #f87171);
        }
      }
    }
    
    .trait-percent {
      font-size: 10px;
      font-weight: 600;
      color: white;
      min-width: 28px;
      text-align: right;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
  }
}

// 检测卡片
.detection-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detection-card {
  .detection-meter {
    display: flex;
    justify-content: center;
    
    .meter-circle {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      
      &.level-normal {
        background: conic-gradient(#10b981 0deg, rgba(255, 255, 255, 0.2) 0deg);
      }
      
      &.level-warning {
        background: conic-gradient(#f59e0b 0deg, rgba(255, 255, 255, 0.2) 0deg);
      }
      
      &.level-danger {
        background: conic-gradient(#ef4444 0deg, rgba(255, 255, 255, 0.2) 0deg);
      }
      
      &.depression-meter {
        background: conic-gradient(#6b7280 0deg, rgba(255, 255, 255, 0.2) 0deg);
      }
      
      .meter-value {
        font-size: 11px;
        font-weight: 700;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
    }
  }
}

// 实时转录显示区域
.transcript-overlay {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  max-width: 500px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 15;
  
  .transcript-header {
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .transcript-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      
      .transcript-icon {
        font-size: 16px;
        color: #10b981;
      }
      
      .listening-indicator {
        .listening-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse-listening 1.5s infinite;
        }
      }
    }
    
    .transcript-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .el-button {
        padding: 2px 8px;
        font-size: 11px;
        height: auto;
        min-height: auto;
      }
      
      .transcript-status {
        font-size: 11px;
        color: #9ca3af;
        padding: 2px 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }
    }
  }
  
  .transcript-content {
    padding: 16px;
    max-height: 150px;
    overflow-y: auto;
    scroll-behavior: smooth;
    
    .transcript-text {
      color: white;
      font-size: 14px;
      line-height: 1.6;
      word-wrap: break-word;
      word-break: break-word;
      
      .final-text {
        color: #f3f4f6;
      }
      
      .interim-text {
        color: #9ca3af;
        font-style: italic;
      }
      
      .cursor-indicator {
        color: #10b981;
        font-weight: bold;
        animation: blink-cursor 1s infinite;
        margin-left: 2px;
      }
    }
    
    .transcript-placeholder {
      color: #6b7280;
      font-size: 13px;
      font-style: italic;
      text-align: center;
      padding: 8px 0;
    }
  }
  
  // 自定义滚动条
  .transcript-content::-webkit-scrollbar {
    width: 4px;
  }
  
  .transcript-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  
  .transcript-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }
  
  .transcript-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
}

@keyframes pulse-listening {
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.6;
    transform: scale(1.2);
  }
}

@keyframes blink-cursor {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
