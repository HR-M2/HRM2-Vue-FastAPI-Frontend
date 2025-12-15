<template>
  <el-card class="form-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-title">
          {{ selectedPositionId ? '编辑岗位' : '选择岗位' }}
        </span>
        <div v-if="selectedPositionId" class="header-actions">
          <!-- AI 工具按钮组 -->
          <div class="tool-buttons">
            <el-tooltip content="AI 智能生成岗位要求" placement="top">
              <el-button size="small" @click="showAIDrawer = true">
                <el-icon><MagicStick /></el-icon>
                AI 生成
              </el-button>
            </el-tooltip>
            <el-tooltip content="查看当前表单的 JSON 数据" placement="top">
              <el-button size="small" @click="showJsonDialog = true">
                <el-icon><Document /></el-icon>
                显示 JSON
              </el-button>
            </el-tooltip>
          </div>
          <el-divider direction="vertical" />
          <el-tag :type="hasChanges ? 'warning' : 'success'">
            {{ hasChanges ? '未保存' : '已保存' }}
          </el-tag>
          <el-button type="primary" size="small" :loading="saving" :disabled="!hasChanges" @click="$emit('save')">
            保存
          </el-button>
        </div>
      </div>
    </template>

    <div v-if="!selectedPositionId" class="no-selection">
      <el-empty description="请从左侧选择一个岗位进行编辑" :image-size="100" />
    </div>

    <el-form
      v-else
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      label-position="left"
    >
      <!-- 岗位名称 -->
      <el-form-item label="岗位名称" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入岗位名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <!-- 所属部门 -->
      <el-form-item label="所属部门" prop="department">
        <el-input
          v-model="formData.department"
          placeholder="请输入所属部门"
          maxlength="50"
        />
      </el-form-item>

      <!-- 岗位描述 -->
      <el-form-item label="岗位描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入岗位描述"
        />
      </el-form-item>

      <!-- 最低工作经验 -->
      <el-form-item label="最低工作经验" prop="min_experience">
        <el-input-number
          v-model="formData.min_experience"
          :min="0"
          :max="30"
          controls-position="right"
        />
        <span class="unit-text">年</span>
      </el-form-item>

      <!-- 薪资范围 -->
      <el-form-item label="薪资范围" prop="salary_range">
        <div class="salary-range">
          <el-input-number
            v-model="formData.salary_min"
            :min="0"
            :max="formData.salary_max || 1000"
            controls-position="right"
            placeholder="最低薪资"
          />
          <span class="range-separator">至</span>
          <el-input-number
            v-model="formData.salary_max"
            :min="formData.salary_min || 0"
            :max="1000"
            controls-position="right"
            placeholder="最高薪资"
          />
          <span class="unit-text">K/月</span>
        </div>
      </el-form-item>

      <!-- 必备技能 -->
      <el-form-item label="必备技能" prop="required_skills">
        <el-select
          v-model="formData.required_skills"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="请选择或输入必备技能"
          style="width: 100%"
        >
          <el-option v-for="skill in commonSkills" :key="skill" :label="skill" :value="skill" />
        </el-select>
      </el-form-item>

      <!-- 优先技能 -->
      <el-form-item label="优先技能" prop="preferred_skills">
        <el-select
          v-model="formData.preferred_skills"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="请选择或输入优先技能"
          style="width: 100%"
        >
          <el-option v-for="skill in commonSkills" :key="skill" :label="skill" :value="skill" />
        </el-select>
      </el-form-item>

      <!-- 学历要求 -->
      <el-form-item label="学历要求" prop="education_requirements">
        <el-select v-model="formData.education_requirements" multiple placeholder="请选择学历要求" style="width: 100%">
          <el-option label="大专" value="大专" />
          <el-option label="本科" value="本科" />
          <el-option label="硕士" value="硕士" />
          <el-option label="博士" value="博士" />
        </el-select>
      </el-form-item>

      <!-- 岗位状态 -->
      <el-form-item label="岗位状态" prop="is_active">
        <el-switch
          v-model="formData.is_active"
          active-text="启用"
          inactive-text="停用"
        />
      </el-form-item>

      <!-- 已关联简历数 -->
      <el-form-item v-if="formData.application_count" label="已关联简历">
        <el-tag type="info">{{ formData.application_count }} 份</el-tag>
      </el-form-item>
    </el-form>

    <!-- AI 生成抽屉 -->
    <PositionAIGenerateDrawer
      v-model="showAIDrawer"
      @apply="handleAIApply"
    />

    <!-- JSON 显示对话框 -->
    <PositionJsonDialog
      v-model="showJsonDialog"
      :form-data="formData"
    />
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MagicStick, Document } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { PositionFormData } from '@/composables/usePositionEditor'
import PositionAIGenerateDrawer from './PositionAIGenerateDrawer.vue'
import PositionJsonDialog from './PositionJsonDialog.vue'

const props = defineProps<{
  formData: PositionFormData
  selectedPositionId: string | null
  hasChanges: boolean
  saving: boolean
}>()

defineEmits<{
  save: []
}>()

const formRef = ref<FormInstance>()
const showAIDrawer = ref(false)
const showJsonDialog = ref(false)

// 处理AI生成结果应用
const handleAIApply = (data: Partial<PositionFormData>) => {
  // 将AI生成的数据应用到表单
  Object.assign(props.formData, {
    title: data.title || props.formData.title,
    description: data.description || '',
    required_skills: data.required_skills || [],
    preferred_skills: data.preferred_skills || [],
    min_experience: data.min_experience ?? 0,
    education_requirements: data.education_requirements || [],
    salary_min: data.salary_min ?? 0,
    salary_max: data.salary_max ?? 0
  })
}

// 表单验证规则
const formRules: FormRules = {
  title: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }]
}

// 常用技能选项
const commonSkills = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Vue.js', 'React',
  'Angular', 'Node.js', 'Python', 'Java', 'Go', 'PHP', 'MySQL',
  'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'Git',
  'Webpack', 'Vite', 'AI', '机器学习', '深度学习', 'AWS', 'Azure'
]

// 暴露表单验证方法
const validate = async () => {
  if (!formRef.value) return true
  return formRef.value.validate()
}

defineExpose({ validate })
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-buttons {
  display: flex;
  gap: 8px;
}

.header-actions .el-divider--vertical {
  height: 20px;
  margin: 0 4px;
}

.form-card :deep(.el-card__header) {
  padding: 16px 20px;
  background-color: #fafafa;
  border-bottom: 1px solid #e4e7ed;
}

.no-selection {
  padding: 40px 20px;
  text-align: center;
}

/* 表单样式 */
.unit-text {
  margin-left: 12px;
  color: #909399;
  font-size: 14px;
}

.salary-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-separator {
  color: #909399;
}
</style>
