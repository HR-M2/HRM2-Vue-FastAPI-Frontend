<template>
  <el-dialog
    :model-value="visible"
    title="面试分析报告"
    width="600px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="report" class="interview-report">
      <div class="report-header">
        <div class="report-score" :class="getReportScoreClass(report)">
          <span class="score-value">{{ report.final_score !== null ? report.final_score : 'N/A' }}</span>
          <span class="score-label">分</span>
        </div>
        <div class="report-recommendation">
          {{ report.is_completed ? '面试已完成' : '面试进行中' }}
        </div>
      </div>
      <div v-if="report.report_markdown" class="report-summary">
        <h4>评估总结</h4>
        <div class="summary-content markdown-body" v-html="formatReportContent(report.report_markdown)"></div>
      </div>
      <!-- AI 参考经验（RAG 引用） -->
      <div v-if="report.applied_experiences && report.applied_experiences.length > 0" class="experience-section">
        <h4>
          <el-icon class="experience-icon"><MagicStick /></el-icon>
          本次评估参考了以下经验
        </h4>
        <div class="experience-list">
          <div v-for="(exp, index) in report.applied_experiences" :key="index" class="experience-item">
            <div class="experience-rule">
              <el-icon><Promotion /></el-icon>
              <span>{{ exp.learned_rule }}</span>
            </div>
            <div class="experience-source">
              <span class="source-label">来源反馈：</span>
              <span class="source-text">{{ exp.source_feedback }}</span>
            </div>
          </div>
        </div>
        <div class="experience-hint">
          <el-icon><InfoFilled /></el-icon>
          <span>这些经验来自您之前的反馈，AI 已学习并应用到本次评估中</span>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('edit', report)">编辑报告</el-button>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { MagicStick, Promotion, InfoFilled } from '@element-plus/icons-vue'
import type { InterviewSessionResponseOutput } from '@/api/types.gen'

defineProps<{
  visible: boolean
  report: InterviewSessionResponseOutput | null
}>()

defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'edit', report: InterviewSessionResponseOutput | null): void
}>()

// 获取报告分数样式
const getReportScoreClass = (report: InterviewSessionResponseOutput) => {
  const score = report?.final_score || 0
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-medium'
  return 'score-low'
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
.interview-report {
  .report-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
    
    .report-score {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      
      &.score-high {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }
      &.score-medium {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }
      &.score-low {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
      }
      
      .score-value {
        font-size: 24px;
        font-weight: 700;
      }
      
      .score-label {
        font-size: 12px;
        opacity: 0.9;
      }
    }
    
    .report-recommendation {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a2e;
    }
  }
  
  .report-summary {
    margin-bottom: 20px;
    
    h4 {
      margin: 0 0 8px;
      font-size: 14px;
      color: #6b7280;
    }
    
    .summary-content {
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }
  }
  
  // 经验引用样式
  .experience-section {
    margin-top: 20px;
    
    h4 {
      display: flex;
      align-items: center;
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      
      .experience-icon {
        color: #667eea;
        margin-right: 6px;
      }
    }
  }
  
  .experience-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .experience-item {
    padding: 12px 14px;
    background: linear-gradient(135deg, #f0f5ff 0%, #ede9fe 100%);
    border-radius: 10px;
    border-left: 3px solid #667eea;
    
    .experience-rule {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #303133;
      margin-bottom: 6px;
      
      .el-icon {
        color: #667eea;
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
    
    .experience-source {
      font-size: 12px;
      color: #6b7280;
      padding-left: 20px;
      
      .source-label {
        color: #909399;
      }
    }
  }
  
  .experience-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    padding: 8px 12px;
    background: #f0f9eb;
    border-radius: 6px;
    font-size: 12px;
    color: #67c23a;
    
    .el-icon {
      flex-shrink: 0;
    }
  }
}
</style>
