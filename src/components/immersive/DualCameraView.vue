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

        <!-- 实时语音转录显示区域 -->
        <transition name="slide-up">
          <div v-if="showTranscript" class="transcript-overlay">
            <div class="transcript-header">
              <div class="transcript-title">
                <el-icon class="transcript-icon"><Microphone /></el-icon>
                <span>实时转录</span>
                <div v-if="isSpeechListening" class="listening-indicator">
                  <span class="listening-dot"></span>
                </div>
              </div>
              <div class="transcript-controls">
                <el-button 
                  v-if="speechTranscript"
                  size="small" 
                  type="danger" 
                  text
                  @click="$emit('clearTranscript')"
                >
                  清空
                </el-button>
                <span class="transcript-status">
                  {{ isSpeechListening ? '录音中' : '已暂停' }}
                </span>
              </div>
            </div>
            <div class="transcript-content" ref="transcriptContentRef">
              <div v-if="speechTranscript || speechInterim" class="transcript-text">
                <!-- 已确认的累积文字 -->
                <span v-if="speechTranscript" class="final-text">{{ speechTranscript }}</span>
                <!-- 临时识别的文字 -->
                <span v-if="speechInterim" class="interim-text">{{ speechInterim }}</span>
                <!-- 光标指示器 -->
                <span v-if="isSpeechListening" class="cursor-indicator">|</span>
              </div>
              <div v-else class="transcript-placeholder">
                {{ isSpeechListening ? '正在监听语音...' : '等待语音输入' }}
              </div>
            </div>
          </div>
        </transition>
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
  showTranscript: false
})

// 欺骗警告显示（分数 > 0.5）
const showDeceptionWarning = computed(() => props.deceptionScore > 0.5)

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
