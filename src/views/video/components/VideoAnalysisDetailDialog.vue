<template>
  <el-dialog 
    :model-value="modelValue" 
    title="视频分析详情" 
    width="700px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="videoAnalysis" class="video-analysis-detail">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h4>基本信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">候选人:</span>
            <span class="value">{{ videoAnalysis.candidate_name || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">岗位:</span>
            <span class="value">{{ videoAnalysis.position_title || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">视频名称:</span>
            <span class="value">{{ videoAnalysis.video_name || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">状态:</span>
            <el-tag :type="getStatusType(videoAnalysis.status)" size="small">
              {{ getStatusText(videoAnalysis.status) }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 分析评分 -->
      <div v-if="videoAnalysis.status === 'completed'" class="detail-section">
        <h4>分析评分</h4>
        
        <!-- 风险与置信度 -->
        <div class="scores-row">
          <div class="score-card" :class="getFraudClass(videoAnalysis.fraud_score)">
            <span class="score-label">欺诈风险</span>
            <span class="score-value">{{ formatScore(videoAnalysis.fraud_score) }}</span>
          </div>
          <div class="score-card">
            <span class="score-label">置信度</span>
            <span class="score-value">{{ formatScore(videoAnalysis.confidence_score) }}</span>
          </div>
        </div>

        <!-- 大五人格 -->
        <div v-if="videoAnalysis.big_five_scores" class="big-five-section">
          <h5>大五人格评分</h5>
          <div class="big-five-grid">
            <div class="personality-item">
              <span class="trait-name">开放性</span>
              <el-progress 
                :percentage="getPercentage(videoAnalysis.big_five_scores.openness)" 
                :stroke-width="12"
                :show-text="false"
              />
              <span class="trait-value">{{ formatScore(videoAnalysis.big_five_scores.openness) }}</span>
            </div>
            <div class="personality-item">
              <span class="trait-name">尽责性</span>
              <el-progress 
                :percentage="getPercentage(videoAnalysis.big_five_scores.conscientiousness)" 
                :stroke-width="12"
                :show-text="false"
              />
              <span class="trait-value">{{ formatScore(videoAnalysis.big_five_scores.conscientiousness) }}</span>
            </div>
            <div class="personality-item">
              <span class="trait-name">外向性</span>
              <el-progress 
                :percentage="getPercentage(videoAnalysis.big_five_scores.extraversion)" 
                :stroke-width="12"
                :show-text="false"
              />
              <span class="trait-value">{{ formatScore(videoAnalysis.big_five_scores.extraversion) }}</span>
            </div>
            <div class="personality-item">
              <span class="trait-name">宜人性</span>
              <el-progress 
                :percentage="getPercentage(videoAnalysis.big_five_scores.agreeableness)" 
                :stroke-width="12"
                :show-text="false"
              />
              <span class="trait-value">{{ formatScore(videoAnalysis.big_five_scores.agreeableness) }}</span>
            </div>
            <div class="personality-item">
              <span class="trait-name">神经质</span>
              <el-progress 
                :percentage="getPercentage(videoAnalysis.big_five_scores.neuroticism)" 
                :stroke-width="12"
                status="exception"
                :show-text="false"
              />
              <span class="trait-value">{{ formatScore(videoAnalysis.big_five_scores.neuroticism) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分析摘要 -->
      <div v-if="videoAnalysis.summary" class="detail-section">
        <h4>分析摘要</h4>
        <div class="summary-content">{{ videoAnalysis.summary }}</div>
      </div>

      <!-- 错误信息 -->
      <div v-if="videoAnalysis.error_message" class="detail-section error-section">
        <h4>错误信息</h4>
        <div class="error-content">{{ videoAnalysis.error_message }}</div>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { VideoAnalysisResponse } from '@/api/types.gen'

defineProps<{
  modelValue: boolean
  videoAnalysis: VideoAnalysisResponse | null
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const formatScore = (score?: number | null) => {
  if (score === undefined || score === null) return 'N/A'
  return score.toFixed(2)
}

const getPercentage = (score?: number | null) => {
  if (score === undefined || score === null) return 0
  return Math.round(score * 100)
}

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    processing: 'primary',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '等待处理',
    processing: '分析中',
    completed: '已完成',
    failed: '分析失败'
  }
  return texts[status] || status
}

const getFraudClass = (score?: number | null) => {
  if (score === undefined || score === null) return ''
  if (score >= 0.7) return 'fraud-high'
  if (score >= 0.4) return 'fraud-medium'
  return 'fraud-low'
}
</script>

<style scoped lang="scss">
.video-analysis-detail {
  .detail-section {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 12px 0;
      font-size: 15px;
      font-weight: 600;
      color: #303133;
      border-left: 3px solid #409eff;
      padding-left: 10px;
    }

    h5 {
      margin: 16px 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: #606266;
    }
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    
    .info-item {
      .label {
        color: #909399;
        margin-right: 8px;
      }
      .value {
        color: #303133;
        font-weight: 500;
      }
    }
  }

  .scores-row {
    display: flex;
    gap: 16px;

    .score-card {
      flex: 1;
      text-align: center;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 8px;

      &.fraud-high {
        background: #fef0f0;
        .score-value { color: #f56c6c; }
      }
      &.fraud-medium {
        background: #fdf6ec;
        .score-value { color: #e6a23c; }
      }
      &.fraud-low {
        background: #f0f9eb;
        .score-value { color: #67c23a; }
      }

      .score-label {
        display: block;
        font-size: 12px;
        color: #909399;
        margin-bottom: 8px;
      }

      .score-value {
        font-size: 24px;
        font-weight: 600;
        color: #303133;
      }
    }
  }

  .big-five-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .personality-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .trait-name {
        width: 60px;
        font-size: 13px;
        color: #606266;
      }

      .el-progress {
        flex: 1;
      }

      .trait-value {
        width: 50px;
        text-align: right;
        font-size: 13px;
        font-weight: 500;
        color: #303133;
      }
    }
  }

  .summary-content {
    padding: 16px;
    background: #fafafa;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1.8;
    color: #303133;
  }

  .error-section {
    h4 {
      border-left-color: #f56c6c;
    }
  }

  .error-content {
    padding: 16px;
    background: #fef0f0;
    border-radius: 6px;
    font-size: 14px;
    color: #f56c6c;
  }
}
</style>
