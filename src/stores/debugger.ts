import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDebuggerStore = defineStore('debugger', () => {
  // 调试器悬浮窗是否可见
  const visible = ref(true)

  function show() {
    visible.value = true
  }

  function hide() {
    visible.value = false
  }

  function toggle() {
    visible.value = !visible.value
  }

  return {
    visible,
    show,
    hide,
    toggle
  }
})
