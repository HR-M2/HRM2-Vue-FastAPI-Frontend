<template>
  <el-dialog 
    v-model="visible" 
    :title="dialogTitle" 
    width="700px"
    destroy-on-close
  >
    <el-form 
      ref="formRef" 
      :model="formData" 
      label-position="top"
      class="report-edit-form"
    >
      <!-- 简历筛选报告字段 -->
      <template v-if="reportType === 'screening'">
        <div class="screening-scores-grid">
          <el-form-item label="综合评分">
            <el-input-number 
              v-model="formData.score" 
              :min="0" 
              :max="100" 
              :precision="1"
            />
          </el-form-item>
          <el-form-item label="HR评分">
            <el-input-number 
              v-model="screeningDimensionScores.hr_score" 
              :min="0" 
              :max="100" 
              :precision="1"
            />
          </el-form-item>
          <el-form-item label="技术评分">
            <el-input-number 
              v-model="screeningDimensionScores.technical_score" 
              :min="0" 
              :max="100" 
              :precision="1"
            />
          </el-form-item>
          <el-form-item label="管理评分">
            <el-input-number 
              v-model="screeningDimensionScores.manager_score" 
              :min="0" 
              :max="100" 
              :precision="1"
            />
          </el-form-item>
        </div>
        <el-form-item label="筛选总结">
          <el-input
            v-model="formData.summary"
            type="textarea"
            :rows="4"
            placeholder="请输入筛选总结"
          />
        </el-form-item>
      </template>

      <!-- 视频分析报告字段 -->
      <template v-else-if="reportType === 'video'">
        <el-form-item label="分析摘要">
          <el-input
            v-model="formData.summary"
            type="textarea"
            :rows="4"
            placeholder="请输入分析摘要"
          />
        </el-form-item>
        <el-divider>大五人格评分</el-divider>
        <div class="big-five-grid">
          <el-form-item label="开放性">
            <el-input-number v-model="formData.openness" :min="0" :max="100" />
          </el-form-item>
          <el-form-item label="尽责性">
            <el-input-number v-model="formData.conscientiousness" :min="0" :max="100" />
          </el-form-item>
          <el-form-item label="外向性">
            <el-input-number v-model="formData.extraversion" :min="0" :max="100" />
          </el-form-item>
          <el-form-item label="宜人性">
            <el-input-number v-model="formData.agreeableness" :min="0" :max="100" />
          </el-form-item>
          <el-form-item label="神经质">
            <el-input-number v-model="formData.neuroticism" :min="0" :max="100" />
          </el-form-item>
        </div>
      </template>

      <!-- 面试报告字段 -->
      <template v-else-if="reportType === 'interview'">
        <el-form-item label="最终评分">
          <el-input-number 
            v-model="formData.final_score" 
            :min="0" 
            :max="100" 
            :precision="1"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="面试报告 (Markdown)">
          <el-input
            v-model="formData.report_markdown"
            type="textarea"
            :rows="12"
            placeholder="请输入面试报告"
          />
        </el-form-item>
      </template>

      <!-- 综合分析报告字段 -->
      <template v-else-if="reportType === 'analysis'">
        <div class="analysis-header-row">
          <el-form-item label="综合得分">
            <el-input-number 
              v-model="formData.final_score" 
              :min="0" 
              :max="100" 
              :precision="1"
              style="width: 150px"
            />
          </el-form-item>
          <el-form-item label="建议行动">
            <el-input
              v-model="formData.suggested_action"
              placeholder="请输入建议的后续行动"
              style="width: 350px"
            />
          </el-form-item>
        </div>
        
        <!-- 多维度 Rubric 评估 -->
        <el-divider>多维度 Rubric 评估</el-divider>
        <div v-if="formData.dimension_scores" class="dimension-cards-grid">
          <div 
            v-for="(dim, key) in (formData.dimension_scores as Record<string, DimensionScore>)" 
            :key="key"
            class="dimension-card"
          >
            <!-- 卡片头部：维度名称 + 评分 -->
            <div class="card-header">
              <span class="dim-name">{{ dim.dimension_name || key }}</span>
              <div class="score-control">
                <el-input-number 
                  v-model="dim.dimension_score" 
                  :min="1" 
                  :max="5" 
                  size="small"
                  controls-position="right"
                  style="width: 80px"
                />
                <span class="score-suffix">/5</span>
              </div>
            </div>
            
            <!-- 进度条 -->
            <el-progress 
              :percentage="(dim.dimension_score || 3) * 20" 
              :stroke-width="6"
              :show-text="false"
              :color="getProgressColor((dim.dimension_score || 3))"
            />
            
            <!-- 优势编辑 -->
            <div class="tag-section strengths-section">
              <span class="tag-label strengths">优势：</span>
              <el-input
                v-model="dim.strengths_text"
                type="textarea"
                :rows="2"
                placeholder="请输入优势，多条用顿号（、）分隔"
                @blur="parseStrengths(dim)"
              />
            </div>
            
            <!-- 不足编辑 -->
            <div class="tag-section weaknesses-section">
              <span class="tag-label weaknesses">不足：</span>
              <el-input
                v-model="dim.weaknesses_text"
                type="textarea"
                :rows="2"
                placeholder="请输入不足，多条用顿号（、）分隔"
                @blur="parseWeaknesses(dim)"
              />
            </div>
          </div>
        </div>
        <div v-else class="no-dimensions">
          <el-empty description="暂无维度评分数据" :image-size="60" />
        </div>
        
        <el-form-item label="分析报告 (Markdown)" style="margin-top: 16px">
          <el-input
            v-model="formData.report"
            type="textarea"
            :rows="6"
            placeholder="请输入分析报告"
          />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存修改
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  updateScreeningResult,
  updateVideoResult,
  updateInterviewSession,
  updateAnalysis
} from '@/api/sdk.gen'

export type ReportType = 'screening' | 'video' | 'interview' | 'analysis'

interface DimensionScore {
  dimension_name?: string
  dimension_score?: number
  analysis?: string
  strengths?: string[]
  weaknesses?: string[]
  strengths_text?: string
  weaknesses_text?: string
}

interface ScreeningDimensionScores {
  hr_score?: number
  technical_score?: number
  manager_score?: number
}

const props = defineProps<{
  modelValue: boolean
  reportType: ReportType
  reportData: Record<string, unknown> | null
  reportId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const visible = ref(props.modelValue)
const saving = ref(false)
const formData = ref<Record<string, unknown>>({})
const screeningDimensionScores = ref<ScreeningDimensionScores>({})

const dialogTitle = computed(() => {
  const titles: Record<ReportType, string> = {
    screening: '编辑简历筛选报告',
    video: '编辑视频分析报告',
    interview: '编辑面试分析报告',
    analysis: '编辑综合分析报告'
  }
  return titles[props.reportType]
})

// 同步对话框显示状态
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.reportData) {
    // 初始化表单数据
    formData.value = JSON.parse(JSON.stringify(props.reportData))
    
    // 初始化筛选维度分数
    if (props.reportType === 'screening') {
      const ds = formData.value.dimension_scores as ScreeningDimensionScores | undefined
      screeningDimensionScores.value = {
        hr_score: ds?.hr_score,
        technical_score: ds?.technical_score,
        manager_score: ds?.manager_score
      }
    }
    
    // 初始化综合分析维度强弱项文本
    if (props.reportType === 'analysis' && formData.value.dimension_scores) {
      const dims = formData.value.dimension_scores as Record<string, DimensionScore>
      for (const key in dims) {
        const dim = dims[key]
        dim.strengths_text = dim.strengths?.join('、') || ''
        dim.weaknesses_text = dim.weaknesses?.join('、') || ''
      }
    }
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleClose = () => {
  visible.value = false
}

// 进度条颜色
const getProgressColor = (score: number) => {
  if (score >= 4) return '#10b981'
  if (score >= 3) return '#3b82f6'
  if (score >= 2) return '#f59e0b'
  return '#ef4444'
}

// 解析优势文本
const parseStrengths = (dim: DimensionScore) => {
  if (dim.strengths_text) {
    dim.strengths = dim.strengths_text.split('、').map(s => s.trim()).filter(s => s)
  } else {
    dim.strengths = []
  }
}

// 解析不足文本
const parseWeaknesses = (dim: DimensionScore) => {
  if (dim.weaknesses_text) {
    dim.weaknesses = dim.weaknesses_text.split('、').map(s => s.trim()).filter(s => s)
  } else {
    dim.weaknesses = []
  }
}

const handleSave = async () => {
  if (!props.reportId) {
    ElMessage.error('报告ID无效')
    return
  }

  saving.value = true
  try {
    let response

    switch (props.reportType) {
      case 'screening':
        response = await updateScreeningResult({
          path: { task_id: props.reportId },
          body: {
            score: formData.value.score as number | undefined,
            summary: formData.value.summary as string | undefined,
            dimension_scores: screeningDimensionScores.value
          }
        })
        break

      case 'video':
        response = await updateVideoResult({
          path: { video_id: props.reportId },
          body: {
            summary: formData.value.summary as string | undefined,
            openness: formData.value.openness as number | undefined,
            conscientiousness: formData.value.conscientiousness as number | undefined,
            extraversion: formData.value.extraversion as number | undefined,
            agreeableness: formData.value.agreeableness as number | undefined,
            neuroticism: formData.value.neuroticism as number | undefined
          }
        })
        break

      case 'interview':
        response = await updateInterviewSession({
          path: { session_id: props.reportId },
          body: {
            final_score: formData.value.final_score as number | undefined,
            report_markdown: formData.value.report_markdown as string | undefined
          }
        })
        break

      case 'analysis':
        // 确保解析了所有优势/不足文本
        if (formData.value.dimension_scores) {
          const dims = formData.value.dimension_scores as Record<string, DimensionScore>
          for (const key in dims) {
            parseStrengths(dims[key])
            parseWeaknesses(dims[key])
            // 清除临时文本字段
            delete dims[key].strengths_text
            delete dims[key].weaknesses_text
          }
        }
        response = await updateAnalysis({
          path: { analysis_id: props.reportId },
          body: {
            final_score: formData.value.final_score as number | undefined,
            suggested_action: formData.value.suggested_action as string | undefined,
            dimension_scores: formData.value.dimension_scores as Record<string, DimensionScore> | undefined,
            report: formData.value.report as string | undefined
          }
        })
        break
    }

    if (response?.data?.success) {
      ElMessage.success('报告修改成功')
      emit('saved')
      handleClose()
    } else {
      ElMessage.error(response?.data?.message || '保存失败')
    }
  } catch (error) {
    console.error('保存报告失败:', error)
    ElMessage.error('保存报告失败，请重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.report-edit-form {
  // 简历筛选评分网格
  .screening-scores-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px 24px;
    background: #f8fafc;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 16px;
  }

  // 大五人格网格
  .big-five-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  // 综合分析头部行
  .analysis-header-row {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  // 维度卡片网格 (2列)
  .dimension-cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 4px;
  }

  // 维度卡片
  .dimension-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      .dim-name {
        font-weight: 600;
        font-size: 15px;
        color: #374151;
      }
      
      .score-control {
        display: flex;
        align-items: center;
        gap: 4px;
        
        .score-suffix {
          color: #9ca3af;
          font-size: 14px;
        }
      }
    }
    
    :deep(.el-progress) {
      margin-bottom: 12px;
    }
    
    .tag-section {
      margin-bottom: 10px;
      
      .tag-label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 6px;
        
        &.strengths {
          color: #10b981;
        }
        
        &.weaknesses {
          color: #f59e0b;
        }
      }
      
      :deep(.el-textarea__inner) {
        font-size: 13px;
        line-height: 1.5;
        background: white;
      }
    }
  }

  .no-dimensions {
    padding: 24px;
    background: #f9fafb;
    border-radius: 12px;
    text-align: center;
  }

  :deep(.el-textarea__inner) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
  }
}
</style>
