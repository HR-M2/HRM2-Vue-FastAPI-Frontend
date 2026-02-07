<template>
  <div class="recommend-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <el-icon><TrophyBase /></el-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">综合分析决策平台</h1>
          <p class="page-desc">整合简历、初筛报告、面试记录，AI智能生成最终录用建议</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-value">{{ positionsList?.length || 0 }}</span>
          <span class="stat-label">岗位</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ totalCandidates }}</span>
          <span class="stat-label">候选人</span>
        </div>
        <div class="stat-item highlight">
          <span class="stat-value">{{ analyzedCount }}</span>
          <span class="stat-label">已分析</span>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-grid">
      <!-- 左侧面板：岗位列表 -->
      <div class="left-panel">
        <PositionList
          :positions="positionsList"
          :selected-position-id="selectedPositionId"
          @select="handlePositionSelect"
        />
      </div>

      <!-- 右侧面板：候选人分析卡片 -->
      <div class="right-panel">
        <div v-if="!selectedPositionId" class="empty-state">
          <el-empty description="请选择左侧岗位查看候选人" :image-size="120" />
        </div>
        
        <div v-else-if="currentApplications.length === 0" class="empty-state">
          <el-empty description="该岗位暂无候选人">
            <el-button type="primary" @click="goToScreening">添加候选人</el-button>
          </el-empty>
        </div>
        
        <div v-else class="candidates-container">
          <div class="panel-header">
            <h3>候选人综合分析</h3>
            <span class="candidate-count">共 {{ currentApplications.length }} 人</span>
          </div>
          
          <div class="candidates-list">
            <CandidateAnalysisCard
              v-for="app in currentApplications"
              :key="app.id"
              :application="app"
              :is-analyzing="isAnalyzingApplication(app.id)"
              :analysis-progress="getAnalysisProgress(app.id)"
              :analysis-status-text="getAnalysisStatusText(app.id)"
              :is-generating-report="isGeneratingReportForApplication(app.id)"
              @view-resume="viewResumeDetail(app)"
              @view-screening-report="viewScreeningReport(app)"
              @view-interview-records="viewInterviewRecords(app)"
              @view-interview-report="viewInterviewReport(app)"
              @view-final-report="viewFinalReport(app)"
              @view-video-analysis="viewVideoAnalysis(app)"
              @go-to-screening="goToScreening"
              @go-to-interview="goToInterview(app)"
              @go-to-video="goToVideo(app)"
              @start-analysis="startCandidateAnalysis(app)"
              @generate-interview-report="generateInterviewReportForApplication(app)"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 简历内容查看对话框 -->
    <el-dialog
      v-model="showResumeDialog"
      title="简历内容"
      width="700px"
      destroy-on-close
    >
      <div v-if="selectedResumeContent" class="resume-content-view">
        <pre class="resume-text">{{ selectedResumeContent }}</pre>
      </div>
      <template #footer>
        <el-button @click="showResumeDialog = false">关闭</el-button>
      </template>
    </el-dialog>
    
    <!-- 初筛报告查看对话框 -->
    <ResumeDetailDialog
      v-model="showScreeningDialog"
      :resume="selectedScreeningResumeData"
      :screening-task-id="currentScreeningTaskId"
      @edit="handleScreeningEdit"
    />
    
    <!-- 面试记录查看对话框 -->
    <InterviewRecordsDialog
      v-model:visible="showInterviewDialog"
      :session="selectedInterviewSession"
    />
    
    <!-- 面试报告查看对话框 -->
    <InterviewReportDialog
      v-model:visible="showInterviewReportDialog"
      :report="selectedInterviewReport"
      @edit="(report) => openReportEdit('interview', report)"
    />
    
    <!-- 综合分析详情对话框 -->
    <ComprehensiveAnalysisDialog
      v-model:visible="showComprehensiveDialog"
      :analysis="selectedComprehensiveAnalysis"
      @edit="(analysis) => openReportEdit('analysis', analysis)"
    />
    
    <!-- 报告编辑对话框 -->
    <ReportEditDialog
      v-model="showReportEditDialog"
      :report-type="editReportType"
      :report-data="editReportData"
      :report-id="editReportId"
      @saved="handleReportEditSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { TrophyBase } from '@element-plus/icons-vue'

// 组件导入
import CandidateAnalysisCard from './components/CandidateAnalysisCard.vue'
import InterviewRecordsDialog from './components/dialogs/InterviewRecordsDialog.vue'
import InterviewReportDialog from './components/dialogs/InterviewReportDialog.vue'
import ComprehensiveAnalysisDialog from './components/dialogs/ComprehensiveAnalysisDialog.vue'
import PositionList from '@/components/common/PositionList.vue'
import ResumeDetailDialog from '@/components/common/ResumeDetailDialog.vue'
import { ReportEditDialog } from '@/components/common'
import type { ReportType } from '@/components/common/ReportEditDialog.vue'

// Composables
import { usePositionManagement } from '@/composables/usePositionManagement'

// API 导入
import { 
  getApplications, 
  getApplication,
  getInterviewSession,
  getAnalysis,
  aiGenerateReport,
  createAnalysis,
  getScreeningTask,
  getStatsOverview
} from '@/api'
import type { ResumeData } from '@/types'
import type { 
  ApplicationDetailResponse,
  InterviewSessionResponseOutput,
  ComprehensiveAnalysisResponse,
  DimensionScoreItem
} from '@/api/types.gen'

const router = useRouter()

// ========== 岗位管理（复用 composable） ==========
const {
  positionsList,
  selectedPositionId,
  loadPositionsList,
  selectPosition
} = usePositionManagement()

const currentApplications = ref<ApplicationDetailResponse[]>([])
const isLoadingApplications = ref(false)

// 统计数据
const totalCandidates = computed(() => {
  return positionsList.value.reduce((sum, pos) => sum + (pos.resume_count || 0), 0)
})

const analyzedCount = ref(0)

// 加载全局统计数据
const loadStatsOverview = async () => {
  try {
    const result = await getStatsOverview()
    if (result.data?.data) {
      analyzedCount.value = (result.data.data.recommended as number) || 0
    }
  } catch (err) {
    console.error('加载统计数据失败:', err)
  }
}

// 加载指定岗位的应聘申请
const loadApplicationsForPosition = async (positionId: string) => {
  isLoadingApplications.value = true
  try {
    const result = await getApplications({ 
      query: { 
        page: 1, 
        page_size: 100, 
        position_id: positionId,
        include_details: true
      } 
    })
    currentApplications.value = (result.data?.data?.items || []) as ApplicationDetailResponse[]
  } catch (err) {
    console.error('加载申请列表失败:', err)
    currentApplications.value = []
  } finally {
    isLoadingApplications.value = false
  }
}

// 处理岗位选择
const handlePositionSelect = async (pos: { id: string; title: string }) => {
  if (selectedPositionId.value === pos.id) return
  selectPosition(pos as any)
  await loadApplicationsForPosition(pos.id)
}

// 跳转到简历初筛
const goToScreening = () => {
  router.push('/screening')
}

// 跳转到面试
const goToInterview = (app: ApplicationDetailResponse) => {
  router.push('/interview')
}

// 跳转到视频分析
const goToVideo = (app: ApplicationDetailResponse) => {
  router.push('/video')
}

// ========== 分析状态管理 ==========
const analyzingApplications = ref<Set<string>>(new Set())
const analysisProgress = ref<Record<string, number>>({})
const analysisStatusTexts = ref<Record<string, string>>({})
const generatingReportApplications = ref<Set<string>>(new Set())

// 是否正在分析
const isAnalyzingApplication = (applicationId: string) => {
  return analyzingApplications.value.has(applicationId)
}

// 获取分析进度
const getAnalysisProgress = (applicationId: string) => {
  return analysisProgress.value[applicationId] || 0
}

// 获取分析状态文本
const getAnalysisStatusText = (applicationId: string) => {
  return analysisStatusTexts.value[applicationId] || ''
}

// 是否正在生成面试报告
const isGeneratingReportForApplication = (applicationId: string) => {
  return generatingReportApplications.value.has(applicationId)
}

// 为指定申请生成面试分析报告
const generateInterviewReportForApplication = async (app: ApplicationDetailResponse) => {
  if (!app.interview_session?.id) {
    ElMessage.warning('未找到面试会话')
    return
  }
  
  generatingReportApplications.value.add(app.id)
  
  try {
    ElMessage.info('正在生成面试分析报告...')
    
    // 调用 AI 生成报告
    await aiGenerateReport({ body: { session_id: app.interview_session.id } })
    
    // 重新加载申请详情
    const detailResult = await getApplication({ path: { application_id: app.id } })
    if (detailResult.data?.data) {
      const index = currentApplications.value.findIndex((a: ApplicationDetailResponse) => a.id === app.id)
      if (index !== -1) {
        currentApplications.value[index] = detailResult.data.data
      }
    }
    
    ElMessage.success('面试分析报告已生成')
    
  } catch (err: any) {
    console.error('生成面试报告失败:', err)
    ElMessage.error(err.message || '生成面试报告失败')
  } finally {
    generatingReportApplications.value.delete(app.id)
  }
}

// ========== 综合分析 ==========
const startCandidateAnalysis = async (app: ApplicationDetailResponse) => {
  analyzingApplications.value.add(app.id)
  analysisProgress.value[app.id] = 10
  analysisStatusTexts.value[app.id] = '正在启动综合分析...'
  
  try {
    // 调用综合分析API（内部会调用AI Agent进行多维度评估）
    analysisProgress.value[app.id] = 20
    analysisStatusTexts.value[app.id] = '正在进行AI多维度分析...'
    
    await createAnalysis({ body: { application_id: app.id } })
    
    // 更新进度
    analysisProgress.value[app.id] = 100
    analysisStatusTexts.value[app.id] = '分析完成'
    
    // 重新加载申请详情
    const detailResult = await getApplication({ path: { application_id: app.id } })
    if (detailResult.data?.data) {
      const index = currentApplications.value.findIndex((a: ApplicationDetailResponse) => a.id === app.id)
      if (index !== -1) {
        currentApplications.value[index] = detailResult.data.data
      }
    }
    
    ElMessage.success('综合分析完成')
    
    // 刷新全局统计
    await loadStatsOverview()
    
  } catch (err: any) {
    console.error('综合分析失败:', err)
    ElMessage.error(err.message || '综合分析失败')
    analysisStatusTexts.value[app.id] = '分析失败'
  } finally {
    analyzingApplications.value.delete(app.id)
  }
}

// ========== 对话框 ==========
const showResumeDialog = ref(false)
const showScreeningDialog = ref(false)
const selectedScreeningResumeData = ref<ResumeData | null>(null)
const showInterviewDialog = ref(false)
const showInterviewReportDialog = ref(false)
const showComprehensiveDialog = ref(false)
const selectedResumeContent = ref<string>('')
const selectedInterviewSession = ref<InterviewSessionResponseOutput | null>(null)
const selectedInterviewReport = ref<InterviewSessionResponseOutput | null>(null)
const selectedComprehensiveAnalysis = ref<ComprehensiveAnalysisResponse | null>(null)
const currentScreeningTaskId = ref('')

// ========== 报告编辑 ==========
const showReportEditDialog = ref(false)
const editReportType = ref<ReportType>('interview')
const editReportData = ref<Record<string, unknown> | null>(null)
const editReportId = ref('')
const currentEditingApplicationId = ref('')

const openReportEdit = (type: ReportType, reportData: unknown) => {
  if (!reportData) {
    ElMessage.warning('无报告数据')
    return
  }
  
  editReportType.value = type
  editReportData.value = reportData as Record<string, unknown>
  
  if (type === 'screening') {
    editReportId.value = (reportData as { id?: string }).id || ''
  } else if (type === 'interview') {
    editReportId.value = (reportData as InterviewSessionResponseOutput).id || ''
  } else if (type === 'analysis') {
    editReportId.value = (reportData as ComprehensiveAnalysisResponse).id || ''
  }
  
  showReportEditDialog.value = true
}

const handleReportEditSaved = async () => {
  // 刷新当前页面数据
  if (selectedPositionId.value) {
    await loadApplicationsForPosition(selectedPositionId.value)
  }
  
  // 关闭原查看对话框
  showScreeningDialog.value = false
  showInterviewReportDialog.value = false
  showComprehensiveDialog.value = false
  
  ElMessage.success('报告已更新')
}

// 查看简历详情
const viewResumeDetail = async (app: ApplicationDetailResponse) => {
  if (!app.resume?.id) {
    ElMessage.warning('暂无简历内容')
    return
  }
  
  try {
    // 需要获取简历详情来获取content
    const { getResume } = await import('@/api')
    const result = await getResume({ path: { resume_id: app.resume.id } })
    const content = result.data?.data?.content
    if (content) {
      selectedResumeContent.value = content
      showResumeDialog.value = true
    } else {
      ElMessage.warning('暂无简历内容')
    }
  } catch {
    ElMessage.warning('获取简历内容失败')
  }
}

// 查看初筛报告
const viewScreeningReport = async (app: ApplicationDetailResponse) => {
  if (!app.screening_task?.id) {
    ElMessage.warning('暂无初筛报告')
    return
  }
  
  try {
    // 构建 ResumeData 对象
    const detailData: ResumeData = {
      id: app.resume?.id || '',
      candidate_name: app.candidate_name || '未知候选人',
      position_title: app.position_title || ''
    }
    
    // 获取完整初筛任务数据
    const taskResult = await getScreeningTask({ path: { task_id: app.screening_task.id } })
    if (taskResult.data?.data) {
      const task = taskResult.data.data
      if (task.score !== null) {
        detailData.screening_score = {
          comprehensive_score: task.score,
          hr_score: (task.dimension_scores?.hr_score as number) || undefined,
          technical_score: (task.dimension_scores?.technical_score as number) || undefined,
          manager_score: (task.dimension_scores?.manager_score as number) || undefined
        }
      }
      detailData.screening_summary = task.summary || undefined
      detailData.resume_content = task.resume_content || undefined
      // 提取引用的经验
      if (task.applied_experiences && task.applied_experiences.length > 0) {
        detailData.applied_experiences = task.applied_experiences
      }
    }
    
    // 如果没有简历内容，尝试从简历API获取
    if (!detailData.resume_content && app.resume?.id) {
      try {
        const { getResume } = await import('@/api')
        const resumeResult = await getResume({ path: { resume_id: app.resume.id } })
        if (resumeResult.data?.data?.content) {
          detailData.resume_content = resumeResult.data.data.content
        }
      } catch {
        // 忽略错误
      }
    }
    
    selectedScreeningResumeData.value = detailData
    currentScreeningTaskId.value = app.screening_task.id
    showScreeningDialog.value = true
  } catch (err) {
    console.error('获取初筛报告失败:', err)
    ElMessage.error('获取初筛报告失败')
  }
}

// 处理初筛报告编辑
const handleScreeningEdit = async (taskId: string) => {
  try {
    const result = await getScreeningTask({ path: { task_id: taskId } })
    if (result.data?.data) {
      openReportEdit('screening', result.data.data)
    }
  } catch (err) {
    console.error('获取初筛任务失败:', err)
    ElMessage.error('获取初筛任务失败')
  }
}

// 查看面试记录
const viewInterviewRecords = async (app: ApplicationDetailResponse) => {
  if (!app.interview_session?.id) {
    ElMessage.warning('暂无面试记录')
    return
  }
  
  try {
    const result = await getInterviewSession({ path: { session_id: app.interview_session.id } })
    if (result.data?.data) {
      selectedInterviewSession.value = result.data.data
      showInterviewDialog.value = true
    }
  } catch (err) {
    ElMessage.warning('获取面试记录失败')
  }
}

// 查看面试报告
const viewInterviewReport = async (app: ApplicationDetailResponse) => {
  if (!app.interview_session?.id) {
    ElMessage.warning('暂无面试报告')
    return
  }
  
  try {
    const result = await getInterviewSession({ path: { session_id: app.interview_session.id } })
    if (result.data?.data) {
      selectedInterviewReport.value = result.data.data
      showInterviewReportDialog.value = true
    }
  } catch (err) {
    ElMessage.warning('获取面试报告失败')
  }
}

// 查看视频分析
const viewVideoAnalysis = (app: ApplicationDetailResponse) => {
  if (app.video_analysis?.id) {
    router.push(`/video/${app.video_analysis.id}`)
  } else {
    ElMessage.warning('暂无视频分析')
  }
}

// 查看最终报告（综合分析详情）
const viewFinalReport = async (app: ApplicationDetailResponse) => {
  if (!app.comprehensive_analysis?.id) {
    ElMessage.warning('暂无综合分析结果')
    return
  }
  
  try {
    const result = await getAnalysis({ path: { analysis_id: app.comprehensive_analysis.id } })
    if (result.data?.data) {
      selectedComprehensiveAnalysis.value = result.data.data
      showComprehensiveDialog.value = true
    }
  } catch (err) {
    ElMessage.warning('获取综合分析详情失败')
  }
}


// ========== 生命周期 ==========
onMounted(async () => {
  await loadPositionsList()
  await loadStatsOverview()
  // 加载第一个岗位的申请详情
  if (selectedPositionId.value) {
    await loadApplicationsForPosition(selectedPositionId.value)
  }
})
</script>

<style scoped lang="scss">
.recommend-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  color: white;
  
  .header-content {
    display: flex;
    align-items: center;
    gap: 20px;
    
    .header-icon {
      width: 56px;
      height: 56px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .el-icon {
        font-size: 28px;
      }
    }
    
    .header-text {
      .page-title {
        margin: 0 0 4px;
        font-size: 24px;
        font-weight: 700;
      }
      
      .page-desc {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }
    }
  }
  
  .header-stats {
    display: flex;
    gap: 32px;
    
    .stat-item {
      text-align: center;
      
      .stat-value {
        display: block;
        font-size: 28px;
        font-weight: 700;
      }
      
      .stat-label {
        font-size: 13px;
        opacity: 0.8;
      }
      
      &.highlight {
        .stat-value {
          color: #fbbf24;
        }
      }
    }
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
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
    }
  }
  
  .position-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .position-item {
    padding: 14px 16px;
    background: #f9fafb;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
    
    &:hover {
      background: #f3f4f6;
    }
    
    &.active {
      background: linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%);
      border-color: #667eea;
    }
    
    .position-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      .position-name {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }
      
      .position-count {
        font-size: 12px;
        color: #6b7280;
        background: #e5e7eb;
        padding: 2px 8px;
        border-radius: 10px;
      }
    }
    
    .position-progress {
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
      
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #10b981 0%, #059669 100%);
        border-radius: 2px;
        transition: width 0.3s;
      }
    }
  }
  
  .empty-positions {
    padding: 20px 0;
  }
}

// 右侧面板
.right-panel {
  min-height: 500px;
  
  .empty-state {
    background: white;
    border-radius: 16px;
    padding: 60px 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  }
  
  .candidates-container {
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      
      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a1a2e;
      }
      
      .candidate-count {
        font-size: 14px;
        color: #6b7280;
      }
    }
    
    .candidates-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  }
}

// 对话框样式
.resume-content-view {
  max-height: 500px;
  overflow-y: auto;
  
  .resume-text {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.8;
    color: #374151;
    background: #f9fafb;
    padding: 20px;
    border-radius: 12px;
    margin: 0;
  }
}


@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 20px;
    text-align: center;
    
    .header-content {
      flex-direction: column;
    }
  }
}
</style>
