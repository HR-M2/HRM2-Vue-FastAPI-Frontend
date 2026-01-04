<template>
  <el-card class="resume-generator" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-title">
          <el-icon><MagicStick /></el-icon>
          随机简历生成器
        </span>
        <el-tag type="warning" size="small">开发测试用</el-tag>
      </div>
    </template>

    <el-form :model="formData" label-width="100px" label-position="left">
      <!-- 岗位选择 -->
      <el-form-item label="选择岗位" required>
        <el-select
          v-model="selectedPositionId"
          placeholder="请选择目标岗位"
          style="width: 100%"
          @change="handlePositionChange"
        >
          <el-option
            v-for="pos in positions"
            :key="pos.id"
            :label="pos.title"
            :value="pos.id"
          >
            <div class="position-option">
              <span>{{ pos.title }}</span>
              <span class="position-dept">{{ pos.department || '未设置部门' }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 岗位信息预览 -->
      <el-form-item v-if="selectedPosition" label="岗位信息">
        <div class="position-preview">
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="岗位名称">
              {{ selectedPosition.title }}
            </el-descriptions-item>
            <el-descriptions-item label="岗位描述">
              {{ selectedPosition.description || '暂无描述' }}
            </el-descriptions-item>
            <el-descriptions-item label="必备技能">
              <el-tag 
                v-for="skill in selectedPosition.required_skills" 
                :key="skill" 
                size="small" 
                style="margin-right: 4px; margin-bottom: 4px;"
              >
                {{ skill }}
              </el-tag>
              <span v-if="!selectedPosition.required_skills?.length" class="text-muted">暂无</span>
            </el-descriptions-item>
            <el-descriptions-item label="最低经验">
              {{ selectedPosition.min_experience || 0 }} 年
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-form-item>

      <!-- 生成数量 -->
      <el-form-item label="生成数量">
        <el-slider
          v-model="formData.count"
          :min="1"
          :max="20"
          :step="1"
          show-input
          :show-input-controls="false"
          style="padding-right: 60px;"
        />
        <span class="count-hint">每份简历将单独调用LLM生成，数量越多耗时越长</span>
      </el-form-item>

      <!-- 操作按钮 -->
      <el-form-item>
        <el-button
          type="primary"
          :loading="generating"
          :disabled="!selectedPositionId"
          @click="handleGenerate"
        >
          <el-icon v-if="!generating"><MagicStick /></el-icon>
          {{ generating ? '生成中...' : '开始生成' }}
        </el-button>
        <span v-if="generating" class="generating-hint">
          正在批量生成 {{ formData.count }} 份简历，每份约需 30-50 秒...
        </span>
      </el-form-item>
    </el-form>

    <!-- 生成结果 -->
    <div v-if="lastResult" class="generate-result">
      <el-divider content-position="left">生成结果</el-divider>
      <el-result
        :icon="lastResult.added_count > 0 ? 'success' : 'warning'"
        :title="`成功生成 ${lastResult.added_count} 份简历`"
        :sub-title="`请求生成 ${lastResult.requested_count} 份，跳过 ${lastResult.skipped_count} 份`"
      >
        <template #extra>
          <el-button type="primary" @click="goToLibrary">
            前往简历库查看
          </el-button>
        </template>
      </el-result>

      <!-- 生成的简历列表 -->
      <div v-if="lastResult.added.length > 0" class="added-list">
        <h4>已添加的简历：</h4>
        <el-tag
          v-for="item in lastResult.added"
          :key="item.id"
          type="success"
          style="margin: 4px;"
        >
          {{ item.candidate_name }}
        </el-tag>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MagicStick } from '@element-plus/icons-vue'
import {
  getPositions,
  getPosition,
  generateRandomResume
} from '@/api/sdk.gen'
import type { PositionListResponse, PositionResponse } from '@/api/types.gen'

// 岗位列表
const positions = ref<PositionListResponse[]>([])
const selectedPositionId = ref<string>('')
const selectedPosition = ref<PositionResponse | null>(null)

// 表单数据
const formData = reactive({
  count: 5
})

// 生成状态
const generating = ref(false)
const lastResult = ref<{
  added: Array<{ id: string; filename: string; candidate_name: string }>
  skipped: Array<{ filename: string; reason: string }>
  added_count: number
  skipped_count: number
  requested_count: number
} | null>(null)

const router = useRouter()

// 加载岗位列表
const loadPositions = async () => {
  try {
    const result = await getPositions({
      query: { page: 1, page_size: 100, is_active: true }
    })
    const data = (result.data as any)?.data || result.data
    positions.value = data?.items || []
  } catch (error) {
    console.error('加载岗位列表失败:', error)
    ElMessage.error('加载岗位列表失败')
  }
}

// 岗位选择变化
const handlePositionChange = async (posId: string) => {
  if (!posId) {
    selectedPosition.value = null
    return
  }
  try {
    const result = await getPosition({
      path: { position_id: posId }
    })
    const data = (result.data as any)?.data || result.data
    selectedPosition.value = data || null
  } catch (error) {
    console.error('获取岗位详情失败:', error)
    selectedPosition.value = null
  }
}

// 生成简历
const handleGenerate = async () => {
  if (!selectedPositionId.value) {
    ElMessage.warning('请先选择岗位')
    return
  }

  generating.value = true
  lastResult.value = null

  try {
    const result = await generateRandomResume({
      body: {
        position_id: selectedPositionId.value,
        count: formData.count
      }
    })

    const data = (result.data as any)?.data || result.data
    // 后端现在返回 added/skipped 数组（已保存到数据库的简历）
    lastResult.value = {
      added: data?.added || [],
      skipped: data?.skipped || [],
      added_count: data?.added_count || 0,
      skipped_count: data?.skipped_count || 0,
      requested_count: formData.count
    }

    if (lastResult.value.added_count > 0) {
      ElMessage.success(`成功生成 ${lastResult.value.added_count} 份简历`)
    } else {
      ElMessage.warning('未能生成任何简历')
    }
  } catch (error: any) {
    console.error('生成简历失败:', error)
    ElMessage.error(error.message || '生成简历失败')
  } finally {
    generating.value = false
  }
}

// 前往简历库
const goToLibrary = () => {
  router.push('/library')
}

onMounted(() => {
  loadPositions()
})
</script>

<style scoped lang="scss">
.resume-generator {
  max-width: 800px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.position-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .position-dept {
    font-size: 12px;
    color: #909399;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.position-preview {
  width: 100%;
  
  :deep(.el-descriptions) {
    margin-top: 0;
  }
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

.count-hint {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.generating-hint {
  margin-left: 12px;
  color: #e6a23c;
  font-size: 13px;
}

.generate-result {
  margin-top: 20px;

  .added-list {
    margin-top: 16px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 8px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #606266;
    }
  }
}
</style>
