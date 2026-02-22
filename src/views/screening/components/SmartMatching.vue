<template>
  <div class="smart-matching">
    <div class="matching-header">
      <h3>智能匹配</h3>
      <p>上传简历后，AI 将自动推荐最适合的岗位</p>
    </div>

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

    <!-- 文件上传区域 -->
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
        <span>已选择 {{ librarySelectedFiles.length }} 份简历</span>
        <el-button type="primary" size="small" @click="showLibraryDialog">
          <el-icon><Plus /></el-icon>
          选择简历
        </el-button>
      </div>
      <div v-if="librarySelectedFiles.length > 0" class="resume-card-list">
        <div
          v-for="file in librarySelectedFiles"
          :key="file.id"
          class="resume-card"
          draggable="true"
          @dragstart="onLibraryDragStart($event, file)"
          @dragend="onResumeDragEnd"
        >
          <span class="drag-handle">⋮⋮</span>
          <div class="card-info">
            <span class="card-name">{{ file.candidate_name || '未知候选人' }}</span>
          </div>
          <div class="card-actions">
            <el-tag type="success" size="small">就绪</el-tag>
            <el-button type="danger" link size="small" @click="removeLibraryFile(file.id)">移除</el-button>
          </div>
        </div>
      </div>
      <div v-else class="library-empty">
        <el-empty description="点击上方按钮从简历库选择简历" :image-size="60" />
      </div>
      <p v-if="librarySelectedFiles.length > 0" class="drag-tip">拖拽简历卡片到左侧岗位可直接分配</p>
    </div>

    <!-- 文件列表 -->
    <div v-if="uploadMode === 'file' && selectedFiles.length > 0" class="file-list">
      <div class="file-list-header">
        <span>已选文件 ({{ selectedFiles.length }})</span>
        <el-button type="danger" link size="small" @click="clearAll">清空</el-button>
      </div>
      <div class="resume-card-list">
        <div
          v-for="(file, index) in selectedFiles"
          :key="file.id"
          class="resume-card"
          :class="{ 'is-disabled': file.status !== 'parsed' }"
          :draggable="file.status === 'parsed'"
          @dragstart="onFileDragStart($event, file)"
          @dragend="onResumeDragEnd"
        >
          <span class="drag-handle">⋮⋮</span>
          <div class="card-info">
            <span class="card-name">{{ file.name.replace(/\.[^/.]+$/, '') }}</span>
            <span class="card-size">{{ formatFileSize(file.size) }}</span>
          </div>
          <div class="card-actions">
            <el-tag v-if="file.status === 'parsing'" type="warning" size="small">解析中</el-tag>
            <el-tag v-else-if="file.status === 'parsed'" type="success" size="small">就绪</el-tag>
            <el-tag v-else-if="file.status === 'error'" type="danger" size="small">失败</el-tag>
            <el-button type="danger" link size="small" @click="removeFile(index)">移除</el-button>
          </div>
        </div>
      </div>
      <p v-if="selectedFiles.some(f => f.status === 'parsed')" class="drag-tip">拖拽简历卡片到左侧岗位可直接分配</p>
    </div>

    <!-- 操作按钮 -->
    <div v-if="hasFiles" class="action-buttons">
      <el-button
        type="primary"
        :loading="isMatching"
        :disabled="!canMatch"
        @click="handleStartMatch"
      >
        <el-icon v-if="!isMatching"><MagicStick /></el-icon>
        {{ isMatching ? 'AI 智能匹配中...' : '一键智能匹配岗位' }}
      </el-button>
    </div>

    <!-- 匹配进度 -->
    <div v-if="isMatching" class="match-progress">
      <div class="progress-header">
        <span class="progress-title">
          <el-icon class="is-loading"><Loading /></el-icon>
          AI 正在分析简历与岗位匹配...
        </span>
        <span class="progress-percent">{{ Math.round(matchProgress) }}%</span>
      </div>
      <el-progress :percentage="Math.round(matchProgress)" :stroke-width="8" :show-text="false" status="warning" />
      <p class="progress-hint">正在分析简历关键技能、经验与各岗位 JD 的匹配程度</p>
    </div>

    <!-- 使用流程指引 -->
    <div v-if="!hasFiles && !isMatching" class="guide-card">
      <div class="guide-title">使用流程</div>
      <el-steps :active="0" simple>
        <el-step title="上传简历" description="拖拽或选择简历文件" />
        <el-step title="一键匹配" description="AI 自动推荐岗位" />
        <el-step title="确认调整" description="检查并手动调整" />
        <el-step title="一键添加" description="正式添加到岗位" />
      </el-steps>
    </div>

    <!-- 简历库选择对话框 -->
    <el-dialog v-model="libraryDialogVisible" title="从简历库选择简历" width="800px" :close-on-click-modal="false">
      <div class="library-filter">
        <el-checkbox v-model="filterAssigned">忽略已在招聘岗位中的简历</el-checkbox>
      </div>
      <el-table
        v-loading="libraryLoading"
        :data="filteredLibraryList"
        style="width: 100%"
        max-height="400"
        @selection-change="handleLibrarySelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="candidate_name" label="候选人" min-width="120">
          <template #default="{ row }">{{ row.candidate_name || '未识别' }}</template>
        </el-table-column>
        <el-table-column label="标识" width="100">
          <template #default="{ row }">
            <span class="hash-value">{{ row.file_hash?.substring(0, 8) || 'N/A' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="上传时间" width="160">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="libraryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmLibrarySelection">
          确认选择 ({{ libraryTempSelected.length }})
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, Document, FolderOpened, Plus, MagicStick, Loading } from '@element-plus/icons-vue'
import { useFileParser } from '@/composables/useFileParser'
import { useScreeningUtils } from '@/composables/useScreeningUtils'
import { getResumes, getApplications } from '@/api/sdk.gen'
import type { ResumeListResponse } from '@/api/types.gen'
import type { ResumeFile } from '@/types'
import { ElMessage } from 'element-plus'

defineProps<{
  isMatching: boolean
  matchProgress: number
}>()

const emit = defineEmits<{
  startMatch: [files: ResumeFile[], libraryFiles: ResumeListResponse[]]
  resumeDragStart: [name: string]
  resumeDragEnd: []
}>()

const { formatFileSize, formatDate } = useScreeningUtils()
const { readFileAsText } = useFileParser()

// 上传模式
const uploadMode = ref<'file' | 'library'>('file')

// 文件相关
const selectedFiles = ref<ResumeFile[]>([])
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

// 简历库相关
const libraryDialogVisible = ref(false)
const libraryLoading = ref(false)
const libraryList = ref<ResumeListResponse[]>([])
const librarySelectedFiles = ref<ResumeListResponse[]>([])
const libraryTempSelected = ref<ResumeListResponse[]>([])
const filterAssigned = ref(true)
const assignedResumeIds = ref<Set<string>>(new Set())

// 过滤后的简历库列表
const filteredLibraryList = computed(() => {
  if (!filterAssigned.value) return libraryList.value
  return libraryList.value.filter(r => !assignedResumeIds.value.has(r.id))
})

// 计算属性
const hasFiles = computed(() => selectedFiles.value.length > 0 || librarySelectedFiles.value.length > 0)
const canMatch = computed(() => {
  const hasParsed = selectedFiles.value.some(f => f.status === 'parsed')
  return hasParsed || librarySelectedFiles.value.length > 0
})

// 文件操作
const triggerFileInput = () => fileInput.value?.click()

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
    target.value = ''
  }
}

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

const removeFile = (index: number) => selectedFiles.value.splice(index, 1)
const clearAll = () => { selectedFiles.value = [] }

// 拖拽
const handleDragover = (e: DragEvent) => { e.preventDefault(); isDragOver.value = true }
const handleDragleave = (e: DragEvent) => { e.preventDefault(); isDragOver.value = false }
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  if (e.dataTransfer?.files) processFiles(Array.from(e.dataTransfer.files))
}

// 简历库操作
const showLibraryDialog = async () => {
  libraryDialogVisible.value = true
  libraryLoading.value = true
  try {
    // 并行加载简历库和已分配的简历ID
    const [resumeRes, appRes] = await Promise.all([
      getResumes({ query: { page_size: 100 } }),
      getApplications({ query: { page_size: 500 } })
    ])
    libraryList.value = resumeRes.data?.data?.items || []
    const apps = appRes.data?.data?.items || []
    assignedResumeIds.value = new Set(
      (apps as Array<{ resume_id?: string }>)
        .map(a => a.resume_id)
        .filter((id): id is string => !!id)
    )
  } catch {
    ElMessage.error('加载简历库失败')
  } finally {
    libraryLoading.value = false
  }
}

const handleLibrarySelectionChange = (rows: ResumeListResponse[]) => {
  libraryTempSelected.value = rows
}

const confirmLibrarySelection = () => {
  librarySelectedFiles.value = [...libraryTempSelected.value]
  libraryDialogVisible.value = false
}

const removeLibraryFile = (id: string) => {
  librarySelectedFiles.value = librarySelectedFiles.value.filter(f => f.id !== id)
}

// 启动匹配
const handleStartMatch = () => {
  const parsedFiles = selectedFiles.value.filter(f => f.status === 'parsed')
  emit('startMatch', parsedFiles, librarySelectedFiles.value)
}

// 拖拽简历卡片（文件上传）
const onFileDragStart = (e: DragEvent, file: ResumeFile) => {
  if (!e.dataTransfer || file.status !== 'parsed') return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/json', JSON.stringify({
    type: 'smart-resume',
    source: 'file',
    fileId: file.id,
    candidateName: file.name.replace(/\.[^/.]+$/, ''),
    content: file.content
  }))
  emit('resumeDragStart', file.name.replace(/\.[^/.]+$/, ''))
}

// 拖拽简历卡片（简历库）
const onLibraryDragStart = (e: DragEvent, file: ResumeListResponse) => {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/json', JSON.stringify({
    type: 'smart-resume',
    source: 'library',
    resumeId: file.id,
    candidateName: file.candidate_name || '未知候选人'
  }))
  emit('resumeDragStart', file.candidate_name || '未知候选人')
}

// 拖拽结束
const onResumeDragEnd = () => {
  emit('resumeDragEnd')
}

// 移除已分配的简历（拖拽分配后由父组件调用）
const removeByFileId = (fileId: string) => {
  const idx = selectedFiles.value.findIndex(f => f.id === fileId)
  if (idx >= 0) selectedFiles.value.splice(idx, 1)
}
const removeByResumeId = (resumeId: string) => {
  librarySelectedFiles.value = librarySelectedFiles.value.filter(f => f.id !== resumeId)
}

// 暴露清理方法
const clearAllData = () => {
  selectedFiles.value = []
  librarySelectedFiles.value = []
  libraryTempSelected.value = []
}

defineExpose({ clearAllData, removeByFileId, removeByResumeId })
</script>

<style scoped lang="scss">
.smart-matching {
  padding: 20px;
  overflow-y: auto;
  height: 100%;
}

.matching-header {
  margin-bottom: 16px;

  h3 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #909399;
  }
}

.upload-mode-tabs {
  margin-bottom: 16px;

  :deep(.el-radio-button__inner) {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.2s;
  margin-bottom: 16px;

  &:hover,
  &.drag-over {
    border-color: #409eff;
    background: #ecf5ff;
  }

  .upload-text {
    margin: 16px 0;

    p {
      margin: 0 0 8px;
      color: #606266;
    }
  }

  .upload-hint {
    margin: 0;
    font-size: 12px;
    color: #909399;
  }
}

.library-select-area {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;

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

}

.file-list {
  margin-bottom: 16px;

  .file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }
}

.resume-card-list {
  max-height: 280px;
  overflow-y: auto;
}

.resume-card {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 6px;
  border: 1px solid #e4e7ed;
  cursor: grab;
  transition: all 0.2s;
  gap: 10px;

  &:hover {
    background: #f0f2f5;
    border-color: #c0c4cc;
  }

  &:active {
    cursor: grabbing;
  }

  &.is-disabled {
    cursor: default;
    opacity: 0.6;
  }

  .drag-handle {
    color: #c0c4cc;
    font-size: 14px;
    cursor: grab;
    user-select: none;
    letter-spacing: -2px;
    flex-shrink: 0;
  }

  .card-info {
    flex: 1;
    min-width: 0;

    .card-name {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #303133;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-size {
      font-size: 12px;
      color: #909399;
    }
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.drag-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.action-buttons {
  margin-bottom: 16px;
}

.match-progress {
  background: #fdf6ec;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #faecd8;
  margin-bottom: 16px;

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .progress-title {
    font-size: 13px;
    font-weight: 500;
    color: #e6a23c;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .progress-percent {
    font-size: 12px;
    color: #e6a23c;
    font-weight: 600;
  }

  .progress-hint {
    margin: 8px 0 0;
    font-size: 12px;
    color: #a68a5b;
  }
}

.guide-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #ebeef5;

  .guide-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 16px;
  }
}

.hash-value {
  font-family: monospace;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.library-empty {
  padding: 20px 0;
}

.library-filter {
  margin-bottom: 12px;
}
</style>
