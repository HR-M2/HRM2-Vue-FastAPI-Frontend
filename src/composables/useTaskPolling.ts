/**
 * 任务轮询 composable
 * 处理简历筛选任务的状态轮询
 */
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getScreeningStatus } from '@/api/sdk.gen'
import type { ProcessingTask } from '@/types'

export function useTaskPolling(onTaskCompleted?: () => void) {
  const processingQueue = ref<ProcessingTask[]>([])
  const taskPollingTimer = ref<number | null>(null)

  // 开始轮询
  const startTaskPolling = () => {
    if (taskPollingTimer.value) return
    taskPollingTimer.value = window.setInterval(pollTaskStatus, 3000)
  }

  // 停止轮询
  const stopTaskPolling = () => {
    if (taskPollingTimer.value) {
      clearInterval(taskPollingTimer.value)
      taskPollingTimer.value = null
    }
  }

  // 轮询任务状态
  const pollTaskStatus = async () => {
    const pendingTasks = processingQueue.value.filter(
      t => t.status === 'pending' || t.status === 'running'
    )

    if (pendingTasks.length === 0) {
      stopTaskPolling()
      return
    }

    for (const task of pendingTasks) {
      if (!task.task_id) continue
      try {
        const response = await getScreeningStatus({
          path: { task_id: task.task_id }
        })
        
        if (response.data?.data) {
          const statusData = response.data.data as Record<string, unknown>
          
          Object.assign(task, {
            status: statusData.status || task.status,
            progress: statusData.progress || task.progress,
            current_speaker: statusData.current_speaker,
            score: statusData.score,
            dimension_scores: statusData.dimension_scores,
            summary: statusData.summary,
            recommendation: statusData.recommendation,
            error_message: statusData.error_message
          })

          if (statusData.status === 'completed') {
            ElMessage.success(`"${task.name}" 初筛完成`)
            onTaskCompleted?.()
          } else if (statusData.status === 'failed') {
            ElMessage.error(`"${task.name}" 初筛失败`)
          }
        }
      } catch (err) {
        console.error('获取任务状态失败:', err)
      }
    }
  }

  // 添加任务到队列
  const addToQueue = (task: ProcessingTask) => {
    processingQueue.value.unshift(task)
    startTaskPolling()
  }

  // 清理
  onUnmounted(() => {
    stopTaskPolling()
  })

  return {
    processingQueue,
    startTaskPolling,
    stopTaskPolling,
    addToQueue
  }
}
