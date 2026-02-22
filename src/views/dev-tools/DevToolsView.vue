<template>
  <div class="dev-tools-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon class="title-icon"><Promotion /></el-icon>
          开发测试
        </h1>
        <p class="page-desc">提供开发调试辅助工具，仅供开发测试使用</p>
      </div>
      <el-tag type="danger" size="large">
        <el-icon><Warning /></el-icon>
        仅限开发环境
      </el-tag>
    </div>

    <!-- 警告提示 -->
    <el-alert
      title="注意：此页面功能仅供开发测试使用"
      type="warning"
      description="生成的测试数据会添加到正式数据库中，请谨慎使用。生产环境建议禁用此功能。"
      show-icon
      :closable="false"
      class="warning-alert"
    />

    <!-- 工具卡片区域 -->
    <div class="tools-grid">
      <!-- 随机简历生成器 -->
      <ResumeGenerator />

      <!-- 经验库管理工具 -->
      <ExperienceManager />

      <!-- Agent 调试器开关 -->
      <el-card class="tool-card debugger-toggle-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              <svg class="bug-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 2l1.5 1.5M16 2l-1.5 1.5M12 12v9M4.93 4.93l2.83 2.83M19.07 4.93l-2.83 2.83M3 12h3M18 12h3M6 19l2-2M18 19l-2-2"/>
                <ellipse cx="12" cy="12" rx="5" ry="7"/>
              </svg>
              Agent 调试器
            </span>
          </div>
        </template>
        <div class="debugger-toggle-content">
          <p class="toggle-desc">实时追踪所有 LLM/Agent 调用过程，查看 prompt 和响应内容</p>
          <div class="toggle-row">
            <span class="toggle-label">显示悬浮窗</span>
            <el-switch
              v-model="debuggerVisible"
              size="large"
              inline-prompt
              active-text="开"
              inactive-text="关"
            />
          </div>
          <p class="toggle-hint">开启后，页面右下角会显示调试器按钮</p>
        </div>
      </el-card>

      <!-- 预留更多工具位置 -->
      <el-card class="tool-placeholder" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              <el-icon><Plus /></el-icon>
              更多工具
            </span>
          </div>
        </template>
        <el-empty description="更多开发测试工具待添加..." :image-size="80" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Promotion, Warning, Plus } from '@element-plus/icons-vue'
import ResumeGenerator from './components/ResumeGenerator.vue'
import ExperienceManager from './components/ExperienceManager.vue'
import { useDebuggerStore } from '@/stores/debugger'

const debuggerStore = useDebuggerStore()
const debuggerVisible = computed({
  get: () => debuggerStore.visible,
  set: (val) => val ? debuggerStore.show() : debuggerStore.hide()
})
</script>

<style scoped lang="scss">
.dev-tools-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .header-left {
    flex: 1;
  }

  .page-title {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    display: flex;
    align-items: center;
    gap: 8px;

    .title-icon {
      color: #e6a23c;
    }
  }

  .page-desc {
    margin: 0;
    font-size: 14px;
    color: #909399;
  }

  .el-tag {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.warning-alert {
  margin-bottom: 0;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
}

.tool-placeholder {
  min-height: 300px;

  .card-header {
    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #909399;
    }
  }

  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }
}

.debugger-toggle-card {
  .bug-icon {
    width: 18px;
    height: 18px;
    margin-right: 4px;
  }

  .debugger-toggle-content {
    .toggle-desc {
      margin: 0 0 20px 0;
      color: #606266;
      font-size: 14px;
      line-height: 1.6;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .toggle-label {
      font-size: 15px;
      font-weight: 500;
      color: #303133;
    }

    .toggle-hint {
      margin: 0;
      font-size: 12px;
      color: #909399;
    }
  }
}

@media (max-width: 900px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
