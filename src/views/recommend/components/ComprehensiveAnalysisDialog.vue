<template>
  <el-dialog
    :model-value="visible"
    title="综合分析详情"
    width="800px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="analysis" class="comprehensive-analysis">
      <!-- 总体评分 -->
      <div class="analysis-header">
        <div class="score-circle" :class="getComprehensiveScoreClass(analysis.final_score)">
          <span class="score-value">{{ analysis.final_score }}</span>
          <span class="score-label">分</span>
        </div>
        <div class="header-info">
          <h3 class="recommendation-label">{{ analysis.recommendation_level }}</h3>
          <p class="analysis-time" v-if="analysis.created_at">
            分析时间：{{ formatDateTime(analysis.created_at) }}
          </p>
        </div>
      </div>
      
      <!-- 维度评分 -->
      <div v-if="analysis.dimension_scores" class="dimension-scores">
        <h4>多维度 Rubric 评估</h4>
        <div class="dimension-grid">
          <div 
            v-for="(dim, key) in analysis.dimension_scores" 
            :key="key"
            class="dimension-item"
          >
            <div class="dimension-header">
              <span class="dimension-name">{{ dim.dimension_name || key }}</span>
              <span class="dimension-score" :class="getDimensionScoreClass(dim.dimension_score || 3)">
                {{ dim.dimension_score || 3 }}/5
              </span>
            </div>
            <el-progress 
              :percentage="(dim.dimension_score || 3) * 20" 
              :stroke-width="8"
              :color="getDimensionColor(dim.dimension_score || 3)"
            />
            <div class="dimension-details">
              <div v-if="dim.strengths?.length" class="detail-section">
                <span class="detail-label">优势：</span>
                <span>{{ dim.strengths.join('、') }}</span>
              </div>
              <div v-if="dim.weaknesses?.length" class="detail-section weakness">
                <span class="detail-label">不足：</span>
                <span>{{ dim.weaknesses.join('、') }}</span>
              </div>
            </div>
          </div>
          
          <!-- 可视化图表区（右下角） -->
          <div class="dimension-item charts-panel">
            <div class="chart-left">
              <AbilityRadarChart 
                :dimension-scores="analysis.dimension_scores" 
              />
            </div>
            <div class="chart-right">
              <BigFivePersonalityBars 
                :data="(analysis as any).big_five_personality || null" 
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 综合报告 -->
      <div v-if="analysis.report" class="comprehensive-report-text">
        <h4>综合分析报告</h4>
        <div class="report-content" v-html="formatReportContent(analysis.report)"></div>
      </div>
      
      <!-- 建议行动 -->
      <div v-if="analysis.suggested_action" class="suggested-action">
        <h4>建议行动</h4>
        <div class="action-content">{{ analysis.suggested_action }}</div>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('edit', analysis)">编辑报告</el-button>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { AbilityRadarChart, BigFivePersonalityBars } from '@/components/charts'
import type { ComprehensiveAnalysisResponse } from '@/api/types.gen'

defineProps<{
  visible: boolean
  analysis: ComprehensiveAnalysisResponse | null
}>()

defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'edit', analysis: ComprehensiveAnalysisResponse | null): void
}>()

const getComprehensiveScoreClass = (score: number) => {
  if (score >= 85) return 'score-strong'
  if (score >= 70) return 'score-good'
  if (score >= 55) return 'score-cautious'
  return 'score-not'
}

const getDimensionScoreClass = (score: number) => {
  // 1-5 分制
  if (score >= 4) return 'dim-excellent'
  if (score >= 3) return 'dim-good'
  return 'dim-weak'
}

const getDimensionColor = (score: number) => {
  // 1-5 分制
  if (score >= 4) return '#10b981'
  if (score >= 3) return '#3b82f6'
  if (score >= 2) return '#f59e0b'
  return '#ef4444'
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatReportContent = (content: string) => {
  if (!content) return ''
  // 简单的 markdown 转 HTML
  return content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
}
</script>

<style scoped lang="scss">
.comprehensive-analysis {
  .analysis-header {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 24px;
    padding: 20px;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border-radius: 16px;
    
    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      
      &.score-strong {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }
      &.score-good {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
      }
      &.score-cautious {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }
      &.score-not {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
      }
      
      .score-value {
        font-size: 32px;
        font-weight: 700;
      }
      
      .score-label {
        font-size: 14px;
        opacity: 0.9;
      }
    }
    
    .header-info {
      .recommendation-label {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 700;
        color: #1a1a2e;
      }
      
      .analysis-time {
        margin: 0;
        font-size: 13px;
        color: #6b7280;
      }
    }
  }
  
  .dimension-scores {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }
    
    .dimension-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .dimension-item {
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      
      .dimension-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        
        .dimension-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        
        .dimension-score {
          font-size: 14px;
          font-weight: 600;
          
          &.dim-excellent {
            color: #10b981;
          }
          &.dim-good {
            color: #3b82f6;
          }
          &.dim-weak {
            color: #f59e0b;
          }
        }
      }
      
      .dimension-details {
        margin-top: 12px;
        
        .detail-section {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
          line-height: 1.5;
          
          .detail-label {
            color: #10b981;
            font-weight: 500;
          }
          
          &.weakness .detail-label {
            color: #f59e0b;
          }
        }
      }

      // 图表面板样式
      &.charts-panel {
        display: flex;
        flex-direction: row;
        gap: 12px;
        padding: 12px;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border: 1px solid #e2e8f0;

        .chart-left {
          flex: 1;
          min-width: 0;
        }

        .chart-right {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
        }
      }
    }
  }
  
  .comprehensive-report-text {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }
    
    .report-content {
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      font-size: 14px;
      color: #374151;
      line-height: 1.8;
      
      :deep(p) {
        margin: 0 0 12px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      :deep(strong) {
        color: #1a1a2e;
      }
    }
  }
  
  .suggested-action {
    h4 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }
    
    .action-content {
      padding: 16px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 12px;
      font-size: 14px;
      color: #0369a1;
      line-height: 1.6;
    }
  }
}

@media (max-width: 1200px) {
  .comprehensive-analysis .dimension-scores .dimension-grid {
    grid-template-columns: 1fr;
  }
}
</style>
