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
import { Promotion, Warning, Plus } from '@element-plus/icons-vue'
import { ResumeGenerator } from '@/components/dev-tools'
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

@media (max-width: 900px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
