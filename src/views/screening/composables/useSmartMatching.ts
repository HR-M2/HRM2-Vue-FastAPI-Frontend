/**
 * 智能匹配 composable
 * 处理简历上传后的 AI 岗位匹配及临时匹配池管理
 */
import { ref, computed, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  startAiMatching,
  createResume,
  createApplication,
  startAiScreening
} from '@/api/sdk.gen'
import type { PositionData, ResumeFile } from '@/types'
import type { ResumeListResponse } from '@/api/types.gen'

export interface MatchResult {
  resumeId: string
  candidateName: string
  matchedPositionId: string | null
  matchedPositionTitle: string | null
  error: string | null
  // 来源信息
  sourceType: 'file' | 'library'
  fileName?: string
}

export function useSmartMatching(
  positionsList: Ref<PositionData[]>,
  onMatchConfirmed: () => void
) {
  const matchResults = ref<MatchResult[]>([])
  const isMatching = ref(false)
  const matchProgress = ref(0)
  const isConfirming = ref(false)

  // 找到岗位标题
  const getPositionTitle = (positionId: string | null): string | null => {
    if (!positionId) return null
    const pos = positionsList.value.find(p => p.id === positionId)
    return pos?.title || null
  }

  // 是否有匹配结果
  const hasResults = computed(() => matchResults.value.length > 0)
  const matchedCount = computed(() => matchResults.value.filter(r => r.matchedPositionId).length)

  // 执行智能匹配（已有简历ID的情况）
  const startMatching = async (resumeIds: string[], nameMap: Record<string, string>) => {
    if (resumeIds.length === 0) return

    isMatching.value = true
    matchProgress.value = 0

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        if (matchProgress.value < 90) {
          matchProgress.value += Math.random() * 15
        }
      }, 500)

      const response = await startAiMatching({
        body: { resume_ids: resumeIds }
      })

      clearInterval(progressInterval)
      matchProgress.value = 100

      if (response.data?.data?.results) {
        const results = response.data.data.results as Array<{
          resume_id: string
          candidate_name: string
          matched_position_id: string | null
          error: string | null
        }>

        matchResults.value = results.map(r => ({
          resumeId: r.resume_id,
          candidateName: r.candidate_name || nameMap[r.resume_id] || '未知',
          matchedPositionId: r.matched_position_id,
          matchedPositionTitle: getPositionTitle(r.matched_position_id),
          error: r.error,
          sourceType: 'library' as const
        }))
      }
    } catch (err) {
      console.error('智能匹配失败:', err)
      ElMessage.error('智能匹配失败')
    } finally {
      isMatching.value = false
    }
  }

  // 上传文件并匹配
  const uploadAndMatch = async (
    files: ResumeFile[],
    libraryFiles: ResumeListResponse[],
    calculateHash: (content: string) => Promise<string>
  ) => {
    const allResumeIds: string[] = []
    const nameMap: Record<string, string> = {}

    isMatching.value = true
    matchProgress.value = 0

    try {
      // 1. 上传文件类型的简历
      for (const file of files) {
        if (file.status !== 'parsed') continue
        try {
          const fileHash = await calculateHash(file.content)
          const resumeResponse = await createResume({
            body: {
              candidate_name: file.name.replace(/\.[^/.]+$/, ''),
              content: file.content,
              file_hash: fileHash
            }
          })

          if (resumeResponse.data?.data?.id) {
            const resumeId = resumeResponse.data.data.id
            allResumeIds.push(resumeId)
            nameMap[resumeId] = file.name.replace(/\.[^/.]+$/, '')
          }
        } catch (err) {
          console.error(`上传 ${file.name} 失败:`, err)
        }
        matchProgress.value = Math.min(40, (allResumeIds.length / (files.length + libraryFiles.length)) * 40)
      }

      // 2. 简历库已有的直接用
      for (const libFile of libraryFiles) {
        allResumeIds.push(libFile.id)
        nameMap[libFile.id] = libFile.candidate_name || '未知候选人'
      }

      matchProgress.value = 45

      if (allResumeIds.length === 0) {
        ElMessage.warning('没有可匹配的简历')
        isMatching.value = false
        return
      }

      // 3. 调用 AI 匹配
      await startMatching(allResumeIds, nameMap)

      // 更新来源类型信息
      const fileResumeIds = new Set(allResumeIds.slice(0, files.filter(f => f.status === 'parsed').length))
      matchResults.value.forEach(r => {
        r.sourceType = fileResumeIds.has(r.resumeId) ? 'file' : 'library'
      })
    } catch (err) {
      console.error('上传并匹配失败:', err)
      ElMessage.error('处理失败')
      isMatching.value = false
    }
  }

  // 手动调整匹配结果的岗位
  const updateMatchPosition = (resumeId: string, positionId: string) => {
    const item = matchResults.value.find(r => r.resumeId === resumeId)
    if (item) {
      item.matchedPositionId = positionId
      item.matchedPositionTitle = getPositionTitle(positionId)
    }
  }

  // 一键添加：确认匹配结果，创建 Application 并可选启动初筛
  const confirmMatches = async (autoScreen: boolean = false) => {
    const matched = matchResults.value.filter(r => r.matchedPositionId)
    if (matched.length === 0) {
      ElMessage.warning('没有已匹配的结果')
      return
    }

    isConfirming.value = true
    let successCount = 0

    try {
      for (const item of matched) {
        try {
          // 创建应聘申请
          const appResponse = await createApplication({
            body: {
              position_id: item.matchedPositionId!,
              resume_id: item.resumeId
            }
          })

          if (appResponse.data?.data?.id) {
            successCount++

            // 可选：自动启动初筛
            if (autoScreen) {
              try {
                await startAiScreening({
                  body: { application_id: appResponse.data.data.id }
                })
              } catch {
                // 初筛启动失败不影响整体流程
              }
            }
          }
        } catch (err) {
          console.error(`添加 ${item.candidateName} 失败:`, err)
        }
      }

      if (successCount > 0) {
        ElMessage.success(`成功添加 ${successCount} 名候选人到对应岗位`)
        matchResults.value = []
        onMatchConfirmed()
      }
    } catch (err) {
      console.error('确认匹配失败:', err)
      ElMessage.error('确认匹配失败')
    } finally {
      isConfirming.value = false
    }
  }

  // 清空匹配结果
  const clearResults = () => {
    matchResults.value = []
    matchProgress.value = 0
  }

  // 从匹配结果中移除某项
  const removeResult = (resumeId: string) => {
    matchResults.value = matchResults.value.filter(r => r.resumeId !== resumeId)
  }

  return {
    matchResults,
    isMatching,
    matchProgress,
    isConfirming,
    hasResults,
    matchedCount,
    uploadAndMatch,
    startMatching,
    updateMatchPosition,
    confirmMatches,
    clearResults,
    removeResult
  }
}
