/**
 * 历史任务 composable
 * 处理历史任务的加载、筛选、删除等操作
 */
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getScreeningTasksApiV1ScreeningGet,
  deleteScreeningTaskApiV1ScreeningTaskIdDelete
} from '@/api/sdk.gen'
import type { HistoryTask } from '@/types'

export function useHistoryTasks() {
  const historyTasks = ref<HistoryTask[]>([])
  const historyParams = reactive({ status: 'completed', page: 1, page_size: 10 })
  const historyTotal = ref(0)
  const historyLoading = ref(false)

  // 加载历史任务
  const loadHistoryTasks = async () => {
    historyLoading.value = true
    try {
      const response = await getScreeningTasksApiV1ScreeningGet({
        query: {
          status: historyParams.status || undefined,
          page: historyParams.page,
          page_size: historyParams.page_size
        }
      })
      
      if (response.data?.data?.items) {
        historyTasks.value = response.data.data.items.map(task => ({
          id: task.id,
          task_id: task.id,
          application_id: task.application_id,
          status: task.status,
          progress: task.progress,
          score: task.score,
          dimension_scores: task.dimension_scores,
          summary: task.summary,
          recommendation: task.recommendation,
          report_content: task.report_content,
          error_message: task.error_message,
          candidate_name: task.candidate_name,
          position_title: task.position_title,
          created_at: task.created_at,
          updated_at: task.updated_at
        }))
        historyTotal.value = response.data.data.total || 0
      }
    } catch (err) {
      console.error('加载历史任务失败:', err)
      ElMessage.error('加载历史任务失败')
    } finally {
      historyLoading.value = false
    }
  }

  // 按状态筛选
  const filterByStatus = (status: string) => {
    historyParams.status = status
    historyParams.page = 1
    loadHistoryTasks()
  }

  // 删除历史任务
  const deleteHistoryTask = async (taskId: string) => {
    try {
      await ElMessageBox.confirm('确定要删除这条初筛记录吗？删除后无法恢复。', '确认删除', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      })
      
      await deleteScreeningTaskApiV1ScreeningTaskIdDelete({
        path: { task_id: taskId }
      })
      ElMessage.success('删除成功')
      loadHistoryTasks()
    } catch (err: unknown) {
      if (err !== 'cancel') {
        console.error('删除失败:', err)
        ElMessage.error('删除失败')
      }
    }
  }

  return {
    historyTasks,
    historyParams,
    historyTotal,
    historyLoading,
    loadHistoryTasks,
    filterByStatus,
    deleteHistoryTask
  }
}
