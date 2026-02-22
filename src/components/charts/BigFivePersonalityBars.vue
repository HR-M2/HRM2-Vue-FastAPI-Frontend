<template>
  <div class="big-five-bars">
    <div class="bars-container">
      <div 
        v-for="trait in traits" 
        :key="trait.key" 
        class="trait-item"
        :title="trait.reason"
      >
        <span class="trait-name">{{ trait.label }}</span>
        <div class="trait-bar-bg">
          <div 
            class="trait-bar-fill" 
            :style="{ 
              width: trait.value + '%',
              backgroundColor: trait.color 
            }"
          ></div>
        </div>
        <span class="trait-value">{{ trait.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;

  .bars-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .trait-item {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: help;

    .trait-name {
      font-size: 11px;
      color: #374151;
      width: 42px;
      flex-shrink: 0;
    }

    .trait-bar-bg {
      flex: 1;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;

      .trait-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s ease;
      }
    }

    .trait-value {
      font-size: 10px;
      font-weight: 600;
      color: #6b7280;
      width: 24px;
      text-align: right;
      flex-shrink: 0;
    }
  }
}
</style>
