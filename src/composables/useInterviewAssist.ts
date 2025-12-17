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
  syncMessages,
  completeSession,
  aiGenerateInitialQuestions,
  aiGenerateAdaptiveQuestions,
  aiGenerateReport,
  aiSimulateCandidateAnswer,
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

// AI 模拟回答模板 - 根据候选人类型生成不同风格的回答
const answerTemplates: Record<string, Record<string, string[]>> = {
  ideal: {
    technical: [
      '在 {skill} 方面，我有 3 年以上的深度实践经验。比如在上一个项目中，我使用 {skill} 实现了高性能的数据处理模块，将处理效率提升了 60%。具体来说，我通过引入缓存机制和异步处理，优化了数据流转的各个环节。',
      '关于 {skill}，我认为它的核心优势在于组件化和声明式编程。在实际应用中，我会结合项目需求选择合适的设计模式，比如在复杂状态管理场景下，我会考虑使用状态机模式来提高代码的可维护性。',
      '这是个很好的问题。{skill} 我在多个生产项目中都有使用，印象最深的是一次性能优化工作，我通过分析性能瓶颈，采用懒加载和代码分割策略，最终将首屏加载时间从 3 秒降低到 800 毫秒。'
    ],
    project: [
      '我最自豪的项目是一个大型电商平台的重构。作为技术负责人，我主导了前端架构升级，引入了微前端方案，最终将页面加载速度提升 40%，同时支持多团队并行开发。这个过程中我学到了很多关于技术选型和团队协作的经验。',
      '在这个项目中，最大的挑战是数据一致性问题。我设计了基于事件溯源的解决方案，通过消息队列确保各服务间的数据同步，同时实现了优雅的降级策略，保证核心功能在部分服务不可用时仍能正常运行。',
      '我参与过一个日活百万级的社交应用开发，负责消息系统的设计与实现。我采用 WebSocket 实现实时通信，配合消息队列处理高并发场景，系统上线后稳定运行，消息延迟控制在 100ms 以内。'
    ],
    general: [
      '这是一个我经常思考的问题。我认为关键在于平衡技术选型和业务需求，同时保持代码的可维护性。具体到我的经验来说...',
      '我来分享一下我的思考。首先从问题本身来分析，然后结合我的实际经验给出解决方案...'
    ]
  },
  junior: {
    technical: [
      '关于 {skill}，我在学校课程和个人项目中学习过基础知识。虽然还没有太多生产环境的经验，但我对它的核心概念有一定理解，比如基本的语法和常用的 API。我很希望能在实际工作中深入学习。',
      '{skill} 我了解一些基础的内容，做过几个小的练习项目。我知道它的基本用法，但对于一些高级特性和最佳实践，可能还需要更多的学习和实践。',
      '说实话，{skill} 我接触的时间不是很长，大概有几个月。目前会写一些基础的代码，但遇到复杂问题可能还需要查文档或者请教同事。我正在通过在线课程持续学习。'
    ],
    project: [
      '我做过几个课程项目和一个毕业设计。毕业设计是一个小型的管理系统，用到了前后端分离的架构，虽然规模不大，但让我对完整的开发流程有了基本的认识。',
      '项目经验的话，主要是学校的团队项目和一些个人练习。我在团队项目中负责前端部分，学会了如何与后端同学配合，以及基本的版本控制流程。',
      '我参与过一个开源项目的贡献，虽然只是修复了一些小 bug 和文档问题，但这个经历让我学会了如何阅读他人代码和遵循项目规范。'
    ],
    general: [
      '这个问题我可能理解得不够深入，但从我目前的学习来看...',
      '我还在学习阶段，这个问题我只能从我有限的经验来回答...'
    ]
  },
  nervous: {
    technical: [
      '呃...{skill} 我用过一些，主要是在之前的项目里...其实我还是有一定经验的，就是...可能表达得不太好...我在项目中确实用它做过一些功能开发...',
      '这个...嗯...{skill} 我有学过，也在工作中使用过。我记得当时做过一个...等等让我想一下...是一个数据展示的功能，用到了它的一些特性...',
      '啊，{skill} 是吧...我...我是有使用经验的，可能现在有点紧张...平时工作中我经常用到，主要是做一些...嗯...组件开发之类的工作。'
    ],
    project: [
      '嗯...我参与过一些项目，就是...可能说得不太清楚...主要是做一些功能模块的开发。项目整体还挺顺利的，虽然中间遇到过一些问题...但最后都解决了...',
      '项目的话...让我想想...我之前负责过一个...就是那个...抱歉有点紧张...是一个订单管理模块，我主要做前端的部分，后来也帮忙做了一些接口对接...',
      '我...我其实做过挺多项目的，就是现在有点想不起来细节...最近一个是关于用户系统的，我负责登录和权限这块...做了大概两三个月...'
    ],
    general: [
      '这个问题...嗯...让我想一下怎么说比较好...',
      '抱歉，我可能有点紧张...这个问题的话...'
    ]
  },
  overconfident: {
    technical: [
      '{skill}？这个我太熟了！基本上没什么是我不会的，各种框架库我都用过，都是轻轻松松就能上手。你要问具体细节的话，那就太多了，我都能给你讲一天。',
      '说实话，{skill} 对我来说太简单了。我接触过的技术栈非常广，什么 Vue、React、Angular 我都精通，后端 Java、Python、Go 也都没问题。技术这东西，对我来说就是小菜一碟。',
      '{skill} 我不仅会用，还深入研究过源码，可以说是专家级别了。现在市面上大部分的技术问题我都能解决，很多时候同事有搞不定的问题都来找我。'
    ],
    project: [
      '我主导过很多大型项目，基本上核心架构都是我一个人设计的，其他人就是按我的设计来实现。没有我的话，那些项目估计都得黄。',
      '之前那个千万用户级别的项目，说实话主要就是靠我。技术方案是我定的，关键代码是我写的，遇到难题也是我解决的。我觉得我的能力在市场上绝对是顶尖的。',
      '我做过的项目太多了，随便拿一个出来都是业界标杆级别的。上一家公司的核心系统就是我从零搭建的，现在还在用呢，没人能改得动，因为太完美了。'
    ],
    general: [
      '这有什么难的？我告诉你正确答案...',
      '这问题太基础了，让我给你讲讲高级一点的思路...'
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

  // AI 模拟模式 - 生成候选人回答（调用后端API）
  const generateAIResponse = async (question: string): Promise<string> => {
    if (!selectedCandidate.value) return ''
    
    const candidateType = selectedCandidate.value.type
    
    // 如果有后端会话，调用后端AI生成
    if (sessionId.value) {
      try {
        const conversationHistory = messages.value
          .filter(m => m.role === 'interviewer' || m.role === 'candidate')
          .map(m => ({ role: m.role, content: m.content }))
        
        const result = await aiSimulateCandidateAnswer({
          body: {
            session_id: sessionId.value,
            question: question,
            candidate_type: candidateType,
            conversation_history: conversationHistory
          }
        })
        
        if (result.data?.data?.answer) {
          return result.data.data.answer as string
        }
      } catch (error) {
        console.error('AI模拟回答失败，使用本地模板:', error)
      }
    }
    
    // 回退到本地模板生成
    return generateLocalAIResponse(question, candidateType)
  }
  
  // 本地模板生成回答（作为后备方案）
  const generateLocalAIResponse = (question: string, candidateType: string): string => {
    const questionLower = question.toLowerCase()
    
    let category: 'technical' | 'project' | 'general' = 'general'
    if (questionLower.includes('项目') || questionLower.includes('经历') || questionLower.includes('案例') || questionLower.includes('经验')) {
      category = 'project'
    } else if (questionLower.includes('技术') || questionLower.includes('如何') || questionLower.includes('实现') || 
               questionLower.includes('原理') || questionLower.includes('框架') || questionLower.includes('语言')) {
      category = 'technical'
    }
    
    const candidateTemplates = answerTemplates[candidateType] || answerTemplates.ideal
    let templates = candidateTemplates?.[category] || candidateTemplates?.general || []
    
    if (templates.length === 0) {
      templates = answerTemplates.ideal?.[category] || answerTemplates.ideal?.general || []
    }
    
    const template = templates[Math.floor(Math.random() * templates.length)] || ''
    const skill = '相关技术'
    
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

  const getConversationHistory = () => {
    return messages.value
      .filter(m => m.role === 'interviewer' || m.role === 'candidate')
      .map(m => ({ role: m.role, content: m.content }))
  }

  const fetchAISuggestions = async (
    question: string,
    answer: string
  ): Promise<SuggestedQuestion[]> => {
    try {
      const result = await aiGenerateAdaptiveQuestions({
        body: {
          session_id: sessionId.value || undefined,
          current_question: question,
          current_answer: answer,
          conversation_history: getConversationHistory(),
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
      console.error('获取AI建议失败:', error)
      return generateLocalSuggestions(question, answer)
    }
  }

  const syncMessagesToBackend = async (): Promise<boolean> => {
    if (!sessionId.value) return false
    
    const qaMessages = messages.value
      .filter(m => m.role === 'interviewer' || m.role === 'candidate')
      .map(m => ({ role: m.role as 'interviewer' | 'candidate', content: m.content }))
    
    if (qaMessages.length === 0) return true
    
    try {
      await syncMessages({
        path: { session_id: sessionId.value },
        body: { messages: qaMessages }
      })
      return true
    } catch (error) {
      console.error('同步对话记录失败:', error)
      return false
    }
  }

  const recordQAAndGetSuggestions = async (
    question: string, 
    answer: string
  ): Promise<SuggestedQuestion[]> => {
    return await fetchAISuggestions(question, answer)
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

  const endAndSaveInterview = async () => {
    if (stats.startTime) {
      stats.duration = Math.round((Date.now() - stats.startTime.getTime()) / 1000 / 60)
    }
    
    addMessage('system', `面试已结束。共进行了 ${stats.totalQuestions} 个问题，${stats.totalFollowups} 次追问，用时 ${stats.duration} 分钟。`)
    
    if (sessionId.value) {
      ElMessage.info('正在保存面试记录...')
      const synced = await syncMessagesToBackend()
      if (!synced) {
        ElMessage.warning('对话记录保存失败')
      }
      
      try {
        await completeSession({ path: { session_id: sessionId.value } })
        ElMessage.success('面试报告已生成')
      } catch (error) {
        console.error('生成报告失败:', error)
        ElMessage.warning('报告生成失败')
      }
    }

    isInterviewActive.value = false
    isPaused.value = false
    sessionId.value = null
    questionPool.value = []
    
    ElMessage.success('面试已结束并保存')
  }

  const endAndSaveOnly = async () => {
    if (stats.startTime) {
      stats.duration = Math.round((Date.now() - stats.startTime.getTime()) / 1000 / 60)
    }
    
    addMessage('system', `面试已结束。共进行了 ${stats.totalQuestions} 个问题，${stats.totalFollowups} 次追问，用时 ${stats.duration} 分钟。`)
    
    if (sessionId.value) {
      const synced = await syncMessagesToBackend()
      if (!synced) {
        ElMessage.warning('对话记录保存失败')
      }
      
      try {
        await completeSession({ path: { session_id: sessionId.value } })
      } catch (error) {
        console.error('保存面试数据失败:', error)
        ElMessage.warning('数据保存失败')
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
      
      const response = await generateAIResponse(question)
      await simulateTyping(response, 'candidate')
      
      isAITyping.value = false
      
      // 生成问题建议（调用 LLM，失败时回退到本地模板）
      isLoadingQuestions.value = true
      suggestedQuestions.value = await fetchAISuggestions(question, response)
      isLoadingQuestions.value = false
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
