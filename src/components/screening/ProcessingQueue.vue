<template>
  <el-card class="queue-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-title">简历处理队列</span>
        <el-tag type="info">队列中 {{ queue.length }} 份</el-tag>
      </div>
    </template>

    <div v-if="queue.length === 0" class="empty-queue">
      <el-empty description="已提交的简历将在此显示" :image-size="60" />
    </div>
    <div v-else class="queue-list">
      <div
        v-for="(item, idx) in queue"
        :key="item.task_id || idx"
        class="queue-item clickable"
        :class="`status-${item.status}`"
        @click="$emit('showDetail', item)"
      >
        <div class="queue-info">
          <div class="queue-name">
            {{ item.name }}
            <el-tag v-if="item.applied_position" type="info" size="small" effect="light" class="position-tag">
              {{ item.applied_position }}
            </el-tag>
          </div>
          <div class="queue-meta">
            <el-tag :type="getStatusType(item.status)" size="small">
              {{ getStatusText(item.status) }}
            </el-tag>
            <span v-if="item.current_speaker" class="speaker">
              {{ getSpeakerText(item.current_speaker) }}
            </span>
            <span class="queue-time">{{ formatDate(item.created_at) }}</span>
          </div>
          <!-- 进度条：在pending、running、processing状态都显示 -->
          <div v-if="item.status === 'pending' || item.status === 'running' || item.status === 'processing'" class="progress-container">
            <el-progress
              :percentage="item.progress || 0"
              :stroke-width="6"
              :status="(item.status === 'running' || item.status === 'processing') ? 'warning' : undefined"
            />
          </div>
          <!-- 评分显示 -->
          <div v-if="item.status === 'completed' && getItemScore(item)" class="queue-scores">
            <el-tag type="success" size="small" effect="plain">
              综合: {{ getItemScore(item)?.comprehensive_score }}
            </el-tag>
            <el-tag type="info" size="small" effect="plain">
              HR: {{ getItemScore(item)?.hr_score || '-' }}
            </el-tag>
            <el-tag type="warning" size="small" effect="plain">
              技术: {{ getItemScore(item)?.technical_score || '-' }}
            </el-tag>
            <el-tag size="small" effect="plain">
              管理: {{ getItemScore(item)?.manager_score || '-' }}
            </el-tag>
          </div>
        </div>
        <div class="queue-actions">
          <el-button
            v-if="item.status === 'completed' && item.task_id"
            size="small"
            type="success"
            @click.stop="$emit('downloadReport', item.task_id!)"
          >
            下载报告
          </el-button>
          <el-button
            v-if="item.status === 'completed'"
            size="small"
            type="primary"
            @click.stop="$emit('addToGroup', item)"
          >
            加入分组
          </el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useScreeningUtils } from '@/composables/useScreeningUtils'
import type { ProcessingTask } from '@/types'

defineProps<{
  queue: ProcessingTask[]
}>()

defineEmits<{
  showDetail: [item: ProcessingTask]
  downloadReport: [taskId: string]
  addToGroup: [item: ProcessingTask]
}>()

const { 
  formatDate, 
  getStatusType, 
  getStatusText, 
  getSpeakerText, 
  getItemScore 
} = useScreeningUtils()
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.empty-queue {
  padding: 20px 0;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border-left: 3px solid transparent;
  transition: all 0.2s;

  &.clickable {
    cursor: pointer;
    
    &:hover {
      background: #f0f5ff;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
    }
  }

  &.status-pending { border-left-color: #e6a23c; }
  &.status-running { border-left-color: #409eff; }
  &.status-completed { border-left-color: #67c23a; }
  &.status-failed { border-left-color: #f56c6c; }
}

.queue-info {
  .queue-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 6px;
    
    .position-tag {
      background-color: #e6f7ff;
      border-color: #91d5ff;
      color: #1890ff;
    }
  }

  .queue-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #909399;
  }
  
  .progress-container {
    margin-top: 8px;
    margin-bottom: 8px;
  }

  .queue-scores {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .queue-time {
    font-size: 12px;
    color: #c0c4cc;
  }
}

.queue-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

</style>
