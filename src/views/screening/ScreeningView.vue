<template>
  <div class="screening-view">
    <!-- 三列布局 -->
    <div ref="layoutRef" class="three-column-layout">
      <!-- 左侧：岗位面板 -->
      <div class="col-left" :style="{ width: leftWidth + 'px' }">
        <PositionSidebar
          :positions="positionsList"
          :selected-position-id="selectedPositionId"
          :drag-over-position-id="dragOverPositionId"
          :dragging-candidate="draggingCandidate"
          :dragging-resume-name="draggingResumeName"
          :candidate-stats="{}"
          @select="handleSelectPosition"
          @drag-over="handleDragOverPosition"
          @drag-leave="handleDragLeavePosition"
          @drop="handleDropOnPosition"
        />
      </div>

      <!-- 左侧分隔线 -->
      <div
        class="resizer resizer-left"
        @mousedown="startResizeLeft"
      />

      <!-- 中间：标签页内容区 -->
      <div class="col-center">
        <div class="center-header">
          <div class="center-header-left">
            <h2 class="position-title">{{ currentPositionTitle }}</h2>
            <div class="stats-row">
              <span class="stat-item">共 <b>{{ positionStats.total }}</b></span>
              <span class="stat-item completed">✓{{ positionStats.completed }}</span>
              <span v-if="positionStats.processing > 0" class="stat-item processing">
                ⟳{{ positionStats.processing }}
              </span>
            </div>
          </div>
          <div class="center-header-right">
            <el-radio-group v-model="activeTab" size="default">
              <el-radio-button value="candidates">候选列表</el-radio-button>
              <el-radio-button value="matching">智能匹配</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="center-content">
          <!-- 候选列表标签页 -->
          <CandidateList
            v-if="activeTab === 'candidates'"
            :candidates="filteredCandidates"
            :selected-candidate-id="selectedCandidate?.id || null"
            :dragging-id="draggingCandidate?.id || null"
            :can-batch-screen="canBatchScreen"
            :batch-screening="batchScreening"
            :batch-progress="batchProgress"
            :status-filter="statusFilter"
            :sort-by="sortBy"
            @select-candidate="handleSelectCandidate"
            @view-detail="handleViewDetail"
            @retry="handleRetryCandidate"
            @delete="handleDeleteCandidate"
            @batch-screen="startBatchScreening"
            @drag-start="handleDragStart"
            @drag-end="handleDragEnd"
            @switch-to-matching="activeTab = 'matching'"
            @update:status-filter="statusFilter = $event"
            @update:sort-by="sortBy = $event"
          />

          <!-- 智能匹配标签页 -->
          <SmartMatching
            v-else
            ref="smartMatchingRef"
            :is-matching="isMatching"
            :match-progress="matchProgress"
            @start-match="handleStartMatch"
            @resume-drag-start="handleResumeDragStart"
            @resume-drag-end="handleResumeDragEnd"
          />
        </div>
      </div>

      <!-- 右侧分隔线 -->
      <div
        class="resizer resizer-right"
        @mousedown="startResizeRight"
      />

      <!-- 右侧：信息面板 -->
      <div class="col-right" :style="{ width: rightWidth + 'px' }">
        <DetailPanel
          :active-tab="activeTab"
          :selected-candidate="selectedCandidate"
          :position-title="currentPositionTitle"
          :position-stats="positionStats"
          :top-candidates="topCandidates"
          :match-results="matchResults"
          :matched-count="matchedCount"
          :is-confirming="isConfirming"
          :positions="positionsList"
          @close-detail="selectedCandidate = null"
          @view-report="handleViewReport"
          @download-report="handleDownloadReport"
          @go-interview="handleGoInterview"
          @retry-screening="handleRetryCandidate"
          @select-candidate="handleSelectCandidate"
          @update-match-position="updateMatchPosition"
          @remove-match-result="removeResult"
          @confirm-matches="handleConfirmMatches"
          @clear-match-results="clearResults"
        />
      </div>
    </div>

    <!-- 简历详情对话框 -->
    <ResumeDetailDialog
      v-model="resumeDetailVisible"
      :resume="selectedResumeDetail"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

// 组件导入
import { ResumeDetailDialog } from '@/components/common'
import PositionSidebar from './components/PositionSidebar.vue'
import CandidateList from './components/CandidateList.vue'
import SmartMatching from './components/SmartMatching.vue'
import DetailPanel from './components/DetailPanel.vue'

// Composables 导入
import { usePositionManagement } from '@/composables/usePositionManagement'
import { useCandidateList } from './composables/useCandidateList'
import { useBatchScreening } from './composables/useBatchScreening'
import { useSmartMatching } from './composables/useSmartMatching'
import { useDragDrop } from './composables/useDragDrop'
import { useResumeDetail } from './composables/useResumeDetail'

// 类型导入
import type { PositionData, ResumeFile } from '@/types'
import type { ResumeListResponse } from '@/api/types.gen'
import type { CandidateItem } from './composables/useCandidateList'

const router = useRouter()

// ==================== 面板宽度调节 ====================
const MIN_PANEL_WIDTH = 180
const DEFAULT_LEFT_WIDTH = 220
const DEFAULT_RIGHT_WIDTH = 300

const layoutRef = ref<HTMLElement | null>(null)
const leftWidth = ref(DEFAULT_LEFT_WIDTH)
const rightWidth = ref(DEFAULT_RIGHT_WIDTH)
const isResizing = ref(false)
const resizeType = ref<'left' | 'right' | null>(null)

const getMaxPanelWidth = () => {
  if (!layoutRef.value) return Math.floor(window.innerWidth / 3)
  return Math.floor(layoutRef.value.offsetWidth / 3)
}

const startResizeLeft = (e: MouseEvent) => {
  isResizing.value = true
  resizeType.value = 'left'
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const startResizeRight = (e: MouseEvent) => {
  isResizing.value = true
  resizeType.value = 'right'
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value || !layoutRef.value) return
  
  const maxWidth = getMaxPanelWidth()
  const layoutRect = layoutRef.value.getBoundingClientRect()
  
  if (resizeType.value === 'left') {
    const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(maxWidth, e.clientX - layoutRect.left))
    leftWidth.value = newWidth
  } else if (resizeType.value === 'right') {
    const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(maxWidth, layoutRect.right - e.clientX))
    rightWidth.value = newWidth
  }
}

const stopResize = () => {
  isResizing.value = false
  resizeType.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// ==================== 标签页状态 ====================
const activeTab = ref('candidates')
const selectedCandidate = ref<CandidateItem | null>(null)

// ==================== 岗位管理 ====================
const {
  positionData,
  positionsList,
  selectedPositionId,
  loadPositionsList,
  selectPosition
} = usePositionManagement()

const currentPositionTitle = computed(() => positionData.value.title || '请选择岗位')

// ==================== 候选列表 ====================
const {
  candidates,
  filteredCandidates,
  positionStats,
  canBatchScreen,
  loading: candidatesLoading,
  statusFilter,
  sortBy,
  loadCandidates,
  retryScreening,
  deleteCandidate,
  startStatusSync,
  stopStatusSync
} = useCandidateList(selectedPositionId)

// 综合分数排名 Top N
const topCandidates = computed(() => {
  return candidates.value
    .filter(c => c.positionId === selectedPositionId.value && c.screeningScore !== null)
    .sort((a, b) => (b.screeningScore || 0) - (a.screeningScore || 0))
    .slice(0, 5)
})

// ==================== 批量初筛 ====================
const {
  batchScreening,
  batchProgress,
  startBatchScreening
} = useBatchScreening(candidates, selectedPositionId, startStatusSync)

// ==================== 智能匹配 ====================
const smartMatchingRef = ref<InstanceType<typeof SmartMatching>>()

const {
  matchResults,
  isMatching,
  matchProgress,
  isConfirming,
  matchedCount,
  uploadAndMatch,
  updateMatchPosition,
  confirmMatches,
  clearResults,
  removeResult
} = useSmartMatching(positionsList, () => {
  // 匹配确认后刷新数据
  loadPositionsList()
  loadCandidates()
  smartMatchingRef.value?.clearAllData()
})

// ==================== 拖拽 ====================
const {
  draggingCandidate,
  draggingResumeName,
  dragOverPositionId,
  handleDragStart,
  handleResumeDragStart,
  handleResumeDragEnd,
  handleDragOverPosition,
  handleDragLeavePosition,
  handleDropOnPosition,
  handleDragEnd
} = useDragDrop(
  () => {
    // 移动/分配成功后刷新数据
    loadPositionsList()
    loadCandidates()
    selectedCandidate.value = null
  },
  (data) => {
    // 简历拖拽分配成功后，从 SmartMatching 中移除已分配的简历
    if (data.source === 'file' && data.fileId) {
      smartMatchingRef.value?.removeByFileId(data.fileId)
    } else if (data.source === 'library' && data.resumeId) {
      smartMatchingRef.value?.removeByResumeId(data.resumeId)
    }
  }
)

// ==================== 简历详情 ====================
const {
  resumeDetailVisible,
  selectedResumeDetail,
  showQueueItemDetail,
  downloadReport
} = useResumeDetail()

// ==================== 事件处理 ====================

const handleSelectPosition = (pos: PositionData) => {
  selectPosition(pos)
  selectedCandidate.value = null
}

const handleSelectCandidate = (candidate: CandidateItem) => {
  selectedCandidate.value = candidate
}

const handleViewDetail = async (candidate: CandidateItem) => {
  // 使用 showQueueItemDetail 复用现有详情查看逻辑
  await showQueueItemDetail({
    name: candidate.candidateName,
    task_id: candidate.screeningTaskId,
    application_id: candidate.id,
    status: candidate.screeningStatus as 'completed',
    progress: candidate.screeningProgress,
    created_at: candidate.createdAt,
    applied_position: candidate.positionTitle,
    score: candidate.screeningScore,
    dimension_scores: {
      technical_score: candidate.technicalScore,
      project_score: candidate.projectScore,
      career_score: candidate.careerScore
    },
    summary: candidate.screeningSummary
  })
}

const handleViewReport = (candidate: CandidateItem) => {
  handleViewDetail(candidate)
}

const handleDownloadReport = (candidate: CandidateItem) => {
  if (candidate.screeningTaskId) {
    downloadReport(candidate.screeningTaskId)
  }
}

const handleGoInterview = (candidate: CandidateItem) => {
  router.push(`/immersive?application_id=${candidate.id}`)
}

const handleRetryCandidate = (candidate: CandidateItem) => {
  retryScreening(candidate)
}

const handleDeleteCandidate = (candidate: CandidateItem) => {
  if (selectedCandidate.value?.id === candidate.id) {
    selectedCandidate.value = null
  }
  deleteCandidate(candidate)
}

const handleStartMatch = async (files: ResumeFile[], libraryFiles: ResumeListResponse[]) => {
  const calculateHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  await uploadAndMatch(files, libraryFiles, calculateHash)
}

const handleConfirmMatches = () => {
  confirmMatches(false)
}

// ==================== 监听岗位切换 ====================
watch(selectedPositionId, () => {
  selectedCandidate.value = null
  loadCandidates()
})

// ==================== 生命周期 ====================
onMounted(async () => {
  await loadPositionsList()
  loadCandidates()
})

onUnmounted(() => {
  stopStatusSync()
})
</script>

<style scoped lang="scss">
.screening-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.three-column-layout {
  flex: 1;
  display: flex;
  min-height: 0;
  background: #fff;
}

.col-left {
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.col-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.col-right {
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.resizer {
  width: 4px;
  background: #e4e7ed;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.2s;

  &:hover {
    background: #409eff;
  }

  &:active {
    background: #337ecc;
  }
}

.center-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;

  .center-header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .position-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .stats-row {
      display: flex;
      gap: 10px;
      font-size: 12px;

      .stat-item {
        color: #909399;

        &.completed { color: #67c23a; }
        &.processing { color: #409eff; }

        b { font-weight: 600; }
      }
    }
  }
}

.center-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
