<template>
  <div class="position-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">
        <span>招聘岗位</span>
        <el-tag type="info" size="small">{{ positions.length }} 个</el-tag>
      </div>
      <div class="sidebar-hint">拖拽候选人到岗位可调整分配</div>
    </div>

    <div class="sidebar-list">
      <div
        v-for="pos in positions"
        :key="pos.id"
        class="pos-item"
        :class="{
          active: selectedPositionId === pos.id,
          'drag-over': dragOverPositionId === pos.id
        }"
        @click="$emit('select', pos)"
        @dragover.prevent="$emit('dragOver', $event, pos.id)"
        @dragleave="$emit('dragLeave', $event, pos.id)"
        @drop="$emit('drop', $event, pos.id)"
      >
        <div class="pos-header">
          <span class="pos-title">{{ pos.title }}</span>
          <el-tag size="small" :type="selectedPositionId === pos.id ? 'primary' : 'info'" round>
            {{ pos.resume_count || 0 }}
          </el-tag>
        </div>
        <div class="pos-meta">
          <span v-if="pos.department" class="pos-dept">{{ pos.department }}</span>
          <span v-if="getUnscreenedCount(pos)" class="pos-unscreened">
            待筛 {{ getUnscreenedCount(pos) }}
          </span>
        </div>

        <!-- 拖拽提示（候选人调岗） -->
        <div v-if="dragOverPositionId === pos.id && draggingCandidate" class="drop-hint">
          <el-icon><Plus /></el-icon>
          松开以将「{{ draggingCandidate.candidateName }}」移至此岗位
        </div>
        <!-- 拖拽提示（智能匹配简历分配） -->
        <div v-else-if="dragOverPositionId === pos.id && draggingResumeName" class="drop-hint">
          <el-icon><Plus /></el-icon>
          松开以将「{{ draggingResumeName }}」添加到此岗位
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <router-link to="/positions">
        <el-button type="primary" size="small" plain class="manage-btn">
          <el-icon><Setting /></el-icon>
          管理岗位
        </el-button>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Setting } from '@element-plus/icons-vue'
import type { PositionData } from '@/types'
import type { CandidateItem } from '../composables/useCandidateList'

defineProps<{
  positions: PositionData[]
  selectedPositionId: string | null
  dragOverPositionId: string | null
  draggingCandidate: CandidateItem | null
  draggingResumeName: string | null
  candidateStats: Record<string, { total: number; unscreened: number }>
}>()

defineEmits<{
  select: [pos: PositionData]
  dragOver: [e: DragEvent, posId: string]
  dragLeave: [e: DragEvent, posId: string]
  drop: [e: DragEvent, posId: string]
}>()

const getUnscreenedCount = (pos: PositionData) => {
  // 暂时返回0，由父组件通过 candidateStats prop 提供
  return 0
}
</script>

<style scoped lang="scss">
.position-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #ebeef5;

  .sidebar-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 4px;
  }

  .sidebar-hint {
    font-size: 12px;
    color: #909399;
  }
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.pos-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
  border: 2px solid transparent;
  background: #fafafa;
  transition: all 0.2s;

  &:hover {
    background: #f0f2f5;
  }

  &.active {
    background: #ecf5ff;
    border-color: #409eff;
  }

  &.drag-over {
    background: #e6f7ff !important;
    border-color: #409eff !important;
    border-style: dashed;
    transform: scale(1.02);
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15);
  }

  .pos-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .pos-title {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
  }

  .pos-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #909399;
  }

  .pos-unscreened {
    color: #e6a23c;
    font-weight: 500;
  }

  .drop-hint {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: 4px;
    background: rgba(64, 158, 255, 0.08);
    border: 1px dashed #409eff;
    font-size: 12px;
    color: #409eff;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
}

.sidebar-footer {
  padding: 10px;
  border-top: 1px solid #ebeef5;

  .manage-btn {
    width: 100%;
  }
}
</style>
