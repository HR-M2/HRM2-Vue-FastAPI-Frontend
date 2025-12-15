/**
 * 岗位编辑器 composable
 */
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getPositionsApiV1PositionsGet,
  getPositionApiV1PositionsPositionIdGet,
  createPositionApiV1PositionsPost,
  updatePositionApiV1PositionsPositionIdPatch,
  deletePositionApiV1PositionsPositionIdDelete
} from '@/api/sdk.gen'
import type { PositionResponse, PositionListResponse } from '@/api/types.gen'

// 表单数据类型
export interface PositionFormData {
  id?: string
  title: string
  department: string
  description: string
  required_skills: string[]
  preferred_skills: string[]
  min_experience: number
  education_requirements: string[]
  salary_min: number
  salary_max: number
  is_active: boolean
  application_count?: number
}

// 默认岗位数据
const defaultPositionData: PositionFormData = {
  title: '',
  department: '',
  description: '',
  required_skills: [],
  preferred_skills: [],
  min_experience: 0,
  education_requirements: [],
  salary_min: 0,
  salary_max: 0,
  is_active: true
}

export function usePositionEditor() {
  // 状态
  const loading = ref(false)
  const saving = ref(false)
  const positions = ref<PositionListResponse[]>([])
  const selectedPositionId = ref<string | null>(null)
  const originalData = ref<PositionFormData | null>(null)

  // 当前编辑的表单数据
  const formData = reactive<PositionFormData>({ ...defaultPositionData })

  // 计算是否有未保存的更改
  const hasChanges = computed(() => {
    if (!originalData.value) return false
    return JSON.stringify(formData) !== JSON.stringify(originalData.value)
  })

  // 加载岗位列表
  const loadPositions = async () => {
    loading.value = true
    try {
      const response = await getPositionsApiV1PositionsGet({
        query: { page: 1, page_size: 100 }
      })
      const data = (response.data as any)?.data || response.data
      positions.value = data?.items || []
    } catch (err) {
      console.error('加载岗位列表失败:', err)
      ElMessage.error('加载岗位列表失败')
    } finally {
      loading.value = false
    }
  }

  // 选择岗位
  const selectPosition = async (pos: PositionListResponse) => {
    if (hasChanges.value) {
      try {
        await ElMessageBox.confirm('当前有未保存的更改，是否放弃？', '提示', {
          confirmButtonText: '放弃',
          cancelButtonText: '取消',
          type: 'warning'
        })
      } catch {
        return false
      }
    }

    selectedPositionId.value = pos.id || null

    // 加载岗位详情
    if (pos.id) {
      try {
        const response = await getPositionApiV1PositionsPositionIdGet({
          path: { position_id: pos.id }
        })
        const detail = (response.data as any)?.data || response.data
        if (detail) {
          Object.assign(formData, {
            ...defaultPositionData,
            id: detail.id,
            title: detail.title || '',
            department: detail.department || '',
            description: detail.description || '',
            required_skills: detail.required_skills || [],
            preferred_skills: detail.preferred_skills || [],
            min_experience: detail.min_experience || 0,
            education_requirements: detail.education_requirements || [],
            salary_min: detail.salary_min || 0,
            salary_max: detail.salary_max || 0,
            is_active: detail.is_active ?? true,
            application_count: detail.application_count || 0
          })
          originalData.value = JSON.parse(JSON.stringify(formData))
        }
      } catch (err) {
        console.error('加载岗位详情失败:', err)
        ElMessage.error('加载岗位详情失败')
        return false
      }
    }
    return true
  }

  // 创建岗位
  const createPosition = async (title: string, description: string) => {
    if (!title.trim()) {
      ElMessage.warning('请输入岗位名称')
      return null
    }

    try {
      const response = await createPositionApiV1PositionsPost({
        body: {
          title,
          description,
          required_skills: [],
          preferred_skills: [],
          min_experience: 0,
          education_requirements: []
        }
      })

      const newPos = (response.data as any)?.data || response.data
      ElMessage.success('岗位创建成功')
      await loadPositions()

      // 自动选中新创建的岗位
      if (newPos?.id) {
        await selectPosition(newPos)
      }

      return newPos
    } catch (err: unknown) {
      console.error('创建岗位失败:', err)
      const errorMessage = err instanceof Error ? err.message : '创建岗位失败'
      ElMessage.error(errorMessage)
      return null
    }
  }

  // 删除岗位
  const deletePosition = async (pos: PositionListResponse) => {
    if (!pos.id) return false

    try {
      await ElMessageBox.confirm(`确定要删除岗位"${pos.title}"吗？`, '确认删除', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      })

      await deletePositionApiV1PositionsPositionIdDelete({
        path: { position_id: pos.id }
      })
      ElMessage.success('岗位已删除')

      // 如果删除的是当前选中的岗位，清空选择
      if (selectedPositionId.value === pos.id) {
        selectedPositionId.value = null
        originalData.value = null
        Object.assign(formData, defaultPositionData)
      }

      await loadPositions()
      return true
    } catch (err) {
      if (err !== 'cancel') {
        console.error('删除岗位失败:', err)
        ElMessage.error('删除岗位失败')
      }
      return false
    }
  }

  // 保存岗位
  const savePosition = async () => {
    if (!selectedPositionId.value || !hasChanges.value) return false

    saving.value = true
    try {
      await updatePositionApiV1PositionsPositionIdPatch({
        path: { position_id: selectedPositionId.value },
        body: {
          title: formData.title,
          department: formData.department || null,
          description: formData.description || null,
          required_skills: formData.required_skills,
          preferred_skills: formData.preferred_skills,
          min_experience: formData.min_experience,
          education_requirements: formData.education_requirements,
          salary_min: formData.salary_min,
          salary_max: formData.salary_max,
          is_active: formData.is_active
        }
      })
      originalData.value = JSON.parse(JSON.stringify(formData))
      ElMessage.success('保存成功')
      await loadPositions()
      return true
    } catch (err) {
      console.error('保存失败:', err)
      ElMessage.error('保存失败')
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    // 状态
    loading,
    saving,
    positions,
    selectedPositionId,
    formData,
    hasChanges,
    // 方法
    loadPositions,
    selectPosition,
    createPosition,
    deletePosition,
    savePosition
  }
}
