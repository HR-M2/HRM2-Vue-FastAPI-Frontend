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
          <div class="video-label">
            <span class="label-icon">👤</span>
            <span class="label-text">{{ candidateName || '候选人' }}</span>
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
      </div>
    </div>

    <!-- 画中画 - 面试官 -->
    <div class="pip-video-container" :class="{ 'expanded': isPipExpanded }">
      <div class="video-wrapper interviewer-video">
        <video
          ref="interviewerVideoRef"
          autoplay
          playsinline
          class="video-element"
          :src="streamUrl"
        ></video>
        <div class="video-overlay mini">
          <div class="video-label">
            <span class="label-icon">🎤</span>
            <span class="label-text">面试官</span>
          </div>
        </div>
        
        <!-- 控制按钮 -->
        <div class="pip-controls">
          <button class="pip-btn" @click="togglePipExpand" :title="isPipExpanded ? '缩小' : '放大'">
            <el-icon><FullScreen v-if="!isPipExpanded" /><ScaleToOriginal v-else /></el-icon>
          </button>
          <button class="pip-btn" @click="swapVideos" title="切换位置">
            <el-icon><Switch /></el-icon>
          </button>
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
import { ref, computed, watch, onMounted } from 'vue'
import { FullScreen, ScaleToOriginal, Switch, VideoCameraFilled } from '@element-plus/icons-vue'
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
}

const props = withDefaults(defineProps<Props>(), {
  candidateName: '候选人',
  streamUrl: '',
  isRecording: false,
  candidateState: null,
  emotionLabel: '',
  localStream: null,
  deceptionScore: 0,
  faceOutOfFrame: false
})

// 欺骗警告显示（分数 > 0.5）
const showDeceptionWarning = computed(() => props.deceptionScore > 0.5)

const emit = defineEmits<{
  (e: 'init-camera'): void
}>()

const candidateVideoRef = ref<HTMLVideoElement | null>(null)
const interviewerVideoRef = ref<HTMLVideoElement | null>(null)
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

// 监听本地流变化
watch(() => props.localStream, (stream) => {
  if (candidateVideoRef.value && stream) {
    candidateVideoRef.value.srcObject = stream
  }
}, { immediate: true })

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
  
  &.mini {
    padding: 8px 12px;
  }
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
</style>
