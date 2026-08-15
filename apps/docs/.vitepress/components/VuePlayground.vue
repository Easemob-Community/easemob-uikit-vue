<script setup lang="ts">
/**
 * 文档站交互式演练场（站点级全局组件，theme/index.ts 注册为 <VuePlayground>）
 *
 * 基于 @vue/repl（Vue 官方演练场，vuejs.org 同款）：用户直接编辑 SFC 源码，
 * 浏览器内实时编译预览。import map 全部指向本地静态托管的 vendor 产物
 * （apps/docs/public/vendor/，由 scripts/sync-vendor.mjs 同步），不依赖 CDN。
 *
 * SSR 安全：@vue/repl 仅在 onMounted 后动态 import（主入口自带 SSR stub），
 * 构建期不触碰浏览器 API；SSR/加载中渲染占位条。
 *
 * 使用方式（md 内，组件已全局注册）：
 *   import { themePlaygroundFiles } from '../.vitepress/components/playground-files/theme'
 *   <VuePlayground :files="themePlaygroundFiles" title="主题配置演练场" id="theme" />
 *
 * 模板自包含约束：playground 源码只能 import import map 已覆盖的模块
 * （vue / pinia / easemob-websdk / @easemob/uikit-im），其余依赖无法在预览 iframe 中解析。
 *
 * 多文件模板：files 键可为 'App.vue' + 'mock.ts'（mock 数据与主代码分离），
 * Repl 原生渲染文件 tab，主文件恒为 'App.vue'。
 *
 * 持久化：编辑内容按 `${id || title}` 写入 localStorage（带 v1 版本号），
 * 刷新/切换页面自动恢复；「重置代码」清除本地持久化并恢复初始模板。
 */
import { onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue'
import type { Component } from 'vue'
import type { ReplStore } from '@vue/repl'

const props = withDefaults(defineProps<{
  /** 初始文件表：键为文件名（如 'App.vue' / 'mock.ts'），值为源码 */
  files: Record<string, string>
  /** 演练场标题（工具条展示） */
  title?: string
  /** 整体高度（px），默认 560 */
  height?: number
  /** 本地持久化 key（同一页面多个演练场必须区分）；不传回落到 title */
  id?: string
}>(), {
  title: '在线演练场',
  height: 560,
  id: '',
})

/** localStorage key（v1 版本号：模板内容变更时整体升级，避免旧缓存污染） */
const storageKey = `uikit-playground:${props.id || props.title}:v1`

/** import map：全部指向本地 vendor（与 sync-vendor.mjs 的产物一一对应） */
const IMPORT_MAP = {
  imports: {
    'vue': '/vendor/vue.js',
    'vue/server-renderer': '/vendor/server-renderer.js',
    '@vue/compiler-sfc': '/vendor/compiler-sfc.js',
    // pinia 为 esbuild 打包单文件（依赖链 vue-demi/devtools-api 已内联，仅 external vue）
    'pinia': '/vendor/pinia.js',
    'easemob-websdk': '/vendor/easemob-websdk.js',
    '@easemob/uikit-im': '/vendor/easemob-uikit-im.js',
  },
}

/** 预览 iframe head 注入：uikit dist 构建产物 CSS（:root 主题变量 + 全部组件样式） */
const PREVIEW_HEAD_HTML = '<link rel="stylesheet" href="/vendor/uikit-theme.css">'

/** 预览应用自定义代码：EmUIKitProvider 不自带 pinia，需使用方创建并注册 */
const PREVIEW_CUSTOM_CODE = {
  importCode: 'import { createPinia } from "pinia"',
  useCode: 'app.use(createPinia())',
}

/** 独立演练场页（public/playground.html，经 location.hash 接收 serialize() 状态） */
const PLAYGROUND_PAGE = `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/playground.html`

/** @vue/repl 运行时实例（onMounted 后动态加载，SSR 阶段为 null） */
const ReplComp = shallowRef<Component | null>(null)
const CodeMirrorEditor = shallowRef<Component | null>(null)
const store = shallowRef<ReplStore | null>(null)

const rootRef = ref<HTMLElement>()
const loading = ref(true)
const loadError = ref('')
const replTheme = ref<'dark' | 'light'>('light')

/** 跟随 VitePress 暗色切换（html class 上的 dark） */
let themeObserver: MutationObserver | null = null
function syncReplTheme() {
  replTheme.value = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** 编辑自动持久化（防抖 500ms） */
let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (saveTimer)
    clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (store.value)
      localStorage.setItem(storageKey, store.value.serialize())
  }, 500)
}

onMounted(async () => {
  syncReplTheme()
  themeObserver = new MutationObserver(syncReplTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  onScopeDispose(() => {
    themeObserver?.disconnect()
    if (saveTimer)
      clearTimeout(saveTimer)
  })

  try {
    const [{ Repl, useStore }, { default: CodeMirror }] = await Promise.all([
      import('@vue/repl'),
      import('@vue/repl/codemirror-editor'),
      import('@vue/repl/style.css'),
    ])
    ReplComp.value = Repl
    CodeMirrorEditor.value = CodeMirror

    // 优先恢复本地持久化的编辑状态（带 v1 版本隔离，旧模板缓存自动失效）
    const saved = localStorage.getItem(storageKey)
    const instance = saved ? useStore({}, saved) : useStore()
    if (saved) {
      // 反序列化会把 import-map.json 一并恢复，统一按当前 IMPORT_MAP 覆盖
      instance.setImportMap(IMPORT_MAP)
    }
    else {
      // 注意顺序：setFiles 会重建内置 import-map.json（覆盖自定义映射），
      // 必须先注入文件、再写入自定义 import map（ReplPreview 会监听变更并重建沙箱）
      await instance.setFiles(props.files, 'App.vue')
      instance.setImportMap(IMPORT_MAP)
    }
    store.value = instance
    // 编辑内容自动保存（getFiles 返回普通对象，deep watch 覆盖文件增删改）
    watch(() => instance.getFiles(), scheduleSave, { deep: true })
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    loading.value = false
  }
})

/** 恢复初始代码（清除持久化缓存，setFiles 会覆盖 import map，需重新注入） */
async function reset() {
  if (!store.value)
    return
  loading.value = true
  localStorage.removeItem(storageKey)
  try {
    await store.value.setFiles(props.files, 'App.vue')
    store.value.setImportMap(IMPORT_MAP)
  }
  finally {
    loading.value = false
  }
}

/** 在新标签打开独立演练场页（serialize → location.hash） */
function openInNewTab() {
  if (!store.value)
    return
  const serialized = store.value.serialize()
  const url = `${location.origin}${PLAYGROUND_PAGE}#${encodeURIComponent(serialized)}`
  window.open(url, '_blank', 'noopener')
}

/** 全屏 / 退出全屏（放大预览） */
function toggleFullscreen() {
  const el = rootRef.value
  if (!el)
    return
  if (document.fullscreenElement)
    void document.exitFullscreen()
  else
    void el.requestFullscreen?.()
}
</script>

<template>
  <div ref="rootRef" class="vue-playground" :style="{ height: `${height}px` }">
    <div class="vue-playground__bar">
      <span class="vue-playground__title">{{ title }}</span>
      <div class="vue-playground__actions">
        <button
          type="button"
          class="vue-playground__btn"
          :disabled="loading || !store"
          title="在新标签打开独立演练场（可分享链接）"
          @click="openInNewTab"
        >
          新标签打开
        </button>
        <button
          type="button"
          class="vue-playground__btn"
          :disabled="loading || !store"
          title="全屏放大预览（Esc 退出）"
          @click="toggleFullscreen"
        >
          全屏
        </button>
        <button
          type="button"
          class="vue-playground__btn"
          :disabled="loading || !store"
          title="清除本地编辑记录并恢复初始模板"
          @click="reset"
        >
          重置代码
        </button>
      </div>
    </div>

    <div class="vue-playground__body">
      <div v-if="loading" class="vue-playground__placeholder">
        加载演练场中…
      </div>
      <div v-else-if="loadError" class="vue-playground__error">
        演练场加载失败：{{ loadError }}
      </div>
      <!-- Repl 为 onMounted 后动态导入的组件，必须用 <component :is> 绑定 -->
      <component
        :is="ReplComp"
        v-else-if="ReplComp && CodeMirrorEditor && store"
        :editor="CodeMirrorEditor"
        :store="store"
        :theme="replTheme"
        :clear-console="false"
        :show-compile-output="false"
        :show-ssr-output="false"
        :show-import-map="false"
        :preview-options="{
          headHTML: PREVIEW_HEAD_HTML,
          customCode: PREVIEW_CUSTOM_CODE,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.vue-playground {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg);
}

/* 全屏态：铺满视口 */
.vue-playground:fullscreen {
  width: 100vw;
  height: 100vh;
  margin: 0;
  border: none;
  border-radius: 0;
}

.vue-playground__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg-soft);
}

.vue-playground__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vue-playground__actions {
  display: flex;
  gap: 6px;
  flex: none;
}

.vue-playground__btn {
  padding: 3px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.6;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background-color 0.15s;
}

.vue-playground__btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.vue-playground__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vue-playground__body {
  position: relative;
  flex: 1;
  min-height: 0;
}

/* Repl 根节点撑满容器（repl 自带 .vue-repl 类） */
.vue-playground__body :deep(.vue-repl) {
  height: 100%;
}

.vue-playground__placeholder,
.vue-playground__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.vue-playground__error {
  color: var(--vp-c-danger-1);
}

/* 窄屏：工具条按钮文字可省略 */
@media (max-width: 640px) {
  .vue-playground__btn {
    padding: 3px 6px;
    font-size: 11px;
  }
}
</style>
