<script setup lang="ts">
import { ref } from 'vue'
import ScrollToTop from './scroll-to-top.vue'
</script>

<template>
  <Story title="ScrollToTop">
    <Variant title="Default">
      <div style="position: relative; height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div v-for="i in 50" :key="i" style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
          列表项 {{ i }}
        </div>
        <ScrollToTop :visibility-height="200" />
      </div>
    </Variant>

    <Variant title="Custom Icon & Size">
      <div style="position: relative; height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div v-for="i in 50" :key="i" style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
          列表项 {{ i }}
        </div>
        <ScrollToTop icon="arrows/arrow_up_n_box" :size="44" :visibility-height="100" :right="20" :bottom="20" />
      </div>
    </Variant>

    <Variant title="Fast Duration">
      <div style="position: relative; height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div v-for="i in 50" :key="i" style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
          列表项 {{ i }}
        </div>
        <ScrollToTop :duration="150" :visibility-height="150" />
      </div>
    </Variant>
  </Story>
</template>
