# API 对接说明

> **🤖 AI 助手指引**
> 
> 查看 API 定义的最佳位置：
> - **API 函数**：`src/api/sdk.gen.ts` - 所有可调用的 API 函数
> - **类型定义**：`src/api/types.gen.ts` - 请求/响应的 TypeScript 类型
> - **后端源码**：`../HRM2-Vue-FastAPI-Backend/app/api/v1/` - FastAPI 路由定义
> - **后端 Schema**：`../HRM2-Vue-FastAPI-Backend/app/schemas/` - Pydantic 模型
> 
> 这些文件由 `@hey-api/openapi-ts` 从后端 OpenAPI 规范自动生成，是最准确的 API 参考。

---

## 缺失的 API（需后端补充）

**目前无缺失 API** - 仪表盘页面所需的 API 后端已全部提供。

---

## 仪表盘页面使用的 API

仪表盘页面已完成对接，使用以下 API：

### 已对接的 API

| API | 用途 | 状态 |
|-----|------|------|
| `GET /api/v1/positions` | 获取岗位列表 | ✅ 已对接 |
| `GET /api/v1/screening` | 获取筛选任务列表 | ✅ 已对接 |
| `GET /api/v1/video` | 获取视频分析列表 | ✅ 已对接 |
| `GET /api/v1/applications/stats/overview` | 获取申请统计概览 | ✅ 已对接 |
| `GET /api/v1/analysis/stats/recommendation` | 获取推荐统计 | ✅ 已对接 |

### API 响应格式说明

所有分页 API 返回格式：
```json
{
  "success": true,
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "page_size": 10,
    "pages": 10
  }
}
```

### 统计 API 期望返回格式

#### `/api/v1/applications/stats/overview`
```json
{
  "success": true,
  "data": {
    "total": 100,           // 总简历数
    "screened": 50,         // 已筛选数
    "interviewed": 30,      // 已面试数
    "screening_completed": 50,  // 备选字段名
    "interview_completed": 30   // 备选字段名
  }
}
```

#### `/api/v1/analysis/stats/recommendation`
```json
{
  "success": true,
  "data": {
    "total": 20,            // 已完成综合分析数
    "analyzed_count": 20    // 备选字段名
  }
}
```

## 前端配置

- 开发服务器端口: `5174`
- API 代理: `/api` → `http://127.0.0.1:8000`
- 需要后端运行在 `8000` 端口

## 已创建的页面

1. **仪表盘** (`/`) - 完整实现
2. **岗位设置** (`/positions`) - 完整实现
3. **简历库** (`/library`) - 完整实现
4. **简历筛选** (`/screening`) - 完整实现
5. **视频分析** (`/video`) - 完整实现
6. **面试辅助** (`/interview`) - 完整实现
7. **最终推荐** (`/recommend`) - 完整实现
8. **开发测试** (`/dev-tools`) - 完整实现
9. 系统设置 (`/settings`) - 占位符

---

## 岗位设置页面使用的 API

### 已对接的 API

| API | 用途 | 状态 |
|-----|------|------|
| `GET /api/v1/positions` | 获取岗位列表 | ✅ 已对接 |
| `GET /api/v1/positions/{id}` | 获取岗位详情 | ✅ 已对接 |
| `POST /api/v1/positions` | 创建岗位 | ✅ 已对接 |
| `PATCH /api/v1/positions/{id}` | 更新岗位 | ✅ 已对接 |
| `DELETE /api/v1/positions/{id}` | 删除岗位 | ✅ 已对接 |
| `POST /api/v1/ai/position/generate` | AI生成岗位要求 | ✅ 已对接 |

### 岗位数据结构

```typescript
interface PositionFormData {
  id?: string
  title: string              // 岗位名称
  department: string         // 所属部门
  description: string        // 岗位描述
  required_skills: string[]  // 必备技能
  optional_skills: string[]  // 可选技能
  min_experience: number     // 最低工作经验(年)
  education: string[]        // 学历要求
  salary_min: number         // 最低薪资(K)
  salary_max: number         // 最高薪资(K)
  is_active: boolean         // 是否启用
  application_count?: number // 关联简历数
}
```

---

## 简历库页面使用的 API

### 已对接的 API

| API | 用途 | 状态 |
|-----|------|------|
| `GET /api/v1/resumes` | 获取简历列表 | ✅ 已对接 |
| `GET /api/v1/resumes/{id}` | 获取简历详情 | ✅ 已对接 |
| `POST /api/v1/resumes` | 创建简历 | ✅ 已对接 |
| `PATCH /api/v1/resumes/{id}` | 更新简历 | ✅ 已对接 |
| `DELETE /api/v1/resumes/{id}` | 删除简历 | ✅ 已对接 |
| `POST /api/v1/resumes/batch-delete` | 批量删除 | ✅ 已对接 |
| `POST /api/v1/resumes/check-hashes` | 批量检查哈希(去重) | ✅ 已对接 |

### 与参考前端的差异

参考前端（HRM2-Vue-Frontend）使用的 API 与新后端有以下不同：

| 功能 | 参考前端 | 新后端 | 说明 |
|------|----------|--------|------|
| 筛选状态过滤 | `is_screened` 参数 | ❌ 不支持 | 新API仅支持keyword搜索 |
| 分配状态过滤 | `is_assigned` 参数 | ❌ 不支持 | 新API无此字段 |
| 内容预览 | `content_preview` 字段 | ❌ 不存在 | 需获取详情查看完整content |
| 文件大小 | 列表返回 | ❌ 列表不返回 | 需获取详情查看 |

**注意**：由于新API不支持`is_screened`和`is_assigned`筛选，前端简历库页面已移除这两个筛选条件。

### 简历数据结构

```typescript
// 列表项
interface ResumeListResponse {
  id: string
  created_at: string
  updated_at: string
  candidate_name: string
  phone: string | null
  email: string | null
  filename: string | null
  is_parsed: boolean
  application_count?: number
}

// 详情
interface ResumeResponse {
  id: string
  created_at: string
  updated_at: string
  candidate_name: string
  phone: string | null
  email: string | null
  content: string           // 完整简历内容
  filename: string | null
  file_hash: string
  file_size: number
  is_parsed: boolean
  notes: string | null
  application_count?: number
}

// 创建请求
interface ResumeCreate {
  candidate_name: string    // 必填
  content: string           // 必填
  phone?: string
  email?: string
  filename?: string
  file_hash: string         // 必填，用于去重
  file_size?: number
  notes?: string
}
```

---

## 简历筛选页面使用的 API

### 已对接的 API

| API | 用途 | 状态 |
|-----|------|------|
| `GET /api/v1/positions` | 获取岗位列表 | ✅ 已对接 |
| `GET /api/v1/applications` | 获取应聘申请列表 | ✅ 已对接 |
| `POST /api/v1/applications` | 创建应聘申请 | ✅ 已对接 |
| `DELETE /api/v1/applications/{id}` | 删除应聘申请 | ✅ 已对接 |
| `GET /api/v1/resumes` | 获取简历列表 | ✅ 已对接 |
| `POST /api/v1/resumes` | 创建简历 | ✅ 已对接 |
| `GET /api/v1/screening` | 获取筛选任务列表 | ✅ 已对接 |
| `POST /api/v1/screening` | 创建筛选任务 | ✅ 已对接 |
| `GET /api/v1/screening/{task_id}` | 获取筛选任务详情 | ✅ 已对接 |
| `GET /api/v1/screening/{task_id}/status` | 获取筛选任务状态(轮询) | ✅ 已对接 |
| `GET /api/v1/screening/{task_id}/download` | 下载筛选报告 | ✅ 已对接 |
| `DELETE /api/v1/screening/{task_id}` | 删除筛选任务 | ✅ 已对接 |

### 需要后端补充/确认的功能

| 功能 | 说明 | 状态 |
|------|------|------|
| AI筛选启动 | `POST /api/v1/ai/screening/start` 需要实现实际的AI筛选逻辑 | ⚠️ 待确认 |
| 任务状态轮询 | `/api/v1/screening/{task_id}/status` 需要返回 `current_speaker` 等进度信息 | ⚠️ 待确认 |
| 维度评分 | `dimension_scores` 字段需要包含 `hr_score`, `technical_score`, `manager_score` | ⚠️ 待确认 |

### 与参考前端的架构差异

新后端采用了不同的数据模型架构：

| 概念 | 参考前端 | 新后端 | 说明 |
|------|----------|--------|------|
| 简历-岗位关联 | 直接关联 | 通过 Application | 新架构使用"应聘申请"作为中间实体 |
| 筛选任务创建 | 直接提交简历内容 | 基于 Application | 必须先创建申请，再创建筛选任务 |
| 简历分组 | Position.resumes | Application | 通过查询该岗位的申请来获取简历 |

### 简历筛选工作流程

```
1. 上传简历文件 → 解析内容
2. 创建简历记录 (POST /api/v1/resumes)
3. 创建应聘申请 (POST /api/v1/applications) - 关联简历和岗位
4. 创建筛选任务 (POST /api/v1/screening) - 基于申请ID
5. 轮询任务状态 (GET /api/v1/screening/{task_id}/status)
6. 任务完成后查看详情/下载报告
```

### 筛选任务数据结构

```typescript
// 筛选任务响应
interface ScreeningTaskResponse {
  id: string
  created_at: string
  updated_at: string
  application_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number                    // 0-100
  score: number | null                // 综合评分
  dimension_scores: {                 // 各维度评分
    hr_score?: number
    technical_score?: number
    manager_score?: number
  } | null
  summary: string | null              // 筛选总结
  recommendation: string | null       // 推荐结果
  report_content: string | null       // 报告内容
  error_message: string | null        // 错误信息
  candidate_name?: string             // 候选人姓名（关联查询）
  position_title?: string             // 岗位名称（关联查询）
}

// 任务状态响应（轮询用）
interface TaskStatusResponse {
  status: string
  progress: number
  current_speaker?: string            // 当前处理的Agent
  score?: number
  dimension_scores?: Record<string, unknown>
  summary?: string
  recommendation?: string
  error_message?: string
}
```

---

## 视频分析页面使用的 API

### 已对接的 API

| API | 用途 | 状态 |
|-----|------|------|
| `GET /api/v1/positions` | 获取岗位列表 | ✅ 已对接 |
| `GET /api/v1/applications` | 获取应聘申请列表(支持position_id筛选) | ✅ 已对接 |
| `GET /api/v1/applications/{id}` | 获取应聘申请详情(含video_analysis) | ✅ 已对接 |
| `POST /api/v1/video` | 创建视频分析任务 | ✅ 已对接 |
| `GET /api/v1/video/{id}` | 获取视频分析详情 | ✅ 已对接 |
| `GET /api/v1/resumes/{id}` | 获取简历详情 | ✅ 已对接 |

### 后端业务逻辑待实现（API接口已存在）

> **注意**：以下功能的 API 接口已在后端定义，前端可正常调用。需要实现的是后端的实际业务处理逻辑。

| 功能 | 相关API | 说明 |
|------|---------|------|
| 视频文件上传存储 | 需新增文件上传接口 | 当前只传文件名/大小，需实现实际文件存储 |
| 视频分析AI处理 | `PATCH /api/v1/video/{id}` | 需实现AI分析逻辑，完成后调用此API更新结果 |
| 分析进度轮询 | `GET /api/v1/video/{id}/status` | API已存在，需确认进度信息返回格式 |

### 视频分析数据结构

```typescript
// 创建视频分析请求
interface VideoAnalysisCreate {
  application_id: string     // 应聘申请ID
  video_name: string         // 视频名称
  video_path?: string        // 视频存储路径
  file_size?: number         // 文件大小
  duration?: number          // 视频时长(秒)
}

// 视频分析响应
interface VideoAnalysisResponse {
  id: string
  created_at: string
  updated_at: string
  application_id: string
  video_name: string
  video_path: string | null
  file_size: number
  duration: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  big_five_scores?: {         // 大五人格评分
    openness?: number         // 开放性
    conscientiousness?: number // 尽责性
    extraversion?: number     // 外向性
    agreeableness?: number    // 宜人性
    neuroticism?: number      // 神经质
  }
  confidence_score: number | null  // 置信度
  fraud_score: number | null       // 欺诈风险
  summary: string | null           // 分析摘要
  candidate_name?: string
  position_title?: string
}
```

### 视频分析工作流程

```
1. 选择岗位 → 查看该岗位下的候选人
2. 获取候选人的应聘申请详情（含已有的video_analysis信息）
3. 为没有视频分析的候选人上传视频 (POST /api/v1/video)
4. 后台执行视频分析（AI处理）
5. 轮询状态或刷新页面查看分析结果
6. 查看完成的视频分析详情
```

---

## 面试辅助页面使用的 API

### 已对接的 API

| API | 用途 | 状态 |
|-----|------|------|
| `GET /api/v1/positions` | 获取岗位列表 | ✅ 已对接 |
| `GET /api/v1/applications` | 获取应聘申请列表 | ✅ 已对接 |
| `POST /api/v1/interview` | 创建面试会话 | ✅ 已对接 |
| `GET /api/v1/interview/{session_id}` | 获取面试会话详情 | ✅ 已对接 |
| `POST /api/v1/interview/{session_id}/message` | 记录消息 | ✅ 已对接 |
| `POST /api/v1/interview/{session_id}/complete` | 完成面试会话 | ✅ 已对接 |
| `POST /api/v1/ai/interview/questions` | AI生成面试问题 | ✅ 已对接 |
| `POST /api/v1/ai/interview/candidate-questions` | AI生成候选问题 | ✅ 已对接 |

### AI 服务实现详情

> **注意**：以下 AI 功能已在后端完整实现，通过 `InterviewAssistAgent` 调用 LLM 服务。

| 功能 | API | 实现文件 | 说明 |
|------|-----|----------|------|
| AI问题生成 | `POST /api/v1/ai/interview/questions` | `interview_assist_agent.py` | ✅ 根据简历和岗位生成面试问题和兴趣点 |
| AI候选问题 | `POST /api/v1/ai/interview/candidate-questions` | `interview_assist_agent.py` | ✅ 分析回答类型，生成追问和候选问题 |
| AI报告生成 | `POST /api/v1/ai/interview/report` | `interview_assist_agent.py` | ✅ 基于问答记录生成综合评估报告 |

**依赖条件**：需要配置 LLM 服务（API Key、Base URL 等），否则会返回备用内容。

### 面试辅助功能说明

#### 两种面试模式

1. **AI 模拟演示**：使用本地模拟的虚拟候选人，主要用于演示系统功能
2. **真人实时面试**：调用后端 API 进行实际面试辅助

#### 面试数据结构

```typescript
// 面试会话创建请求
interface InterviewSessionCreate {
  application_id: string     // 应聘申请ID
  interview_type?: string    // 面试类型
  config?: {                 // 面试配置
    followupCount: number    // 追问数量
    alternativeCount: number // 候选问题数量
    interestPointCount: number // 兴趣点数量
  }
}

// 问答消息请求
interface QAMessageCreate {
  role: 'interviewer' | 'candidate'  // 角色
  content: string                     // 内容
}

// 问答消息
interface QAMessage {
  seq: number                         // 消息序号
  role: 'interviewer' | 'candidate'  // 角色
  content: string                     // 内容
  timestamp: string                   // 时间戳
}

// 面试会话响应
interface InterviewSessionResponse {
  id: string
  created_at: string
  updated_at: string
  application_id: string
  interview_type: string
  config: Record<string, unknown>
  messages: QAMessage[]           // 消息流
  question_pool: string[]
  is_completed: boolean
  final_score: number | null
  report: Record<string, unknown> | null
  report_markdown: string | null
  message_count?: number          // 消息数量
  candidate_name?: string
  position_title?: string
}
```

### 面试辅助工作流程

```
1. 选择面试模式（AI模拟/真人面试）
2. 真人面试模式：
   a. 检查麦克风 → 选择候选人（可选）
   b. 创建面试会话 (POST /api/v1/interview)
   c. 获取问题池和兴趣点 (POST /api/v1/ai/interview/questions)
   d. 面试官提问 → 候选人回答 → 记录消息 (POST /api/v1/interview/{id}/message)
   e. 获取追问建议 (POST /api/v1/ai/interview/candidate-questions)
   f. 结束面试，生成报告 (POST /api/v1/interview/{id}/complete)
3. AI模拟模式：
   a. 选择虚拟候选人类型
   b. 面试官提问 → AI生成回答 → 本地评估
   c. 本地生成追问建议
   d. 结束面试，导出记录
```

---

## 最终推荐页面使用的 API

### 已对接的 API

| API | 用途 | 状态 |
|-----|------|------|
| `GET /api/v1/positions` | 获取岗位列表 | ✅ 已对接 |
| `GET /api/v1/applications` | 获取应聘申请列表 | ✅ 已对接 |
| `GET /api/v1/applications/{id}` | 获取应聘申请详情(含关联数据) | ✅ 已对接 |
| `GET /api/v1/resumes/{id}` | 获取简历详情 | ✅ 已对接 |
| `GET /api/v1/interview/{session_id}` | 获取面试会话详情 | ✅ 已对接 |
| `GET /api/v1/analysis/{analysis_id}` | 获取综合分析详情 | ✅ 已对接 |
| `POST /api/v1/analysis` | 创建综合分析记录 | ✅ 已对接 |
| `POST /api/v1/ai/analysis/comprehensive` | AI综合分析 | ✅ 已对接 |
| `POST /api/v1/ai/interview/report` | AI生成面试报告 | ✅ 已对接 |

### 页面功能说明

最终推荐页面整合了以下数据源进行候选人综合分析：
1. **简历文件** - 通过 `ApplicationDetailResponse.resume` 获取
2. **简历初筛报告** - 通过 `ApplicationDetailResponse.screening_task` 获取
3. **面试问答记录** - 通过 `ApplicationDetailResponse.interview_session` 获取
4. **面试分析报告** - 通过 `InterviewSessionResponse.report` 获取
5. **视频分析结果** - 通过 `ApplicationDetailResponse.video_analysis` 获取

### 综合分析数据结构

```typescript
// 综合分析响应
interface ComprehensiveAnalysisResponse {
  id: string
  created_at: string
  updated_at: string
  application_id: string
  final_score: number                    // 最终评分
  recommendation_level: string           // 推荐等级
  recommendation_reason: string | null   // 推荐理由
  suggested_action: string | null        // 建议行动
  dimension_scores: Record<string, unknown>  // 维度评分
  report: string | null                  // 综合报告内容
  input_snapshot: Record<string, unknown>    // 输入数据快照
  candidate_name?: string
  position_title?: string
}

// 综合分析简要信息（列表用）
interface ComprehensiveAnalysisBrief {
  id: string
  final_score: number
  recommendation_level: string
  created_at: string
}
```

### 综合分析工作流程

```
1. 选择岗位 → 显示该岗位下的所有候选人
2. 展开候选人卡片 → 查看数据完整度
3. 确保必要数据齐全（简历、初筛报告、面试报告）
4. 点击"开始综合分析" → 调用 AI 综合分析 API
5. 分析完成 → 保存分析结果
6. 查看综合分析详情（评分、维度分析、建议）
```

### 注意事项

- 综合分析需要至少三项数据：简历、初筛报告、面试分析报告
- `ScreeningTaskBrief` 类型只包含简要信息（id, status, score, recommendation），详细的 `dimension_scores` 和 `summary` 需要调用完整的筛选任务详情 API
- `ResumeListResponse` 不包含 `content` 字段，需要调用 `getResume` API 获取简历详情
