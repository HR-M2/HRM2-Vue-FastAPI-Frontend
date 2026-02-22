<template>
  <el-card class="video-resumes-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-title">候选人视频分析</span>
        <el-tag v-if="selectedPosition" type="info" size="small">
          {{ selectedPosition.title }}
        </el-tag>
      </div>
    </template>

    <!-- 未选择岗位 -->
    <div v-if="!selectedPosition" class="empty-state">
      <el-empty description="请在左侧选择岗位查看候选人" :image-size="100" />
    </div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 岗位无候选人 -->
    <div v-else-if="!applications.length" class="empty-state">
      <el-empty description="该岗位暂无候选人" :image-size="100">
        <el-button type="primary" size="small" @click="$emit('goToScreening')">
          去初筛添加
        </el-button>
      </el-empty>
    </div>

    <!-- 候选人列表 -->
    <div v-else class="resumes-list">
      <div 
        v-for="app in applications" 
        :key="app.id" 
        class="resume-item"
        :class="{ 'has-video': app.video_analysis }"
      >
        <!-- 候选人信息 -->
        <div class="resume-header">
          <div class="candidate-info">
            <h4>{{ app.candidate_name || '未知候选人' }}</h4>
            <span class="position">{{ app.position_title }}</span>
          </div>
          <div 
            class="score-badge"
            :class="getScoreBadgeClass(app.screening_task?.score)"
          >
            <span class="score-label">初筛评分</span>
            <span class="score-value">{{ app.screening_task?.score ?? 'N/A' }}</span>
          </div>
        </div>

        <!-- 初筛评分详情 -->
        <div v-if="app.screening_task?.dimension_scores" class="score-breakdown">
          <div class="score-item">
            <span class="label">HR:</span>
            <strong>{{ getDimensionScore(app.screening_task.dimension_scores, 'hr_score') }}</strong>
          </div>
          <div class="score-item">
            <span class="label">技术:</span>
            <strong>{{ getDimensionScore(app.screening_task.dimension_scores, 'technical_score') }}</strong>
          </div>
          <div class="score-item">
            <span class="label">管理:</span>
            <strong>{{ getDimensionScore(app.screening_task.dimension_scores, 'manager_score') }}</strong>
          </div>
        </div>

        <!-- 视频分析结果 -->
        <div 
          v-if="app.video_analysis && app.video_analysis.status === 'completed'" 
          class="video-analysis-scores"
        >
          <div class="section-title">
            <el-icon><VideoCamera /></el-icon>
            视频分析评分
          </div>
          <div class="analysis-grid">
            <div class="analysis-item fraud">
              <span class="label">欺诈风险:</span>
              <strong :class="getFraudScoreClass(app.video_analysis.fraud_score)">
                {{ formatScore(app.video_analysis.fraud_score) }}
              </strong>
            </div>
            <div class="analysis-item">
              <span class="label">自信度:</span>
              <strong>{{ formatScore(app.video_analysis.confidence_score) }}</strong>
            </div>
            <div v-if="app.video_analysis.big_five_scores" class="analysis-item">
              <span class="label">外向性:</span>
              <strong>{{ formatScore(app.video_analysis.big_five_scores.extraversion) }}</strong>
            </div>
            <div v-if="app.video_analysis.big_five_scores" class="analysis-item">
              <span class="label">开放性:</span>
              <strong>{{ formatScore(app.video_analysis.big_five_scores.openness) }}</strong>
            </div>
            <div v-if="app.video_analysis.big_five_scores" class="analysis-item">
              <span class="label">宜人性:</span>
              <strong>{{ formatScore(app.video_analysis.big_five_scores.agreeableness) }}</strong>
            </div>
            <div v-if="app.video_analysis.big_five_scores" class="analysis-item">
              <span class="label">尽责性:</span>
              <strong>{{ formatScore(app.video_analysis.big_five_scores.conscientiousness) }}</strong>
            </div>
          </div>
        </div>

        <!-- 视频分析状态 -->
        <div v-else-if="app.video_analysis" class="video-status">
          <span class="label">视频分析状态:</span>
          <el-tag :type="getVideoStatusType(app.video_analysis.status)" size="small">
            {{ getVideoStatusText(app.video_analysis.status) }}
          </el-tag>
        </div>

        <!-- 操作按钮 -->
        <div class="resume-actions">
          <el-button 
            size="small" 
            @click="$emit('viewDetail', app)"
          >
            查看简历
          </el-button>
          <el-button
            v-if="!app.video_analysis"
            size="small"
            type="primary"
            @click="$emit('uploadVideo', app)"
          >
            <el-icon><Upload /></el-icon>
            上传视频
          </el-button>
          <el-button
            v-else-if="app.video_analysis.status === 'completed'"
            size="small"
            type="success"
            @click="$emit('viewVideoResult', app)"
          >
            <el-icon><VideoCamera /></el-icon>
            查看分析
          </el-button>
          <el-button
            v-else-if="app.video_analysis.status === 'processing'"
            size="small"
            type="warning"
            loading
          >
            分析中...
          </el-button>
          <el-button
            v-else-if="app.video_analysis.status === 'failed'"
            size="small"
            type="danger"
            @click="$emit('uploadVideo', app)"
          >
            重新上传
          </el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { VideoCamera, Upload } from '@element-plus/icons-vue'
import type { PositionData, VideoApplicationData } from '@/types'

defineProps<{
  selectedPosition: PositionData | null
  applications: VideoApplicationData[]
  loading: boolean
}>()

defineEmits<{
  goToScreening: []
  viewDetail: [app: VideoApplicationData]
  uploadVideo: [app: VideoApplicationData]
  viewVideoResult: [app: VideoApplicationData]
}>()

// 工具函数
const formatScore = (score?: number | null) => {
  if (score === undefined || score === null) return 'N/A'
  return score.toFixed(2)
}

const getDimensionScore = (scores: Record<string, unknown> | null, key: string) => {
  if (!scores) return 'N/A'
  const value = scores[key]
  if (typeof value === 'number') return value.toFixed(0)
  return 'N/A'
}

const getScoreBadgeClass = (score?: number | null) => {
  if (score === undefined || score === null) return 'score-na'
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-medium'
  return 'score-low'
}

const getFraudScoreClass = (score?: number | null) => {
  if (score === undefined || score === null) return ''
  if (score >= 0.7) return 'fraud-high'
  if (score >= 0.4) return 'fraud-medium'
  return 'fraud-low'
}

const getVideoStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    processing: 'primary',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

const getVideoStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '等待处理',
    processing: '分析中',
    completed: '已完成',
    failed: '分析失败'
  }
  return texts[status] || status
}
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

.empty-state,
.loading-state {
  padding: 40px 0;
}

.resumes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resume-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 3px solid #909399;
  transition: all 0.2s;

  &.has-video {
    border-left-color: #409eff;
  }

  &:hover {
    background: #f5f7fa;
  }
}

.resume-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;

  .candidate-info {
    h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      color: #303133;
    }

    .position {
      font-size: 13px;
      color: #909399;
    }
  }
}

.score-badge {
  padding: 8px 12px;
  border-radius: 8px;
  text-align: center;
  background: #f5f7fa;

  &.score-high {
    background: #f0f9eb;
    .score-value { color: #67c23a; }
  }

  &.score-medium {
    background: #fdf6ec;
    .score-value { color: #e6a23c; }
  }

  &.score-low {
    background: #fef0f0;
    .score-value { color: #f56c6c; }
  }

  .score-label {
    display: block;
    font-size: 11px;
    color: #909399;
    margin-bottom: 2px;
  }

  .score-value {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
}

.score-breakdown {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;

  .score-item {
    font-size: 13px;

    .label {
      color: #909399;
    }

    strong {
      color: #303133;
      margin-left: 4px;
    }
  }
}

.video-analysis-scores {
  margin: 12px 0;
  padding: 12px;
  background: #ecf5ff;
  border-radius: 6px;

  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #409eff;
    margin-bottom: 10px;
  }

  .analysis-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .analysis-item {
    font-size: 12px;

    .label {
      color: #606266;
    }

    strong {
      margin-left: 4px;
      color: #303133;

      &.fraud-high { color: #f56c6c; }
      &.fraud-medium { color: #e6a23c; }
      &.fraud-low { color: #67c23a; }
    }
  }
}

.video-status {
  margin: 12px 0;
  font-size: 13px;

  .label {
    color: #909399;
    margin-right: 8px;
  }
}

.resume-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
