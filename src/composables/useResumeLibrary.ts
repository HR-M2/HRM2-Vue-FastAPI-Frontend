/**
 * 简历库管理 Composable
 */
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getResumesApiV1ResumesGet,
  getResumeApiV1ResumesResumeIdGet,
  createResumeApiV1ResumesPost,
  updateResumeApiV1ResumesResumeIdPatch,
  deleteResumeApiV1ResumesResumeIdDelete,
  batchDeleteResumesApiV1ResumesBatchDeletePost,
  checkHashesApiV1ResumesCheckHashesPost,
} from '@/api/sdk.gen'
import type { ResumeListResponse, ResumeResponse, ResumeCreate } from '@/api/types.gen'

export function useResumeLibrary() {
  // 状态
  const loading = ref(false)
  const uploading = ref(false)
  const resumes = ref<ResumeListResponse[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const keyword = ref('')
  const selectedIds = ref<string[]>([])

  // 加载简历库列表
  const loadResumes = async () => {
    loading.value = true
    try {
      const { data, error } = await getResumesApiV1ResumesGet({
        query: {
          page: currentPage.value,
          page_size: pageSize.value,
          keyword: keyword.value || undefined,
        }
      })
      
      if (error) {
        throw new Error('获取简历列表失败')
      }
      
      if (data?.data) {
        resumes.value = data.data.items || []
        total.value = data.data.total || 0
      }
    } catch (error) {
      console.error('加载简历库失败:', error)
      ElMessage.error('加载简历库失败')
    } finally {
      loading.value = false
    }
  }

  // 获取简历详情
  const getResumeDetail = async (resumeId: string): Promise<ResumeResponse | null> => {
    try {
      const { data, error } = await getResumeApiV1ResumesResumeIdGet({
        path: { resume_id: resumeId }
      })
      
      if (error) {
        throw new Error('获取简历详情失败')
      }
      
      return data?.data || null
    } catch (error) {
      console.error('获取简历详情失败:', error)
      ElMessage.error('获取简历详情失败')
      return null
    }
  }

  // 计算文件哈希
  const computeFileHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 上传简历
  const uploadResumes = async (files: Array<{ name: string; content: string; metadata?: { size?: number; type?: string } }>) => {
    if (files.length === 0) return { uploaded_count: 0, skipped_count: 0, skipped: [] }
    
    uploading.value = true
    try {
      // 计算所有文件的哈希
      const fileHashes: string[] = []
      const fileHashMap: Map<string, { name: string; content: string; metadata?: { size?: number; type?: string } }> = new Map()
      
      for (const file of files) {
        const hash = await computeFileHash(file.content)
        fileHashes.push(hash)
        fileHashMap.set(hash, file)
      }
      
      // 批量检查哈希是否存在
      const { data: checkResult, error: checkError } = await checkHashesApiV1ResumesCheckHashesPost({
        body: { hashes: fileHashes }
      })
      
      if (checkError) {
        throw new Error('检查文件哈希失败')
      }
      
      const existsMap = checkResult?.data?.exists || {}
      
      // 上传不存在的文件
      let uploadedCount = 0
      const skipped: Array<{ filename: string; reason: string }> = []
      
      for (const [hash, file] of fileHashMap) {
        if (existsMap[hash]) {
          skipped.push({ filename: file.name, reason: '文件已存在（重复）' })
          continue
        }
        
        // 从内容中提取候选人姓名（简单逻辑：取第一行非空文本）
        const candidateName = extractCandidateName(file.content, file.name)
        
        const resumeData: ResumeCreate = {
          candidate_name: candidateName,
          content: file.content,
          filename: file.name,
          file_hash: hash,
          file_size: file.metadata?.size || file.content.length,
        }
        
        const { error: createError } = await createResumeApiV1ResumesPost({
          body: resumeData
        })
        
        if (createError) {
          skipped.push({ filename: file.name, reason: '上传失败' })
        } else {
          uploadedCount++
        }
      }
      
      const result = {
        uploaded_count: uploadedCount,
        skipped_count: skipped.length,
        skipped
      }
      
      if (uploadedCount > 0) {
        ElMessage.success(`成功上传 ${uploadedCount} 份简历`)
      }
      if (skipped.length > 0) {
        const reasons = skipped.map(s => `${s.filename}: ${s.reason}`).join('\n')
        ElMessage.warning(`跳过 ${skipped.length} 份简历:\n${reasons}`)
      }
      
      // 刷新列表
      await loadResumes()
      
      return result
    } catch (error) {
      console.error('上传简历失败:', error)
      ElMessage.error('上传简历失败')
      throw error
    } finally {
      uploading.value = false
    }
  }

  // 从文件名提取候选人姓名（去掉后缀）
  const extractCandidateName = (_content: string, filename: string): string => {
    return filename.replace(/\.[^.]+$/, '') || '未知'
  }

  // 删除简历
  const deleteResume = async (resumeId: string) => {
    try {
      await ElMessageBox.confirm('确定要删除这份简历吗？', '确认删除', {
        type: 'warning'
      })
      
      const { error } = await deleteResumeApiV1ResumesResumeIdDelete({
        path: { resume_id: resumeId }
      })
      
      if (error) {
        throw new Error('删除失败')
      }
      
      ElMessage.success('删除成功')
      await loadResumes()
    } catch (err: unknown) {
      if (err !== 'cancel') {
        console.error('删除简历失败:', err)
        ElMessage.error('删除简历失败')
      }
    }
  }

  // 批量删除
  const batchDelete = async () => {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请先选择要删除的简历')
      return
    }
    
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedIds.value.length} 份简历吗？`,
        '确认删除',
        { type: 'warning' }
      )
      
      const { error } = await batchDeleteResumesApiV1ResumesBatchDeletePost({
        body: { resume_ids: selectedIds.value }
      })
      
      if (error) {
        throw new Error('批量删除失败')
      }
      
      ElMessage.success(`成功删除 ${selectedIds.value.length} 份简历`)
      selectedIds.value = []
      await loadResumes()
    } catch (err: unknown) {
      if (err !== 'cancel') {
        console.error('批量删除失败:', err)
        ElMessage.error('批量删除失败')
      }
    }
  }

  // 更新简历信息
  const updateResume = async (resumeId: string, data: { candidate_name?: string; notes?: string }) => {
    try {
      const { error } = await updateResumeApiV1ResumesResumeIdPatch({
        path: { resume_id: resumeId },
        body: data
      })
      
      if (error) {
        throw new Error('更新失败')
      }
      
      ElMessage.success('更新成功')
      await loadResumes()
    } catch (error) {
      console.error('更新简历失败:', error)
      ElMessage.error('更新简历失败')
      throw error
    }
  }

  // 搜索
  const search = () => {
    currentPage.value = 1
    loadResumes()
  }

  // 重置筛选
  const resetFilters = () => {
    keyword.value = ''
    currentPage.value = 1
    loadResumes()
  }

  // 页码改变
  const handlePageChange = (page: number) => {
    currentPage.value = page
    loadResumes()
  }

  // 页面大小改变
  const handleSizeChange = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
    loadResumes()
  }

  // 选择改变
  const handleSelectionChange = (selection: ResumeListResponse[]) => {
    selectedIds.value = selection.map(r => r.id)
  }

  // 是否有选中
  const hasSelection = computed(() => selectedIds.value.length > 0)

  return {
    // 状态
    loading,
    uploading,
    resumes,
    total,
    currentPage,
    pageSize,
    keyword,
    selectedIds,
    hasSelection,
    // 方法
    loadResumes,
    getResumeDetail,
    uploadResumes,
    deleteResume,
    batchDelete,
    updateResume,
    search,
    resetFilters,
    handlePageChange,
    handleSizeChange,
    handleSelectionChange
  }
}
