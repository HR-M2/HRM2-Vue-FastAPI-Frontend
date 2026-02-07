/**
 * 拖拽交互 composable
 * 处理候选人在岗位间的拖拽移动，以及智能匹配简历拖拽分配
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { updateApplication, createResume, createApplication } from '@/api/sdk.gen'
import type { CandidateItem } from './useCandidateList'

// 智能匹配简历拖拽数据
export interface SmartResumeDropData {
  type: 'smart-resume'
  source: 'file' | 'library'
  fileId?: string
  resumeId?: string
  candidateName: string
  content?: string
}

export function useDragDrop(
  onMoveSuccess: () => void,
  onResumeAssigned?: (data: SmartResumeDropData) => void
) {
  const draggingCandidate = ref<CandidateItem | null>(null)
  const draggingResumeName = ref<string | null>(null)
  const dragOverPositionId = ref<string | null>(null)

  // 开始拖拽候选人
  const handleDragStart = (e: DragEvent, candidate: CandidateItem) => {
    draggingCandidate.value = candidate
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', candidate.id)
    }
  }

  // 智能匹配简历拖拽开始（由 SmartMatching 触发）
  const handleResumeDragStart = (name: string) => {
    draggingResumeName.value = name
  }

  // 智能匹配简历拖拽结束
  const handleResumeDragEnd = () => {
    draggingResumeName.value = null
  }

  // 拖拽经过岗位
  const handleDragOverPosition = (e: DragEvent, positionId: string) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
    dragOverPositionId.value = positionId
  }

  // 拖拽离开岗位
  const handleDragLeavePosition = (positionId: string) => {
    if (dragOverPositionId.value === positionId) {
      dragOverPositionId.value = null
    }
  }

  // 放置到岗位（统一处理候选人调岗 + 简历分配）
  const handleDropOnPosition = async (e: DragEvent, targetPositionId: string) => {
    e.preventDefault()
    dragOverPositionId.value = null

    // 尝试解析智能匹配简历数据
    let resumeData: SmartResumeDropData | null = null
    try {
      const json = e.dataTransfer?.getData('application/json')
      if (json) {
        const parsed = JSON.parse(json)
        if (parsed.type === 'smart-resume') {
          resumeData = parsed as SmartResumeDropData
        }
      }
    } catch { /* 不是 JSON 数据，忽略 */ }

    // 处理智能匹配简历拖拽
    if (resumeData) {
      draggingResumeName.value = null
      await handleResumeDropOnPosition(resumeData, targetPositionId)
      return
    }

    // 处理候选人调岗
    if (!draggingCandidate.value) return
    if (draggingCandidate.value.positionId === targetPositionId) {
      draggingCandidate.value = null
      return
    }

    const candidate = draggingCandidate.value
    draggingCandidate.value = null

    try {
      await updateApplication({
        path: { application_id: candidate.id },
        body: { position_id: targetPositionId }
      })

      ElMessage.success(`已将「${candidate.candidateName}」移至新岗位`)
      onMoveSuccess()
    } catch (err) {
      console.error('调岗失败:', err)
      ElMessage.error('调岗失败')
    }
  }

  // 处理简历拖拽到岗位（创建简历+申请）
  const handleResumeDropOnPosition = async (data: SmartResumeDropData, positionId: string) => {
    try {
      let resumeId: string | null = null

      if (data.source === 'library' && data.resumeId) {
        resumeId = data.resumeId
      } else if (data.source === 'file' && data.content) {
        // 计算文件哈希
        const encoder = new TextEncoder()
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data.content))
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        const resumeRes = await createResume({
          body: { candidate_name: data.candidateName, content: data.content, file_hash: fileHash }
        })
        resumeId = resumeRes.data?.data?.id || null
      }

      if (!resumeId) {
        ElMessage.error('简历创建失败')
        return
      }

      const appRes = await createApplication({
        body: { position_id: positionId, resume_id: resumeId }
      })

      if (appRes.data?.data?.id) {
        ElMessage.success(`已将「${data.candidateName}」添加到岗位`)
        onResumeAssigned?.(data)
        onMoveSuccess()
      }
    } catch (err) {
      console.error('简历分配失败:', err)
      ElMessage.error('简历分配失败')
    }
  }

  // 拖拽结束
  const handleDragEnd = () => {
    draggingCandidate.value = null
    draggingResumeName.value = null
    dragOverPositionId.value = null
  }

  return {
    draggingCandidate,
    draggingResumeName,
    dragOverPositionId,
    handleDragStart,
    handleResumeDragStart,
    handleResumeDragEnd,
    handleDragOverPosition,
    handleDragLeavePosition,
    handleDropOnPosition,
    handleDragEnd
  }
}
