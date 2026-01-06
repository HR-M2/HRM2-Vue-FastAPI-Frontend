<template>
  <el-card class="experience-manager" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-title">
          <el-icon><Collection /></el-icon>
          经验库管理
        </span>
        <el-tag type="info" size="small">AI 学习记忆</el-tag>
      </div>
    </template>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-select v-model="selectedCategory" placeholder="全部类别" clearable style="width: 120px">
        <el-option label="全部" value="" />
        <el-option label="简历筛选" value="screening" />
        <el-option label="面试评估" value="interview" />
        <el-option label="综合分析" value="analysis" />
      </el-select>
      <div class="action-buttons">
        <el-button type="primary" @click="loadExperiences">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="danger" :disabled="experiences.length === 0" @click="handleClearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
        <el-button type="success" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加
        </el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-row">
      <el-tag v-for="(count, cat) in categoryStats" :key="cat" :type="getCategoryType(String(cat))" size="large">
        {{ getCategoryLabel(String(cat)) }}: {{ count }}
      </el-tag>
      <span class="total-count">共 {{ experiences.length }} 条经验</span>
    </div>

    <!-- 经验列表 -->
    <div class="experience-list" v-loading="loading">
      <div v-if="filteredExperiences.length === 0" class="empty-state">
        <el-empty description="暂无经验数据" :image-size="80">
          <template #description>
            <span>{{ selectedCategory ? '该类别暂无经验' : 'AI 尚未学习任何经验' }}</span>
          </template>
        </el-empty>
      </div>
      
      <div v-else class="experience-cards">
        <div 
          v-for="exp in filteredExperiences" 
          :key="exp.id" 
          class="experience-card"
          @click="showDetail(exp)"
        >
          <div class="card-top">
            <el-tag :type="getCategoryType(exp.category)" size="small">
              {{ getCategoryLabel(exp.category) }}
            </el-tag>
            <span class="time">{{ formatTime(exp.created_at) }}</span>
            <el-button type="danger" link size="small" @click.stop="handleDelete(exp.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <div class="rule-text">{{ exp.learned_rule }}</div>
        </div>
      </div>
    </div>

    <!-- 添加经验弹窗 -->
    <el-dialog v-model="showAddDialog" title="添加经验规则" width="500px" destroy-on-close>
      <el-form :model="newExperience" label-width="80px" label-position="left">
        <el-form-item label="类别" required>
          <el-select v-model="newExperience.category" placeholder="选择类别" style="width: 100%">
            <el-option label="简历筛选" value="screening" />
            <el-option label="面试评估" value="interview" />
            <el-option label="综合分析" value="analysis" />
          </el-select>
        </el-form-item>
        <el-form-item label="规则" required>
          <el-input 
            v-model="newExperience.rule" 
            type="textarea"
            :rows="4"
            placeholder="输入经验规则，如：名校背景的候选人应适当加分"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          :disabled="!newExperience.category || !newExperience.rule.trim()"
          :loading="adding"
          @click="handleAdd"
        >
          确认添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 经验详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="经验详情" width="550px" destroy-on-close>
      <div v-if="currentExperience" class="detail-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="类别">
            <el-tag :type="getCategoryType(currentExperience.category)">
              {{ getCategoryLabel(currentExperience.category) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="学习时间">
            {{ new Date(currentExperience.created_at).toLocaleString('zh-CN') }}
          </el-descriptions-item>
          <el-descriptions-item label="经验规则">
            <div class="detail-rule">{{ currentExperience.learned_rule }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="来源反馈">
            <div class="detail-feedback">{{ currentExperience.source_feedback || '无' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="上下文">
            <div class="detail-context">{{ currentExperience.context_summary || '无' }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button type="danger" @click="handleDeleteCurrent">删除此经验</el-button>
        <el-button type="primary" @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Collection, Refresh, Delete, Plus } from '@element-plus/icons-vue'
import {
  getExperiences,
  deleteExperience,
  deleteAllExperiences,
  createExperience
} from '@/api/sdk.gen'

interface Experience {
  id: string
  category: string
  learned_rule: string
  context_summary: string
  source_feedback?: string
  created_at: string
}

const loading = ref(false)
const adding = ref(false)
const experiences = ref<Experience[]>([])
const selectedCategory = ref('')
const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const currentExperience = ref<Experience | null>(null)

const newExperience = reactive({
  category: 'screening',
  rule: ''
})

// 分类统计
const categoryStats = computed(() => {
  const stats: Record<string, number> = { screening: 0, interview: 0, analysis: 0 }
  experiences.value.forEach(exp => {
    if (exp.category in stats) {
      stats[exp.category] = (stats[exp.category] || 0) + 1
    }
  })
  return stats
})

// 过滤后的经验
const filteredExperiences = computed(() => {
  if (!selectedCategory.value) return experiences.value
  return experiences.value.filter(exp => exp.category === selectedCategory.value)
})

// 获取类别标签
const getCategoryLabel = (cat: string) => {
  const labels: Record<string, string> = {
    screening: '简历筛选',
    interview: '面试评估',
    analysis: '综合分析'
  }
  return labels[cat] || cat
}

// 获取类别样式
const getCategoryType = (cat: string): 'success' | 'warning' | 'info' => {
  const types: Record<string, 'success' | 'warning' | 'info'> = {
    screening: 'success',
    interview: 'warning',
    analysis: 'info'
  }
  return types[cat] || 'info'
}

// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// 加载经验列表
const loadExperiences = async () => {
  loading.value = true
  try {
    const result = await getExperiences({})
    const data = (result.data as Record<string, unknown>)?.data as Record<string, unknown> | undefined
    experiences.value = (data?.items as Experience[]) || []
  } catch (error) {
    console.error('加载经验失败:', error)
    ElMessage.error('加载经验列表失败')
  } finally {
    loading.value = false
  }
}

// 显示详情
const showDetail = (exp: Experience) => {
  currentExperience.value = exp
  showDetailDialog.value = true
}

// 删除当前查看的经验
const handleDeleteCurrent = async () => {
  if (!currentExperience.value) return
  await handleDelete(currentExperience.value.id)
  showDetailDialog.value = false
}

// 删除单条经验
const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定删除这条经验吗？', '确认删除', { type: 'warning' })
    await deleteExperience({ path: { experience_id: id } })
    ElMessage.success('已删除')
    loadExperiences()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 清空经验
const handleClearAll = async () => {
  const msg = selectedCategory.value 
    ? `确定清空【${getCategoryLabel(selectedCategory.value)}】类别的所有经验吗？`
    : '确定清空全部经验吗？此操作不可恢复！'
  
  try {
    await ElMessageBox.confirm(msg, '确认清空', {
      type: 'warning',
      confirmButtonText: '确认清空',
      cancelButtonText: '取消'
    })
    
    const result = await deleteAllExperiences({
      query: selectedCategory.value ? { category: selectedCategory.value } : {}
    })
    const data = (result.data as Record<string, unknown>)?.data as Record<string, unknown> | undefined
    ElMessage.success(`已清空 ${data?.deleted_count || 0} 条经验`)
    loadExperiences()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空失败:', error)
      ElMessage.error('清空失败')
    }
  }
}

// 手动添加经验
const handleAdd = async () => {
  if (!newExperience.category || !newExperience.rule.trim()) return
  
  adding.value = true
  try {
    await createExperience({
      query: {
        category: newExperience.category,
        learned_rule: newExperience.rule.trim(),
        context_summary: '手动添加'
      }
    })
    ElMessage.success('经验已添加')
    newExperience.rule = ''
    showAddDialog.value = false
    loadExperiences()
  } catch (error) {
    console.error('添加失败:', error)
    ElMessage.error('添加失败')
  } finally {
    adding.value = false
  }
}

onMounted(() => {
  loadExperiences()
})
</script>

<style scoped lang="scss">
.experience-manager {
  max-width: 900px;
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

.action-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: nowrap;
  align-items: center;

  .action-buttons {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }
}

.stats-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;

  .total-count {
    margin-left: auto;
    font-size: 14px;
    color: #606266;
  }
}

.experience-list {
  min-height: 150px;
  max-height: 350px;
  overflow-y: auto;
}

.empty-state {
  padding: 30px 0;
}

.experience-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.experience-card {
  padding: 12px 16px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f0f9ff;
    border-color: #a0cfff;
    transform: translateX(4px);
  }

  .card-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;

    .time {
      font-size: 12px;
      color: #909399;
    }

    .el-button {
      margin-left: auto;
    }
  }

  .rule-text {
    font-size: 14px;
    color: #303133;
    font-weight: 500;
    line-height: 1.5;
  }
}

// 详情弹窗样式
.detail-content {
  .detail-rule {
    font-weight: 600;
    color: #409eff;
    line-height: 1.6;
  }

  .detail-feedback,
  .detail-context {
    color: #606266;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
