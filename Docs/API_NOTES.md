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
3. 简历库 (`/library`) - 占位符
4. 简历筛选 (`/screening`) - 占位符
5. 视频分析 (`/video`) - 占位符
6. 面试辅助 (`/interview`) - 占位符
7. 最终推荐 (`/recommend`) - 占位符
8. 开发测试 (`/dev-tools`) - 占位符
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
  preferred_skills: string[] // 优先技能
  min_experience: number     // 最低工作经验(年)
  education_requirements: string[] // 学历要求
  salary_min: number         // 最低薪资(K)
  salary_max: number         // 最高薪资(K)
  is_active: boolean         // 是否启用
  application_count?: number // 关联简历数
}
```
