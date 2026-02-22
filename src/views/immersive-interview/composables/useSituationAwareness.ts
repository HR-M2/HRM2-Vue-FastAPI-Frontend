import { ref, watch, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { SituationAssessment, QuestionSuggestion as SAPanelSuggestion, InterestPoint } from '../components/SituationAwarenessPanel.vue'

interface SituationAwarenessDeps {
  sessionId: Ref<string | null>
  messages: Ref<Array<{ role: string; content: string; [key: string]: any }>>
  isLeftPanelExpanded: Ref<boolean>
  isFullscreen: Ref<boolean>
  currentStage: Ref<number>
  currentStageConfig: Ref<{ name?: string; description?: string } | null>
  stages: Ref<Array<{ name: string; description: string; [key: string]: any }>>
  config: { followupCount: number; alternativeCount: number; interestPointCount: number; [key: string]: any }
  autoStageSwitch: Ref<boolean>
  advanceStage: () => void
  addInterviewerMessage: (content: string) => void
  syncMessages: () => any
  analysisPanelRef: Ref<{ setQuestionInput: (text: string) => void } | null>
  applications: Ref<Array<{ id: string; resume_id?: string; [key: string]: any }>>
  selectedApplicationId: Ref<string>
}

/**
 * 态势感知 composable
 * 封装局面评估、提问建议、简历兴趣点等逻辑
 */
export function useSituationAwareness(deps: SituationAwarenessDeps) {
  const {
    sessionId,
    messages,
    isLeftPanelExpanded,
    isFullscreen,
    currentStage,
    currentStageConfig,
    stages,
    config,
    autoStageSwitch,
    advanceStage,
    addInterviewerMessage,
    syncMessages,
    analysisPanelRef,
    applications,
    selectedApplicationId
  } = deps

  // 态势感知数据
  const situationAssessment = ref<SituationAssessment>({
    assessment: ''
  })
  const situationSuggestions = ref<SAPanelSuggestion[]>([])
  const isLoadingAssessment = ref(false)
  const isLoadingSuggestions = ref(false)
  const autoRefreshEnabled = ref(false)

  // 简历兴趣点（面试开始前生成一次）
  const interestPoints = ref<InterestPoint[]>([])
  const isLoadingInterestPoints = ref(false)

  // 解析局面评估文本，分离显示内容和切换指示
  const parseAssessmentResponse = (rawAssessment: string): { displayText: string; shouldSwitch: boolean } => {
    const marker = '---STAGE_SWITCH---'
    const parts = rawAssessment.split(marker)
    
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const displayText = parts[0].trim()
      const switchPart = parts[1].trim().toUpperCase()
      const shouldSwitch = switchPart.startsWith('YES')
      return { displayText, shouldSwitch }
    }
    
    return { displayText: rawAssessment.trim(), shouldSwitch: false }
  }

  // 刷新局面评估（仅在面板展开时调用，支持无对话时基于简历评估）
  const handleRefreshAssessment = async () => {
    if ((!isLeftPanelExpanded.value && !isFullscreen.value) || !sessionId.value) return
    
    isLoadingAssessment.value = true
    try {
      const conversationHistory = messages.value.map(m => ({
        role: m.role,
        content: m.content
      }))
      
      const response = await fetch(`/api/v1/ai/interview/situation-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId.value,
          conversation_history: conversationHistory,
          current_stage_index: currentStage.value,
          current_stage_name: currentStageConfig.value?.name || '开场寒暄',
          total_stages: stages.value.length || 4,
          all_stages: stages.value.map(s => ({ name: s.name, description: s.description }))
        })
      })
      
      const result = await response.json()
      if (result.success && result.data?.assessment) {
        const { displayText, shouldSwitch } = parseAssessmentResponse(result.data.assessment)
        
        // 只显示前两段给 HR
        situationAssessment.value = { assessment: displayText }
        
        // 自动切换环节（如果开启且 LLM 建议切换且未到最后一个环节）
        if (autoStageSwitch.value && shouldSwitch && currentStage.value < stages.value.length) {
          advanceStage()
          ElMessage.success(`已自动进入下一环节：${currentStageConfig.value?.name || ''}`)
        }
      }
    } catch (error) {
      console.error('获取局面评估失败:', error)
    } finally {
      isLoadingAssessment.value = false
    }
  }

  // 刷新提问建议（仅在面板展开时调用，支持无对话时生成开场建议）
  const handleRefreshSituationSuggestions = async () => {
    if ((!isLeftPanelExpanded.value && !isFullscreen.value) || !sessionId.value) return
    
    isLoadingSuggestions.value = true
    try {
      // 获取最近的候选人回答（无对话时为空字符串）
      const lastAnswer = [...messages.value].reverse().find((m: { role: string }) => m.role === 'candidate')?.content || ''
      
      const conversationHistory = messages.value.map(m => ({
        role: m.role,
        content: m.content
      }))
      
      const response = await fetch(`/api/v1/ai/interview/adaptive-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId.value,
          current_answer: lastAnswer,
          conversation_history: conversationHistory,
          followup_count: config.followupCount,
          normal_count: config.alternativeCount,
          current_stage_name: currentStageConfig.value?.name || '开场寒暄',
          current_stage_description: currentStageConfig.value?.description || ''
        })
      })
      
      const result = await response.json()
      if (result.success && result.data) {
        const suggestions: SAPanelSuggestion[] = []
        
        // 追问
        if (result.data.followups) {
          result.data.followups.forEach((q: { question: string; purpose?: string }, i: number) => {
            suggestions.push({
              question: q.question,
              type: 'followup',
              purpose: q.purpose,
              priority: i + 1
            })
          })
        }
        
        // 候选问题
        if (result.data.alternatives) {
          result.data.alternatives.forEach((q: { question: string; purpose?: string }, i: number) => {
            suggestions.push({
              question: q.question,
              type: 'alternative',
              purpose: q.purpose,
              priority: i + 10
            })
          })
        }
        
        situationSuggestions.value = suggestions
      }
    } catch (error) {
      console.error('获取建议失败:', error)
    } finally {
      isLoadingSuggestions.value = false
    }
  }

  // 使用态势面板的建议（直接发送）
  const handleUseSituationSuggestion = (suggestion: SAPanelSuggestion) => {
    addInterviewerMessage(suggestion.question)
    syncMessages()
    ElMessage.success('已添加问题到对话')
  }

  // 使用简历兴趣点（直接发送问题）
  const handleUseInterestPoint = (point: InterestPoint) => {
    if (point.question) {
      addInterviewerMessage(point.question)
      syncMessages()
      ElMessage.success('已添加兴趣点问题到对话')
    }
  }

  // 编辑简历兴趣点（添加到输入框）
  const handleEditInterestPoint = (point: InterestPoint) => {
    if (point.question) {
      analysisPanelRef.value?.setQuestionInput(point.question)
      ElMessage.info('已添加到输入框，可编辑后发送')
    }
  }

  // 编辑态势面板的建议（添加到输入框）
  const handleEditSituationSuggestion = (suggestion: SAPanelSuggestion) => {
    analysisPanelRef.value?.setQuestionInput(suggestion.question)
    ElMessage.info('已添加到输入框，可编辑后发送')
  }

  // 生成简历兴趣点和初始问题
  const generateInterestPoints = async () => {
    if (!sessionId.value) return
    
    isLoadingInterestPoints.value = true
    try {
      // 获取候选人简历内容
      const selectedApp = applications.value.find(app => app.id === selectedApplicationId.value)
      if (!selectedApp?.resume_id) {
        console.warn('未找到简历ID')
        return
      }
      
      const response = await fetch(`/api/v1/ai/interview/initial-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId.value,
          interest_point_count: config.interestPointCount
        })
      })
      
      const result = await response.json()
      if (result.success && result.data) {
        // 存储兴趣点
        if (result.data.interest_points) {
          interestPoints.value = result.data.interest_points.map((p: any) => ({
            source: p.source || '',
            question: p.question || ''
          }))
        }
        ElMessage.success(`已生成 ${interestPoints.value.length} 个简历兴趣点`)
      }
    } catch (error) {
      console.error('生成兴趣点失败:', error)
    } finally {
      isLoadingInterestPoints.value = false
    }
  }

  // 监听消息变化，自动刷新态势感知
  watch(
    () => messages.value.length,
    (newLen, oldLen) => {
      if (newLen > oldLen && autoRefreshEnabled.value && isLeftPanelExpanded.value) {
        const lastMsg = messages.value[messages.value.length - 1]
        if (lastMsg?.role === 'candidate') {
          // 候选人回答完成，自动刷新评估和建议
          handleRefreshAssessment()
          handleRefreshSituationSuggestions()
        }
      }
    }
  )

  return {
    // 状态
    situationAssessment,
    situationSuggestions,
    isLoadingAssessment,
    isLoadingSuggestions,
    autoRefreshEnabled,
    interestPoints,
    isLoadingInterestPoints,
    // 方法
    handleRefreshAssessment,
    handleRefreshSituationSuggestions,
    handleUseSituationSuggestion,
    handleUseInterestPoint,
    handleEditInterestPoint,
    handleEditSituationSuggestion,
    generateInterestPoints
  }
}
