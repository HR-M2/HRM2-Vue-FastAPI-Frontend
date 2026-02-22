<template>
  <el-dialog
    v-model="visible"
    title="上传简历到简历库"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-upload
      ref="uploadRef"
      class="upload-area"
      drag
      multiple
      :auto-upload="false"
      :file-list="fileList"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      accept=".pdf,.docx,.txt,.md"
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">
        将简历文件拖拽到此处，或 <em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          支持 PDF、DOCX、TXT、Markdown 格式，单次最多上传 50 份
        </div>
      </template>
    </el-upload>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="uploading"
        :disabled="fileList.length === 0"
        @click="handleUpload"
      >
        上传 ({{ fileList.length }})
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { useFileParser } from '@/composables/useFileParser'

const props = defineProps<{
  modelValue: boolean
  uploading: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  upload: [files: Array<{ name: string; content: string; metadata?: { size?: number; type?: string } }>]
}>()

const { readFileAsText } = useFileParser()

const visible = ref(props.modelValue)
const fileList = ref<UploadFile[]>([])
const uploadRef = ref()

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleFileChange = (_file: UploadFile, files: UploadFile[]) => {
  fileList.value = files
}

const handleFileRemove = (_file: UploadFile, files: UploadFile[]) => {
  fileList.value = files
}

const handleClosed = () => {
  fileList.value = []
}

const handleUpload = async () => {
  if (fileList.value.length === 0) return
  
  const files: Array<{ name: string; content: string; metadata?: { size?: number; type?: string } }> = []
  
  for (const file of fileList.value) {
    if (!file.raw) continue
    
    try {
      const content = await readFileAsText(file.raw)
      files.push({
        name: file.name,
        content,
        metadata: {
          size: file.size,
          type: file.raw.type
        }
      })
    } catch (error) {
      console.error(`读取文件失败: ${file.name}`, error)
      ElMessage.error(`读取文件失败: ${file.name}`)
    }
  }
  
  if (files.length > 0) {
    emit('upload', files)
  }
}

defineExpose({
  clear: () => {
    fileList.value = []
  }
})
</script>

<style scoped>
.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
}
</style>
