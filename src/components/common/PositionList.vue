<template>
  <el-card class="groups-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <span class="card-title">招聘岗位</span>
          <el-button 
            type="info" 
            size="small" 
            link 
            @click="toggleExpand"
          >
            {{ isExpanded ? '收起详情' : '展开详情' }}
          </el-button>
        </div>
        <router-link to="/positions">
          <el-button type="primary" size="small">管理岗位</el-button>
        </router-link>
      </div>
    </template>
    
    <div v-if="positions.length === 0" class="empty-groups">
      <el-empty description="暂无岗位，请先创建岗位" :image-size="60">
        <router-link to="/positions">
          <el-button type="primary" size="small">创建岗位</el-button>
        </router-link>
      </el-empty>
    </div>
    
    <div v-else class="groups-list">
      <div 
        v-for="pos in positions" 
        :key="pos.id" 
        class="group-item-card"
        :class="{ active: selectedPositionId === pos.id }"
        @click="$emit('select', pos)"
      >
        <div class="group-header">
          <div class="group-title">
            <span class="group-name">{{ pos.title }}</span>
          </div>
          <div class="group-actions">
            <span class="group-meta">{{ pos.resume_count || 0 }} 份</span>
            <el-button 
              v-if="isExpanded"
              type="primary" 
              size="small" 
              link 
              @click.stop="$emit('assign', pos)"
            >+添加</el-button>
          </div>
        </div>
        
        <!-- 岗位中的简历列表 - 展开时才显示 -->
        <div v-if="isExpanded && pos.resumes && pos.resumes.length > 0" class="resumes-preview">
          <div class="resumes-list">
            <div 
              v-for="resume in getPagedResumes(pos)" 
              :key="resume.id" 
              class="resume-item clickable"
              @click.stop="showResumeDetail(resume)"
            >
              <div class="resume-info">
                <span class="resume-name">{{ resume.candidate_name || '未知候选人' }}</span>
              </div>
              <div class="resume-actions">
                <el-tag v-if="resume.screening_score" size="small" type="success">
                  {{ resume.screening_score.comprehensive_score }}
                </el-tag>
                <el-icon 
                  class="remove-btn" 
                  @click.stop="$emit('removeResume', pos, resume)"
                ><Close /></el-icon>
              </div>
            </div>
          </div>
          
          <!-- 简洁翻页 -->
          <div v-if="pos.resumes.length > pageSize" class="resumes-pagination">
            <el-button 
              size="small" 
              link 
              :disabled="getPositionPage(pos.id) <= 1"
              @click.stop="prevPage(pos.id)"
            >上一页</el-button>
            <span class="page-info">{{ getPositionPage(pos.id) }}/{{ Math.ceil(pos.resumes.length / pageSize) }}</span>
            <el-button 
              size="small" 
              link 
              :disabled="getPositionPage(pos.id) >= Math.ceil(pos.resumes.length / pageSize)"
              @click.stop="nextPage(pos.id)"
            >下一页</el-button>
          </div>
        </div>
        <div v-else-if="isExpanded" class="no-resumes">暂无简历</div>
      </div>
    </div>
  </el-card>

  <!-- 简历详情弹窗 -->
  <ResumeDetailDialog
    v-model="detailDialogVisible"
    :resume="selectedResumeDetail"
  />
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Close } from '@element-plus/icons-vue'
import ResumeDetailDialog from './ResumeDetailDialog.vue'
import { getResume, getScreeningTask } from '@/api/sdk.gen'
import type { PositionData, ResumeData } from '@/types'

const props = defineProps<{
  positions: PositionData[]
  selectedPositionId: string | null
}>()

// 展开/收起状态
const isExpanded = ref(true)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

defineEmits<{
  select: [pos: PositionData]
  assign: [pos: PositionData]
  removeResume: [pos: PositionData, resume: ResumeData]
}>()

// 简历详情弹窗状态
const detailDialogVisible = ref(false)
const selectedResumeDetail = ref<ResumeData | null>(null)

// 显示简历详情（获取完整初筛数据）
const showResumeDetail = async (resume: ResumeData) => {
  try {
    const resumeResult = await getResume({ path: { resume_id: resume.id } })
    const resumeData = resumeResult.data?.data
    
    const detailData: ResumeData = {
      id: resume.id,
      candidate_name: resumeData?.candidate_name || resume.candidate_name,
      position_title: resume.position_title,
      content: resumeData?.content,
      resume_content: resumeData?.content,
      created_at: resumeData?.created_at
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const screeningTaskId = (resume as any).screening_task_id
    if (screeningTaskId) {
      try {
        const taskResult = await getScreeningTask({ path: { task_id: screeningTaskId } })
        if (taskResult.data?.data) {
          const task = taskResult.data.data
          if (task.score !== null) {
            detailData.screening_score = {
              comprehensive_score: task.score,
              hr_score: (task.dimension_scores?.hr_score as number) || undefined,
              technical_score: (task.dimension_scores?.technical_score as number) || undefined,
              manager_score: (task.dimension_scores?.manager_score as number) || undefined
            }
          }
          detailData.screening_summary = task.summary || undefined
          if (!detailData.resume_content && task.resume_content) {
            detailData.resume_content = task.resume_content
          }
        }
      } catch (taskErr) {
        console.warn('获取初筛任务详情失败:', taskErr)
      }
    }
    
    selectedResumeDetail.value = detailData
    detailDialogVisible.value = true
  } catch (err) {
    console.error('获取简历详情失败:', err)
  }
}

const pageSize = 8

// 存储每个岗位的当前页码
const positionPages = reactive<Record<string, number>>({})

// 获取岗位的当前页码
const getPositionPage = (posId: string) => {
  return positionPages[posId] || 1
}

// 获取分页后的简历列表
const getPagedResumes = (pos: PositionData) => {
  if (!pos.resumes) return []
  const page = getPositionPage(pos.id)
  const start = (page - 1) * pageSize
  return pos.resumes.slice(start, start + pageSize)
}

// 上一页
const prevPage = (posId: string) => {
  const current = getPositionPage(posId)
  if (current > 1) {
    positionPages[posId] = current - 1
  }
}

// 下一页
const nextPage = (posId: string) => {
  const pos = props.positions.find(p => p.id === posId)
  if (!pos?.resumes) return
  
  const current = getPositionPage(posId)
  const total = Math.ceil(pos.resumes.length / pageSize)
  if (current < total) {
    positionPages[posId] = current + 1
  }
}
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-item-card {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 2px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f0f2f5;
  }

  &.active {
    background: #ecf5ff;
    border-color: #409eff;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;

    .group-title {
      display: flex;
      align-items: center;
      gap: 8px;

      .group-name {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
      }
    }

    .group-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .group-meta {
        font-size: 12px;
        color: #909399;
      }
    }
  }

  .resumes-preview {
    .resumes-list {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .resume-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #ebeef5;

        &.clickable {
          cursor: pointer;
          transition: all 0.2s;
          
          &:hover {
            background: #f5f7fa;
            border-color: #409eff;
          }
        }

        .resume-info {
          display: flex;
          flex-direction: column;

          .resume-name {
            font-size: 13px;
            font-weight: 500;
            color: #303133;
          }
        }

        .resume-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          
          .remove-btn {
            color: #c0c4cc;
            cursor: pointer;
            font-size: 14px;
            
            &:hover {
              color: #f56c6c;
            }
          }
        }
      }
    }
  }

  .resumes-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid #ebeef5;
    margin-top: 8px;
    
    .page-info {
      font-size: 12px;
      color: #909399;
    }
  }
}

.no-resumes {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
  padding: 8px;
}

.empty-groups {
  padding: 20px 0;
}
</style>
