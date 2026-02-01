<template>
  <div class="big-five-bars">
    <h5 class="chart-title">大五人格特质</h5>
    <div class="bars-container">
      <div 
        v-for="trait in traits" 
        :key="trait.key" 
        class="trait-item"
        :title="trait.reason"
      >
        <div class="trait-header">
          <span class="trait-name">{{ trait.label }}</span>
          <span class="trait-value">{{ trait.value }}</span>
        </div>
        <div class="trait-bar-bg">
          <div 
            class="trait-bar-fill" 
            :style="{ 
              width: trait.value + '%',
              backgroundColor: trait.color 
            }"
          ></div>
        </div>
      </div>
    </div>
    <div class="chart-hint">
      <el-icon><InfoFilled /></el-icon>
      <span>基于面试对话和简历推断，仅供参考</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'

interface BigFiveData {
  openness?: number
  conscientiousness?: number
  extraversion?: number
  agreeableness?: number
  neuroticism?: number
  analysis?: {
    openness_reason?: string
    conscientiousness_reason?: string
    extraversion_reason?: string
    agreeableness_reason?: string
    neuroticism_reason?: string
  }
}

const props = defineProps<{
  data: BigFiveData | null
}>()

// 特质配置
const traitConfigs = [
  { key: 'openness', label: '开放性', color: '#8b5cf6', reasonKey: 'openness_reason' },
  { key: 'conscientiousness', label: '尽责性', color: '#10b981', reasonKey: 'conscientiousness_reason' },
  { key: 'extraversion', label: '外向性', color: '#f59e0b', reasonKey: 'extraversion_reason' },
  { key: 'agreeableness', label: '宜人性', color: '#3b82f6', reasonKey: 'agreeableness_reason' },
  { key: 'neuroticism', label: '神经质', color: '#ef4444', reasonKey: 'neuroticism_reason' }
]

const traits = computed(() => {
  if (!props.data) {
    return traitConfigs.map(cfg => ({
      ...cfg,
      value: 50,
      reason: '暂无数据'
    }))
  }

  return traitConfigs.map(cfg => ({
    ...cfg,
    value: (props.data as Record<string, any>)[cfg.key] || 50,
    reason: props.data?.analysis?.[cfg.reasonKey as keyof typeof props.data.analysis] || ''
  }))
})
</script>

<style scoped lang="scss">
.big-five-bars {
  .chart-title {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    text-align: center;
  }

  .bars-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .trait-item {
    cursor: help;

    .trait-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .trait-name {
        font-size: 12px;
        color: #374151;
      }

      .trait-value {
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
      }
    }

    .trait-bar-bg {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;

      .trait-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease;
      }
    }
  }

  .chart-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-top: 10px;
    font-size: 10px;
    color: #9ca3af;

    .el-icon {
      font-size: 12px;
    }
  }
}
</style>
