import { client } from '@/api/client.gen'

const DEFAULT_RECONNECT_DELAY_MS = 3000

interface ScreeningStreamMessage {
  type?: string
  data?: Record<string, unknown>
  message?: string
}

export interface ScreeningStatusStreamCallbacks {
  onOpen?: () => void
  onStatus?: (payload: Record<string, unknown>) => void
  onError?: (message: string) => void
}

export interface ScreeningStatusStreamOptions {
  taskId: string
  reconnectDelayMs?: number
  callbacks: ScreeningStatusStreamCallbacks
}

export interface ScreeningStatusStreamHandle {
  close: () => void
}

const buildScreeningStreamUrl = (taskId: string): string => {
  const path = `/api/v1/screening/${encodeURIComponent(taskId)}/stream`
  const baseUrl = String(client.getConfig().baseUrl || '').trim().replace(/\/$/, '')
  if (!baseUrl) return path
  return `${baseUrl}${path}`
}

export const createScreeningStatusStream = (
  options: ScreeningStatusStreamOptions
): ScreeningStatusStreamHandle => {
  const reconnectDelayMs = options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS
  let active = true
  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const clearReconnectTimer = () => {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const closeCurrentSource = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  const scheduleReconnect = () => {
    if (!active || reconnectTimer !== null) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, reconnectDelayMs)
  }

  const connect = () => {
    if (!active) return

    if (typeof EventSource === 'undefined') {
      options.callbacks.onError?.('当前浏览器不支持 SSE，筛选状态无法实时更新')
      return
    }

    closeCurrentSource()

    try {
      eventSource = new EventSource(buildScreeningStreamUrl(options.taskId))
    } catch (err) {
      console.error('创建筛选状态 SSE 连接失败:', err)
      options.callbacks.onError?.('筛选状态流连接失败，正在自动重连')
      scheduleReconnect()
      return
    }

    eventSource.onopen = () => {
      clearReconnectTimer()
      options.callbacks.onOpen?.()
    }

    eventSource.onmessage = (event) => {
      let message: ScreeningStreamMessage
      try {
        message = JSON.parse(event.data) as ScreeningStreamMessage
      } catch (err) {
        console.error('解析筛选状态 SSE 消息失败:', err)
        return
      }

      if (!message.type || message.type === 'connected' || message.type === 'heartbeat') {
        return
      }

      if (message.type === 'error') {
        options.callbacks.onError?.(message.message || '筛选状态流异常')
        return
      }

      if (message.type === 'status' && message.data) {
        options.callbacks.onStatus?.(message.data)
      }
    }

    eventSource.onerror = () => {
      if (!active || !eventSource) return
      const closedState = typeof EventSource.CLOSED === 'number' ? EventSource.CLOSED : 2

      if (eventSource.readyState === closedState) {
        options.callbacks.onError?.('筛选状态流连接中断，正在自动重连')
        closeCurrentSource()
        scheduleReconnect()
      }
    }
  }

  connect()

  return {
    close: () => {
      active = false
      clearReconnectTimer()
      closeCurrentSource()
    }
  }
}
