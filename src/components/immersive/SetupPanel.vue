<template>
  <div class="setup-panel">
    <div class="setup-card">
      <div class="setup-header">
        <el-icon class="setup-icon"><Setting /></el-icon>
        <h2>面试设置</h2>
      </div>

      <el-form label-position="top" class="setup-form">
        <!-- 选择候选人 -->
        <el-form-item label="选择候选人">
          <el-select
            :model-value="selectedApplicationId"
            @update:model-value="$emit('update:selectedApplicationId', $event)"
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

        <!-- 摄像头模式 -->
        <el-form-item label="摄像头模式">
          <el-radio-group :model-value="config.cameraMode" @update:model-value="updateConfig('cameraMode', $event)" class="camera-mode-group">
            <el-radio value="local">仅本地摄像头</el-radio>
            <el-radio value="stream">仅网络推流</el-radio>
            <el-radio value="dual">双摄像头（本地+推流）</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 网络推流地址 -->
        <el-form-item 
          v-if="config.cameraMode === 'stream' || config.cameraMode === 'dual'" 
          label="网络摄像头推流地址"
        >
          <el-input
            :model-value="config.streamUrl"
            @update:model-value="updateConfig('streamUrl', $event)"
            placeholder="请输入推流地址，如 rtsp://... 或 http://.../stream.m3u8"
            clearable
          >
            <template #prepend>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
          <div class="form-tip">支持 RTSP/HLS/HTTP-FLV 等常见推流协议</div>
        </el-form-item>

        <!-- 行为分析源选择 -->
        <el-form-item v-if="config.cameraMode === 'dual'" label="行为分析视频源">
          <el-select :model-value="config.analyzeSource" @update:model-value="updateConfig('analyzeSource', $event)" class="full-width">
            <el-option value="local" label="本地摄像头（考官）" />
            <el-option value="stream" label="网络推流（考生）" />
          </el-select>
          <div class="form-tip">选择哪个摄像头的画面用于 AI 行为分析</div>
        </el-form-item>

        <!-- 功能开关 -->
        <el-form-item label="功能设置">
          <div class="feature-toggles">
            <el-checkbox 
              :model-value="config.localCameraEnabled"
              @update:model-value="updateConfig('localCameraEnabled', $event)"
              :disabled="config.cameraMode === 'stream'"
            >
              启用本地摄像头
            </el-checkbox>
            <el-checkbox :model-value="config.autoAnalyze" @update:model-value="updateConfig('autoAnalyze', $event)">自动行为分析</el-checkbox>
          </div>
        </el-form-item>

        <!-- 分析间隔 -->
        <el-form-item label="分析帧间隔">
          <el-slider
            :model-value="config.analyzeInterval"
            @update:model-value="updateConfig('analyzeInterval', $event)"
            :min="1"
            :max="10"
            :step="1"
            :marks="{ 1: '1秒', 3: '3秒', 5: '5秒', 10: '10秒' }"
            show-stops
          />
        </el-form-item>

        <!-- AI 建议配置 -->
        <el-divider content-position="left">
          <el-icon><MagicStick /></el-icon>
          AI 提问建议
        </el-divider>

        <div class="ai-config-grid">
          <el-form-item label="追问数量">
            <el-input-number
              :model-value="config.followupCount"
              @update:model-value="updateConfig('followupCount', $event)"
              :min="1"
              :max="5"
              :step="1"
              size="small"
            />
            <div class="form-tip">每轮回答后推荐的追问数</div>
          </el-form-item>

          <el-form-item label="候选问题数">
            <el-input-number
              :model-value="config.alternativeCount"
              @update:model-value="updateConfig('alternativeCount', $event)"
              :min="2"
              :max="6"
              :step="1"
              size="small"
            />
            <div class="form-tip">不同角度的备选问题数</div>
          </el-form-item>

          <el-form-item label="简历兴趣点">
            <el-input-number
              :model-value="config.interestPointCount"
              @update:model-value="updateConfig('interestPointCount', $event)"
              :min="1"
              :max="5"
              :step="1"
              size="small"
            />
            <div class="form-tip">从简历提取的兴趣点数</div>
          </el-form-item>
        </div>
      </el-form>

      <div class="setup-actions">
        <el-button
          type="primary"
          size="large"
          :loading="isLoading"
          :disabled="!selectedApplicationId"
          @click="$emit('create-session')"
        >
          <el-icon><VideoCamera /></el-icon>
          创建面试会话
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Setting, VideoCamera, Link, MagicStick } from '@element-plus/icons-vue'

export interface SetupConfig {
  cameraMode: 'local' | 'stream' | 'dual'
  streamUrl: string
  analyzeSource: 'local' | 'stream'
  localCameraEnabled: boolean
  autoAnalyze: boolean
  analyzeInterval: number
  // AI 建议配置
  followupCount: number
  alternativeCount: number
  interestPointCount: number
}

export interface ApplicationItem {
  id: string
  candidate_name: string
  position_title: string
  resume_id?: string
  screening_task_id?: string
}

defineProps<{
  config: SetupConfig
  selectedApplicationId: string
  applications: ApplicationItem[]
  isLoadingCandidates: boolean
  isLoading: boolean
}>()

const emit = defineEmits<{
  'update:selectedApplicationId': [value: string]
  'update:config': [key: keyof SetupConfig, value: any]
  'create-session': []
}>()

const updateConfig = (key: keyof SetupConfig, value: any) => {
  emit('update:config', key, value)
}
</script>

<style scoped lang="scss">
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

.camera-mode-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-tip {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.ai-config-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  .el-form-item {
    margin-bottom: 0;
  }

  .el-input-number {
    width: 100%;
  }
}

:deep(.el-divider__text) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #667eea;
}
</style>
