/**
 * 简历上传 composable
 * 处理简历文件上传和提交
 */
import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createResume,
  createApplication,
  startAiScreening,
  getResumes
} from '@/api/sdk.gen'
import type { ResumeListResponse } from '@/api/types.gen'
import type { PositionData, ResumeFile, ProcessingTask } from '@/types'

export function useResumeUpload(
  positionData: Ref<PositionData>,
  onSubmitSuccess?: (task: ProcessingTask) => void
) {
  const isSubmitting = ref(false)
  const currentFiles = ref<ResumeFile[]>([])
  const libraryFiles = ref<ResumeListResponse[]>([])

  // 上传文件变化处理
  const handleFilesChanged = (files: ResumeFile[]) => {
    currentFiles.value = files
  }

  // 简历库文件变化处理
  const handleLibraryFilesChanged = (files: ResumeListResponse[]) => {
    libraryFiles.value = files
  }

  // 计算内容哈希
  const calculateHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 提交文件
  const submitFiles = async (clearCallback?: () => void) => {
    const parsedFiles = currentFiles.value.filter(f => f.status === 'parsed')
    const selectedLibraryFiles = libraryFiles.value
    
    if (parsedFiles.length === 0 && selectedLibraryFiles.length === 0) {
      ElMessage.warning('没有已解析的文件可提交')
      return
    }

    if (!positionData.value?.id) {
      ElMessage.warning('请先选择一个岗位')
      return
    }

    isSubmitting.value = true
    let successCount = 0
    
    try {
      // 1. 提交上传的文件
      for (const file of parsedFiles) {
        try {
          const fileHash = await calculateHash(file.content)
          
          // 创建简历
          const resumeResponse = await createResume({
            body: {
              candidate_name: file.name.replace(/\.[^/.]+$/, ''),
              content: file.content,
              file_hash: fileHash
            }
          })
          
          if (!resumeResponse.data?.data?.id) {
            throw new Error('创建简历失败')
          }
          
          const resumeId = resumeResponse.data.data.id
          
          // 创建应聘申请
          const appResponse = await createApplication({
            body: {
              position_id: positionData.value.id,
              resume_id: resumeId
            }
          })
          
          if (!appResponse.data?.data?.id) {
            throw new Error('创建申请失败')
          }
          
          const applicationId = appResponse.data.data.id
          
          // 直接启动 AI 筛选（会自动创建筛选任务）
          const aiResponse = await startAiScreening({
            body: {
              application_id: applicationId
            }
          })
          
          const aiData = aiResponse.data?.data as { task_id?: string } | undefined
          if (!aiData?.task_id) {
            throw new Error('启动AI筛选失败')
          }
          
          const task: ProcessingTask = {
            name: file.name,
            task_id: aiData.task_id,
            application_id: applicationId,
            status: 'running',
            progress: 0,
            created_at: new Date().toISOString(),
            applied_position: positionData.value.title
          }
          
          onSubmitSuccess?.(task)
          successCount++
        } catch (err) {
          console.error(`提交 ${file.name} 失败:`, err)
          ElMessage.error(`${file.name} 提交失败`)
        }
      }

      // 2. 提交从简历库选择的文件
      for (const libFile of selectedLibraryFiles) {
        try {
          // 创建应聘申请
          const appResponse = await createApplication({
            body: {
              position_id: positionData.value.id,
              resume_id: libFile.id
            }
          })
          
          if (!appResponse.data?.data?.id) {
            throw new Error('创建申请失败')
          }
          
          const applicationId = appResponse.data.data.id
          
          // 直接启动 AI 筛选（会自动创建筛选任务）
          const aiResponse = await startAiScreening({
            body: {
              application_id: applicationId
            }
          })
          
          const aiData = aiResponse.data?.data as { task_id?: string } | undefined
          if (!aiData?.task_id) {
            throw new Error('启动AI筛选失败')
          }
          
          const task: ProcessingTask = {
            name: libFile.candidate_name || '未知候选人',
            task_id: aiData.task_id,
            application_id: applicationId,
            status: 'running',
            progress: 0,
            created_at: new Date().toISOString(),
            applied_position: positionData.value.title
          }
          
          onSubmitSuccess?.(task)
          successCount++
        } catch (err) {
          console.error(`提交 ${libFile.candidate_name} 失败:`, err)
          ElMessage.error(`${libFile.candidate_name || '简历'} 提交失败`)
        }
      }

      if (successCount > 0) {
        clearCallback?.()
        ElMessage.success(`成功提交 ${successCount} 份简历进行初筛`)
      }
    } catch (err) {
      console.error('提交失败:', err)
      ElMessage.error('提交失败')
    } finally {
      isSubmitting.value = false
    }
  }

  // 加载简历库列表
  const loadLibraryList = async () => {
    try {
      const response = await getResumes({
        query: { page_size: 100 }
      })
      return response.data?.data?.items || []
    } catch (err) {
      console.error('加载简历库失败:', err)
      return []
    }
  }

  return {
    isSubmitting,
    currentFiles,
    libraryFiles,
    handleFilesChanged,
    handleLibraryFilesChanged,
    submitFiles,
    loadLibraryList
  }
}
