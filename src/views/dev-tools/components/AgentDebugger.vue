<template>
  <Teleport to="body">
    <div 
      v-if="isDev && debuggerVisible"
      class="agent-debugger"
      :class="{ expanded: isExpanded }"
      :style="floatingStyle"
    >
      <!-- 折叠态：悬浮按钮 -->
      <Transition name="debugger-fade">
        <div 
          v-if="!isExpanded"
          class="debugger-toggle"
          @click="handleToggleClick"
          @mousedown="startDrag"
        >
        <el-badge :value="activeCount" :hidden="activeCount === 0" :max="9">
          <svg class="bug-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 2l1.5 1.5M16 2l-1.5 1.5M12 12v9M4.93 4.93l2.83 2.83M19.07 4.93l-2.83 2.83M3 12h3M18 12h3M6 19l2-2M18 19l-2-2"/>
            <ellipse cx="12" cy="12" rx="5" ry="7"/>
          </svg>
        </el-badge>
        </div>
      </Transition>

      <!-- 展开态：调试面板 -->
      <Transition name="debugger-scale">
        <div v-if="isExpanded" class="debugger-panel">
        <!-- 标题栏（可拖拽） -->
        <div class="panel-header" @mousedown="startDrag">
          <span class="title">
            <el-icon><Monitor /></el-icon>
            Agent 调试器
          </span>
          <div class="header-actions">
            <el-switch 
              v-model="tracingEnabled" 
              size="small"
              inline-prompt
              active-text="追踪"
              inactive-text="暂停"
              @change="toggleTracing"
            />
            <el-button 
              :icon="Delete" 
              size="small" 
              text 
              @click="clearHistory"
              title="清空历史"
            />
            <el-button 
              :icon="Minus" 
              size="small" 
              text 
              @click="isExpanded = false"
              title="最小化"
            />
          </div>
        </div>

        <!-- 事件列表 -->
        <div class="panel-content" ref="contentRef">
          <div v-if="events.length === 0" class="empty-state">
            <el-icon :size="32" color="#c0c4cc"><DocumentCopy /></el-icon>
            <p>暂无调用记录</p>
            <p class="hint">触发 AI 功能后将在此显示调用过程</p>
          </div>

          <div 
            v-for="event in events" 
            :key="event.id"
            class="trace-item"
            :class="[`status-${event.status}`]"
            @click="toggleEventDetail(event.id)"
          >
            <div class="trace-header">
              <span class="status-dot" />
              <span class="agent-name">{{ event.agent_name }}</span>
              <span class="method-name">.{{ event.method }}()</span>
              <span class="duration" v-if="event.duration_ms">
                {{ event.duration_ms }}ms
              </span>
              <span class="time">{{ formatTime(event.timestamp) }}</span>
            </div>

            <!-- 展开的详情 -->
            <div v-if="expandedEvents.has(event.id)" class="trace-detail">
              <div class="detail-section">
                <div class="detail-label">
                  Prompt:
                  <el-button :icon="CopyDocument" size="small" text @click.stop="copyContent(event.prompt_preview || event.prompt_full || '', 'Prompt')" title="复制 Prompt" />
                </div>
                <pre class="detail-content">{{ event.prompt_preview || event.prompt_full || '(空)' }}</pre>
              </div>
              <div class="detail-section">
                <div class="detail-label">
                  Response:
                  <el-button :icon="CopyDocument" size="small" text @click.stop="copyContent(event.response || '', 'Response')" title="复制 Response" />
                </div>
                <pre class="detail-content" :class="{ streaming: event.status === 'streaming' }">
                  {{ event.response || (event.status === 'streaming' ? '正在生成...' : '(空)') }}
                  <span v-if="event.status === 'streaming'" class="cursor-blink">▌</span>
                </pre>
              </div>
              <div v-if="event.error" class="detail-section error">
                <div class="detail-label">Error:</div>
                <pre class="detail-content">{{ event.error }}</pre>
              </div>
              <div class="detail-actions">
                <el-button size="small" @click.stop="copyFullTrace(event)">
                  <el-icon><CopyDocument /></el-icon>
                  复制完整调用信息
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 状态栏 -->
        <div class="panel-footer">
          <span :class="['connection-status', connectionStatus]">
            <span class="status-indicator" />
            {{ connectionText }}
          </span>
          <span class="event-count">{{ events.length }} 条记录</span>
        </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Monitor, Delete, Minus, DocumentCopy, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useDebuggerStore } from '@/stores/debugger'

interface TraceEvent {
  id: string
  timestamp: string
  agent_name: string
  method: string
  status: 'pending' | 'streaming' | 'completed' | 'error'
  prompt_preview?: string
  prompt_full?: string
  response?: string
  duration_ms?: number
  error?: string
  parent_id?: string
  metadata?: Record<string, unknown>
}

const isDev = import.meta.env.DEV
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const debuggerStore = useDebuggerStore()
const debuggerVisible = computed(() => debuggerStore.visible)

const isExpanded = ref(false)
const tracingEnabled = ref(true)
const events = ref<TraceEvent[]>([])
const expandedEvents = ref<Set<string>>(new Set())
const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('disconnected')
const contentRef = ref<HTMLElement | null>(null)

// 拖拽相关
const position = ref({ x: window.innerWidth - 50, y: window.innerHeight - 50 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const hasDragged = ref(false)  // 记录是否发生了拖拽

// 计算样式 - 展开时面板向左上角延伸
const floatingStyle = computed(() => {
  if (isExpanded.value) {
    // 展开态：面板右下角对齐按钮位置
    return {
      left: `${position.value.x - 420 + 36}px`,
      top: `${position.value.y - 500 + 36}px`,
    }
  }
  return {
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
  }
})

// 活跃调用数
const activeCount = computed(() => 
  events.value.filter(e => e.status === 'pending' || e.status === 'streaming').length
)

// 连接状态文字
const connectionText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    default: return '未连接'
  }
})

// SSE 连接
let eventSource: EventSource | null = null

function connectSSE() {
  if (eventSource) {
    eventSource.close()
  }

  connectionStatus.value = 'connecting'
  eventSource = new EventSource(`${API_BASE}/api/v1/debug/agent-trace/stream`)

  eventSource.onopen = () => {
    connectionStatus.value = 'connected'
  }

  eventSource.onmessage = (e) => {
    try {
      const message = JSON.parse(e.data)
      handleSSEMessage(message)
    } catch (err) {
      console.error('[AgentDebugger] Parse error:', err)
    }
  }

  eventSource.onerror = () => {
    connectionStatus.value = 'disconnected'
    // 1秒后重连
    setTimeout(() => {
      if (isDev) connectSSE()
    }, 5000)
  }
}

function handleSSEMessage(message: { type: string; data?: TraceEvent }) {
  if (message.type === 'heartbeat' || message.type === 'connected') {
    return
  }

  if (!message.data) return
  const eventData = message.data

  switch (message.type) {
    case 'start':
      // 新调用开始，添加到列表头部
      events.value.unshift(eventData)
      // 限制最多100条
      if (events.value.length > 100) {
        events.value.pop()
      }
      break

    case 'chunk':
      // 流式更新
      updateEvent(eventData)
      break

    case 'end':
      // 调用结束
      updateEvent(eventData)
      break
  }

  // 自动滚动到顶部
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.scrollTop = 0
    }
  })
}

function updateEvent(data: TraceEvent) {
  const idx = events.value.findIndex(e => e.id === data.id)
  if (idx !== -1) {
    events.value[idx] = { ...events.value[idx], ...data }
  }
}

function toggleEventDetail(id: string) {
  if (expandedEvents.value.has(id)) {
    expandedEvents.value.delete(id)
  } else {
    expandedEvents.value.add(id)
  }
}

async function toggleTracing(enabled: boolean) {
  try {
    await fetch(`${API_BASE}/api/v1/debug/agent-trace/toggle?enabled=${enabled}`, {
      method: 'POST'
    })
  } catch (err) {
    console.error('[AgentDebugger] Toggle error:', err)
  }
}

async function clearHistory() {
  try {
    await fetch(`${API_BASE}/api/v1/debug/agent-trace/clear`, {
      method: 'POST'
    })
    events.value = []
    expandedEvents.value.clear()
  } catch (err) {
    console.error('[AgentDebugger] Clear error:', err)
  }
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  } catch {
    return ''
  }
}

// 复制内容到剪贴板
async function copyContent(content: string, label: string) {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success(`${label} 已复制到剪贴板`)
  } catch (err) {
    console.error('[AgentDebugger] Copy error:', err)
    ElMessage.error('复制失败')
  }
}

// 复制完整调用信息
async function copyFullTrace(event: TraceEvent) {
  const fullContent = `=== Agent 调用信息 ===
时间: ${event.timestamp}
Agent: ${event.agent_name}
方法: ${event.method}
状态: ${event.status}
耗时: ${event.duration_ms || 0}ms
${event.error ? `错误: ${event.error}\n` : ''}
=== Prompt ===
${event.prompt_preview || event.prompt_full || '(空)'}

=== Response ===
${event.response || '(空)'}`

  try {
    await navigator.clipboard.writeText(fullContent)
    ElMessage.success('完整调用信息已复制到剪贴板')
  } catch (err) {
    console.error('[AgentDebugger] Copy error:', err)
    ElMessage.error('复制失败')
  }
}

// 点击处理 - 只有未拖拽时才展开
function handleToggleClick() {
  if (!hasDragged.value) {
    isExpanded.value = true
  }
}

// 拖拽逻辑
function startDrag(e: MouseEvent) {
  isDragging.value = true
  hasDragged.value = false  // 重置拖拽标记
  dragOffset.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  
  hasDragged.value = true  // 标记已拖拽
  
  let newX = e.clientX - dragOffset.value.x
  let newY = e.clientY - dragOffset.value.y
  
  // 边界限制（按钮模式）
  const btnSize = 36
  newX = Math.max(0, Math.min(newX, window.innerWidth - btnSize))
  newY = Math.max(0, Math.min(newY, window.innerHeight - btnSize))
  
  position.value = { x: newX, y: newY }
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 展开时确保面板不超出屏幕
watch(isExpanded, (expanded) => {
  if (expanded) {
    // 确保面板左上角不超出屏幕
    const panelLeft = position.value.x - 420 + 36
    const panelTop = position.value.y - 500 + 36
    
    if (panelLeft < 0) {
      position.value.x = 420 - 36
    }
    if (panelTop < 0) {
      position.value.y = 500 - 36
    }
  }
})

onMounted(() => {
  if (isDev) {
    connectSSE()
  }
})

onUnmounted(() => {
  if (eventSource) {
    eventSource.close()
  }
})
</script>

<style scoped>
.agent-debugger {
  position: fixed;
  z-index: 99999;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  font-size: 12px;
}

/* 折叠态按钮 */
.debugger-toggle {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #606266;
}

.debugger-toggle:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
  color: #409eff;
}

.bug-icon {
  width: 18px;
  height: 18px;
}

/* 展开态面板 */
.debugger-panel {
  width: 420px;
  height: 500px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #ebeef5;
  cursor: move;
  user-select: none;
}

.panel-header .title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
  font-weight: 600;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions .el-button {
  color: #909399;
}

.header-actions .el-button:hover {
  color: #409eff;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #fafafa;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  text-align: center;
}

.empty-state .hint {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 8px;
}

/* 调用记录项 */
.trace-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #ffffff;
  border-radius: 8px;
  border-left: 3px solid #dcdfe6;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.trace-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.trace-item.status-pending {
  border-left-color: #e6a23c;
  background: linear-gradient(to right, #fdf6ec, #ffffff);
}

.trace-item.status-streaming {
  border-left-color: #409eff;
  background: linear-gradient(to right, #ecf5ff, #ffffff);
}

.trace-item.status-completed {
  border-left-color: #67c23a;
}

.trace-item.status-error {
  border-left-color: #f56c6c;
  background: linear-gradient(to right, #fef0f0, #ffffff);
}

.trace-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-pending .status-dot { color: #e6a23c; }
.status-streaming .status-dot { 
  color: #409eff; 
  animation: pulse 1s infinite;
}
.status-completed .status-dot { color: #67c23a; }
.status-error .status-dot { color: #f56c6c; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.agent-name {
  color: #9c27b0;
  font-weight: 600;
}

.method-name {
  color: #ff9800;
}

.duration {
  color: #67c23a;
  margin-left: auto;
  font-size: 11px;
}

.time {
  color: #c0c4cc;
  font-size: 10px;
}

/* 详情展开 */
.trace-detail {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e4e7ed;
}

.detail-section {
  margin-bottom: 10px;
}

.detail-section.error .detail-content {
  color: #f56c6c;
  background: #fef0f0;
  border-color: #fbc4c4;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
  font-size: 11px;
  margin-bottom: 4px;
  font-weight: 500;
}

.detail-label .el-button {
  padding: 2px 4px;
  color: #909399;
}

.detail-label .el-button:hover {
  color: #409eff;
}

.detail-actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e4e7ed;
}

.detail-actions .el-button {
  font-size: 11px;
}

.detail-content {
  color: #606266;
  background: #f5f7fa;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
  font-size: 11px;
  line-height: 1.5;
}

.detail-content.streaming {
  border-color: #409eff;
  background: #ecf5ff;
}

.cursor-blink {
  color: #409eff;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 状态栏 */
.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f8f9fa;
  border-top: 1px solid #ebeef5;
  font-size: 11px;
  color: #909399;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #666;
}

.connection-status.connected .status-indicator {
  background: #67c23a;
}

.connection-status.connecting .status-indicator {
  background: #e6a23c;
  animation: pulse 1s infinite;
}

.connection-status.disconnected .status-indicator {
  background: #f56c6c;
}

/* 展开/收起动画 */
.debugger-fade-enter-active,
.debugger-fade-leave-active {
  transition: opacity 0.2s ease;
}

.debugger-fade-enter-from,
.debugger-fade-leave-to {
  opacity: 0;
}

.debugger-scale-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.debugger-scale-leave-active {
  transition: all 0.2s ease-out;
}

.debugger-scale-enter-from {
  opacity: 0;
  transform: scale(0.3) translate(50%, 50%);
}

.debugger-scale-leave-to {
  opacity: 0;
  transform: scale(0.3) translate(50%, 50%);
}
</style>
