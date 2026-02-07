# HRM2 前端开发规范（AI读）

> 精简版规范，供 AI 编程助手快速参考。详细说明见 `前端开发规范（人读）.md`

---

## 技术栈

- Vue 3.5+ / TypeScript 5.9+ / Vite 7.1+ / Element Plus 2.11+
- API 客户端自动生成：`@hey-api/openapi-ts`

## 项目结构（Co-location 架构）

```
src/
├── api/              → 自动生成的 API SDK（禁止手动修改）
├── components/       → 跨视图共享组件
│   ├── charts/       → 图表组件
│   ├── common/       → 通用业务组件
│   └── layout/       → 布局组件
├── composables/      → 跨视图共享的组合式函数
├── services/         → 服务层（WebSocket 等）
├── stores/           → 状态管理
├── types/            → 前端扩展类型
├── router/           → 路由配置
└── views/            → 页面视图（视图级就近归置）
    └── {view}/
        ├── {View}View.vue
        ├── components/   → 视图专属组件
        ├── composables/  → 视图专属 composables
        └── styles/       → 视图专属样式（如需要）
```

## 命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| Vue 组件 | PascalCase.vue | `PositionListPanel.vue` |
| Composable | useCamelCase.ts | `usePositionManagement.ts` |
| 变量/函数 | camelCase | `positionData`, `handleSubmit` |
| 事件处理 | handle{Action} | `handleSelectPosition` |
| 布尔值 | is/has/can 开头 | `isLoading`, `hasChanges` |

## Vue 组件规范

**SFC 顺序**：`<template>` → `<script setup lang="ts">` → `<style scoped>`

**Script 区块顺序**：
1. 导入（Vue → 第三方 → 组件 → Composables → API → 类型）
2. Props & Emits
3. Composables 解构
4. 本地状态
5. 方法
6. 生命周期

**Props/Emits 定义**：使用泛型语法
```typescript
defineProps<{ items: ItemType[]; loading: boolean }>()
defineEmits<{ select: [item: ItemType]; delete: [item: ItemType] }>()
```

## Composable 规范

文件结构：状态定义 → 方法 → return 导出

```typescript
export function use{Feature}() {
  const loading = ref(false)
  const items = ref<ItemType[]>([])
  
  const loadItems = async () => { ... }
  
  return { loading, items, loadItems }
}
```

## 类型规范

- API 类型：从 `@/api/types.gen` 导入（自动生成，禁止修改）
- 前端扩展类型：放 `src/types/`，用桶文件 `index.ts` 导出
- 导入时使用 `import type`

## 组件目录规范

- **视图专属组件**：放在 `views/{view}/components/`，扁平结构，直接导入文件
- **共享组件**：放在 `components/` 下（charts / common / layout），通过 `index.ts` 桶文件导出
- 视图专属组件用相对路径导入：`import XxxDialog from './components/XxxDialog.vue'`
- 共享组件用别名导入：`import { ResumeDetailDialog } from '@/components/common'`

## API 调用规范

- 使用生成的 SDK：`import { getItems } from '@/api/sdk.gen'`
- 错误处理：try-catch + `ElMessage.error()`
- 乐观更新：先更新 UI，API 失败后回滚

```typescript
const response = await getItems({ query: { page_size: 100 } })
const items = response.data?.data?.items || []
```

## 样式规范

- 必须使用 `<style scoped>`
- 深度选择器：`:deep(.el-component)`
- 优先使用 Element Plus 组件

## 路由规范

- 懒加载：`component: () => import('@/views/{view}/{View}View.vue')`
- 设置 `meta.title` 用于页面标题
- 路由切换使用淡入淡出过渡动画

## 新功能开发流程

1. `src/views/{view}/` - 创建视图目录
2. `src/views/{view}/{View}View.vue` - 创建页面
3. `src/views/{view}/components/` - 创建视图专属组件（扁平结构，无需 index.ts）
4. `src/views/{view}/composables/` - 创建视图专属 composables（如需要）
5. `src/types/{module}.ts` - 定义前端扩展类型（如需要）
6. `src/router/index.ts` - 添加路由

> 跨视图复用的组件放 `src/components/`，跨视图复用的 composables 放 `src/composables/`

## 禁止事项

- 手动修改 `src/api/*.gen.ts` 文件
- 组件不使用 scoped 样式
- 跳过类型定义使用 any
- 在模板中写复杂逻辑（应抽到 composable）
