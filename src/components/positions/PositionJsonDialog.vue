<template>
  <el-dialog
    v-model="visible"
    title="当前岗位 JSON 数据"
    width="600px"
    :close-on-click-modal="true"
  >
    <div class="json-dialog-content">
      <!-- 操作提示 -->
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="copy-tip"
      >
        <template #title>
          <span>点击下方按钮可复制完整的 JSON 数据</span>
        </template>
      </el-alert>

      <!-- JSON 预览 -->
      <div class="json-preview">
        <pre><code>{{ formattedJson }}</code></pre>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">关闭</el-button>
        <el-button type="primary" @click="handleCopy">
          <el-icon><DocumentCopy /></el-icon>
          复制 JSON
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'
import type { PositionFormData } from '@/composables/usePositionEditor'

const props = defineProps<{
  modelValue: boolean
  formData: PositionFormData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 格式化JSON显示（过滤掉不需要的字段）
const formattedJson = computed(() => {
  const dataToExport = {
    title: props.formData.title,
    department: props.formData.department,
    description: props.formData.description,
    required_skills: props.formData.required_skills,
    optional_skills: props.formData.optional_skills,
    min_experience: props.formData.min_experience,
    education: props.formData.education,
    salary_min: props.formData.salary_min,
    salary_max: props.formData.salary_max,
    is_active: props.formData.is_active
  }
  return JSON.stringify(dataToExport, null, 2)
})

// 复制到剪贴板
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(formattedJson.value)
    ElMessage.success('JSON 已复制到剪贴板')
  } catch {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = formattedJson.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('JSON 已复制到剪贴板')
  }
}
</script>

<style scoped>
.json-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.copy-tip :deep(.el-alert__content) {
  font-size: 13px;
}

.json-preview {
  max-height: 400px;
  overflow: auto;
  background: #282c34;
  border-radius: 8px;
  padding: 16px;
}

.json-preview pre {
  margin: 0;
}

.json-preview code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #abb2bf;
  white-space: pre-wrap;
  word-break: break-all;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
