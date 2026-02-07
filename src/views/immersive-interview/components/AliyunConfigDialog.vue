<template>
  <el-dialog :model-value="visible" @update:model-value="$emit('update:visible', $event)" title="阿里云语音识别配置" width="500px">
    <el-form label-position="top">
      <el-form-item label="AppKey" required>
        <el-input :model-value="config.appKey" @update:model-value="updateConfig('appKey', $event)" placeholder="从阿里云智能语音交互控制台获取" />
      </el-form-item>
      <el-form-item label="Token" required>
        <el-input :model-value="config.token" @update:model-value="updateConfig('token', $event)" type="password" placeholder="从阿里云控制台或CLI获取，有效期24小时" show-password />
      </el-form-item>
      <el-alert type="info" :closable="false" class="config-tip">
        <template #title>
          <p style="margin: 0;">获取方式：</p>
          <ol style="margin: 8px 0 0; padding-left: 20px;">
            <li>登录阿里云控制台，进入智能语音交互</li>
            <li>创建项目获取 AppKey</li>
            <li>使用 CLI 命令或控制台获取 Token（有效期24小时）</li>
          </ol>
        </template>
      </el-alert>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="$emit('save')">保存配置</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
export interface AliyunConfig {
  appKey: string
  token: string
}

defineProps<{
  visible: boolean
  config: AliyunConfig
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:config': [key: keyof AliyunConfig, value: string]
  'save': []
}>()

const updateConfig = (key: keyof AliyunConfig, value: string) => {
  emit('update:config', key, value)
}
</script>

<style scoped lang="scss">
.config-tip {
  margin-top: 16px;
}
</style>
