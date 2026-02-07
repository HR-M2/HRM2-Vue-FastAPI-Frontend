import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: { title: '仪表盘 - HRM2招聘管理系统' }
        },
        {
          path: 'positions',
          name: 'positions',
          component: () => import('@/views/positions/PositionsView.vue'),
          meta: { title: '岗位设置 - HRM2招聘管理系统' }
        },
        {
          path: 'library',
          name: 'library',
          component: () => import('@/views/resume-library/ResumeLibraryView.vue'),
          meta: { title: '简历库 - HRM2招聘管理系统' }
        },
        {
          path: 'screening',
          name: 'screening',
          component: () => import('@/views/screening/ScreeningView.vue'),
          meta: { title: '简历筛选 - HRM2招聘管理系统' }
        },
        {
          path: 'video',
          name: 'video',
          component: () => import('@/views/video/VideoView.vue'),
          meta: { title: '视频分析 - HRM2招聘管理系统' }
        },
        {
          path: 'video/:id',
          name: 'video-detail',
          component: () => import('@/views/video/VideoView.vue'),
          meta: { title: '视频分析详情 - HRM2招聘管理系统' }
        },
        {
          path: 'interview',
          name: 'interview',
          component: () => import('@/views/interview/InterviewView.vue'),
          meta: { title: '面试辅助 - HRM2招聘管理系统' }
        },
        {
          path: 'immersive',
          name: 'immersive',
          component: () => import('@/views/immersive-interview/ImmersiveInterviewView.vue'),
          meta: { title: '沉浸式面试 - HRM2招聘管理系统' }
        },
        {
          path: 'recommend',
          name: 'recommend',
          component: () => import('@/views/recommend/RecommendView.vue'),
          meta: { title: '最终推荐 - HRM2招聘管理系统' }
        },
        {
          path: 'dev-tools',
          name: 'dev-tools',
          component: () => import('@/views/dev-tools/DevToolsView.vue'),
          meta: { title: '开发测试 - HRM2招聘管理系统' }
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/settings/SettingsView.vue'),
          meta: { title: '系统设置 - HRM2招聘管理系统' }
        }
      ]
    }
  ]
})

// 添加全局前置守卫来动态设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta && to.meta.title) {
    document.title = to.meta.title as string
  } else {
    document.title = 'HRM2招聘管理系统'
  }
  next()
})

router.isReady().then(() => {
  const prefetch = () => {
    import('@/views/dashboard/DashboardView.vue')
    import('@/views/positions/PositionsView.vue')
    import('@/views/resume-library/ResumeLibraryView.vue')
    import('@/views/screening/ScreeningView.vue')
    import('@/views/video/VideoView.vue')
    import('@/views/interview/InterviewView.vue')
    import('@/views/immersive-interview/ImmersiveInterviewView.vue')
    import('@/views/recommend/RecommendView.vue')
    import('@/views/dev-tools/DevToolsView.vue')
    import('@/views/settings/SettingsView.vue')
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(prefetch)
  } else {
    setTimeout(prefetch, 1000)
  }
})

export default router
