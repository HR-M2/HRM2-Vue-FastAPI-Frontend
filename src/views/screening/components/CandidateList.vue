<template>
  <div class="candidate-list">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="filter-label">状态:</span>
        <el-radio-group v-model="statusFilter" size="small" @change="$emit('update:statusFilter', $event)">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="completed">已完成</el-radio-button>
          <el-radio-button value="running">进行中</el-radio-button>
          <el-radio-button value="none">待筛选</el-radio-button>
          <el-radio-button value="failed">失败</el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-right">
        <el-select v-model="localSortBy" size="small" style="width: 120px" @change="$emit('update:sortBy', $event)">
          <el-option label="按综合分" value="score" />
          <el-option label="按时间" value="time" />
        </el-select>
        <el-button
          type="primary"
          size="small"
          :disabled="!canBatchScreen || batchScreening"
          :loading="batchScreening"
          @click="$emit('batchScreen')"
        >
          <el-icon v-if="!batchScreening"><Lightning /></el-icon>
          {{ batchScreening ? '初筛进行中...' : '一键初筛' }}
        </el-button>
      </div>
    </div>

    <!-- 批量初筛进度 -->
    <div v-if="batchScreening" class="batch-progress">
      <div class="batch-header">
        <span class="batch-title">
          <el-icon class="is-loading"><Loading /></el-icon>
          批量初筛中 ({{ batchProgress.current }}/{{ batchProgress.total }})
        </span>
        <span class="batch-percent">
          {{ Math.round((batchProgress.current / Math.max(batchProgress.total, 1)) * 100) }}%
        </span>
      </div>
      <el-progress
        :percentage="Math.round((batchProgress.current / Math.max(batchProgress.total, 1)) * 100)"
        :stroke-width="8"
        :show-text="false"
      />
      <div class="batch-items">
        <el-tag
          v-for="item in batchProgress.items"
          :key="item.id"
          :type="item.status === 'done' ? 'success' : item.status === 'running' ? 'primary' : item.status === 'failed' ? 'danger' : 'info'"
          size="small"
          effect="light"
        >
          {{ item.status === 'done' ? '✓' : item.status === 'running' ? '⟳' : item.status === 'failed' ? '✗' : '○' }}
          {{ item.name }}
        </el-tag>
      </div>
    </div>

    <!-- 表头 -->
    <div class="table-header">
      <span class="col-drag"></span>
      <span class="col-name">候选人</span>
      <span class="col-score">初筛评分</span>
      <span class="col-status">状态</span>
      <span class="col-time">时间</span>
      <span class="col-actions">操作</span>
    </div>

    <!-- 候选人列表 -->
    <div class="table-body" v-if="candidates.length > 0">
      <div
        v-for="candidate in candidates"
        :key="candidate.id"
        draggable="true"
        class="candidate-row"
        :class="{
          selected: selectedCandidateId === candidate.id,
          'is-dragging': draggingId === candidate.id
        }"
        @click="$emit('selectCandidate', candidate)"
        @dragstart="$emit('dragStart', $event, candidate)"
        @dragend="$emit('dragEnd')"
      >
        <!-- 拖拽手柄 -->
        <div class="col-drag">
          <el-icon class="drag-handle"><Rank /></el-icon>
        </div>

        <!-- 候选人名称 -->
        <div class="col-name">
          <span class="name-text">{{ candidate.candidateName }}</span>
        </div>

        <!-- 初筛评分 -->
        <div class="col-score">
          <template v-if="candidate.screeningScore !== null">
            <el-tag
              :type="getScoreType(candidate.screeningScore)"
              effect="light"
              size="default"
            >
              {{ candidate.screeningScore }}
            </el-tag>
            <span class="score-detail">
              HR:{{ candidate.hrScore || '-' }}
              技:{{ candidate.techScore || '-' }}
              管:{{ candidate.mgrScore || '-' }}
            </span>
          </template>
          <template v-else-if="candidate.screeningStatus === 'running' || candidate.screeningStatus === 'pending'">
            <el-progress
              :percentage="candidate.screeningProgress || 0"
              :stroke-width="6"
              :show-text="false"
              style="width: 100px"
            />
            <span v-if="candidate.currentSpeaker" class="speaker-text">
              {{ getSpeakerText(candidate.currentSpeaker) }}
            </span>
          </template>
          <span v-else class="no-score">—</span>
        </div>

        <!-- 状态 -->
        <div class="col-status">
          <el-tag
            :type="getStatusType(candidate.screeningStatus)"
            size="small"
            effect="plain"
          >
            <span
              class="status-dot"
              :class="{ 'is-animating': ['running', 'pending'].includes(candidate.screeningStatus) }"
              :style="{ background: getStatusColor(candidate.screeningStatus) }"
            ></span>
            {{ getStatusText(candidate.screeningStatus) }}
          </el-tag>
        </div>

        <!-- 时间 -->
        <div class="col-time">{{ formatDate(candidate.createdAt) }}</div>

        <!-- 操作 -->
        <div class="col-actions">
          <el-tooltip content="查看详情" placement="top" v-if="candidate.screeningStatus === 'completed'">
            <el-button size="small" type="primary" link @click.stop="$emit('viewDetail', candidate)">
              <el-icon><View /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="重新初筛" placement="top" v-if="candidate.screeningStatus === 'failed' || candidate.screeningStatus === 'completed'">
            <el-button size="small" type="warning" link @click.stop="$emit('retry', candidate)">
              <el-icon><RefreshRight /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="移除候选人" placement="top">
            <el-button size="small" type="danger" link @click.stop="$emit('delete', candidate)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-empty description="当前岗位暂无候选人" :image-size="80">
        <el-button type="primary" size="small" @click="$emit('switchToMatching')">
          上传简历
        </el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Rank, View, RefreshRight, Delete, Loading } from '@element-plus/icons-vue'
import { useScreeningUtils } from '@/composables/useScreeningUtils'
import type { CandidateItem } from '../composables/useCandidateList'
import type { BatchProgress } from '../composables/useBatchScreening'

// Lightning 图标用 el-icon 的内置名
const Lightning = { template: '<svg viewBox="0 0 1024 1024"><path d="M576 128L192 576h256l-64 320 384-448H512l64-320z" fill="currentColor"/></svg>' }

const props = defineProps<{
  candidates: CandidateItem[]
  selectedCandidateId: string | null
  draggingId: string | null
  canBatchScreen: boolean
  batchScreening: boolean
  batchProgress: BatchProgress
  statusFilter: string
  sortBy: string
}>()

defineEmits<{
  selectCandidate: [candidate: CandidateItem]
  viewDetail: [candidate: CandidateItem]
  retry: [candidate: CandidateItem]
  delete: [candidate: CandidateItem]
  batchScreen: []
  dragStart: [e: DragEvent, candidate: CandidateItem]
  dragEnd: []
  switchToMatching: []
  'update:statusFilter': [value: string]
  'update:sortBy': [value: string]
}>()

const { formatDate, getStatusType, getStatusText, getSpeakerText } = useScreeningUtils()

const localSortBy = ref(props.sortBy)
const statusFilter = ref(props.statusFilter)

watch(() => props.statusFilter, v => { statusFilter.value = v })
watch(() => props.sortBy, v => { localSortBy.value = v })

const getScoreType = (score: number) => {
  if (score >= 85) return 'success'
  if (score >= 70) return 'warning'
  return 'danger'
}

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    completed: '#67c23a',
    running: '#409eff',
    pending: '#e6a23c',
    failed: '#f56c6c',
    none: '#909399'
  }
  return map[status] || '#909399'
}
</script>

<style scoped lang="scss">
.candidate-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .filter-label {
      font-size: 12px;
      color: #909399;
    }
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.batch-progress {
  padding: 12px 16px;
  background: #ecf5ff;
  border-bottom: 1px solid #b3d8ff;
  flex-shrink: 0;

  .batch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .batch-title {
    font-size: 13px;
    font-weight: 500;
    color: #409eff;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .batch-percent {
    font-size: 12px;
    color: #409eff;
    font-weight: 600;
  }

  .batch-items {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
}

.table-header {
  display: grid;
  grid-template-columns: 30px minmax(100px, 1fr) 200px 90px 90px 100px;
  gap: 8px;
  padding: 8px 16px;
  font-size: 12px;
  color: #909399;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.table-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.candidate-row {
  display: grid;
  grid-template-columns: 30px minmax(100px, 1fr) 200px 90px 90px 100px;
  gap: 8px;
  padding: 10px 8px;
  margin-bottom: 2px;
  border-radius: 6px;
  align-items: center;
  cursor: grab;
  transition: all 0.15s;
  border: 1px solid transparent;

  &:hover {
    background: #f5f7fa;
  }

  &.selected {
    background: #ecf5ff;
    border-color: #409eff;
  }

  &.is-dragging {
    opacity: 0.3;
    background: #f0f0f0;
  }

  &:active {
    cursor: grabbing;
  }

  .col-drag {
    display: flex;
    align-items: center;
    justify-content: center;

    .drag-handle {
      color: #c0c4cc;
      cursor: grab;
      font-size: 16px;
    }
  }

  .col-name {
    .name-text {
      font-size: 13px;
      font-weight: 600;
      color: #303133;
    }
  }

  .col-score {
    display: flex;
    align-items: center;
    gap: 8px;

    .score-detail {
      font-size: 11px;
      color: #909399;
    }

    .speaker-text {
      font-size: 11px;
      color: #409eff;
    }

    .no-score {
      color: #c0c4cc;
    }
  }

  .col-status {
    .status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-right: 4px;

      &.is-animating {
        animation: pulse 1.5s ease-in-out infinite;
      }
    }
  }

  .col-time {
    font-size: 12px;
    color: #909399;
  }

  .col-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
