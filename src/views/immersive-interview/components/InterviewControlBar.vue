<template>
  <div class="control-bar">
    <div class="control-left">
      <!-- 四格环节指示器 + 自动切换开关 -->
      <div class="stage-row">
        <div class="stage-indicator" v-if="stages.length > 0">
          <div 
            v-for="(stage, index) in stages" 
            :key="index"
            :class="['stage-item', { 
              active: index + 1 === currentStage,
              completed: index + 1 < currentStage 
            }]"
            @click="$emit('set-stage', index + 1)"
            :title="stage.description"
          >
            <span class="stage-number">
              <el-icon v-if="index + 1 < currentStage"><Check /></el-icon>
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span class="stage-name">{{ stage.name }}</span>
          </div>
        </div>
        <!-- 自动切换环节开关 -->
        <div class="auto-stage-switch">
          <el-switch
            v-model="autoStageSwitch"
            size="small"
            active-text="自动环节"
            @change="$emit('update:autoStageSwitch', $event)"
          />
        </div>
      </div>
    </div>
    <div class="control-center">
      <el-button-group>
        <el-button
          v-if="!isRecording"
          type="success"
          size="large"
          @click="$emit('start-interview')"
        >
          <el-icon><VideoPlay /></el-icon>
          开始面试
        </el-button>
        <el-button
          v-else
          type="danger"
          size="large"
          @click="$emit('stop-interview')"
        >
          <el-icon><VideoPause /></el-icon>
          结束面试
        </el-button>
      </el-button-group>
    </div>
    <div class="control-right">
      <!-- 语音转写控制 -->
      <el-button
        v-if="isRecording && !isSpeechListening"
        :type="isSpeechConfigured ? 'primary' : 'warning'"
        @click="$emit('toggle-speech')"
        :disabled="!speechSupported"
      >
        <el-icon><Microphone /></el-icon>
        {{ isSpeechConfigured ? '开始转写' : '配置语音' }}
      </el-button>
      <el-button
        v-if="isRecording && isSpeechListening"
        type="success"
        @click="$emit('toggle-speech')"
      >
        <el-icon><Switch /></el-icon>
        切换发言人
      </el-button>
      <el-button
        v-if="isRecording && isSpeechListening"
        type="warning"
        @click="$emit('stop-speech')"
      >
        停止转写
      </el-button>
      <!-- 语音配置按钮（已配置时显示，用于更新Token） -->
      <el-button
        v-if="isRecording && isSpeechConfigured"
        type="info"
        circle
        title="修改语音识别配置"
        @click="$emit('open-speech-config')"
      >
        <el-icon><Setting /></el-icon>
      </el-button>
      <el-button type="danger" plain @click="$emit('end-session')">
        <el-icon><Close /></el-icon>
        退出会话
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  VideoPlay,
  VideoPause,
  Microphone,
  Switch,
  Close,
  Setting,
  Check
} from '@element-plus/icons-vue'

export interface SessionInfo {
  candidate_name?: string | null
  position_title?: string | null
}

export interface StageInfo {
  name: string
  description: string
}

const props = defineProps<{
  session: SessionInfo | null
  isRecording: boolean
  isSpeechListening: boolean
  isSpeechConfigured: boolean
  speechSupported: boolean
  stages: StageInfo[]
  currentStage: number
  autoStageSwitch: boolean
}>()

const autoStageSwitch = defineModel<boolean>('autoStageSwitch', { default: true })

defineEmits<{
  'start-interview': []
  'stop-interview': []
  'toggle-speech': []
  'stop-speech': []
  'open-speech-config': []
  'end-session': []
  'set-stage': [stageIndex: number]
  'update:autoStageSwitch': [value: boolean]
}>()
</script>

<style scoped lang="scss">
.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 16px;
  padding: 16px 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);

  .control-left {
    display: flex;
    align-items: center;
    min-width: 320px;

    .stage-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stage-indicator {
      display: flex;
      gap: 4px;

      .stage-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 8px;
        background: #f3f4f6;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;

        &:hover {
          background: #e5e7eb;
        }

        &.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #667eea;

          .stage-number {
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }
        }

        &.completed {
          background: #d1fae5;
          border-color: #10b981;

          .stage-number {
            background: #10b981;
            color: white;
          }
        }

        .stage-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #d1d5db;
          font-size: 11px;
          font-weight: 600;
          color: #4b5563;
        }

        .stage-name {
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }
      }
    }

    .auto-stage-switch {
      display: flex;
      align-items: center;
      
      :deep(.el-switch) {
        --el-switch-on-color: #10b981;
      }
      
      :deep(.el-switch__label) {
        font-size: 11px;
        color: #6b7280;
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
</style>
