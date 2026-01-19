<template>
  <div ref="chartRef" class="big-five-radar-chart" :style="{ width: width, height: height }"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'

interface BigFiveData {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

interface Props {
  data: BigFiveData | null
  width?: string
  height?: string
  showLabel?: boolean
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  data: null,
  width: '100%',
  height: '200px',
  showLabel: true,
  color: '#667eea'
})

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const dimensionLabels = {
  openness: '开放性',
  conscientiousness: '尽责性',
  extraversion: '外向性',
  agreeableness: '宜人性',
  neuroticism: '神经质'
}

const initChart = () => {
  if (!chartRef.value) return
  
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chartInstance || !props.data) return
  
  const indicators = [
    { name: dimensionLabels.openness, max: 1 },
    { name: dimensionLabels.conscientiousness, max: 1 },
    { name: dimensionLabels.extraversion, max: 1 },
    { name: dimensionLabels.agreeableness, max: 1 },
    { name: dimensionLabels.neuroticism, max: 1 }
  ]
  
  const values = [
    props.data.openness,
    props.data.conscientiousness,
    props.data.extraversion,
    props.data.agreeableness,
    props.data.neuroticism
  ]
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.data && params.data.value) {
          const labels = ['开放性', '尽责性', '外向性', '宜人性', '神经质']
          let result = '<div style="font-weight: 600; margin-bottom: 8px;">大五人格评分</div>'
          params.data.value.forEach((val: number, idx: number) => {
            result += `<div>${labels[idx]}: ${(val * 100).toFixed(0)}%</div>`
          })
          return result
        }
        return ''
      }
    },
    radar: {
      indicator: indicators,
      radius: '65%',
      center: ['50%', '50%'],
      axisName: {
        show: props.showLabel,
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
          color: '#e5e7eb'
        }
      },
      axisLine: {
        lineStyle: {
          color: '#e5e7eb'
        }
      }
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            name: '大五人格',
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              color: props.color,
              width: 2
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: `${props.color}40` },
                { offset: 1, color: `${props.color}10` }
              ])
            },
            itemStyle: {
              color: props.color
            }
          }
        ]
      }
    ]
  }
  
  chartInstance.setOption(option)
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

watch(() => props.data, () => {
  nextTick(() => {
    if (chartInstance) {
      updateChart()
    } else {
      initChart()
    }
  })
}, { deep: true })

onMounted(() => {
  nextTick(() => {
    initChart()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.big-five-radar-chart {
  min-height: 150px;
}
</style>
