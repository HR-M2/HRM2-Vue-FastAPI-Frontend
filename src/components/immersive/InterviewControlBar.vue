<template>
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
  Setting
} from '@element-plus/icons-vue'

export interface SessionInfo {
  candidate_name?: string | null
  position_title?: string | null
}

defineProps<{
  session: SessionInfo | null
  isRecording: boolean
  isSpeechListening: boolean
  isSpeechConfigured: boolean
  speechSupported: boolean
}>()

defineEmits<{
  'start-interview': []
  'stop-interview': []
  'toggle-speech': []
  'stop-speech': []
  'open-speech-config': []
  'end-session': []
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
</style>
