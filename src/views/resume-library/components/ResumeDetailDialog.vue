<template>
  <el-dialog
    v-model="visible"
    :title="isEditing ? '编辑简历信息' : '查看简历'"
    width="800px"
    @closed="handleClosed"
  >
    <template v-if="resume">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="文件名">{{ resume.filename || '无文件名' }}</el-descriptions-item>
        <el-descriptions-item label="文件大小">{{ formatFileSize(resume.file_size) }}</el-descriptions-item>
        <el-descriptions-item label="上传时间">{{ formatDate(resume.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="文件哈希">
          <span class="hash-value">{{ resume.file_hash?.substring(0, 8) }}...</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-form v-if="isEditing" :model="editForm" label-width="80px" style="margin-top: 20px">
        <el-form-item label="候选人">
          <el-input v-model="editForm.candidate_name" placeholder="请输入候选人姓名" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.notes" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>

      <div v-else class="resume-content-preview">
        <div class="preview-header">
          <h4>简历内容预览</h4>
          <el-tag size="small" type="info">{{ getFileTypeLabel(resume.filename || '') }}</el-tag>
        </div>
        <div class="content-text">
          <template v-if="resume.content">
            {{ formatResumeContent(resume.content) }}
          </template>
          <el-empty v-else description="暂无内容" :image-size="60" />
        </div>
      </div>
    </template>

    <template #footer>
      <el-button @click="visible = false">
        {{ isEditing ? '取消' : '关闭' }}
      </el-button>
      <el-button v-if="!isEditing" type="primary" @click="isEditing = true">
        编辑
      </el-button>
      <el-button v-else type="primary" :loading="saving" @click="handleSave">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { ResumeResponse } from '@/api/types.gen'

const props = defineProps<{
  modelValue: boolean
  resume: ResumeResponse | null
  saving?: boolean
  mode?: 'view' | 'edit'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: { candidate_name?: string; notes?: string }]
}>()

const visible = ref(props.modelValue)
const isEditing = ref(props.mode === 'edit')
const editForm = reactive({
  candidate_name: '',
  notes: ''
})

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

watch(() => props.resume, (resume) => {
  if (resume) {
    editForm.candidate_name = resume.candidate_name || ''
    editForm.notes = resume.notes || ''
  }
})

watch(() => props.mode, (mode) => {
  isEditing.value = mode === 'edit'
})

const handleClosed = () => {
  isEditing.value = false
}

const handleSave = () => {
  emit('save', {
    candidate_name: editForm.candidate_name || undefined,
    notes: editForm.notes || undefined
  })
}

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getFileTypeLabel = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, string> = {
    'pdf': 'PDF 文档',
    'docx': 'Word 文档',
    'txt': '纯文本',
    'md': 'Markdown'
  }
  return typeMap[ext] || '未知格式'
}

const formatResumeContent = (content: string): string => {
  if (!content) return ''
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
</script>

<style scoped>
.hash-value {
  font-family: monospace;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.resume-content-preview {
  margin-top: 20px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.preview-header h4 {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

.content-text {
  max-height: 450px;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #303133;
}

.content-text::-webkit-scrollbar {
  width: 6px;
}

.content-text::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.content-text::-webkit-scrollbar-track {
  background: #f5f7fa;
}
</style>
