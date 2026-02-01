<template>
  <div class="ability-radar-chart">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

interface DimensionScore {
  dimension_name?: string | null
  dimension_score?: number | null
}

const props = defineProps<{
  dimensionScores: Record<string, DimensionScore> | null | undefined
}>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 维度名称映射
const dimensionNameMap: Record<string, string> = {
  professional_competency: '专业能力',
  work_experience: '工作经验',
  soft_skills: '软技能',
  cultural_fit: '文化匹配',
  interview_performance: '面试表现'
}

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chartInstance || !props.dimensionScores) return

  const indicators: { name: string; max: number }[] = []
  const values: number[] = []

  // 按固定顺序提取数据
  const orderedKeys = ['professional_competency', 'work_experience', 'soft_skills', 'cultural_fit', 'interview_performance']
  
  for (const key of orderedKeys) {
    const dim = props.dimensionScores[key]
    if (dim) {
      indicators.push({
        name: dim.dimension_name || dimensionNameMap[key] || key,
        max: 5
      })
      values.push(dim.dimension_score || 3)
    }
  }

  const option: echarts.EChartsOption = {
    radar: {
      indicator: indicators,
      radius: '65%',
      center: ['50%', '55%'],
      axisName: {
        color: '#6b7280',
        fontSize: 11
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(102, 126, 234, 0.02)', 'rgba(102, 126, 234, 0.05)']
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(102, 126, 234, 0.15)'
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(102, 126, 234, 0.2)'
        }
      }
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        name: '能力评估',
        areaStyle: {
          color: 'rgba(102, 126, 234, 0.3)'
        },
        lineStyle: {
          color: '#667eea',
          width: 2
        },
        itemStyle: {
          color: '#667eea'
        }
      }]
    }]
  }

  chartInstance.setOption(option)
}

const handleResize = () => {
  chartInstance?.resize()
}

watch(() => props.dimensionScores, updateChart, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.ability-radar-chart {
  width: 100%;
  height: 100%;

  .chart-container {
    width: 100%;
    height: 100%;
    min-height: 140px;
  }
}
</style>
