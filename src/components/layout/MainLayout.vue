<template>
  <div class="main-layout">
    <!-- 侧边栏 -->
    <AppSidebar />

    <!-- 主内容区域 -->
    <div class="main-container" :class="{ 'sidebar-collapsed': isCollapsed }">
      <!-- 顶部标题栏 -->
      <AppHeader :title="pageTitle" :is-collapsed="isCollapsed" />

      <!-- 页面内容 -->
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <Transition name="page-fade" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </Transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useSidebar } from '@/composables/useSidebar'

const { isCollapsed } = useSidebar()
const route = useRoute()

// 页面标题映射
const pageTitles: Record<string, string> = {
  '/': '仪表盘',
  '/positions': '岗位设置',
  '/library': '简历库',
  '/screening': '简历筛选',
  '/video': '视频分析',
  '/interview': '面试辅助',
  '/recommend': '最终推荐',
  '/dev-tools': '开发测试',
  '/settings': '系统设置'
}

// 计算当前页面标题
const pageTitle = computed(() => {
  // 获取基础路径
  const basePath = '/' + (route.path.split('/')[1] || '')
  return pageTitles[basePath] || '招聘管理系统'
})
</script>

<style scoped lang="scss">
.main-layout {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.main-container {
  margin-left: 240px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;

  &.sidebar-collapsed {
    margin-left: 64px;
  }
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.15s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
