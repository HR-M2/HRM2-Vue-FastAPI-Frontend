/**
 * 面试辅助系统核心 composable
 * 支持 AI 模拟面试和真人实时语音面试两种模式
 */
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createInterviewSession,
  getInterviewSession,
  deleteInterviewSession,
  addMessage as addMessageApi,
  completeSession,
  aiGenerateInitialQuestions,
  aiGenerateAdaptiveQuestions,
  aiGenerateReport,
  getApplications,
  getResume
} from '@/api/sdk.gen'
import type { InterviewSessionResponse, QaMessage } from '@/api/types.gen'

// 类型定义
export interface Message {
  id: string
  role: 'interviewer' | 'candidate' | 'system'
  content: string
  timestamp: Date
  isFollowup?: boolean
  evaluation?: MessageEvaluation
  isTyping?: boolean
}

export interface MessageEvaluation {
  score: number
  recommendation: 'excellent' | 'good' | 'average' | 'needsImprovement'
  feedback: string
  confidenceLevel: 'genuine' | 'uncertain' | 'overconfident'
}

export interface SuggestedQuestion {
  id: string
  question: string
  type: 'followup' | 'alternative'
  angle?: string
  priority: number
}

export interface InterviewConfig {
  mode: 'ai-simulation' | 'live-interview'
  domain: string
  followupCount: number
  alternativeCount: number
  interestPointCount: number
}

export interface ResumeInterestPoint {
  id: string
  content: string
  question: string
  isAsked: boolean
}

export interface CandidateProfile {
  name: string
  type: 'ideal' | 'junior' | 'nervous' | 'overconfident' | 'random'
  skills: Record<string, number>
  personality: {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    neuroticism: number
  }
}

// AI 模拟候选人配置预设
export const candidatePresets: Record<string, CandidateProfile> = {
  ideal: {
    name: '理想候选人',
    type: 'ideal',
    skills: { 'JavaScript': 9, 'React': 8, 'Node.js': 8, 'TypeScript': 7, '系统设计': 8 },
    personality: { openness: 0.8, conscientiousness: 0.85, extraversion: 0.7, agreeableness: 0.75, neuroticism: 0.2 }
  },
  junior: {
    name: '初级候选人',
    type: 'junior',
    skills: { 'JavaScript': 5, 'React': 4, 'Node.js': 3, 'CSS': 5, 'HTML': 6 },
    personality: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.5, agreeableness: 0.8, neuroticism: 0.4 }
  },
  nervous: {
    name: '紧张型候选人',
    type: 'nervous',
    skills: { 'JavaScript': 7, 'React': 6, 'Node.js': 5, 'TypeScript': 5, 'Git': 6 },
    personality: { openness: 0.5, conscientiousness: 0.8, extraversion: 0.3, agreeableness: 0.7, neuroticism: 0.8 }
  },
  overconfident: {
    name: '过度自信型',
    type: 'overconfident',
    skills: { 'JavaScript': 6, 'React': 5, 'Node.js': 4, 'TypeScript': 4, 'AWS': 3 },
    personality: { openness: 0.7, conscientiousness: 0.5, extraversion: 0.9, agreeableness: 0.4, neuroticism: 0.3 }
  }
}

// AI 模拟回答模板
const answerTemplates: Record<string, Record<string, string[]>> = {
  ideal: {
    technical: [
      '在 {skill} 方面，我有 3 年以上的深度实践经验。比如在上一个项目中，我使用 {skill} 实现了高性能的数据处理模块，将处理效率提升了 60%。具体来说...',
      '关于 {skill}，我认为它的核心优势在于...在实际应用中，我会结合项目需求选择合适的设计模式...'
    ],
    project: [
      '我最自豪的项目是一个大型电商平台的重构。作为技术负责人，我主导了前端架构升级，引入了微前端方案，最终将页面加载速度提升 40%，同时支持多团队并行开发...',
      '在这个项目中，最大的挑战是数据一致性问题。我设计了基于事件溯源的解决方案...'
    ]
  },
  nervous: {
    technical: [
      '呃...{skill} 我用过一些，主要是在学校的项目里...可能还不太熟练...',
      '这个...我有学过 {skill}，但是实际经验不是很多，可能需要一些时间来适应...'
    ],
    project: [
      '嗯...我参与过一些项目，主要是做一些功能开发...可能规模不是很大...',
      '项目的话...主要是跟着导师做的，我负责的部分是...'
    ]
  },
  overconfident: {
    technical: [
      '{skill}？这个我精通！基本上没有什么是我不会的，各种框架库我都用过，轻松驾驭！',
      '说实话，{skill} 对我来说太简单了，我可以快速上手任何新技术，这不是问题。'
    ],
    project: [
      '我主导过很多大型项目，基本上都是我一个人搞定核心架构，其他人只是打下手。',
      '那个项目完全是靠我带起来的，如果没有我的技术决策，项目根本不可能成功。'
    ]
  }
}

// 追问模板
const followupTemplates = [
  '您刚才提到的 {point}，能否更详细地说明具体实现方式？',
  '关于 {point}，您能举一个具体的数据或案例来支撑吗？',
  '您提到 {point}，那么在实际中遇到 {challenge} 时如何处理？',
  '能否深入解释一下 {point} 的技术细节？'
]

// 候选问题模板
const alternativeQuestionTemplates = [
  { angle: '深度探索', template: '如果要从底层原理角度来理解您的方案，您会如何解释？' },
  { angle: '实际案例', template: '能否分享一个具体的案例来说明您的观点？' },
  { angle: '反向思考', template: '如果重新做这个决定，您会有什么不同的选择？' },
  { angle: '团队协作', template: '在这个过程中，您是如何与团队其他成员协作的？' },
  { angle: '问题解决', template: '遇到最大的困难是什么？您是如何克服的？' }
]

export function useInterviewAssist() {
  // 配置状态
  const config = reactive<InterviewConfig>({
    mode: 'ai-simulation',
    domain: 'tech',
    followupCount: 2,
    alternativeCount: 3,
    interestPointCount: 2
  })

  // 会话状态
  const sessionId = ref<string | null>(null)
  const applicationId = ref<string | null>(null)
  const sessionData = ref<InterviewSessionResponse | null>(null)
  const questionPool = ref<string[]>([])
  const resumeHighlights = ref<string[]>([])

  // 面试状态
  const isInterviewActive = ref(false)
  const isPaused = ref(false)
  const messages = ref<Message[]>([])
  const currentQuestion = ref('')
  const isProcessing = ref(false)
  const isRecording = ref(false)

  // AI 模拟状态
  const selectedCandidate = ref<CandidateProfile | null>(null)
  const isAITyping = ref(false)

  // 问题建议状态
  const suggestedQuestions = ref<SuggestedQuestion[]>([])
  const showSuggestions = ref(false)
  const isLoadingQuestions = ref(false)
  const isWaitingForAnswer = ref(false)
  
  // 简历兴趣点状态
  const interestPoints = ref<ResumeInterestPoint[]>([])

  // 统计数据
  const stats = reactive({
    totalQuestions: 0,
    totalFollowups: 0,
    averageScore: 0,
    startTime: null as Date | null,
    duration: 0
  })

  // 生成唯一 ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 更新配置
  const updateConfig = (updates: Partial<InterviewConfig>) => {
    Object.assign(config, updates)
  }

  // 添加消息
  const addMessage = (
    role: Message['role'],
    content: string,
    options?: Partial<Message>
  ) => {
    const message: Message = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      ...options
    }
    messages.value.push(message)
    return message
  }

  // 模拟打字效果
  const simulateTyping = async (content: string, role: Message['role']) => {
    const message = addMessage(role, '', { isTyping: true })
    const messageIndex = messages.value.length - 1
    const chars = content.split('')
    
    for (let i = 0; i < chars.length; i++) {
      const current = messages.value[messageIndex]!
      messages.value[messageIndex] = {
        ...current,
        content: current.content + chars[i]
      }
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30))
    }
    
    const final = messages.value[messageIndex]!
    messages.value[messageIndex] = {
      ...final,
      isTyping: false
    }
    return messages.value[messageIndex]!
  }

  // 生成本地建议（后端不可用时使用）
  const generateLocalSuggestions = (
    questionContext: string,
    answerContext: string
  ): SuggestedQuestion[] => {
    const suggestions: SuggestedQuestion[] = []
    
    // 生成追问
    const keywords = answerContext.match(/[\u4e00-\u9fa5a-zA-Z]+/g)?.slice(0, 3) || ['这个问题']
    for (let i = 0; i < config.followupCount; i++) {
      const template = followupTemplates[i % followupTemplates.length]
      const point = keywords[i % keywords.length] || '这个问题'
      suggestions.push({
        id: generateId(),
        question: template?.replace('{point}', point).replace('{challenge}', '性能瓶颈') || '',
        type: 'followup',
        priority: i + 1
      })
    }
    
    // 生成候选问题
    const shuffled = [...alternativeQuestionTemplates].sort(() => Math.random() - 0.5)
    for (let i = 0; i < config.alternativeCount; i++) {
      const item = shuffled[i]
      if (item) {
        suggestions.push({
          id: generateId(),
          question: item.template,
          type: 'alternative',
          angle: item.angle,
          priority: config.followupCount + i + 1
        })
      }
    }
    
    return suggestions
  }

  // 设置兴趣点
  const setInterestPoints = (points: Array<{ content: string; question: string }>) => {
    interestPoints.value = points.slice(0, config.interestPointCount).map((p, index) => ({
      id: `interest_${Date.now()}_${index}`,
      content: p.content,
      question: p.question,
      isAsked: false
    }))
  }
  
  // 使用兴趣点提问
  const askInterestPointQuestion = (pointId: string) => {
    const point = interestPoints.value.find(p => p.id === pointId)
    if (point && !point.isAsked) {
      point.isAsked = true
      askQuestion(point.question)
    }
  }

  // 本地生成模拟兴趣点
  const generateLocalInterestPoints = () => {
    const mockInterestPoints = [
      {
        content: '项目管理经验',
        question: '请详细介绍您在项目管理方面的经验，特别是如何处理项目延期或资源冲突的情况？'
      },
      {
        content: '技术架构能力',
        question: '您在简历中提到参与过系统架构设计，能否具体说明您做了哪些架构决策及其原因？'
      },
      {
        content: '团队协作',
        question: '请分享一个您在团队中解决冲突或推动协作的具体案例？'
      }
    ]
    setInterestPoints(mockInterestPoints.slice(0, config.interestPointCount))
  }

  // 评估回答（本地模拟）
  const evaluateAnswerLocal = (answer: string): MessageEvaluation => {
    const length = answer.length
    const hasNumbers = /\d+/.test(answer)
    const hasSpecificTerms = /项目|技术|实现|优化|提升|方案|架构/.test(answer)
    
    let score = 50
    let recommendation: MessageEvaluation['recommendation'] = 'average'
    let confidenceLevel: MessageEvaluation['confidenceLevel'] = 'genuine'
    
    if (length > 200 && hasSpecificTerms) {
      score = 75 + Math.random() * 20
      recommendation = score > 85 ? 'excellent' : 'good'
    } else if (length > 100) {
      score = 60 + Math.random() * 15
      recommendation = 'good'
    } else if (length < 50) {
      score = 30 + Math.random() * 20
      recommendation = 'needsImprovement'
    }
    
    if (hasNumbers) score += 5
    
    if (/精通|轻松|简单|没问题|都会/.test(answer) && length < 100) {
      confidenceLevel = 'overconfident'
      score -= 10
    }
    
    if (/可能|也许|不太确定|大概/.test(answer)) {
      confidenceLevel = 'uncertain'
    }
    
    const feedbacks = {
      excellent: '回答非常专业，有具体案例支撑，展现了深厚的技术功底',
      good: '回答较为完整，建议可以补充更多具体数据或案例',
      average: '回答基本到位，但深度不足，建议追问以了解更多细节',
      needsImprovement: '回答过于简略，需要进一步挖掘候选人能力'
    }
    
    return {
      score: Math.min(100, Math.max(0, score)),
      recommendation,
      feedback: feedbacks[recommendation],
      confidenceLevel
    }
  }

  // AI 模拟模式 - 生成候选人回答
  const generateAIResponse = async (question: string): Promise<string> => {
    if (!selectedCandidate.value) return ''
    
    const type = selectedCandidate.value.type
    const category = question.includes('项目') ? 'project' : 'technical'
    const templates = answerTemplates[type]?.[category] || answerTemplates.ideal?.technical || []
    const template = templates[Math.floor(Math.random() * templates.length)] || ''
    
    const skills = Object.keys(selectedCandidate.value.skills)
    const skill = skills[Math.floor(Math.random() * skills.length)] || 'JavaScript'
    
    return template.replace(/{skill}/g, skill)
  }

  // 创建后端会话
  const createSession = async (appId: string): Promise<boolean> => {
    try {
      const result = await createInterviewSession({
        body: {
          application_id: appId,
          interview_type: 'live',
          config: {
            followupCount: config.followupCount,
            alternativeCount: config.alternativeCount,
            interestPointCount: config.interestPointCount
          }
        }
      })
      
      if (result.data?.data) {
        sessionId.value = result.data.data.id
        applicationId.value = appId
        sessionData.value = result.data.data
        return true
      }
      return false
    } catch (error) {
      console.error('创建会话失败:', error)
      ElMessage.warning('后端服务不可用，将使用本地模拟模式')
      return false
    }
  }

  // 从后端获取问题池和兴趣点
  const fetchQuestionPool = async (resumeContent?: string): Promise<void> => {
    if (isLoadingQuestions.value) return
    
    isLoadingQuestions.value = true
    
    if (!sessionId.value) {
      generateLocalInterestPoints()
      isLoadingQuestions.value = false
      return
    }

    try {
      const result = await aiGenerateInitialQuestions({
        body: {
          session_id: sessionId.value,
          resume_content: resumeContent,
          count: config.alternativeCount,
          interest_point_count: config.interestPointCount
        }
      })
      
      if (result.data?.data) {
        const data = result.data.data as Record<string, unknown>
        if (Array.isArray(data.questions)) {
          questionPool.value = data.questions.map((q: { question?: string }) => q.question || '')
          suggestedQuestions.value = data.questions.map((q: { question?: string }, i: number) => ({
            id: generateId(),
            question: q.question || '',
            type: 'alternative' as const,
            angle: '简历相关',
            priority: i + 1
          }))
          showSuggestions.value = true
        }
        if (Array.isArray(data.interest_points)) {
          setInterestPoints(data.interest_points as Array<{ content: string; question: string }>)
        } else {
          generateLocalInterestPoints()
        }
      }
    } catch (error) {
      console.error('获取问题池失败:', error)
      generateLocalInterestPoints()
    } finally {
      isLoadingQuestions.value = false
    }
  }

  // 记录问答并获取候选问题
  const recordQAAndGetSuggestions = async (
    question: string, 
    answer: string
  ): Promise<SuggestedQuestion[]> => {
    if (!sessionId.value) {
      return generateLocalSuggestions(question, answer)
    }

    try {
      // 记录问答消息到后端
      await addMessageApi({
        path: { session_id: sessionId.value },
        body: { role: 'interviewer', content: question }
      })
      await addMessageApi({
        path: { session_id: sessionId.value },
        body: { role: 'candidate', content: answer }
      })

      // 获取候选问题
      const result = await aiGenerateAdaptiveQuestions({
        body: {
          current_question: question,
          current_answer: answer,
          followup_count: config.followupCount,
          alternative_count: config.alternativeCount
        }
      })

      if (result.data?.data) {
        const data = result.data.data as Record<string, unknown>
        const suggestions: SuggestedQuestion[] = []
        
        if (Array.isArray(data.followups)) {
          data.followups.forEach((q: { question?: string; purpose?: string }, i: number) => {
            suggestions.push({
              id: generateId(),
              question: q.question || '',
              type: 'followup',
              priority: i + 1
            })
          })
        }
        
        if (Array.isArray(data.alternatives)) {
          data.alternatives.forEach((q: { question?: string; angle?: string }, i: number) => {
            suggestions.push({
              id: generateId(),
              question: q.question || '',
              type: 'alternative',
              angle: q.angle || '其他',
              priority: config.followupCount + i + 1
            })
          })
        }
        
        return suggestions.length > 0 ? suggestions : generateLocalSuggestions(question, answer)
      }
      
      return generateLocalSuggestions(question, answer)
    } catch (error) {
      console.error('记录问答失败:', error)
      return generateLocalSuggestions(question, answer)
    }
  }

  // 开始面试
  const startInterview = async (candidateType?: string) => {
    isInterviewActive.value = true
    isPaused.value = false
    messages.value = []
    stats.startTime = new Date()
    stats.totalQuestions = 0
    stats.totalFollowups = 0
    
    if (config.mode === 'ai-simulation' && candidateType) {
      selectedCandidate.value = candidatePresets[candidateType] || null
    }
    
    // 开场白
    const greeting = config.mode === 'ai-simulation' && selectedCandidate.value
      ? `你好${selectedCandidate.value.name}，欢迎参加今天的面试。我是您的面试官，我们现在开始吧。`
      : '面试已开始，请面试官提问。系统将在候选人回答后自动推荐追问和候选问题。'
    
    addMessage('system', greeting)
    
    // 真人面试模式：获取问题池
    if (config.mode === 'live-interview' && sessionId.value && questionPool.value.length === 0) {
      await fetchQuestionPool()
    }
    
    if (questionPool.value.length > 0) {
      addMessage('system', `已根据简历生成 ${questionPool.value.length} 个候选问题，可从问题池中选择或自由提问。`)
    }
    
    ElMessage.success('面试已开始')
  }

  // 暂停面试
  const pauseInterview = () => {
    isPaused.value = true
    ElMessage.info('面试已暂停')
  }

  // 继续面试
  const resumeInterview = () => {
    isPaused.value = false
    ElMessage.info('面试继续')
  }

  // 放弃面试
  const quitInterview = async () => {
    // 删除后端会话
    if (sessionId.value) {
      try {
        await deleteInterviewSession({ path: { session_id: sessionId.value } })
      } catch (e) {
        console.warn('删除会话失败:', e)
      }
    }
    
    isInterviewActive.value = false
    isPaused.value = false
    sessionId.value = null
    questionPool.value = []
    messages.value = []
    suggestedQuestions.value = []
    showSuggestions.value = false
    
    ElMessage.warning('面试已放弃')
  }

  // 结束面试并保存（生成报告）
  const endAndSaveInterview = async () => {
    if (stats.startTime) {
      stats.duration = Math.round((Date.now() - stats.startTime.getTime()) / 1000 / 60)
    }
    
    addMessage('system', `面试已结束。共进行了 ${stats.totalQuestions} 个问题，${stats.totalFollowups} 次追问，用时 ${stats.duration} 分钟。`)
    
    // 生成报告
    if (sessionId.value) {
      ElMessage.info('正在生成面试报告...')
      try {
        await completeSession({
          path: { session_id: sessionId.value }
        })
        ElMessage.success('面试报告已生成')
      } catch (error) {
        console.error('生成报告失败:', error)
        ElMessage.warning('面试已结束，但报告生成失败')
      }
    }

    isInterviewActive.value = false
    isPaused.value = false
    sessionId.value = null
    questionPool.value = []
    
    ElMessage.success('面试已结束并保存')
  }

  // 结束面试（仅保存，不生成报告）
  const endAndSaveOnly = async () => {
    if (stats.startTime) {
      stats.duration = Math.round((Date.now() - stats.startTime.getTime()) / 1000 / 60)
    }
    
    addMessage('system', `面试已结束。共进行了 ${stats.totalQuestions} 个问题，${stats.totalFollowups} 次追问，用时 ${stats.duration} 分钟。`)
    
    // 调用后端 API 保存面试数据（完成会话）
    if (sessionId.value) {
      try {
        await completeSession({
          path: { session_id: sessionId.value }
        })
      } catch (error) {
        console.error('保存面试数据失败:', error)
        ElMessage.warning('面试已结束，但数据保存失败')
      }
    }
    
    isInterviewActive.value = false
    isPaused.value = false
    sessionId.value = null
    questionPool.value = []
    
    ElMessage.success('面试已结束并保存')
  }

  // 兼容旧代码
  const endInterview = endAndSaveInterview

  // 面试官提问
  const askQuestion = async (question: string) => {
    if (!isInterviewActive.value || isPaused.value) return
    
    currentQuestion.value = question
    showSuggestions.value = false
    stats.totalQuestions++
    
    await simulateTyping(question, 'interviewer')
    
    // 真人面试模式：设置等待候选人回答状态
    if (config.mode === 'live-interview') {
      isWaitingForAnswer.value = true
    }
    
    // AI 模拟模式：自动生成候选人回答
    if (config.mode === 'ai-simulation' && selectedCandidate.value) {
      isAITyping.value = true
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
      
      const response = await generateAIResponse(question)
      const message = await simulateTyping(response, 'candidate')
      
      // 评估回答
      const evaluation = evaluateAnswerLocal(response)
      if (message) {
        message.evaluation = evaluation
      }
      
      isAITyping.value = false
      
      // 生成问题建议
      suggestedQuestions.value = generateLocalSuggestions(question, response)
      showSuggestions.value = true
    }
  }

  // 提交候选人回答（真人面试模式）
  const submitAnswer = async (answer: string) => {
    if (!isInterviewActive.value || isPaused.value) return
    
    isWaitingForAnswer.value = false
    isLoadingQuestions.value = true
    
    addMessage('candidate', answer)
    
    // 记录问答并获取建议
    const suggestions = await recordQAAndGetSuggestions(currentQuestion.value, answer)
    suggestedQuestions.value = suggestions
    showSuggestions.value = true
    isLoadingQuestions.value = false
  }

  // 使用建议的问题
  const useSuggestedQuestion = (suggestion: SuggestedQuestion) => {
    if (suggestion.type === 'followup') {
      stats.totalFollowups++
    }
    askQuestion(suggestion.question)
  }

  // 清除建议
  const clearSuggestions = () => {
    showSuggestions.value = false
  }

  // 导出面试记录
  const exportRecord = () => {
    const record = {
      date: new Date().toISOString(),
      mode: config.mode,
      candidate: selectedCandidate.value?.name || '真人候选人',
      messages: messages.value.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      })),
      stats: { ...stats }
    }
    
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview_record_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('面试记录已导出')
  }

  return {
    // 配置
    config,
    updateConfig,
    
    // 状态
    isInterviewActive,
    isPaused,
    messages,
    isRecording,
    isAITyping,
    selectedCandidate,
    sessionId,
    applicationId,
    
    // 问题建议
    suggestedQuestions,
    showSuggestions,
    isLoadingQuestions,
    isWaitingForAnswer,
    interestPoints,
    questionPool,
    
    // 统计
    stats,
    
    // 方法
    createSession,
    fetchQuestionPool,
    startInterview,
    pauseInterview,
    resumeInterview,
    quitInterview,
    endAndSaveInterview,
    endAndSaveOnly,
    endInterview,
    askQuestion,
    submitAnswer,
    useSuggestedQuestion,
    askInterestPointQuestion,
    clearSuggestions,
    exportRecord
  }
}
