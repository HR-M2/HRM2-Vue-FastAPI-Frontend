import { ref, computed, type Ref } from 'vue'

/**
 * 面板拖拽调整宽度 composable
 * 支持左侧态势感知面板和右侧分析面板的拖拽调整
 */
export function useResizePanel(isFullscreen: Ref<boolean>) {
  // 右侧面板拖拽调整宽度
  const analysisPanelWidth = ref(420)
  const resizeBarDragging = ref(false)
  const startX = ref(0)
  const startWidth = ref(0)

  // 左侧态势感知面板状态
  const isLeftPanelExpanded = ref(false)
  const leftPanelWidth = ref(320)
  const leftResizeBarDragging = ref(false)
  const leftStartX = ref(0)
  const leftStartWidth = ref(0)

  // 右侧面板拖拽
  const startResize = (e: MouseEvent) => {
    resizeBarDragging.value = true
    startX.value = e.clientX
    startWidth.value = analysisPanelWidth.value
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const onResize = (e: MouseEvent) => {
    if (!resizeBarDragging.value) return
    const diff = startX.value - e.clientX
    // 获取容器宽度，计算最大允许宽度（视频最小保留30%）
    const container = document.querySelector('.content-grid') as HTMLElement
    const containerWidth = container?.offsetWidth || 1200
    const maxWidth = Math.floor(containerWidth * 0.7) - 20 // 70% - gap
    const newWidth = Math.min(Math.max(startWidth.value + diff, 320), maxWidth)
    analysisPanelWidth.value = newWidth
  }

  const stopResize = () => {
    resizeBarDragging.value = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // 左侧面板拖拽
  const startLeftResize = (e: MouseEvent) => {
    leftResizeBarDragging.value = true
    leftStartX.value = e.clientX
    leftStartWidth.value = leftPanelWidth.value
    document.addEventListener('mousemove', onLeftResize)
    document.addEventListener('mouseup', stopLeftResize)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const onLeftResize = (e: MouseEvent) => {
    if (!leftResizeBarDragging.value) return
    const diff = e.clientX - leftStartX.value
    const container = document.querySelector('.content-grid') as HTMLElement
    const containerWidth = container?.offsetWidth || 1200
    const maxWidth = Math.floor(containerWidth * 0.4) - 20
    const newWidth = Math.min(Math.max(leftStartWidth.value + diff, 280), maxWidth)
    leftPanelWidth.value = newWidth
  }

  const stopLeftResize = () => {
    leftResizeBarDragging.value = false
    document.removeEventListener('mousemove', onLeftResize)
    document.removeEventListener('mouseup', stopLeftResize)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // 切换左侧面板
  const toggleLeftPanel = () => {
    isLeftPanelExpanded.value = !isLeftPanelExpanded.value
  }

  // 计算内容区域网格列
  const contentGridColumns = computed(() => {
    if (isFullscreen.value) {
      return '1fr'
    }
    if (isLeftPanelExpanded.value) {
      return `${leftPanelWidth.value}px 6px 1fr 6px ${analysisPanelWidth.value}px`
    }
    return `40px 1fr 6px ${analysisPanelWidth.value}px`
  })

  return {
    // 右侧面板
    analysisPanelWidth,
    resizeBarDragging,
    startResize,
    // 左侧面板
    isLeftPanelExpanded,
    leftPanelWidth,
    leftResizeBarDragging,
    startLeftResize,
    // 通用
    toggleLeftPanel,
    contentGridColumns
  }
}
