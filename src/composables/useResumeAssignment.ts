/**
 * 简历分配 composable
 * 处理简历添加到岗位的相关操作
 */
import { ref, computed, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getResumes,
  createApplication
} from '@/api/sdk.gen'
import type { ResumeListResponse } from '@/api/types.gen'
import type { PositionData, ProcessingTask, HistoryTask } from '@/types'
import { useScreeningUtils } from './useScreeningUtils'

export function useResumeAssignment(
  selectedPositionId: Ref<string | null>,
  positionsList: Ref<PositionData[]>,
  onAssignSuccess?: () => void
) {
  const { getHistoryTaskName } = useScreeningUtils()

  // 对话框状态
  const createGroupDialogVisible = ref(false)
  const addToGroupDialogVisible = ref(false)

  // 数据状态
  const availableResumes = ref<ResumeListResponse[]>([])
  const resumesLoading = ref(false)
  const creatingGroup = ref(false)
  const currentTaskForGroup = ref<ProcessingTask | null>(null)

  // 计算所有已分配到任何岗位的简历ID
  const assignedResumeIds = computed(() => {
    const ids: string[] = []
    for (const pos of positionsList.value) {
      if (pos.resumes) {
        for (const resume of pos.resumes) {
          if (resume.id && !ids.includes(resume.id)) {
            ids.push(resume.id)
          }
        }
      }
    }
    return ids
  })

  // 加载可用简历
  const loadAvailableResumes = async () => {
    resumesLoading.value = true
    try {
      const response = await getResumes({
        query: { page_size: 100 }
      })
      availableResumes.value = response.data?.data?.items || []
    } catch (err) {
      console.error('加载可用简历失败:', err)
      ElMessage.error('加载简历列表失败')
    } finally {
      resumesLoading.value = false
    }
  }

  // 显示添加对话框
  const showCreateGroupDialog = async () => {
    createGroupDialogVisible.value = true
    await loadAvailableResumes()
  }

  // 关闭对话框时清理
  const handleCreateDialogClose = () => {
    availableResumes.value = []
  }

  // 添加简历到岗位（创建应聘申请）
  const assignResumesToPosition = async (resumeIds: string[]) => {
    if (resumeIds.length === 0 || !selectedPositionId.value) return
    
    creatingGroup.value = true
    let assignedCount = 0
    
    try {
      for (const resumeId of resumeIds) {
        try {
          await createApplication({
            body: {
              position_id: selectedPositionId.value,
              resume_id: resumeId
            }
          })
          assignedCount++
        } catch (err) {
          console.error(`添加简历 ${resumeId} 失败:`, err)
        }
      }
      
      if (assignedCount > 0) {
        ElMessage.success(`成功添加 ${assignedCount} 份简历到岗位`)
        createGroupDialogVisible.value = false
        onAssignSuccess?.()
      } else {
        ElMessage.error('添加简历失败')
      }
    } catch (err) {
      console.error('添加简历失败:', err)
      ElMessage.error('添加简历失败')
    } finally {
      creatingGroup.value = false
    }
  }

  // 显示添加到组对话框（从处理队列）
  const showAddToGroupDialog = (task: ProcessingTask) => {
    currentTaskForGroup.value = task
    addToGroupDialogVisible.value = true
  }

  // 显示添加到组对话框（从历史任务）
  const showAddToGroupDialogFromHistory = (task: HistoryTask) => {
    currentTaskForGroup.value = {
      name: getHistoryTaskName(task),
      task_id: task.task_id,
      application_id: task.application_id,
      status: task.status as 'pending' | 'running' | 'completed' | 'failed',
      progress: 0,
      created_at: task.created_at,
      score: task.score,
      dimension_scores: task.dimension_scores,
      summary: task.summary
    }
    addToGroupDialogVisible.value = true
  }

  // 添加到组（这个功能在新API中需要获取resume_id然后创建application）
  const addToGroup = async (groupId: string) => {
    // 在新架构中，需要从application获取resume_id，然后创建新的application
    ElMessage.info('此功能需要后端支持获取申请关联的简历ID')
    addToGroupDialogVisible.value = false
  }

  return {
    createGroupDialogVisible,
    addToGroupDialogVisible,
    availableResumes,
    assignedResumeIds,
    resumesLoading,
    creatingGroup,
    currentTaskForGroup,
    showCreateGroupDialog,
    handleCreateDialogClose,
    assignResumesToPosition,
    showAddToGroupDialog,
    showAddToGroupDialogFromHistory,
    addToGroup
  }
}
