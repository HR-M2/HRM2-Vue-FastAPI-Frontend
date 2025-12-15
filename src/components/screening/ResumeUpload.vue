<template>
  <el-card class="upload-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="card-title-wrapper">
          <span class="card-title">简历上传与初筛</span>
          <el-tag v-if="positionName" type="info" effect="light" class="position-tag">
            {{ positionName }}
          </el-tag>
        </div>
        <el-tag :type="uploadStatus.type" effect="plain">{{ uploadStatus.text }}</el-tag>
      </div>
    </template>

    <!-- 上传方式选择 -->
    <div class="upload-mode-tabs">
      <el-radio-group v-model="uploadMode" size="default">
        <el-radio-button value="file">
          <el-icon><Upload /></el-icon>
          上传文件
        </el-radio-button>
        <el-radio-button value="library">
          <el-icon><FolderOpened /></el-icon>
          从简历库选择
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 上传区域（文件上传模式） -->
    <div
      v-if="uploadMode === 'file'"
      class="upload-area"
      :class="{ 'drag-over': isDragOver }"
      @drop="handleDrop"
      @dragover="handleDragover"
      @dragleave="handleDragleave"
    >
      <div class="upload-content">
        <el-icon :size="48" color="#c0c4cc"><Upload /></el-icon>
        <div class="upload-text">
          <p>将简历文件拖拽到此处，或</p>
          <el-button type="primary" @click="triggerFileInput">点击选择文件</el-button>
        </div>
        <p class="upload-hint">支持 PDF、DOCX、TXT、Markdown 格式，单个文件不超过10MB</p>
      </div>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md"
        style="display: none"
        @change="handleFileSelect"
      />
    </div>

    <!-- 简历库选择区域 -->
    <div v-else class="library-select-area">
      <div class="library-header">
        <span>已从简历库选择 {{ librarySelectedCount }} 份简历</span>
        <el-button type="primary" @click="showLibraryDialog">
          <el-icon><Plus /></el-icon>
          选择简历
        </el-button>
      </div>
      <div v-if="librarySelectedFiles.length > 0" class="library-selected-list">
        <div v-for="file in librarySelectedFiles" :key="file.id" class="library-item">
          <div class="library-item-info">
            <el-icon><Document /></el-icon>
            <span class="file-name">{{ file.candidate_name || '未知候选人' }}</span>
          </div>
          <el-button type="danger" link size="small" @click="removeLibraryFile(file.id)">
            移除
          </el-button>
        </div>
      </div>
      <div v-else class="library-empty">
        <el-empty description="点击上方按钮从简历库选择简历" :image-size="60" />
      </div>
      
      <!-- 简历库选择操作按钮 -->
      <div v-if="librarySelectedFiles.length > 0" class="action-buttons">
        <el-button
          type="primary"
          :loading="isSubmitting"
          @click="$emit('submit')"
        >
          {{ isSubmitting ? '提交中...' : `提交 ${librarySelectedCount} 份简历进行初筛` }}
        </el-button>
        <el-button @click="clearLibrarySelection">清空选择</el-button>
      </div>
    </div>

    <!-- 简历库选择对话框 -->
    <el-dialog
      v-model="libraryDialogVisible"
      title="从简历库选择简历"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-table
        v-loading="libraryLoading"
        :data="libraryList"
        style="width: 100%"
        max-height="400"
        @selection-change="handleLibrarySelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="candidate_name" label="候选人" min-width="120">
          <template #default="{ row }">
            {{ row.candidate_name || '未识别' }}
          </template>
        </el-table-column>
        <el-table-column label="标识" width="100">
          <template #default="{ row }">
            <span class="hash-value">{{ row.file_hash?.substring(0, 8) || 'N/A' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="上传时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      
      <template #footer>
        <el-button @click="libraryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmLibrarySelection">
          确认选择 ({{ libraryTempSelected.length }})
        </el-button>
      </template>
    </el-dialog>

    <!-- 文件列表（仅文件上传模式显示） -->
    <div v-if="uploadMode === 'file' && selectedFiles.length > 0" class="file-list">
      <div class="file-list-header">
        <h4>已选文件 ({{ selectedFiles.length }})</h4>
      </div>
      <div class="file-items">
        <div v-for="(file, index) in selectedFiles" :key="file.id" class="file-item">
          <div class="file-info">
            <el-icon :size="20" color="#409eff"><Document /></el-icon>
            <div class="file-details">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>
          </div>
          <div class="file-actions">
            <el-button v-if="file.status === 'parsing'" size="small" :loading="true" type="info">
              解析中
            </el-button>
            <el-button v-else-if="file.status === 'parsed'" size="small" type="success" @click="$emit('preview', file)">
              预览
            </el-button>
            <el-button v-else size="small" type="danger" @click="removeFile(index)">
              移除
            </el-button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button
          type="primary"
          :loading="isSubmitting"
          :disabled="!hasParsedFiles"
          @click="$emit('submit')"
        >
          {{ isSubmitting ? '提交中...' : `提交 ${parsedFilesCount} 份简历进行初筛` }}
        </el-button>
        <el-button @click="clearAll">清空列表</el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { Upload, Document, FolderOpened, Plus } from '@element-plus/icons-vue'
import { useFileParser } from '@/composables/useFileParser'
import { useScreeningUtils } from '@/composables/useScreeningUtils'
import { getResumes } from '@/api/sdk.gen'
import type { ResumeListResponse } from '@/api/types.gen'
import type { ResumeFile } from '@/types'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  isSubmitting: boolean
  positionName?: string
}>()

const emit = defineEmits<{
  submit: []
  preview: [file: ResumeFile]
  filesChanged: [files: ResumeFile[]]
  libraryFilesChanged: [files: ResumeListResponse[]]
}>()

// 上传模式
const uploadMode = ref<'file' | 'library'>('file')

// 简历库相关
const libraryDialogVisible = ref(false)
const libraryLoading = ref(false)
const libraryList = ref<ResumeListResponse[]>([])
const librarySelectedFiles = ref<ResumeListResponse[]>([])
const libraryTempSelected = ref<ResumeListResponse[]>([])

const librarySelectedCount = computed(() => librarySelectedFiles.value.length)

// 显示简历库选择对话框
const showLibraryDialog = async () => {
  libraryDialogVisible.value = true
  libraryLoading.value = true
  try {
    const response = await getResumes({
      query: { page_size: 100 }
    })
    libraryList.value = response.data?.data?.items || []
  } catch (error) {
    console.error('加载简历库失败:', error)
    ElMessage.error('加载简历库失败')
  } finally {
    libraryLoading.value = false
  }
}

// 处理简历库选择变化
const handleLibrarySelectionChange = (rows: ResumeListResponse[]) => {
  libraryTempSelected.value = rows
}

// 确认选择
const confirmLibrarySelection = () => {
  librarySelectedFiles.value = [...libraryTempSelected.value]
  libraryDialogVisible.value = false
  emit('libraryFilesChanged', librarySelectedFiles.value)
}

// 移除简历库选择的文件
const removeLibraryFile = (id: string) => {
  librarySelectedFiles.value = librarySelectedFiles.value.filter(f => f.id !== id)
  emit('libraryFilesChanged', librarySelectedFiles.value)
}

// 清空简历库选择
const clearLibrarySelection = () => {
  librarySelectedFiles.value = []
  libraryTempSelected.value = []
  emit('libraryFilesChanged', [])
}

const { formatFileSize, formatDate } = useScreeningUtils()
const { readFileAsText } = useFileParser()

// 文件相关状态
const selectedFiles = ref<ResumeFile[]>([])
const isDragOver = ref(false)

// 计算属性
const hasParsedFiles = computed(() => selectedFiles.value.some(f => f.status === 'parsed'))
const parsedFilesCount = computed(() => selectedFiles.value.filter(f => f.status === 'parsed').length)

// 文件输入引用
const fileInput = ref<HTMLInputElement>()

// 上传状态
const uploadStatus = reactive({ type: 'info' as 'info' | 'success' | 'warning' | 'danger', text: '等待上传' })

// 监听文件变化
watch(selectedFiles, (files) => {
  emit('filesChanged', files)
  updateUploadStatus()
}, { deep: true })

// 更新上传状态
const updateUploadStatus = () => {
  const total = selectedFiles.value.length
  const parsed = parsedFilesCount.value
  if (total === 0) {
    uploadStatus.type = 'info'
    uploadStatus.text = '等待上传'
  } else if (parsed === total) {
    uploadStatus.type = 'success'
    uploadStatus.text = `${parsed} 份已就绪`
  } else {
    uploadStatus.type = 'warning'
    uploadStatus.text = `${parsed}/${total} 已解析`
  }
}

// 触发文件选择
const triggerFileInput = () => fileInput.value?.click()

// 处理文件选择
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
    target.value = ''
  }
}

// 处理文件列表
const processFiles = async (files: File[]) => {
  const validFiles = files.filter(file => {
    const isValidType = /\.(pdf|docx|txt|md)$/i.test(file.name)
    const isValidSize = file.size <= 10 * 1024 * 1024
    if (!isValidType) ElMessage.error(`"${file.name}" 格式不支持`)
    if (!isValidSize) ElMessage.error(`"${file.name}" 超过10MB`)
    return isValidType && isValidSize
  })

  for (const file of validFiles) {
    const resumeFile: ResumeFile = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      content: '',
      status: 'pending'
    }
    selectedFiles.value.push(resumeFile)
    parseFileContent(resumeFile)
  }

  if (validFiles.length > 0) {
    ElMessage.success(`成功添加 ${validFiles.length} 个文件`)
  }
}

// 解析单个文件内容
const parseFileContent = async (resumeFile: ResumeFile) => {
  const target = selectedFiles.value.find(f => f.id === resumeFile.id)
  if (!target) return

  target.status = 'parsing'
  try {
    const content = await readFileAsText(resumeFile.file)
    target.content = content.replace(/\s+/g, ' ').trim()
    target.status = 'parsed'
  } catch {
    target.status = 'error'
    target.error = '解析失败'
  }
}

// 移除文件
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// 清空所有文件
const clearAll = () => {
  selectedFiles.value = []
}

// 拖拽处理
const handleDragover = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragleave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  if (e.dataTransfer?.files) {
    processFiles(Array.from(e.dataTransfer.files))
  }
}

// 暴露方法给父组件
defineExpose({
  selectedFiles,
  hasParsedFiles,
  parsedFilesCount,
  clearAll,
  uploadMode,
  librarySelectedFiles,
  librarySelectedCount,
  clearLibrarySelection
})
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.position-tag {
  background-color: #e6f7ff;
  border-color: #91d5ff;
  color: #1890ff;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.2s;

  &:hover,
  &.drag-over {
    border-color: #409eff;
    background: #ecf5ff;
  }
}

.upload-content {
  .upload-text {
    margin: 16px 0;

    p {
      margin: 0 0 8px 0;
      color: #606266;
    }
  }

  .upload-hint {
    margin: 0;
    font-size: 12px;
    color: #909399;
  }
}

.file-list {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.file-list-header h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #303133;
}

.file-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-details {
  .file-name {
    display: block;
    font-size: 13px;
    color: #303133;
  }

  .file-size {
    display: block;
    font-size: 12px;
    color: #909399;
  }
}

.action-buttons {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.upload-mode-tabs {
  margin-bottom: 16px;
  
  :deep(.el-radio-button__inner) {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.library-select-area {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  span {
    color: #606266;
    font-size: 14px;
  }
}

.library-selected-list {
  max-height: 300px;
  overflow-y: auto;
}

.library-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.library-item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .file-name {
    color: #303133;
    font-size: 14px;
  }
}

.library-empty {
  padding: 20px 0;
}

.hash-value {
  font-family: monospace;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
