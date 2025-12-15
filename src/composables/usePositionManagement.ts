/**
 * 岗位管理 composable
 * 处理岗位列表加载、选择等操作
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getPositions,
  getApplications,
  deleteApplication
} from '@/api/sdk.gen'
import type { PositionData, ResumeData } from '@/types'

export function usePositionManagement() {
  // 状态
  const positionData = ref<PositionData>({
    id: '',
    title: '',
    required_skills: [],
    optional_skills: [],
    min_experience: 0,
    education: []
  })
  const positionsList = ref<PositionData[]>([])
  const selectedPositionId = ref<string | null>(null)

  // 加载岗位列表（包含关联的简历）
  const loadPositionsList = async () => {
    try {
      const response = await getPositions({
        query: { page_size: 100 }
      })
      
      if (response.data?.data?.items) {
        const positions = response.data.data.items
        
        // 为每个岗位获取关联的申请/简历
        const positionsWithResumes: PositionData[] = []
        
        for (const pos of positions) {
          // 获取该岗位的申请
          const appsResponse = await getApplications({
            query: { position_id: pos.id, page_size: 100 }
          })
          
          const applications = appsResponse.data?.data?.items || []
          const resumes: ResumeData[] = applications.map(app => ({
            id: app.resume_id,
            candidate_name: app.candidate_name || '未知候选人',
            position_title: app.position_title || pos.title,
            application_id: app.id
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          })) as any[]
          
          positionsWithResumes.push({
            id: pos.id,
            title: pos.title,
            department: pos.department || undefined,
            is_active: pos.is_active,
            resume_count: resumes.length,
            resumes,
            created_at: pos.created_at,
            updated_at: pos.updated_at
          })
        }
        
        positionsList.value = positionsWithResumes
        
        // 自动选择第一个岗位
        const firstPosition = positionsList.value[0]
        if (firstPosition && !selectedPositionId.value) {
          selectedPositionId.value = firstPosition.id
          positionData.value = firstPosition
        }
      }
    } catch (err) {
      console.error('加载岗位列表失败:', err)
      ElMessage.error('加载岗位列表失败')
    }
  }

  // 选择岗位
  const selectPosition = (pos: PositionData) => {
    selectedPositionId.value = pos.id
    positionData.value = pos
  }

  // 从岗位移除简历（删除申请关联）
  const removeResumeFromPosition = async (pos: PositionData, resume: ResumeData) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applicationId = (resume as any).application_id
    if (!applicationId) {
      ElMessage.warning('无法获取申请信息')
      return
    }
    
    try {
      await deleteApplication({
        path: { application_id: applicationId }
      })
      ElMessage.success('移除成功')
      await loadPositionsList()
    } catch (err) {
      console.error('移除简历失败:', err)
      ElMessage.error('移除失败')
    }
  }

  return {
    positionData,
    positionsList,
    selectedPositionId,
    loadPositionsList,
    selectPosition,
    removeResumeFromPosition
  }
}
