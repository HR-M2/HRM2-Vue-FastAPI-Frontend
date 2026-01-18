<template>
  <div class="candidate-card" :class="{ 'expanded': isExpanded }">
    <!-- 卡片头部 -->
    <div class="card-header" @click="toggleExpand">
      <div class="candidate-info">
        <div class="avatar">
          <el-icon><User /></el-icon>
        </div>
        <div class="info">
          <h3>{{ application.candidate_name || '未知候选人' }}</h3>
          <p class="position">{{ application.position_title || '未指定岗位' }}</p>
        </div>
      </div>
      
      <div class="header-right">
        <!-- 综合推荐标签 -->
        <div v-if="comprehensiveAnalysis" class="recommendation-badge" :class="recommendationClass">
          <el-icon><Trophy /></el-icon>
          <span>{{ comprehensiveAnalysis.recommendation_level }}</span>
          <span class="score">{{ comprehensiveAnalysis.final_score }}分</span>
        </div>
        <div v-else class="status-badge pending">
          <el-icon><Clock /></el-icon>
          <span>待分析</span>
        </div>
        
        <el-icon class="expand-icon" :class="{ 'rotated': isExpanded }">
          <ArrowDown />
        </el-icon>
      </div>
    </div>
    
    <!-- 数据完整度进度条 -->
    <div class="completeness-bar">
      <div class="bar-track">
        <div class="bar-fill" :style="{ width: completenessPercent + '%' }"></div>
      </div>
      <span class="bar-label">数据完整度 {{ completenessPercent }}%</span>
    </div>
    
    <!-- 展开内容 -->
    <transition name="expand">
      <div v-if="isExpanded" class="card-content">
        <!-- 数据源状态列表 -->
        <div class="data-sources">
          <h4 class="section-title">
            <el-icon><Document /></el-icon>
            分析数据源
          </h4>
          
          <!-- 1. 简历 -->
          <div class="data-item" :class="{ 'available': hasResume }">
            <div class="item-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="item-info">
              <span class="item-name">简历文件</span>
              <span class="item-status">{{ hasResume ? '已上传' : '未上传' }}</span>
            </div>
            <el-button v-if="hasResume" size="small" text type="primary" @click.stop="$emit('viewResume')">
              查看
            </el-button>
          </div>
          
          <!-- 2. 简历初筛报告 -->
          <div class="data-item" :class="{ 'available': hasScreeningReport }">
            <div class="item-icon">
              <el-icon><DataAnalysis /></el-icon>
            </div>
            <div class="item-info">
              <span class="item-name">简历初筛报告</span>
              <span class="item-status">
                {{ hasScreeningReport ? `评分 ${screeningScore}` : '未生成' }}
              </span>
            </div>
            <el-button v-if="hasScreeningReport" size="small" text type="primary" @click.stop="$emit('viewScreeningReport')">
              查看
            </el-button>
            <el-button v-else size="small" text @click.stop="$emit('goToScreening')">
              去初筛
            </el-button>
          </div>
          
          <!-- 3. 沉浸式面试问答记录 -->
          <div class="data-item" :class="{ 'available': hasImmersiveRecords }">
            <div class="item-icon">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <div class="item-info">
              <span class="item-name">沉浸式面试问答记录</span>
              <span class="item-status">
                {{ hasImmersiveRecords ? `${immersiveUtteranceCount} 条对话` : '无记录' }}
              </span>
            </div>
            <el-button v-if="hasImmersiveRecords" size="small" text type="primary" @click.stop="$emit('viewImmersiveRecords')">
              查看
            </el-button>
            <el-button v-else size="small" text @click.stop="$emit('goToImmersive')">
              去面试
            </el-button>
          </div>
          
          <!-- 4. 沉浸式面试分析报告 -->
          <div class="data-item" :class="{ 'available': hasImmersiveReport }">
            <div class="item-icon">
              <el-icon><Memo /></el-icon>
            </div>
            <div class="item-info">
              <span class="item-name">沉浸式面试分析报告</span>
              <span class="item-status">
                {{ hasImmersiveReport ? '已生成' : (hasImmersiveRecords ? '有对话记录，可生成' : '未生成') }}
              </span>
            </div>
            <el-button v-if="hasImmersiveReport" size="small" text type="primary" @click.stop="$emit('viewImmersiveReport')">
              查看
            </el-button>
          </div>
          
          <!-- 5. 面试视频分析（预留） -->
          <div class="data-item" :class="{ 'available': hasVideoAnalysis }">
            <div class="item-icon">
              <el-icon><VideoCamera /></el-icon>
            </div>
            <div class="item-info">
              <span class="item-name">面试视频分析</span>
              <span class="item-status">
                {{ hasVideoAnalysis ? '已完成' : '未分析' }}
              </span>
            </div>
            <el-button v-if="hasVideoAnalysis" size="small" text type="primary" @click.stop="$emit('viewVideoAnalysis')">
              查看
            </el-button>
            <el-button v-else size="small" text @click.stop="$emit('goToVideo')">
              去分析
            </el-button>
          </div>
        </div>
        
        <!-- 综合分析操作区 -->
        <div class="analysis-section">
          <h4 class="section-title">
            <el-icon><MagicStick /></el-icon>
            综合分析
          </h4>
          
          <div v-if="!canAnalyze" class="analysis-requirements">
            <el-alert type="warning" :closable="false" show-icon>
              <template #title>
                需要以下数据才能进行综合分析：
              </template>
              <ul class="requirements-list">
                <li :class="{ 'met': hasResume }">
                  <el-icon><Check v-if="hasResume" /><Close v-else /></el-icon>
                  简历文件
                </li>
                <li :class="{ 'met': hasScreeningReport }">
                  <el-icon><Check v-if="hasScreeningReport" /><Close v-else /></el-icon>
                  简历初筛报告
                </li>
                <li :class="{ 'met': hasImmersiveReport }">
                  <el-icon><Check v-if="hasImmersiveReport" /><Close v-else /></el-icon>
                  沉浸式面试分析报告
                </li>
              </ul>
            </el-alert>
          </div>
          
          <div v-else-if="isAnalyzing" class="analysis-progress">
            <el-progress :percentage="analysisProgress" :status="analysisStatus" :stroke-width="12" />
            <p class="progress-text">{{ analysisStatusText }}</p>
          </div>
          
          <div v-else-if="comprehensiveAnalysis" class="analysis-result">
            <div class="result-header">
              <div class="result-badge" :class="recommendationClass">
                <el-icon><Trophy /></el-icon>
                <span class="result-text">{{ comprehensiveAnalysis.recommendation_level }}</span>
                <span class="result-score">{{ comprehensiveAnalysis.final_score }}分</span>
              </div>
              <div class="result-actions">
                <el-button size="small" text type="primary" @click.stop="$emit('viewFinalReport')">
                  查看完整报告
                </el-button>
                <el-button 
                  size="small" 
                  type="info" 
                  plain
                  @click.stop="$emit('startAnalysis')"
                >
                  <el-icon><Refresh /></el-icon>
                  重新分析
                </el-button>
              </div>
            </div>
          </div>
          
          <div v-else class="analysis-action">
            <el-button 
              type="primary" 
              size="large"
              :loading="isAnalyzing"
              @click.stop="$emit('startAnalysis')"
            >
              <el-icon><MagicStick /></el-icon>
              开始综合分析
            </el-button>
            <p class="action-hint">将综合简历、初筛报告、沉浸式面试分析报告生成最终录用建议</p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  User, Trophy, Clock, ArrowDown, Document, DataAnalysis, 
  ChatDotRound, Memo, VideoCamera, MagicStick, Check, Close, Refresh 
} from '@element-plus/icons-vue'
import type { 
  ApplicationDetailResponse, 
  ComprehensiveAnalysisBrief,
  ScreeningTaskBrief,
  VideoAnalysisBrief
} from '@/api/types.gen'

const props = defineProps<{
  application: ApplicationDetailResponse
  isAnalyzing?: boolean
  analysisProgress?: number
  analysisStatusText?: string
  isGeneratingReport?: boolean
  // 沉浸式面试数据
  immersiveSession?: {
    id: string
    is_completed: boolean
    utterance_count: number
    has_final_analysis: boolean
  } | null
}>()

defineEmits<{
  viewResume: []
  viewScreeningReport: []
  viewImmersiveRecords: []
  viewImmersiveReport: []
  viewFinalReport: []
  viewVideoAnalysis: []
  goToScreening: []
  goToImmersive: []
  goToVideo: []
  startAnalysis: []
}>()

const isExpanded = ref(false)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// 获取关联数据
const screeningTask = computed<ScreeningTaskBrief | null | undefined>(() => props.application.screening_task)
const videoAnalysis = computed<VideoAnalysisBrief | null | undefined>(() => props.application.video_analysis)
const comprehensiveAnalysis = computed<ComprehensiveAnalysisBrief | null | undefined>(() => props.application.comprehensive_analysis)

// 数据状态计算
const hasResume = computed(() => !!props.application.resume)

const hasScreeningReport = computed(() => {
  return screeningTask.value?.status === 'completed' && screeningTask.value?.score !== null
})

const screeningScore = computed(() => {
  return screeningTask.value?.score ?? 'N/A'
})

// 沉浸式面试数据状态
const hasImmersiveRecords = computed(() => {
  return props.immersiveSession && (props.immersiveSession.utterance_count ?? 0) > 0
})

const immersiveUtteranceCount = computed(() => {
  return props.immersiveSession?.utterance_count || 0
})

const hasImmersiveReport = computed(() => {
  // 沉浸式面试已完成且有最终分析数据
  return props.immersiveSession?.is_completed && props.immersiveSession?.has_final_analysis
})

const hasVideoAnalysis = computed(() => {
  return videoAnalysis.value?.status === 'completed'
})

// 数据完整度
const completenessPercent = computed(() => {
  let count = 0
  if (hasResume.value) count++
  if (hasScreeningReport.value) count++
  if (hasImmersiveRecords.value) count++
  if (hasImmersiveReport.value) count++
  if (hasVideoAnalysis.value) count++
  return Math.round((count / 5) * 100)
})

// 是否可以进行综合分析
const canAnalyze = computed(() => {
  return hasResume.value && hasScreeningReport.value && hasImmersiveReport.value
})

// 分析状态
const analysisStatus = computed(() => {
  if (props.analysisProgress === 100) return 'success'
  return ''
})

// 推荐等级样式
const recommendationClass = computed(() => {
  if (!comprehensiveAnalysis.value) return ''
  const score = comprehensiveAnalysis.value.final_score
  if (score >= 80) return 'level-strong'
  if (score >= 60) return 'level-normal'
  if (score >= 40) return 'level-weak'
  return 'level-reject'
})
</script>

<style scoped lang="scss">
.candidate-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
  
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
  
  &.expanded {
    border-color: #667eea;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  cursor: pointer;
  
  .candidate-info {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      
      .el-icon {
        font-size: 24px;
        color: white;
      }
    }
    
    .info {
      h3 {
        margin: 0 0 4px;
        font-size: 16px;
        font-weight: 600;
        color: #1a1a2e;
      }
      
      .position {
        margin: 0;
        font-size: 13px;
        color: #6b7280;
      }
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .expand-icon {
      transition: transform 0.3s;
      color: #9ca3af;
      
      &.rotated {
        transform: rotate(180deg);
      }
    }
  }
}

.recommendation-badge, .status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  
  .score {
    margin-left: 4px;
    font-weight: 600;
  }
}

.recommendation-badge {
  &.level-strong {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
  }
  &.level-normal {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }
  &.level-weak {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
  }
  &.level-reject {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }
}

.status-badge.pending {
  background: #f3f4f6;
  color: #6b7280;
}

.completeness-bar {
  padding: 0 24px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  
  .bar-track {
    flex: 1;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
    
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 3px;
      transition: width 0.3s;
    }
  }
  
  .bar-label {
    font-size: 12px;
    color: #9ca3af;
    white-space: nowrap;
  }
}

.card-content {
  padding: 0 24px 24px;
  border-top: 1px solid #e5e7eb;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  
  .el-icon {
    color: #667eea;
  }
}

.data-sources {
  .data-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #f9fafb;
    border-radius: 10px;
    margin-bottom: 8px;
    border: 1px solid transparent;
    transition: all 0.2s;
    
    &.available {
      background: #f0fdf4;
      border-color: #bbf7d0;
      
      .item-icon {
        background: #10b981;
      }
      
      .item-status {
        color: #10b981;
      }
    }
    
    &.disabled {
      opacity: 0.6;
      
      .item-status.reserved {
        color: #9ca3af;
        font-style: italic;
      }
    }
    
    .item-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .el-icon {
        font-size: 16px;
        color: white;
      }
    }
    
    .item-info {
      flex: 1;
      
      .item-name {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #374151;
      }
      
      .item-status {
        font-size: 12px;
        color: #9ca3af;
      }
    }
  }
}

.analysis-section {
  margin-top: 8px;
  
  .analysis-requirements {
    .requirements-list {
      margin: 8px 0 0;
      padding-left: 0;
      list-style: none;
      
      li {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 4px;
        
        &.met {
          color: #10b981;
        }
        
        .el-icon {
          font-size: 14px;
        }
      }
    }
  }
  
  .analysis-progress {
    padding: 20px;
    background: #f0f9ff;
    border-radius: 12px;
    text-align: center;
    
    .progress-text {
      margin: 12px 0 0;
      font-size: 13px;
      color: #3b82f6;
    }
  }
  
  .analysis-result {
    padding: 20px;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border-radius: 12px;
    
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .result-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 24px;
      
      &.level-strong {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }
      &.level-normal {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
      }
      &.level-weak {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }
      &.level-reject {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
      }
      
      .result-text {
        font-weight: 600;
      }
      
      .result-score {
        font-size: 18px;
        font-weight: 700;
      }
    }
    
    .result-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
  
  .analysis-action {
    text-align: center;
    padding: 24px;
    background: linear-gradient(135deg, #f0f5ff 0%, #ede9fe 100%);
    border-radius: 12px;
    
    .el-button {
      padding: 12px 32px;
      font-size: 15px;
    }
    
    .action-hint {
      margin: 12px 0 0;
      font-size: 13px;
      color: #6b7280;
    }
  }
}

// 展开动画
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 800px;
}
</style>
