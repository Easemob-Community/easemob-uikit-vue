import { computed } from 'vue'
import { useContactStore } from '../store/contact'

export function useContact() {
  const contactStore = useContactStore()
  const contactList = computed(() => contactStore.contactList || [])

  return {
    contactList,
  }
}
