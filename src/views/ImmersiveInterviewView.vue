<template>
  <div class="immersive-interview-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <span class="title-icon">🎬</span>
            沉浸式面试
            <el-tag type="warning" size="small" effect="dark" class="exp-tag">实验性</el-tag>
          </h1>
          <p class="page-desc">实时视频面试 · AI情绪识别 · 智能注视检测</p>
        </div>
        <div class="header-right">
          <el-tag v-if="isRecording" type="danger" effect="dark" size="large" class="status-tag">
            <span class="status-dot"></span>
            面试进行中 · {{ formatDuration(stats.duration) }}
          </el-tag>
          <el-tag v-else-if="isSessionActive" type="success" effect="plain" size="large">
            会话已就绪
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 设置面板（未开始时显示） -->
    <transition name="fade">
      <div v-if="!isSessionActive" class="setup-panel">
        <div class="setup-card">
          <div class="setup-header">
            <el-icon class="setup-icon"><Setting /></el-icon>
            <h2>面试设置</h2>
          </div>

          <el-form label-position="top" class="setup-form">
            <!-- 选择候选人 -->
            <el-form-item label="选择候选人">
              <el-select
                v-model="selectedApplicationId"
                placeholder="请选择待面试的候选人"
                filterable
                class="full-width"
                :loading="isLoadingCandidates"
              >
                <el-option
                  v-for="app in applications"
                  :key="app.id"
                  :label="`${app.candidate_name} - ${app.position_title}`"
                  :value="app.id"
                >
                  <div class="candidate-option">
                    <span class="candidate-name">{{ app.candidate_name }}</span>
                    <span class="candidate-position">{{ app.position_title }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <!-- 功能开关 -->
            <el-form-item label="功能设置">
              <div class="feature-toggles">
                <el-checkbox v-model="config.localCameraEnabled">启用摄像头（用于行为分析）</el-checkbox>
                <el-checkbox v-model="config.autoAnalyze">自动行为分析</el-checkbox>
              </div>
            </el-form-item>

            <!-- 分析间隔 -->
            <el-form-item label="分析帧间隔">
              <el-slider
                v-model="config.analyzeInterval"
                :min="1"
                :max="10"
                :step="1"
                :marks="{ 1: '1秒', 3: '3秒', 5: '5秒', 10: '10秒' }"
                show-stops
              />
            </el-form-item>
          </el-form>

          <div class="setup-actions">
            <el-button
              type="primary"
              size="large"
              :loading="isLoading"
              :disabled="!selectedApplicationId"
              @click="handleCreateSession"
            >
              <el-icon><VideoCamera /></el-icon>
              创建面试会话
            </el-button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 主面试界面 -->
    <transition name="slide-up">
      <div v-if="isSessionActive" class="main-interview-area">
        <!-- 控制栏 -->
        <div class="control-bar">
          <div class="control-left">
            <div class="candidate-info" v-if="session">
              <span class="info-label">候选人：</span>
              <span class="info-value">{{ session.candidate_name }}</span>
              <el-divider direction="vertical" />
              <span class="info-label">应聘岗位：</span>
              <span class="info-value">{{ session.position_title }}</span>
            </div>
          </div>
          <div class="control-center">
            <el-button-group>
              <el-button
                v-if="!isRecording"
                type="success"
                size="large"
                @click="handleStartInterview"
              >
                <el-icon><VideoPlay /></el-icon>
                开始面试
              </el-button>
              <el-button
                v-else
                type="danger"
                size="large"
                @click="handleStopInterview"
              >
                <el-icon><VideoPause /></el-icon>
                结束面试
              </el-button>
            </el-button-group>
          </div>
          <div class="control-right">
            <el-button @click="handleFetchSuggestions" :loading="isLoading">
              <el-icon><MagicStick /></el-icon>
              获取建议
            </el-button>
            <el-button type="danger" plain @click="handleEndSession">
              <el-icon><Close /></el-icon>
              退出会话
            </el-button>
          </div>
        </div>

        <!-- 主内容区 -->
        <div class="content-grid">
          <!-- 左侧：视频区 -->
          <div class="video-section">
            <div class="video-container">
              <video
                v-if="config.localCameraEnabled"
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

              <!-- 情绪状态浮层 -->
              <div v-if="isRecording && currentEmotionLabel" class="emotion-overlay">
                <span class="emotion-label">{{ currentEmotionLabel }}</span>
              </div>

              <!-- 分析状态指示器 -->
              <div v-if="isRecording" class="analysis-indicator" :class="{ active: isWsConnected }">
                <span class="indicator-dot"></span>
                <span class="indicator-text">{{ isWsConnected ? '分析中' : '连接中...' }}</span>
              </div>
            </div>
          </div>

          <!-- 右侧：实时分析面板 -->
          <div class="analysis-section">
            <RealTimeAnalysisPanel
              :is-connected="isWsConnected"
              :emotions="currentBehavior?.emotions || []"
              :gaze="currentBehavior?.gaze || null"
              :suggestions="suggestions"
              :stats="stats"
              :candidate-info="candidateInfo"
              @refresh-suggestions="handleFetchSuggestions"
              @use-suggestion="handleUseSuggestion"
            />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  VideoCamera,
  VideoPlay,
  VideoPause,
  MagicStick,
  Close
} from '@element-plus/icons-vue'
import RealTimeAnalysisPanel from '@/components/immersive/RealTimeAnalysisPanel.vue'
import { useImmersiveInterview, type QuestionSuggestion } from '@/composables/useImmersiveInterview'
import { getApplications } from '@/api/sdk.gen'
import type { ApplicationDetailResponse } from '@/api/types.gen'

// 使用 composable
const {
  config,
  sessionId,
  session,
  isLoading,
  isRecording,
  isSessionActive,
  isWsConnected,
  localVideoRef,
  currentBehavior,
  currentEmotionLabel,
  suggestions,
  stats,
  createSession,
  initLocalCamera,
  startInterview,
  stopInterview,
  fetchSuggestions,
  deleteSession
} = useImmersiveInterview()

// 本地状态
const selectedApplicationId = ref('')
const applications = ref<Array<{
  id: string
  candidate_name: string
  position_title: string
  resume_id?: string
  screening_task_id?: string
}>>([])
const isLoadingCandidates = ref(false)

// 获取候选人列表
const fetchApplications = async () => {
  isLoadingCandidates.value = true
  try {
    const result = await getApplications({ query: { page_size: 100 } })
    if (result.data?.data?.items) {
      applications.value = result.data.data.items.map((item: ApplicationDetailResponse) => ({
        id: item.id,
        candidate_name: item.candidate_name || '未知',
        position_title: item.position_title || '未知岗位',
        resume_id: item.resume?.id,
        screening_task_id: item.screening_task?.id
      }))
    }
  } catch (error) {
    console.error('获取候选人列表失败:', error)
    ElMessage.error('获取候选人列表失败')
  } finally {
    isLoadingCandidates.value = false
  }
}

// 候选人信息
const candidateInfo = computed(() => {
  const selectedApp = applications.value.find(app => app.id === selectedApplicationId.value)
  return {
    name: session.value?.candidate_name || selectedApp?.candidate_name || '',
    position: session.value?.position_title || selectedApp?.position_title || '',
    applicationId: selectedApplicationId.value,
    resumeId: selectedApp?.resume_id,
    screeningTaskId: selectedApp?.screening_task_id
  }
})

// 创建会话
const handleCreateSession = async () => {
  if (!selectedApplicationId.value) {
    ElMessage.warning('请选择候选人')
    return
  }

  const success = await createSession(selectedApplicationId.value)
  if (success && config.localCameraEnabled) {
    await initLocalCamera()
  }
}

// 开始面试
const handleStartInterview = async () => {
  const success = await startInterview()
  if (success && config.localCameraEnabled) {
    // 确保视频流已初始化
    if (!localVideoRef.value?.srcObject) {
      await initLocalCamera()
    }
  }
}

// 结束面试
const handleStopInterview = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要结束本次面试吗？',
      '结束面试',
      {
        confirmButtonText: '确定结束',
        cancelButtonText: '继续面试',
        type: 'warning'
      }
    )
    await stopInterview()
  } catch {
    // 用户取消
  }
}

// 退出会话
const handleEndSession = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出会话吗？所有未保存的数据将丢失。',
      '退出会话',
      {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await deleteSession()
    selectedApplicationId.value = ''
  } catch {
    // 用户取消
  }
}

// 获取建议
const handleFetchSuggestions = async () => {
  await fetchSuggestions()
}

// 使用建议
const handleUseSuggestion = (suggestion: QuestionSuggestion) => {
  ElMessage.success(`已复制问题：${suggestion.question}`)
}

// 格式化时长
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 生命周期
onMounted(() => {
  fetchApplications()
})
</script>

<style scoped lang="scss">
.immersive-interview-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: calc(100vh - 140px);
}

// 页面头部
.page-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 28px 32px;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    .page-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 700;
      color: white;

      .title-icon {
        font-size: 32px;
      }

      .exp-tag {
        font-size: 11px;
        margin-left: 8px;
      }
    }

    .page-desc {
      margin: 0;
      font-size: 15px;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 0.5px;
    }
  }

  .status-tag {
    padding: 10px 20px;
    font-size: 14px;
    border-radius: 25px;

    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: white;
      margin-right: 8px;
      animation: pulse 1.5s infinite;
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

// 设置面板
.setup-panel {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.setup-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);

  .setup-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;

    .setup-icon {
      font-size: 28px;
      color: #667eea;
    }

    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a2e;
    }
  }

  .setup-form {
    .full-width {
      width: 100%;
    }

    .feature-toggles {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  }

  .setup-actions {
    margin-top: 32px;
    display: flex;
    justify-content: center;

    .el-button {
      padding: 14px 40px;
      font-size: 16px;
    }
  }
}

.candidate-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .candidate-name {
    font-weight: 500;
  }

  .candidate-position {
    font-size: 12px;
    color: #9ca3af;
  }
}

// 主面试区域
.main-interview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 16px;
  padding: 16px 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);

  .control-left {
    .candidate-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .info-label {
        font-size: 13px;
        color: #6b7280;
      }

      .info-value {
        font-size: 14px;
        font-weight: 600;
        color: #1a1a2e;
      }
    }
  }

  .control-center {
    .el-button {
      padding: 12px 28px;
    }
  }

  .control-right {
    display: flex;
    gap: 10px;
  }
}

.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 20px;
  min-height: 500px;
}

.video-section {
  background: #1a1a2e;
  border-radius: 20px;
  overflow: hidden;

  .video-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
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

  // 情绪浮层
  .emotion-overlay {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    padding: 8px 16px;
    border-radius: 20px;

    .emotion-label {
      color: white;
      font-size: 14px;
      font-weight: 500;
    }
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
}

.analysis-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

// 动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  transform: translateY(-30px);
}

// 响应式
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;

    .video-section {
      height: 400px;
    }

    .analysis-section {
      height: 500px;
    }
  }
}
</style>
