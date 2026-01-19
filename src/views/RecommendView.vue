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
              :immersive-session="getImmersiveSessionForApp(app.id)"
              @view-resume="viewResumeDetail(app)"
              @view-screening-report="viewScreeningReport(app)"
              @view-immersive-records="viewImmersiveRecords(app)"
              @view-immersive-report="viewImmersiveReport(app)"
              @view-final-report="viewFinalReport(app)"
              @view-video-analysis="viewVideoAnalysis(app)"
              @go-to-screening="goToScreening"
              @go-to-immersive="goToImmersive(app)"
              @go-to-video="goToVideo(app)"
              @start-analysis="startCandidateAnalysis(app)"
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
    />
    
    <!-- 沉浸式面试问答记录弹窗 -->
    <ImmersiveRecordsDialog
      v-model="showImmersiveRecordsDialog"
      :session-data="selectedImmersiveSession"
      :loading="isLoadingImmersiveData"
    />
    
    <!-- 沉浸式面试分析报告弹窗 -->
    <ImmersiveAnalysisReportDialog
      v-model="showImmersiveReportDialog"
      :report-data="selectedImmersiveReport"
      :loading="isLoadingImmersiveData"
    />
    
    <!-- 综合分析详情对话框 -->
    <el-dialog
      v-model="showComprehensiveDialog"
      title="综合分析详情"
      width="800px"
      destroy-on-close
    >
      <div v-if="selectedComprehensiveAnalysis" class="comprehensive-analysis">
        <!-- 总体评分 -->
        <div class="analysis-header">
          <div class="score-circle" :class="getComprehensiveScoreClass(selectedComprehensiveAnalysis.final_score)">
            <span class="score-value">{{ selectedComprehensiveAnalysis.final_score }}</span>
            <span class="score-label">分</span>
          </div>
          <div class="header-info">
            <h3 class="recommendation-label">{{ selectedComprehensiveAnalysis.recommendation_level }}</h3>
            <p class="analysis-time" v-if="selectedComprehensiveAnalysis.created_at">
              分析时间：{{ formatDateTime(selectedComprehensiveAnalysis.created_at) }}
            </p>
          </div>
        </div>
        
        <!-- 维度评分 -->
        <div v-if="selectedComprehensiveAnalysis.dimension_scores" class="dimension-scores">
          <h4>多维度 Rubric 评估</h4>
          <div class="dimension-grid">
            <div 
              v-for="(dim, key) in selectedComprehensiveAnalysis.dimension_scores" 
              :key="key"
              class="dimension-item"
            >
              <div class="dimension-header">
                <span class="dimension-name">{{ dim.dimension_name || key }}</span>
                <span class="dimension-score" :class="getDimensionScoreClass(dim.dimension_score || 3)">
                  {{ dim.dimension_score || 3 }}/5
                </span>
              </div>
              <el-progress 
                :percentage="(dim.dimension_score || 3) * 20" 
                :stroke-width="8"
                :color="getDimensionColor(dim.dimension_score || 3)"
              />
              <div class="dimension-details">
                <div v-if="dim.strengths?.length" class="detail-section">
                  <span class="detail-label">优势：</span>
                  <span>{{ dim.strengths.join('、') }}</span>
                </div>
                <div v-if="dim.weaknesses?.length" class="detail-section weakness">
                  <span class="detail-label">不足：</span>
                  <span>{{ dim.weaknesses.join('、') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 综合报告 -->
        <div v-if="selectedComprehensiveAnalysis.report" class="comprehensive-report-text">
          <h4>综合分析报告</h4>
          <div class="report-content" v-html="formatReportContent(selectedComprehensiveAnalysis.report)"></div>
        </div>
        
        <!-- 建议行动 -->
        <div v-if="selectedComprehensiveAnalysis.suggested_action" class="suggested-action">
          <h4>建议行动</h4>
          <div class="action-content">{{ selectedComprehensiveAnalysis.suggested_action }}</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showComprehensiveDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { TrophyBase, Plus } from '@element-plus/icons-vue'

// 组件导入
import { CandidateAnalysisCard } from '@/components/recommend'
import PositionList from '@/components/common/PositionList.vue'
import ResumeDetailDialog from '@/components/common/ResumeDetailDialog.vue'
import ImmersiveRecordsDialog from '@/components/recommend/ImmersiveRecordsDialog.vue'
import ImmersiveAnalysisReportDialog from '@/components/recommend/ImmersiveAnalysisReportDialog.vue'

// Composables
import { usePositionManagement } from '@/composables/usePositionManagement'

// API 导入
import { 
  getApplications, 
  getApplication,
  getAnalysis,
  createAnalysis,
  getScreeningTask,
  getStatsOverview
} from '@/api'
import axios from 'axios'
import type { ResumeData } from '@/types'
import type { 
  ApplicationDetailResponse,
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
    const applications = (result.data?.data?.items || []) as ApplicationDetailResponse[]
    currentApplications.value = applications
    
    // 加载沉浸式面试会话数据
    await loadImmersiveSessionsForApplications(applications)
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

// 跳转到沉浸式面试
const goToImmersive = (app: ApplicationDetailResponse) => {
  router.push('/immersive')
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
const showComprehensiveDialog = ref(false)
const selectedResumeContent = ref<string>('')
const selectedComprehensiveAnalysis = ref<ComprehensiveAnalysisResponse | null>(null)

// 沉浸式面试相关状态
const showImmersiveRecordsDialog = ref(false)
const showImmersiveReportDialog = ref(false)
const selectedImmersiveSession = ref<any>(null)
const selectedImmersiveReport = ref<any>(null)
const isLoadingImmersiveData = ref(false)
const immersiveSessionsMap = ref<Record<string, any>>({})

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
    showScreeningDialog.value = true
  } catch (err) {
    console.error('获取初筛报告失败:', err)
    ElMessage.error('获取初筛报告失败')
  }
}

// 获取应用的沉浸式会话数据
const getImmersiveSessionForApp = (appId: string) => {
  return immersiveSessionsMap.value[appId] || null
}

// 加载沉浸式面试会话列表（使用新API by-application）
const loadImmersiveSessionsForApplications = async (applications: ApplicationDetailResponse[]) => {
  for (const app of applications) {
    try {
      // 使用新API直接按application_id获取面试记录
      const response = await axios.get(`/api/v1/immersive/by-application/${app.id}/record`)
      const data = response.data?.data
      
      if (data) {
        immersiveSessionsMap.value[app.id] = {
          id: data.id,
          is_completed: data.is_completed,
          utterance_count: data.statistics?.utterance_count?.total || 0,
          has_final_analysis: true,
          // 缓存完整数据供后续使用
          _cachedData: data
        }
      }
    } catch (err: any) {
      // 404表示没有已完成的面试记录，不是错误
      if (err.response?.status !== 404) {
        console.error(`加载应用 ${app.id} 的沉浸式会话失败:`, err)
      }
    }
  }
}

// 查看沉浸式面试问答记录（使用新API by-application）
const viewImmersiveRecords = async (app: ApplicationDetailResponse) => {
  isLoadingImmersiveData.value = true
  showImmersiveRecordsDialog.value = true
  
  try {
    // 优先使用缓存数据
    const cachedSession = immersiveSessionsMap.value[app.id]
    let data = cachedSession?._cachedData
    
    // 如果没有缓存，重新请求
    if (!data) {
      const response = await axios.get(`/api/v1/immersive/by-application/${app.id}/record`)
      data = response.data?.data
    }
    
    if (data) {
      selectedImmersiveSession.value = {
        session_id: data.id,
        duration_seconds: data.duration_seconds || 0,
        start_time: data.start_time || data.created_at,
        candidate_info: {
          name: data.candidate_name || app.candidate_name || '未知',
          position_title: data.position_title || app.position_title || '未知'
        },
        statistics: data.statistics,
        conversation_history: data.conversation_history || []
      }
    } else {
      ElMessage.warning('暂无沉浸式面试记录')
      showImmersiveRecordsDialog.value = false
    }
  } catch (err: any) {
    console.error('获取沉浸式面试记录失败:', err)
    if (err.response?.status === 404) {
      ElMessage.warning('暂无已完成的沉浸式面试记录')
    } else {
      ElMessage.error('获取沉浸式面试记录失败')
    }
    showImmersiveRecordsDialog.value = false
  } finally {
    isLoadingImmersiveData.value = false
  }
}

// 查看沉浸式面试分析报告（需要从综合分析API获取心理分析数据）
const viewImmersiveReport = async (app: ApplicationDetailResponse) => {
  isLoadingImmersiveData.value = true
  showImmersiveReportDialog.value = true
  
  try {
    // 1. 获取面试记录基础数据
    const cachedSession = immersiveSessionsMap.value[app.id]
    let recordData = cachedSession?._cachedData
    
    if (!recordData) {
      const recordResponse = await axios.get(`/api/v1/immersive/by-application/${app.id}/record`)
      recordData = recordResponse.data?.data
    }
    
    if (!recordData) {
      ElMessage.warning('暂无沉浸式面试记录')
      showImmersiveReportDialog.value = false
      return
    }
    
    // 2. 尝试从综合分析获取心理分析数据
    let psychologicalAnalysis = null
    if (app.comprehensive_analysis?.id) {
      try {
        const analysisResult = await getAnalysis({ path: { analysis_id: app.comprehensive_analysis.id } })
        const analysisData = analysisResult.data?.data
        if (analysisData?.input_snapshot?.psychological_analysis) {
          psychologicalAnalysis = analysisData.input_snapshot.psychological_analysis
        }
      } catch (analysisErr) {
        console.warn('获取综合分析心理数据失败，将使用面试记录数据:', analysisErr)
      }
    }
    
    // 3. 如果没有综合分析，从面试记录的统计数据构建心理分析
    if (!psychologicalAnalysis && recordData.statistics) {
      const stats = recordData.statistics
      psychologicalAnalysis = {
        big_five: stats.big_five_average ? {
          scores: stats.big_five_average,
          personality_summary: '基于面试对话分析的大五人格评估',
          strengths: [],
          potential_concerns: [],
          work_style: '',
          team_fit: '',
          detailed_analysis: ''
        } : null,
        credibility: null,
        depression: stats.depression_average ? {
          overall_score: stats.depression_average.score,
          level: stats.depression_average.level,
          level_label: stats.depression_average.level === 'low' ? '低风险' : 
                       stats.depression_average.level === 'medium' ? '中等风险' : '高风险',
          level_distribution: null,
          interpretation: '基于面试对话的抑郁风险评估'
        } : null
      }
    }
    
    // 4. 构建报告数据
    selectedImmersiveReport.value = {
      session_id: recordData.id,
      duration_seconds: recordData.duration_seconds || 0,
      start_time: recordData.start_time || recordData.created_at,
      candidate_info: {
        name: recordData.candidate_name || app.candidate_name || '未知',
        position_title: recordData.position_title || app.position_title || '未知'
      },
      statistics: recordData.statistics,
      psychological_analysis: psychologicalAnalysis
    }
  } catch (err: any) {
    console.error('获取沉浸式面试分析报告失败:', err)
    if (err.response?.status === 404) {
      ElMessage.warning('暂无已完成的沉浸式面试记录')
    } else {
      ElMessage.error('获取沉浸式面试分析报告失败')
    }
    showImmersiveReportDialog.value = false
  } finally {
    isLoadingImmersiveData.value = false
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


// 综合分析详情相关函数
const getComprehensiveScoreClass = (score: number) => {
  if (score >= 85) return 'score-strong'
  if (score >= 70) return 'score-good'
  if (score >= 55) return 'score-cautious'
  return 'score-not'
}

const getDimensionScoreClass = (score: number) => {
  // 1-5 分制
  if (score >= 4) return 'dim-excellent'
  if (score >= 3) return 'dim-good'
  return 'dim-weak'
}

const getDimensionColor = (score: number) => {
  // 1-5 分制
  if (score >= 4) return '#10b981'
  if (score >= 3) return '#3b82f6'
  if (score >= 2) return '#f59e0b'
  return '#ef4444'
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatReportContent = (content: string) => {
  if (!content) return ''
  // 简单的 markdown 转 HTML
  return content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
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

.interview-records {
  max-height: 500px;
  overflow-y: auto;
  
  .message-item {
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 8px;
    
    &.interviewer {
      background: #ede9fe;
      
      .message-label {
        color: #667eea;
      }
    }
    
    &.candidate {
      background: #ecfdf5;
      
      .message-label {
        color: #10b981;
      }
    }
    
    .message-label {
      font-weight: 600;
      margin-right: 8px;
    }
    
    .message-content {
      color: #374151;
      line-height: 1.6;
    }
  }
}

.interview-report {
  .report-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
    
    .report-score {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      
      &.score-high {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }
      &.score-medium {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }
      &.score-low {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
      }
      
      .score-value {
        font-size: 24px;
        font-weight: 700;
      }
      
      .score-label {
        font-size: 12px;
        opacity: 0.9;
      }
    }
    
    .report-recommendation {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a2e;
    }
  }
  
  .report-summary {
    margin-bottom: 20px;
    
    h4 {
      margin: 0 0 8px;
      font-size: 14px;
      color: #6b7280;
    }
    
    .summary-content {
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }
  }
}

// 综合分析详情对话框样式
.comprehensive-analysis {
  .analysis-header {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 24px;
    padding: 20px;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border-radius: 16px;
    
    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      
      &.score-strong {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }
      &.score-good {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
      }
      &.score-cautious {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }
      &.score-not {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
      }
      
      .score-value {
        font-size: 32px;
        font-weight: 700;
      }
      
      .score-label {
        font-size: 14px;
        opacity: 0.9;
      }
    }
    
    .header-info {
      .recommendation-label {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 700;
        color: #1a1a2e;
      }
      
      .analysis-time {
        margin: 0;
        font-size: 13px;
        color: #6b7280;
      }
    }
  }
  
  .dimension-scores {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }
    
    .dimension-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .dimension-item {
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      
      .dimension-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        
        .dimension-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        
        .dimension-score {
          font-size: 14px;
          font-weight: 600;
          
          &.dim-excellent {
            color: #10b981;
          }
          &.dim-good {
            color: #3b82f6;
          }
          &.dim-weak {
            color: #f59e0b;
          }
        }
      }
      
      .dimension-details {
        margin-top: 12px;
        
        .detail-section {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
          line-height: 1.5;
          
          .detail-label {
            color: #10b981;
            font-weight: 500;
          }
          
          &.weakness .detail-label {
            color: #f59e0b;
          }
        }
      }
    }
  }
  
  .comprehensive-report-text {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }
    
    .report-content {
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      font-size: 14px;
      color: #374151;
      line-height: 1.8;
      
      p {
        margin: 0 0 12px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      strong {
        color: #1a1a2e;
      }
    }
  }
  
  .suggested-action {
    h4 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }
    
    .action-content {
      padding: 16px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 12px;
      font-size: 14px;
      color: #0369a1;
      line-height: 1.6;
    }
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
  
  .comprehensive-analysis .dimension-scores .dimension-grid {
    grid-template-columns: 1fr;
  }
}
</style>
