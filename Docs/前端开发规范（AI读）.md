# HRM2 前端开发规范（AI读）

> 精简版规范，供 AI 编程助手快速参考。详细说明见 `前端开发规范（人读）.md`

---

## 技术栈

- Vue 3.5+ / TypeScript 5.9+ / Vite 7.1+ / Element Plus 2.11+
- API 客户端自动生成：`@hey-api/openapi-ts`

## 项目结构

```
src/
├── api/           → 自动生成的 API SDK（禁止手动修改）
├── components/    → 按业务模块组织的组件
├── composables/   → 组合式函数（use*.ts）
├── views/         → 页面视图
├── types/         → 前端扩展类型
└── router/        → 路由配置
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

- 按模块分目录：`components/{module}/`
- 每个目录有 `index.ts` 统一导出
- 导入时从模块导入：`import { Component } from '@/components/{module}'`

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

- 懒加载：`component: () => import('@/views/XxxView.vue')`
- 设置 `meta.title` 用于页面标题

## 新功能开发流程

1. `src/types/{module}.ts` - 定义前端类型（如需要）
2. `src/composables/use{Module}.ts` - 创建业务逻辑
3. `src/components/{module}/` - 创建组件 + index.ts
4. `src/views/{Module}View.vue` - 创建页面
5. `src/router/index.ts` - 添加路由

## 禁止事项

- 手动修改 `src/api/*.gen.ts` 文件
- 组件不使用 scoped 样式
- 跳过类型定义使用 any
- 在模板中写复杂逻辑（应抽到 composable）
