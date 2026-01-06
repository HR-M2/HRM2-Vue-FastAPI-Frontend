<template>
  <el-dialog v-model="visible" title="简历详情" width="70%">
    <div v-if="resume" class="resume-detail-dialog">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h4>候选人信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">姓名:</span>
            <span class="value">{{ resume.candidate_name || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">岗位:</span>
            <span class="value">{{ resume.position_title || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 初筛评分 -->
      <div v-if="resume.screening_score" class="detail-section">
        <h4>初筛评分</h4>
        <div class="scores-grid">
          <div class="score-item">
            <span class="score-label">综合评分</span>
            <span class="score-value primary">{{ resume.screening_score.comprehensive_score }}</span>
          </div>
          <div class="score-item">
            <span class="score-label">HR评分</span>
            <span class="score-value">{{ resume.screening_score.hr_score || '-' }}</span>
          </div>
          <div class="score-item">
            <span class="score-label">技术评分</span>
            <span class="score-value">{{ resume.screening_score.technical_score || '-' }}</span>
          </div>
          <div class="score-item">
            <span class="score-label">管理评分</span>
            <span class="score-value">{{ resume.screening_score.manager_score || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 初筛评价 -->
      <div v-if="resume.screening_summary" class="detail-section">
        <h4>初筛评价</h4>
        <div class="markdown-content" v-html="renderMarkdown(resume.screening_summary)"></div>
      </div>

      <!-- AI 参考经验（RAG 引用） -->
      <div v-if="resume.applied_experiences && resume.applied_experiences.length > 0" class="detail-section">
        <h4>
          <el-icon class="experience-icon"><MagicStick /></el-icon>
          本次评分参考了以下经验
        </h4>
        <div class="experience-list">
          <div v-for="exp in resume.applied_experiences" :key="exp.id" class="experience-item">
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

      <!-- 简历原文 -->
      <div class="detail-section">
        <h4>简历内容</h4>
        <div 
          v-if="resume.resume_content || resume.content" 
          class="markdown-content resume-content" 
          v-html="renderMarkdown(resume.resume_content || resume.content || '', true)"
        ></div>
        <div v-else class="no-content">暂无简历内容</div>
      </div>
    </div>
    <template #footer>
      <el-button v-if="screeningTaskId" @click="handleEdit">编辑报告</el-button>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { MagicStick, Promotion, InfoFilled } from '@element-plus/icons-vue'
import { useScreeningUtils } from '@/composables/useScreeningUtils'
import type { ResumeData } from '@/types'

const props = defineProps<{
  modelValue: boolean
  resume: ResumeData | null
  screeningTaskId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'edit': [taskId: string]
}>()

const { renderMarkdown } = useScreeningUtils()

const visible = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleEdit = () => {
  if (props.screeningTaskId) {
    emit('edit', props.screeningTaskId)
  }
}
</script>

<style scoped lang="scss">
.resume-detail-dialog {
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
  
  .scores-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    
    .score-item {
      text-align: center;
      padding: 12px;
      background: #f5f7fa;
      border-radius: 8px;
      
      .score-label {
        display: block;
        font-size: 12px;
        color: #909399;
        margin-bottom: 6px;
      }
      
      .score-value {
        display: block;
        font-size: 20px;
        font-weight: 600;
        color: #67c23a;
        
        &.primary {
          font-size: 24px;
          color: #409eff;
        }
      }
    }
  }
  
  .markdown-content {
    padding: 16px;
    background: #fafafa;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1.8;
    color: #303133;
    
    :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
      margin: 12px 0 8px 0;
      font-weight: 600;
      color: #303133;
    }
    
    :deep(h1) { font-size: 18px; }
    :deep(h2) { font-size: 16px; }
    :deep(h3) { font-size: 15px; }
    :deep(h4) { font-size: 14px; }
    
    :deep(p) {
      margin: 8px 0;
    }
    
    :deep(ul), :deep(ol) {
      padding-left: 20px;
      margin: 8px 0;
    }
    
    :deep(li) {
      margin: 4px 0;
    }
    
    :deep(strong) {
      font-weight: 600;
      color: #303133;
    }
    
    :deep(code) {
      background: #e8e8e8;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    
    :deep(pre) {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
    }
    
    :deep(table) {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      
      th, td {
        border: 1px solid #e4e7ed;
        padding: 8px 12px;
        text-align: left;
      }
      
      th {
        background: #f5f7fa;
        font-weight: 600;
      }
    }
    
    &.resume-content {
      max-height: 400px;
      overflow-y: auto;
    }
  }
  
  .no-content {
    padding: 20px;
    text-align: center;
    color: #909399;
    background: #fafafa;
    border-radius: 6px;
  }
  
  // 经验引用样式
  .experience-icon {
    color: #667eea;
    margin-right: 6px;
  }
  
  .experience-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .experience-item {
    padding: 14px 16px;
    background: linear-gradient(135deg, #f0f5ff 0%, #ede9fe 100%);
    border-radius: 10px;
    border-left: 3px solid #667eea;
    
    .experience-rule {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #303133;
      margin-bottom: 8px;
      
      .el-icon {
        color: #667eea;
        margin-top: 3px;
        flex-shrink: 0;
      }
    }
    
    .experience-source {
      font-size: 12px;
      color: #6b7280;
      padding-left: 22px;
      
      .source-label {
        color: #909399;
      }
      
      .source-text {
        color: #6b7280;
      }
    }
  }
  
  .experience-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding: 10px 14px;
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
