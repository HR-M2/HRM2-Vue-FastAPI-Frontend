<template>
  <el-dialog
    v-model="visible"
    title="面试结果统计"
    width="800px"
    :close-on-click-modal="!loading"
    :close-on-press-escape="true"
    :show-close="true"
    class="interview-result-dialog"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <el-icon class="is-loading" :size="48" color="#409eff"><Loading /></el-icon>
      </div>
      <p>正在生成面试报告...</p>
      <el-button class="cancel-btn" @click="handleClose">退出面试界面</el-button>
    </div>
    
    <div v-else-if="error" class="error-container">
      <el-icon class="error-icon" color="#f56c6c" size="48"><CircleClose /></el-icon>
      <h3 class="error-title">面试报告生成失败</h3>
      <p class="error-message">{{ error }}</p>
      <div class="error-actions">
        <el-button type="primary" @click="handleClose">确定</el-button>
      </div>
    </div>
    
    <div v-else-if="resultData" class="result-content">
      <!-- 会话基本信息 -->
      <div class="session-info-card">
        <h3>面试基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">候选人：</span>
            <span class="value">{{ resultData.candidate_name }}</span>
          </div>
          <div class="info-item">
            <span class="label">应聘岗位：</span>
            <span class="value">{{ resultData.position_title }}</span>
          </div>
          <div class="info-item">
            <span class="label">面试时长：</span>
            <span class="value">{{ formatDuration(resultData.duration_seconds) }}</span>
          </div>
          <div class="info-item">
            <span class="label">开始时间：</span>
            <span class="value">{{ formatDateTime(resultData.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- 统计数据 -->
      <div class="statistics-card">
        <h3>对话统计</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ resultData.statistics.total_segments }}</div>
            <div class="stat-label">总对话段数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ (resultData.statistics.candidate_speak_ratio * 100).toFixed(1) }}%</div>
            <div class="stat-label">候选人发言比例</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ (resultData.statistics.interviewer_speak_ratio * 100).toFixed(1) }}%</div>
            <div class="stat-label">面试官发言比例</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ Math.round(resultData.statistics.session_quality_score) }}</div>
            <div class="stat-label">会话质量分</div>
          </div>
        </div>
      </div>

      <!-- 心理分析汇总 -->
      <div v-if="resultData.psychological_summary" class="psychology-card">
        <h3>心理分析汇总</h3>
        
        <!-- 大五人格 -->
        <div class="big-five-section">
          <h4>大五人格特征</h4>
          <div class="personality-traits">
            <div class="trait-item">
              <span class="trait-name">开放性</span>
              <el-progress 
                :percentage="Math.round((resultData.psychological_summary.final_big_five?.openness || 0) * 100)"
                :stroke-width="8"
                :show-text="true"
              />
            </div>
            <div class="trait-item">
              <span class="trait-name">尽责性</span>
              <el-progress 
                :percentage="Math.round((resultData.psychological_summary.final_big_five?.conscientiousness || 0) * 100)"
                :stroke-width="8"
                :show-text="true"
              />
            </div>
            <div class="trait-item">
              <span class="trait-name">外向性</span>
              <el-progress 
                :percentage="Math.round((resultData.psychological_summary.final_big_five?.extraversion || 0) * 100)"
                :stroke-width="8"
                :show-text="true"
              />
            </div>
            <div class="trait-item">
              <span class="trait-name">宜人性</span>
              <el-progress 
                :percentage="Math.round((resultData.psychological_summary.final_big_five?.agreeableness || 0) * 100)"
                :stroke-width="8"
                :show-text="true"
              />
            </div>
            <div class="trait-item">
              <span class="trait-name">神经质</span>
              <el-progress 
                :percentage="Math.round((resultData.psychological_summary.final_big_five?.neuroticism || 0) * 100)"
                :stroke-width="8"
                :show-text="true"
                color="#f56c6c"
              />
            </div>
          </div>
        </div>

        <!-- 抑郁风险评估 -->
        <div class="depression-section">
          <h4>心理健康评估</h4>
          <div class="depression-info">
            <div class="risk-level" :class="getRiskLevelClass(resultData.psychological_summary.depression_assessment?.level || 'unknown')">
              <span class="risk-label">抑郁风险等级：</span>
              <span class="risk-value">{{ getRiskLevelText(resultData.psychological_summary.depression_assessment?.level || 'unknown') }}</span>
            </div>
            <div class="risk-score">
              <span class="score-label">风险评分：</span>
              <span class="score-value">{{ (resultData.psychological_summary.depression_assessment?.score || 0).toFixed(1) }}/100</span>
            </div>
          </div>
        </div>

        <!-- 积极特质和关注点 -->
        <div class="traits-section">
          <div class="positive-traits">
            <h4>积极特质</h4>
            <div class="trait-tags">
              <el-tag 
                v-for="trait in []" 
                :key="trait"
                type="success"
                class="trait-tag"
              >
                {{ trait }}
              </el-tag>
            </div>
          </div>
          
          <div class="concerns">
            <h4>关注点</h4>
            <div class="concern-tags">
              <el-tag 
                v-for="concern in []" 
                :key="concern"
                type="warning"
                class="concern-tag"
              >
                {{ concern }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 质量评分 -->
      <div class="quality-card">
        <h3>面试质量评分</h3>
        <div class="quality-scores">
          <div class="score-item">
            <div class="score-circle">
              <el-progress 
                type="circle" 
                :percentage="Math.round(resultData.statistics.session_quality_score)"
                :width="80"
                :stroke-width="8"
              />
            </div>
            <div class="score-label">会话质量</div>
          </div>
          <div class="score-item">
            <div class="score-circle">
              <el-progress 
                type="circle" 
                :percentage="Math.round(resultData.psychological_summary?.psychological_wellness_score || 0)"
                :width="80"
                :stroke-width="8"
                color="#67c23a"
              />
            </div>
            <div class="score-label">心理健康</div>
          </div>
        </div>
      </div>
    </div>

    <template v-if="!loading" #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">退出面试界面</el-button>
        <el-button v-if="resultData" type="primary" @click="handleExport">导出报告</el-button>
        <el-button v-if="resultData" type="success" @click="handleViewFullReport">查看详细报告</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleClose, Loading } from '@element-plus/icons-vue'
import type { CompleteSessionResponse } from '@/composables/useImmersiveInterview'

interface Props {
  modelValue: boolean
  resultData?: CompleteSessionResponse | null
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  resultData: null,
  loading: false,
  error: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'export-report'): void
  (e: 'view-full-report'): void
  (e: 'close'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 格式化时长
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟${secs}秒`
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`
  } else {
    return `${secs}秒`
  }
}

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 获取风险等级样式类
const getRiskLevelClass = (level: string): string => {
  switch (level) {
    case 'low': return 'risk-low'
    case 'medium': return 'risk-medium'
    case 'high': return 'risk-high'
    default: return 'risk-unknown'
  }
}

// 获取风险等级文本
const getRiskLevelText = (level: string): string => {
  switch (level) {
    case 'low': return '低风险'
    case 'medium': return '中等风险'
    case 'high': return '高风险'
    default: return '未知'
  }
}

// 获取趋势文本
const getTrendText = (trend: string | undefined): string => {
  switch (trend) {
    case 'improving': return '改善中'
    case 'stable': return '稳定'
    case 'worsening': return '恶化中'
    case 'insufficient_data': return '数据不足'
    default: return '未知'
  }
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  emit('close')
}

// 导出报告
const handleExport = () => {
  emit('export-report')
  ElMessage.success('报告导出功能开发中...')
}

// 查看详细报告
const handleViewFullReport = () => {
  emit('view-full-report')
  ElMessage.success('详细报告功能开发中...')
}
</script>

<style scoped lang="scss">
.interview-result-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  
  .loading-spinner {
    margin-bottom: 16px;
    
    .is-loading {
      animation: rotating 2s linear infinite;
    }
  }
  
  p {
    margin: 0 0 20px 0;
    color: #666;
    font-size: 14px;
  }
  
  .cancel-btn {
    margin-top: 8px;
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
  
  .error-icon {
    margin-bottom: 16px;
  }
  
  .error-title {
    margin: 0 0 12px 0;
    color: #f56c6c;
    font-size: 18px;
    font-weight: 600;
  }
  
  .error-message {
    margin: 0 0 24px 0;
    color: #666;
    line-height: 1.6;
    max-width: 400px;
  }
  
  .error-actions {
    display: flex;
    gap: 12px;
  }
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// 会话信息卡片
.session-info-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  
  h3 {
    margin: 0 0 12px 0;
    color: #1f2937;
    font-size: 16px;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    
    .info-item {
      display: flex;
      
      .label {
        color: #6b7280;
        margin-right: 8px;
        min-width: 80px;
      }
      
      .value {
        color: #1f2937;
        font-weight: 500;
      }
    }
  }
}

// 统计数据卡片
.statistics-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  
  h3 {
    margin: 0 0 16px 0;
    color: #1f2937;
    font-size: 16px;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    
    .stat-item {
      text-align: center;
      
      .stat-value {
        font-size: 24px;
        font-weight: 600;
        color: #3b82f6;
        margin-bottom: 4px;
      }
      
      .stat-label {
        font-size: 12px;
        color: #6b7280;
      }
    }
  }
}

// 心理分析卡片
.psychology-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  
  h3 {
    margin: 0 0 16px 0;
    color: #1f2937;
    font-size: 16px;
  }
  
  h4 {
    margin: 16px 0 12px 0;
    color: #374151;
    font-size: 14px;
  }
  
  .personality-traits {
    display: flex;
    flex-direction: column;
    gap: 12px;
    
    .trait-item {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .trait-name {
        min-width: 60px;
        font-size: 13px;
        color: #374151;
      }
      
      :deep(.el-progress) {
        flex: 1;
      }
    }
  }
  
  .depression-info {
    display: flex;
    gap: 24px;
    align-items: center;
    
    .risk-level {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .risk-label {
        color: #6b7280;
      }
      
      .risk-value {
        font-weight: 600;
      }
      
      &.risk-low .risk-value {
        color: #10b981;
      }
      
      &.risk-medium .risk-value {
        color: #f59e0b;
      }
      
      &.risk-high .risk-value {
        color: #ef4444;
      }
    }
    
    .risk-score {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .score-label {
        color: #6b7280;
      }
      
      .score-value {
        font-weight: 600;
        color: #374151;
      }
    }
  }
  
  .traits-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 16px;
    
    .trait-tags, .concern-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      
      .trait-tag, .concern-tag {
        margin: 0;
      }
    }
  }
}

// 质量评分卡片
.quality-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  
  h3 {
    margin: 0 0 16px 0;
    color: #1f2937;
    font-size: 16px;
  }
  
  .quality-scores {
    display: flex;
    justify-content: space-around;
    
    .score-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      
      .score-label {
        font-size: 14px;
        color: #6b7280;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>