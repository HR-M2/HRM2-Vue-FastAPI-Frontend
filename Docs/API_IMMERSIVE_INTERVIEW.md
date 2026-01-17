# 沉浸式面试 API 数据结构文档

## 概述

本文档描述了沉浸式面试功能相关的API接口数据结构，包括请求格式和响应格式。

## 基础信息

- **API 基础路径**: `/api/v1/immersive`
- **内容类型**: `application/json`
- **代理配置**: 前端请求通过 Vite 代理转发到 `http://127.0.0.1:8000`

## API 接口

### 1. 创建沉浸式面试会话

创建一个新的沉浸式面试会话。

**请求**:
```http
POST /api/v1/immersive
Content-Type: application/json
```

**请求体**:
```typescript
{
  application_id: string           // 候选人申请ID (必需)
  local_camera_enabled: boolean    // 是否启用本地摄像头 (必需)
  stream_url: string | null        // 推流地址，可选
  config: {
    autoAnalyze: boolean          // 是否自动分析
    analyzeInterval: number       // 分析间隔（秒）
  }
}
```

**响应**:
```typescript
{
  success: boolean
  data?: {
    id: string                    // 会话ID
    application_id: string        // 申请ID
    local_camera_enabled: boolean // 本地摄像头状态
    stream_url: string | null     // 推流地址
    config: object               // 配置信息
    is_recording: boolean        // 是否正在录制
    is_completed: boolean        // 是否已完成
    transcripts: Transcript[]    // 转录记录
    speaker_segments: SpeakerSegment[] // 说话人片段
    state_history: CandidateState[]    // 状态历史
    duration_seconds: number     // 持续时间（秒）
    interviewer_speak_ratio: number    // 面试官说话比例
    candidate_speak_ratio: number      // 候选人说话比例
    final_analysis: object | null      // 最终分析结果
    candidate_name: string | null      // 候选人姓名
    position_title: string | null      // 岗位标题
  }
  message?: string               // 错误信息（失败时）
}
```

### 2. 开始面试

开始录制面试会话。

**请求**:
```http
POST /api/v1/immersive/{sessionId}/start
```

**响应**:
```typescript
{
  success: boolean
  message?: string               // 错误信息（失败时）
}
```

### 3. 停止面试

停止录制面试会话。

**请求**:
```http
POST /api/v1/immersive/{sessionId}/stop
```

**响应**:
```typescript
{
  success: boolean
  message?: string               // 错误信息（失败时）
}
```

### 4. 获取问题建议

获取基于当前面试状态的问题建议。

**请求**:
```http
GET /api/v1/immersive/{sessionId}/suggestions
```

**响应**:
```typescript
{
  success: boolean
  data?: {
    suggestions: QuestionSuggestion[]
  }
  message?: string               // 错误信息（失败时）
}
```

**QuestionSuggestion 类型**:
```typescript
interface QuestionSuggestion {
  question: string               // 问题内容
  type: 'followup' | 'alternative' | 'probe' // 问题类型
  priority: number               // 优先级（数字越小优先级越高）
  reason?: string                // 推荐原因（可选）
}
```

### 5. 获取面试洞察

获取面试过程中的洞察信息。

**请求**:
```http
GET /api/v1/immersive/{sessionId}/insights
```

**响应**:
```typescript
{
  success: boolean
  data?: {
    insights: InterviewInsight[]
  }
  message?: string               // 错误信息（失败时）
}
```

### 6. 添加转录文本

添加面试转录文本。

**请求**:
```http
POST /api/v1/immersive/{sessionId}/transcript?speaker={speaker}&text={text}&is_final={isFinal}
```

**参数**:
- `speaker`: `'interviewer' | 'candidate'` - 说话人
- `text`: `string` - 转录文本（URL编码）
- `is_final`: `boolean` - 是否为最终结果

**响应**:
```typescript
{
  success: boolean
  data?: Transcript
  message?: string               // 错误信息（失败时）
}
```

### 7. 生成面试报告

生成面试结束后的报告。

**请求**:
```http
POST /api/v1/immersive/{sessionId}/generate-report
```

**响应**:
```typescript
{
  success: boolean
  data?: {
    report: Record<string, unknown> // 报告数据
  }
  message?: string               // 错误信息（失败时）
}
```

### 8. 删除会话

删除面试会话。

**请求**:
```http
DELETE /api/v1/immersive/{sessionId}
```

**响应**:
```typescript
{
  success: boolean
  message?: string               // 错误信息（失败时）
}
```

## 数据类型定义

### Transcript (转录记录)
```typescript
interface Transcript {
  speaker: 'interviewer' | 'candidate' | 'unknown'
  text: string
  timestamp: string
  is_final: boolean
}
```

### SpeakerSegment (说话人片段)
```typescript
interface SpeakerSegment {
  speaker: 'interviewer' | 'candidate'
  start_time: number
  end_time: number
  text: string
  confidence: number
}
```

### CandidateState (候选人状态)
```typescript
interface CandidateState {
  timestamp: string
  emotion: {
    emotion: string
    confidence: number
    valence: number
    arousal: number
  }
  engagement: number
  nervousness: number
  confidence_level: number
  eye_contact: number
  posture_score: number
  speech_clarity: number
  speech_pace: 'slow' | 'normal' | 'fast'
}
```

### InterviewInsight (面试洞察)
```typescript
interface InterviewInsight {
  category: string
  content: string
  severity: 'info' | 'warning' | 'alert'
  timestamp: string
}
```

## 错误处理

所有API响应都遵循统一的错误格式：

```typescript
{
  success: false
  message: string                // 错误描述
}
```

常见错误类型：
- **网络错误**: 连接失败、超时等
- **HTTP 4xx**: 客户端错误（如404、400等）
- **HTTP 5xx**: 服务器内部错误

## 前端集成

### 使用 useImmersiveInterview Composable

```typescript
import { useImmersiveInterview } from '@/composables/useImmersiveInterview'

const {
  // 状态
  sessionId,
  session,
  isLoading,
  isRecording,
  suggestions,
  
  // 方法
  createSession,
  startInterview,
  stopInterview,
  fetchSuggestions,
  deleteSession
} = useImmersiveInterview()

// 创建会话
await createSession('application-id')

// 开始面试
await startInterview()

// 获取建议
await fetchSuggestions()

// 停止面试
await stopInterview()
```

### 本地回退机制

当API不可用时，前端会自动使用本地生成的问题建议：

```typescript
// 基于简历的问题建议
const resumeBasedSuggestions = [
  {
    question: "请简单介绍一下自己，以及为什么对该岗位感兴趣？",
    type: "probe",
    priority: 1,
    reason: "开场自我介绍"
  },
  // ... 更多问题
]
```

## 注意事项

1. **会话管理**: 每个面试会话都有唯一的 `sessionId`，用于标识和管理会话状态
2. **实时性**: 建议API应该根据当前面试进度和候选人回答动态生成问题
3. **错误处理**: 前端会优雅处理API错误，提供本地回退方案
4. **数据持久化**: 面试数据应该在后端持久化存储，支持会话恢复