<template>
  <div class="noise-waveform" ref="containerRef">
    <canvas ref="canvasRef" :width="canvasWidth" :height="height"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  value: number // 0-1 的数值，控制波形幅度
  width?: number // 如果为0，则自动适应容器宽度
  height?: number
  color?: string
  backgroundColor?: string
  lineWidth?: number
  speed?: number // 波形移动速度
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  width: 0, // 默认自动适应
  height: 50,
  color: '#10b981',
  backgroundColor: 'transparent',
  lineWidth: 1.8,
  speed: 1.2
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const canvasWidth = ref(200) // 默认宽度
let animationFrameId: number | null = null
let offset = 0
let resizeObserver: ResizeObserver | null = null

// 生成高斯分布的随机数（Box-Muller变换）
const gaussianRandom = (mean: number = 0, stdDev: number = 1): number => {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return z0 * stdDev + mean
}

// Perlin噪声的简化实现
const perlinNoise = (x: number): number => {
  const X = Math.floor(x) & 255
  const xf = x - Math.floor(x)
  
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  
  // 使用简单的伪随机函数
  const hash = (n: number) => {
    const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453
    return (h - Math.floor(h)) * 2 - 1
  }
  
  const u = fade(xf)
  const a = hash(X)
  const b = hash(X + 1)
  
  return a * (1 - u) + b * u
}

// 生成平滑的高斯噪声波形
const smoothGaussianNoise = (x: number, scale: number = 1): number => {
  // 组合多个频率的Perlin噪声，模拟高斯分布的平滑变化
  const noise1 = perlinNoise(x * 0.02) * 0.5
  const noise2 = perlinNoise(x * 0.05) * 0.3
  const noise3 = perlinNoise(x * 0.1) * 0.2
  
  // 添加少量高斯随机性
  const gaussian = gaussianRandom(0, 0.1)
  
  return (noise1 + noise2 + noise3 + gaussian) * scale
}

// 更新canvas宽度
const updateCanvasWidth = () => {
  if (props.width > 0) {
    canvasWidth.value = props.width
  } else if (containerRef.value) {
    // 自动适应容器宽度，减去padding
    const rect = containerRef.value.getBoundingClientRect()
    canvasWidth.value = Math.floor(rect.width - 8) // 减去padding
  }
}

// 绘制噪声波形
const drawWaveform = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const width = canvasWidth.value
  const { height } = props
  
  // 清空画布
  ctx.clearRect(0, 0, width, height)
  
  // 填充背景色
  if (props.backgroundColor !== 'transparent') {
    ctx.fillStyle = props.backgroundColor
    ctx.fillRect(0, 0, width, height)
  }
  
  // 绘制网格线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 0.5
  
  // 水平网格线
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // 垂直网格线
  const gridCount = Math.ceil(width / 30) // 根据宽度动态计算网格数
  for (let i = 0; i <= gridCount; i++) {
    const x = (width / gridCount) * i
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  
  // 绘制高斯噪声波形
  ctx.strokeStyle = props.color
  ctx.lineWidth = props.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  ctx.beginPath()
  
  const centerY = height / 2
  const pixelsPerPoint = 0.6 // 密集的采样点
  const totalPoints = Math.ceil(width / pixelsPerPoint)
  
  // 计算振幅（根据value值调整）
  const amplitude = height * 0.35 * (0.2 + props.value * 0.8)
  
  for (let i = 0; i < totalPoints; i++) {
    const x = i * pixelsPerPoint
    const globalX = (i + offset) * pixelsPerPoint
    
    // 生成高斯分布的平滑噪声
    const noise = smoothGaussianNoise(globalX, amplitude)
    const y = centerY - noise
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  
  ctx.stroke()
}

// 动画循环
const animate = () => {
  offset += props.speed
  drawWaveform()
  animationFrameId = requestAnimationFrame(animate)
}

// 监听value变化
watch(() => props.value, () => {
  drawWaveform()
})

// 监听颜色变化
watch(() => props.color, () => {
  drawWaveform()
})

// 监听宽度变化
watch(() => props.width, () => {
  updateCanvasWidth()
  nextTick(() => {
    drawWaveform()
  })
})

onMounted(() => {
  updateCanvasWidth()
  
  // 如果width为0，使用ResizeObserver监听容器大小变化
  if (props.width === 0 && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateCanvasWidth()
      drawWaveform()
    })
    resizeObserver.observe(containerRef.value)
  }
  
  nextTick(() => {
    animate()
  })
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style scoped lang="scss">
.noise-waveform {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  
  canvas {
    display: block;
  }
}
</style>
