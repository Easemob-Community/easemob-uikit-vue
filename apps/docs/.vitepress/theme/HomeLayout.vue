<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme
// injected by vite define, see vite.config.ts
const version = __EASEMOB_UIKIT_VERSION__
</script>

<template>
  <Layout>
    <!-- home hero: version badge between title and actions -->
    <template #home-hero-info>
      <p class="uikit-hero-version">
        <span class="doc-badge">v{{ version }}</span>
      </p>
    </template>
  </Layout>
</template>

<style scoped>
.uikit-hero-version {
  margin: 14px 0 0;
  text-align: center;
}
</style>
