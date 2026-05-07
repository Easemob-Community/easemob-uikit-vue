import { computed } from 'vue'
import { useGroupStore } from '../store/group'

export function useGroup() {
  const groupStore = useGroupStore()
  const groupList = computed(() => groupStore.groupList || [])

  return {
    groupList,
  }
}
