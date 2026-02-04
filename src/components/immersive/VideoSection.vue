<template>
  <div class="video-section">
    <!-- 单摄像头模式：本地摄像头 -->
    <template v-if="cameraMode === 'local'">
      <div class="video-container">
        <video
          v-if="localCameraEnabled"
          ref="localVideoRef"
          class="interview-video"
          autoplay
          playsinline
          muted
        ></video>
        <div v-else class="video-placeholder">
          <el-icon :size="64"><VideoCamera /></el-icon>
          <p>摄像头未启用</p>
        </div>
        <transition name="gaze-fade">
          <div v-if="isRecording && isGazeDrifting" class="gaze-warning">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">视线游离</span>
          </div>
        </transition>
        <div v-if="isRecording" class="analysis-indicator" :class="{ active: isWsConnected }">
          <span class="indicator-dot"></span>
          <span class="indicator-text">{{ isWsConnected ? '分析中' : '连接中...' }}</span>
        </div>
      </div>
    </template>

    <!-- 单摄像头模式：网络推流 -->
    <template v-else-if="cameraMode === 'stream'">
      <div class="video-container">
        <video
          v-if="streamUrl"
          ref="streamVideoRef"
          class="interview-video"
          autoplay
          playsinline
          muted
          crossorigin="anonymous"
        ></video>
        <div v-else class="video-placeholder">
          <el-icon :size="64"><Link /></el-icon>
          <p>未配置推流地址</p>
        </div>
        <transition name="gaze-fade">
          <div v-if="isRecording && isGazeDrifting" class="gaze-warning">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">视线游离</span>
          </div>
        </transition>
        <div v-if="isRecording" class="analysis-indicator" :class="{ active: isWsConnected }">
          <span class="indicator-dot"></span>
          <span class="indicator-text">{{ isWsConnected ? '分析中' : '连接中...' }}</span>
        </div>
      </div>
    </template>

    <!-- 双摄像头模式：画中画 -->
    <template v-else-if="cameraMode === 'dual'">
      <!-- 本地摄像头视频 -->
      <div 
        class="video-container"
        :class="pipSwapped ? 'main-position' : 'pip-position'"
        @click="!pipSwapped && $emit('toggle-pip')"
      >
        <div class="video-label">本地（考官）</div>
        <video
          v-if="localCameraEnabled"
          ref="localVideoRef"
          class="interview-video"
          autoplay
          playsinline
          muted
        ></video>
        <div v-else class="video-placeholder">
          <el-icon :size="pipSwapped ? 64 : 24"><VideoCamera /></el-icon>
          <p v-if="pipSwapped">摄像头未启用</p>
        </div>
        <template v-if="pipSwapped">
          <transition name="gaze-fade">
            <div v-if="isRecording && isGazeDrifting && analyzeSource === 'local'" class="gaze-warning">
              <span class="warning-icon">⚠️</span>
              <span class="warning-text">视线游离</span>
            </div>
          </transition>
          <div v-if="isRecording && analyzeSource === 'local'" class="analysis-indicator" :class="{ active: isWsConnected }">
            <span class="indicator-dot"></span>
            <span class="indicator-text">{{ isWsConnected ? '分析中' : '连接中...' }}</span>
          </div>
        </template>
      </div>

      <!-- 网络推流视频 -->
      <div 
        class="video-container"
        :class="pipSwapped ? 'pip-position' : 'main-position'"
        @click="pipSwapped && $emit('toggle-pip')"
      >
        <div class="video-label">推流（考生）</div>
        <video
          v-if="streamUrl"
          ref="streamVideoRef"
          class="interview-video"
          autoplay
          playsinline
          muted
          crossorigin="anonymous"
        ></video>
        <div v-else class="video-placeholder">
          <el-icon :size="pipSwapped ? 24 : 64"><Link /></el-icon>
          <p v-if="!pipSwapped">未配置推流地址</p>
        </div>
        <template v-if="!pipSwapped">
          <transition name="gaze-fade">
            <div v-if="isRecording && isGazeDrifting && analyzeSource === 'stream'" class="gaze-warning">
              <span class="warning-icon">⚠️</span>
              <span class="warning-text">视线游离</span>
            </div>
          </transition>
          <div v-if="isRecording && analyzeSource === 'stream'" class="analysis-indicator" :class="{ active: isWsConnected }">
            <span class="indicator-dot"></span>
            <span class="indicator-text">{{ isWsConnected ? '分析中' : '连接中...' }}</span>
          </div>
        </template>
      </div>

      <!-- 互换按钮 -->
      <el-button 
        class="pip-swap-btn" 
        circle 
        @click="$emit('toggle-pip')"
      >
        <el-icon><Switch /></el-icon>
      </el-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VideoCamera, Link, Switch } from '@element-plus/icons-vue'

const props = defineProps<{
  cameraMode: 'local' | 'stream' | 'dual'
  localCameraEnabled: boolean
  streamUrl: string
  analyzeSource: 'local' | 'stream'
  isRecording: boolean
  isWsConnected: boolean
  isGazeDrifting: boolean
  pipSwapped: boolean
  localVideoStream?: MediaStream | null
}>()

defineEmits<{
  'toggle-pip': []
}>()

const localVideoRef = ref<HTMLVideoElement | null>(null)
const streamVideoRef = ref<HTMLVideoElement | null>(null)

// 暴露 video ref 给父组件
defineExpose({
  localVideoRef,
  streamVideoRef
})

// 监听 localVideoStream 变化，自动绑定到 video 元素并播放
watch(
  () => props.localVideoStream,
  async (stream) => {
    if (localVideoRef.value && stream) {
      localVideoRef.value.srcObject = stream
      await localVideoRef.value.play()
    }
  },
  { immediate: true }
)

// 监听 localVideoRef 变化（组件挂载时）
watch(
  localVideoRef,
  async (el) => {
    if (el && props.localVideoStream) {
      el.srcObject = props.localVideoStream
      await el.play()
    }
  }
)
</script>

<style scoped lang="scss">
.video-section {
  background: #1a1a2e;
  border-radius: 20px;
  overflow: hidden;
  position: relative;

  .video-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    transition: all 0.3s ease;

    // 主画面位置
    &.main-position {
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    // 画中画位置
    &.pip-position {
      position: absolute;
      right: 16px;
      bottom: 16px;
      width: 200px;
      height: 150px;
      background: #0d0d1a;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.1);
      z-index: 20;

      &:hover {
        transform: scale(1.02);
        border-color: rgba(102, 126, 234, 0.5);
      }

      .video-label {
        top: 8px;
        left: 8px;
        bottom: auto;
        padding: 2px 8px;
        font-size: 10px;
      }

      .video-placeholder {
        gap: 8px;
      }
    }
  }

  // 视频标签
  .video-label {
    position: absolute;
    bottom: 12px;
    left: 12px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    z-index: 10;
  }

  .interview-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: rgba(255, 255, 255, 0.5);

    p {
      font-size: 14px;
    }
  }

  // 互换按钮
  .pip-swap-btn {
    position: absolute;
    right: 224px;
    bottom: 24px;
    background: rgba(255, 255, 255, 0.15) !important;
    border: none !important;
    color: white !important;
    backdrop-filter: blur(8px);
    z-index: 25;
    transition: background 0.2s, transform 0.2s;

    &:hover {
      background: rgba(102, 126, 234, 0.6) !important;
      transform: scale(1.1);
    }
  }

  // 视线游离警告
  .gaze-warning {
    position: absolute;
    top: 20px;
    left: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(245, 158, 11, 0.85);
    backdrop-filter: blur(8px);
    padding: 8px 14px;
    border-radius: 20px;
    box-shadow: 0 2px 12px rgba(245, 158, 11, 0.4);
    animation: warning-pulse 1.5s ease-in-out infinite;

    .warning-icon {
      font-size: 14px;
    }

    .warning-text {
      color: white;
      font-size: 13px;
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }
  }

  @keyframes warning-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(1.02); }
  }

  // 分析状态指示器
  .analysis-indicator {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    padding: 8px 16px;
    border-radius: 20px;

    .indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
    }

    .indicator-text {
      color: white;
      font-size: 12px;
    }

    &.active {
      .indicator-dot {
        background: #10b981;
        animation: pulse 1.5s infinite;
      }
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
}

// 视线游离警告淡入淡出动画
.gaze-fade-enter-active,
.gaze-fade-leave-active {
  transition: all 0.3s ease;
}

.gaze-fade-enter-from,
.gaze-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
