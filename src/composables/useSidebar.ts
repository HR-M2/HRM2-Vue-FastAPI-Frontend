import { ref } from 'vue'

const isCollapsed = ref(false)

export function useSidebar() {
  const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value
  }

  const collapseSidebar = () => {
    isCollapsed.value = true
  }

  const expandSidebar = () => {
    isCollapsed.value = false
  }

  return {
    isCollapsed,
    toggleSidebar,
    collapseSidebar,
    expandSidebar
  }
}
