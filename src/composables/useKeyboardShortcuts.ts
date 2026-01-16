/**
 * 键盘快捷键 composable
 * 用于沉浸式面试界面的调试和快捷操作
 */
import { onMounted, onUnmounted } from 'vue'

export interface KeyboardShortcutCallbacks {
  onTriggerDeception?: () => void
  // 预留其他快捷键回调
  onKey2?: () => void
  onKey3?: () => void
  onKey4?: () => void
  onKey5?: () => void
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks) {
  const handleKeyDown = (event: KeyboardEvent) => {
    // 如果用户正在输入框中输入，不触发快捷键
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    // 处理不同的按键
    switch (event.key) {
      case '1':
        // 按键1：触发欺骗检测高值
        if (callbacks.onTriggerDeception) {
          callbacks.onTriggerDeception()
          console.log('[快捷键] 触发欺骗检测高值 (按键: 1)')
        }
        break

      case '2':
        // 按键2：预留功能
        if (callbacks.onKey2) {
          callbacks.onKey2()
          console.log('[快捷键] 触发功能2 (按键: 2)')
        }
        break

      case '3':
        // 按键3：预留功能
        if (callbacks.onKey3) {
          callbacks.onKey3()
          console.log('[快捷键] 触发功能3 (按键: 3)')
        }
        break

      case '4':
        // 按键4：预留功能
        if (callbacks.onKey4) {
          callbacks.onKey4()
          console.log('[快捷键] 触发功能4 (按键: 4)')
        }
        break

      case '5':
        // 按键5：预留功能
        if (callbacks.onKey5) {
          callbacks.onKey5()
          console.log('[快捷键] 触发功能5 (按键: 5)')
        }
        break

      default:
        // 其他按键不处理
        break
    }
  }

  // 挂载时添加事件监听
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    console.log('[键盘快捷键] 已启用')
  })

  // 卸载时移除事件监听
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    console.log('[键盘快捷键] 已禁用')
  })

  return {
    // 可以暴露一些方法供外部使用
  }
}
