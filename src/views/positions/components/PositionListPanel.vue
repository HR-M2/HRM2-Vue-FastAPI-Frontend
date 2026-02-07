<template>
  <el-card class="positions-list-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-title">岗位列表</span>
        <el-button type="primary" size="small" @click="$emit('create')">
          <el-icon><Plus /></el-icon> 新建岗位
        </el-button>
      </div>
    </template>

    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>
    <div v-else-if="positions.length === 0" class="empty-positions">
      <el-empty description="暂无岗位，点击上方按钮创建" :image-size="80" />
    </div>
    <div v-else class="positions-list">
      <div
        v-for="pos in positions"
        :key="pos.id"
        class="position-item"
        :class="{ active: selectedPositionId === pos.id }"
        @click="$emit('select', pos)"
      >
        <div class="position-info">
          <div class="position-name">{{ pos.title }}</div>
          <div class="position-meta">
            <span class="resume-count">{{ pos.application_count || 0 }} 份简历</span>
            <el-tag v-if="!pos.is_active" type="info" size="small">已停用</el-tag>
          </div>
        </div>
        <div class="position-actions" @click.stop>
          <el-button
            type="danger"
            size="small"
            link
            @click="$emit('delete', pos)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import type { PositionListResponse } from '@/api/types.gen'

defineProps<{
  positions: PositionListResponse[]
  selectedPositionId: string | null
  loading: boolean
}>()

defineEmits<{
  select: [pos: PositionListResponse]
  delete: [pos: PositionListResponse]
  create: []
}>()
</script>

<style scoped>
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

.positions-list-card :deep(.el-card__header) {
  padding: 16px 20px;
  background-color: #fafafa;
  border-bottom: 1px solid #e4e7ed;
}

.loading-container {
  padding: 20px;
}

.empty-positions {
  padding: 40px 20px;
  text-align: center;
}

.positions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.position-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.position-item:hover {
  background: #f0f2f5;
}

.position-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.position-info {
  flex: 1;
}

.position-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.position-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}
</style>
