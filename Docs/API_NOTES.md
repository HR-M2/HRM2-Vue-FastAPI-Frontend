# API 对接说明

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
2. 岗位设置 (`/positions`) - 占位符
3. 简历库 (`/library`) - 占位符
4. 简历筛选 (`/screening`) - 占位符
5. 视频分析 (`/video`) - 占位符
6. 面试辅助 (`/interview`) - 占位符
7. 最终推荐 (`/recommend`) - 占位符
8. 开发测试 (`/dev-tools`) - 占位符
9. 系统设置 (`/settings`) - 占位符
