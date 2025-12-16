<template>
  <div class="video-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">视频面试分析系统</h1>
        <p class="page-desc">通过AI技术分析视频面试内容，提供候选人综合素质评估</p>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-grid">
      <!-- 左侧面板 - 岗位列表 -->
      <div class="left-panel">
        <PositionList
          :positions="positionsList"
          :selected-position-id="selectedPositionId"
          @select="selectPosition"
          @assign="goToScreening"
          @remove-resume="removeResumeFromPosition"
        />
      </div>

      <!-- 右侧面板 - 视频分析候选人列表 -->
      <div class="right-panel">
        <VideoResumeList
          :selected-position="selectedPosition"
          :applications="filteredApplications"
          :loading="loadingApplications"
          @go-to-screening="goToScreening"
          @view-detail="showResumeDetail"
          @upload-video="openUploadDialog"
          @view-video-result="viewVideoResult"
        />
      </div>
    </div>

    <!-- 视频上传对话框 -->
    <VideoUploadDialog
      v-model="uploadDialogVisible"
      :candidate-name="currentApplication?.candidate_name || ''"
      :loading="uploading"
      @file-change="handleVideoChange"
      @submit="submitVideo"
    />

    <!-- 视频分析详情对话框 -->
    <VideoAnalysisDetailDialog
      v-model="videoDetailVisible"
      :video-analysis="selectedVideoAnalysis"
    />

    <!-- 简历详情对话框 -->
    <ResumeDetailDialog
      v-model="resumeDetailVisible"
      :resume="selectedResumeDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

// 组件导入
import { PositionList, ResumeDetailDialog } from '@/components/common'
import { VideoResumeList, VideoUploadDialog, VideoAnalysisDetailDialog } from '@/components/video'

// Composables 导入
import { usePositionManagement } from '@/composables/usePositionManagement'

// API
import { 
  getApplications,
  getApplication,
  createVideoAnalysis,
  getVideoAnalysis,
  getResume
} from '@/api/sdk.gen'
import type { VideoAnalysisResponse } from '@/api/types.gen'
import type { PositionData, ResumeData, VideoApplicationData } from '@/types'

const router = useRouter()

// ========== 岗位管理（使用 composable 保持一致性） ==========
const {
  positionsList,
  selectedPositionId,
  loadPositionsList,
  selectPosition,
  removeResumeFromPosition
} = usePositionManagement()

// 计算当前选中的岗位
const selectedPosition = computed(() => {
  if (!selectedPositionId.value) return null
  return positionsList.value.find(p => p.id === selectedPositionId.value) || null
})

// 跳转到简历初筛
const goToScreening = () => {
  router.push('/screening')
}

// ========== 候选人应聘申请管理 ==========
const applications = ref<VideoApplicationData[]>([])
const loadingApplications = ref(false)

// 筛选当前岗位的申请
const filteredApplications = computed(() => {
  if (!selectedPositionId.value) return []
  return applications.value.filter(app => app.position_id === selectedPositionId.value)
})

// 加载应聘申请列表（包含筛选任务和视频分析信息）
const loadApplications = async () => {
  if (!selectedPositionId.value) return
  
  loadingApplications.value = true
  try {
    const result = await getApplications({ 
      query: { 
        position_id: selectedPositionId.value,
        page_size: 100 
      } 
    })
    
    if (result.data?.data?.items) {
      // 获取详细信息（包含 video_analysis）
      const detailedApps: VideoApplicationData[] = []
      for (const app of result.data.data.items) {
        try {
          const detailResult = await getApplication({ path: { application_id: app.id } })
          if (detailResult.data?.data) {
            const detail = detailResult.data.data
            detailedApps.push({
              id: detail.id,
              position_id: detail.position_id,
              resume_id: detail.resume_id,
              candidate_name: detail.candidate_name,
              position_title: detail.position_title,
              created_at: detail.created_at,
              screening_task: detail.screening_task ? {
                id: detail.screening_task.id,
                status: detail.screening_task.status,
                score: detail.screening_task.score,
                dimension_scores: null,
                recommendation: detail.screening_task.recommendation
              } : null,
              video_analysis: detail.video_analysis ? {
                id: detail.video_analysis.id,
                video_name: detail.video_analysis.video_name,
                status: detail.video_analysis.status,
                fraud_score: null,
                confidence_score: null,
                big_five_scores: null,
                summary: null
              } : null
            })
          }
        } catch (e) {
          // 如果获取详情失败，使用列表数据
          detailedApps.push({
            id: app.id,
            position_id: app.position_id,
            resume_id: app.resume_id,
            candidate_name: app.candidate_name,
            position_title: app.position_title,
            created_at: app.created_at,
            screening_task: app.screening_task ? {
              id: app.screening_task.id,
              status: app.screening_task.status,
              score: app.screening_task.score,
              dimension_scores: null,
              recommendation: app.screening_task.recommendation
            } : null,
            video_analysis: null
          })
        }
      }
      applications.value = detailedApps
    }
  } catch (err) {
    console.error('加载应聘申请失败:', err)
  } finally {
    loadingApplications.value = false
  }
}

// 监听岗位变化，重新加载申请
watch(selectedPositionId, () => {
  loadApplications()
})

// ========== 视频上传 ==========
const uploadDialogVisible = ref(false)
const currentApplication = ref<VideoApplicationData | null>(null)
const selectedVideoFile = ref<File | null>(null)
const uploading = ref(false)

// 打开上传对话框
const openUploadDialog = (app: VideoApplicationData) => {
  currentApplication.value = app
  selectedVideoFile.value = null
  uploadDialogVisible.value = true
}

// 处理视频文件选择
const handleVideoChange = (file: File) => {
  selectedVideoFile.value = file
}

// 提交视频
const submitVideo = async () => {
  if (!selectedVideoFile.value || !currentApplication.value) return

  uploading.value = true
  try {
    // 创建视频分析任务
    await createVideoAnalysis({
      body: {
        application_id: currentApplication.value.id,
        video_name: selectedVideoFile.value.name,
        file_size: selectedVideoFile.value.size
      }
    })

    ElMessage.success('视频分析任务已创建')
    uploadDialogVisible.value = false

    // 刷新数据
    await loadApplications()
  } catch (err) {
    console.error('创建视频分析失败:', err)
    ElMessage.error('创建视频分析失败')
  } finally {
    uploading.value = false
  }
}

// ========== 视频分析详情 ==========
const videoDetailVisible = ref(false)
const selectedVideoAnalysis = ref<VideoAnalysisResponse | null>(null)

const viewVideoResult = async (app: VideoApplicationData) => {
  if (!app.video_analysis?.id) return
  
  try {
    const result = await getVideoAnalysis({ path: { video_id: app.video_analysis.id } })
    if (result.data?.data) {
      selectedVideoAnalysis.value = result.data.data
      videoDetailVisible.value = true
    }
  } catch (err) {
    console.error('获取视频分析详情失败:', err)
    ElMessage.error('获取视频分析详情失败')
  }
}

// ========== 简历详情 ==========
const resumeDetailVisible = ref(false)
const selectedResumeDetail = ref<ResumeData | null>(null)

// 从 VideoResumeList 显示简历详情
const showResumeDetail = async (app: VideoApplicationData) => {
  try {
    const result = await getResume({ path: { resume_id: app.resume_id } })
    if (result.data?.data) {
      const resume = result.data.data
      selectedResumeDetail.value = {
        id: resume.id,
        candidate_name: resume.candidate_name,
        position_title: app.position_title || undefined,
        content: resume.content,
        resume_content: resume.content,
        created_at: resume.created_at
      }
      resumeDetailVisible.value = true
    }
  } catch (err) {
    console.error('获取简历详情失败:', err)
    ElMessage.error('获取简历详情失败')
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  loadPositionsList()
})
</script>

<style scoped lang="scss">
.video-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  .page-title {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .page-desc {
    margin: 0;
    font-size: 14px;
    color: #909399;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: start;
}

// 左侧面板
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// 右侧面板
.right-panel {
  min-height: 400px;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
